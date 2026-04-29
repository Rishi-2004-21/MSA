/**
 * Lead Controller — all lead CRUD + Excel upload + stats
 */
const { leads, interactions } = require('../db');
const { qualifyLead } = require('../services/aiAgent');
const { sendEmail, welcomeEmailHtml, ownerNotificationHtml } = require('../services/emailService');
const { parseExcelBuffer } = require('../services/excelParser');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Routing Helper ─────────────────────────────────────────────────────────────
function routeToTeam(aiResult) {
    const req = (aiResult.requirement || '').toLowerCase();
    if (aiResult.qualification === 'Hot' || aiResult.score >= 75) return 'Sales';
    if (req.includes('cyber') || req.includes('data center') || req.includes('ai')) return 'Technical';
    if (aiResult.qualification === 'Warm') return 'Sales';
    return 'Management';
}

// ── Score override from problem spec ──────────────────────────────────────────
function computeScore(rawData) {
    let score = 0;
    const msg = (rawData.message || rawData.requirement || '').toLowerCase();
    if (msg.length > 20) score += 30;                                       // Clear requirement
    if (rawData.phone && rawData.phone.length > 5) score += 20;             // Phone available
    if (/urgent|asap|immediately|priority/i.test(msg)) score += 30;         // Urgency
    if (/enterprise|company|pvt|ltd|llp|corp|business/i.test(msg + (rawData.company || ''))) score += 20; // Business intent
    return Math.min(score, 100);
}

// ── Internal: process one raw lead ───────────────────────────────────────────
async function processOneLead(rawData) {
    // Save or get existing lead
    const existing = leads.findByEmailOrPhone(rawData.email, rawData.phone);
    let lead;
    if (existing) {
        lead = existing;
        interactions.create({ leadId: lead.id, type: 'note', content: `Duplicate lead inquiry from ${rawData.source || 'excel'}. Re-triggering welcome email.` });
    } else {
        // AI Qualification
        const aiResult = await qualifyLead({ ...rawData, message: rawData.message || rawData.requirement });
        const assignedTeam = routeToTeam(aiResult);

        // Compute next follow-up (Day 1)
        const nextActionDate = new Date();
        nextActionDate.setDate(nextActionDate.getDate() + 1);

        lead = leads.create({
            name: aiResult.name || rawData.name || '',
            email: aiResult.email || rawData.email || '',
            phone: aiResult.phone || rawData.phone || '',
            company: aiResult.company || rawData.company || '',
            source: rawData.source || 'excel',
            channel: rawData.channel || 'excel',
            requirement: aiResult.requirement || 'Other',
            budget: aiResult.budget || null,
            timeline: aiResult.timeline || null,
            location: aiResult.location || rawData.location || null,
            qualification: aiResult.qualification || 'Cold',
            score: aiResult.score || 0,
            summary: aiResult.summary || '',
            status: 'Captured',
            assignedTeam,
            nextActionDate: nextActionDate.toISOString(),
            followUpStage: 0,
            rawLeadData: rawData.rawLeadData || JSON.stringify(rawData),
        });

        // Hot lead alert
        if (lead.qualification === 'Hot') {
            interactions.create({ leadId: lead.id, type: 'note', content: `🔥 HOT LEAD — Assigned to ${assignedTeam}. Immediate follow-up required.` });
            console.log(`🔥 [ALERT] Hot lead ${lead.id} (score: ${lead.score}) assigned to ${assignedTeam}`);
        }
    }

    // Auto-response email (async, non-blocking)
    if (lead.email) {
        const welcomeMsg = `Thank you for reaching out to Ushnik Technologies! Our team will connect with you as soon as possible regarding your requirements. We are excited to explore how we can support your business.`;
        sendEmail({
            to: lead.email,
            subject: `Welcome to Ushnik Technologies — We've received your enquiry!`,
            text: welcomeMsg,
            html: welcomeEmailHtml(lead, welcomeMsg),
        }).then(result => {
            leads.update(lead.id, { emailSent: result.success });
            interactions.create({ leadId: lead.id, type: 'email_sent', content: `Auto-welcome email sent to ${lead.email}. ID: ${result.messageId || 'mock'}` });
        }).catch(e => console.error('[Email] Auto-response error:', e.message));
    }

    // Owner notification (async for new leads)
    if (!existing) {
        const ownerEmail = process.env.OWNER_EMAIL || process.env.FROM_EMAIL;
        if (ownerEmail) {
            sendEmail({
                to: ownerEmail,
                subject: `🔥 New Lead: ${lead.name || lead.email || 'Unknown'} [${lead.qualification}]`,
                text: `New ${lead.qualification} lead from ${lead.source}. Score: ${lead.score}. Requirement: ${lead.requirement}.`,
                html: ownerNotificationHtml(lead),
            }).catch(e => console.error('[Email] Owner notification error:', e.message));
        }
    }

    return { lead, duplicate: !!existing };
}

// ── POST /api/leads ───────────────────────────────────────────────────────────
exports.captureLead = async (req, res) => {
    try {
        const rawData = {
            ...req.body,
            source: req.query.source || req.body.source || 'website',
            channel: req.body.channel || 'web',
        };
        const result = await processOneLead(rawData);
        if (result.duplicate) {
            return res.status(200).json({ success: true, duplicate: true, message: 'Lead already exists.', existingId: result.existingId });
        }
        res.status(201).json({ success: true, message: 'Lead captured and qualified.', lead: result.lead });
    } catch (err) {
        console.error('[captureLead]', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── POST /api/leads/upload-excel ──────────────────────────────────────────────
exports.uploadExcelMiddleware = upload.single('file');

exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });

        const rawLeads = parseExcelBuffer(req.file.buffer);
        if (rawLeads.length === 0) {
            return res.status(400).json({ error: 'No valid leads found in the file. Check column names: Name, Email, Phone, Requirement.' });
        }

        console.log(`[Excel] Processing ${rawLeads.length} leads...`);

        const results = [];
        let processed = 0, duplicates = 0, errors = 0;

        for (const raw of rawLeads) {
            try {
                const result = await processOneLead(raw);
                if (result.duplicate) {
                    duplicates++;
                    results.push({ name: raw.name, email: raw.email, status: 'duplicate', existingId: result.existingId });
                } else {
                    processed++;
                    results.push({ name: raw.name, email: raw.email, status: 'processed', leadId: result.lead.id, qualification: result.lead.qualification, score: result.lead.score });
                }
            } catch (e) {
                errors++;
                results.push({ name: raw.name, email: raw.email, status: 'error', error: e.message });
            }
        }

        res.json({ success: true, total: rawLeads.length, processed, duplicates, errors, results });
    } catch (err) {
        console.error('[uploadExcel]', err);
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/leads ────────────────────────────────────────────────────────────
exports.getAllLeads = (req, res) => {
    try {
        const { qualification, status, source, limit } = req.query;
        let all = leads.findAll({ qualification, status, source });
        if (limit) all = all.slice(0, parseInt(limit));
        res.json(all);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/leads/:id ────────────────────────────────────────────────────────
exports.getLeadById = (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── PATCH /api/leads/:id ──────────────────────────────────────────────────────
exports.updateLead = (req, res) => {
    try {
        const allowed = ['status', 'assignedTeam', 'meetingLink', 'proposalStatus', 'proposalContent', 'nextActionDate', 'followUpStage'];
        const data = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) data[k] = req.body[k];
        }
        const lead = leads.update(req.params.id, data);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });
        if (req.body.status) {
            interactions.create({ leadId: lead.id, type: 'note', content: `Status updated to: ${req.body.status}` });
        }
        res.json({ success: true, lead });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/leads/:id/interaction ──────────────────────────────────────────
exports.addInteraction = (req, res) => {
    try {
        const { type, content } = req.body;
        if (!type || !content) return res.status(400).json({ error: 'type and content required.' });
        const interaction = interactions.create({ leadId: req.params.id, type, content });
        res.status(201).json({ success: true, interaction });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/stats ────────────────────────────────────────────────────────────
exports.getStats = (req, res) => {
    try {
        res.json(leads.stats());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
