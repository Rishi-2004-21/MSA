/**
 * Chat + WhatsApp Controller
 * Handles chatbot messages, WhatsApp webhook, and booking page
 */
const { processMessage, getSession, resetSession, getAllSessions } = require('../services/agentOrchestrator');
const { leads, interactions } = require('../db');
const { sendEmail, meetingBookedEmailHtml } = require('../services/emailService');
const { generateSaleAgreement, generateBookingForm } = require('../services/aiAgent');

// ── POST /api/chat ────────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
    try {
        const { sessionId, message, source } = req.body;
        if (!sessionId || !message) return res.status(400).json({ error: 'sessionId and message required.' });

        const result = await processMessage(sessionId, message, { source: source || 'web', channel: 'web' });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Chat]', err);
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/chat/session/:sessionId ─────────────────────────────────────────
exports.getSession = (req, res) => {
    const session = getSession(req.params.sessionId);
    if (!session) return res.json({ exists: false, stage: 'capture', history: [] });
    res.json({ exists: true, stage: session.stage, leadId: session.leadId, history: session.history });
};

// ── DELETE /api/chat/session/:sessionId ───────────────────────────────────────
exports.resetSession = (req, res) => {
    resetSession(req.params.sessionId);
    res.json({ success: true });
};

// ── GET /api/chat/sessions ────────────────────────────────────────────────────
exports.getSessions = (req, res) => {
    res.json(getAllSessions());
};

// ── POST /api/whatsapp/webhook ────────────────────────────────────────────────
// Supports Twilio WhatsApp & Meta Cloud API format
exports.whatsappWebhook = async (req, res) => {
    try {
        // Handle Meta webhook verification
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'msa-verify-token')) {
                return res.status(200).send(challenge);
            }
            return res.status(403).send('Forbidden');
        }

        let fromNumber, userMessage;

        // Handle Twilio format
        if (req.body.From && req.body.Body) {
            fromNumber = req.body.From.replace('whatsapp:', '').replace(/\D/g, '');
            userMessage = req.body.Body.trim();
        }
        // Handle Meta Cloud API format
        else if (req.body.entry) {
            const entry = req.body.entry?.[0];
            const change = entry?.changes?.[0];
            const msg = change?.value?.messages?.[0];
            if (!msg) return res.sendStatus(200);
            fromNumber = msg.from;
            userMessage = msg.text?.body || msg.button?.text || '';
        }

        if (!fromNumber || !userMessage) return res.sendStatus(200);

        console.log(`[WhatsApp] From: ${fromNumber} | Msg: ${userMessage}`);

        const sessionId = `wa_${fromNumber}`;
        const result = await processMessage(sessionId, userMessage, {
            source: 'whatsapp', channel: 'whatsapp', phone: fromNumber,
        });

        // Send response back on WhatsApp
        for (const response of result.responses) {
            const text = `${response.agent?.emoji || ''} *${response.agent?.name || 'Agent'}*\n\n${response.text}`;
            await sendWhatsAppMessage(fromNumber, text);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('[WhatsApp Webhook]', err);
        res.sendStatus(200); // Always return 200 to WhatsApp
    }
};

// ── WhatsApp Message Sender ───────────────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
        console.log(`[WhatsApp Mock] To: ${to}\nMsg: ${text.substring(0, 100)}...`);
        return { mock: true };
    }

    try {
        // Node 18+ has native fetch — no need for node-fetch package
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: text }),
        });
        const data = await response.json();
        console.log(`[WhatsApp] Sent to ${to} | SID: ${data.sid || 'error'}`);
        return data;
    } catch (err) {
        console.error('[WhatsApp Send Error]', err.message);
    }
}

// ── POST /api/book/:leadId ────────────────────────────────────────────────────
// Internal meeting booking page handler
exports.bookMeeting = async (req, res) => {
    try {
        const { date, time, meetLink } = req.body;
        const lead = leads.findById(req.params.leadId);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        const slot = { date, time, meetLink: meetLink || null };
        const rep = lead.location?.toLowerCase().includes('south') ? 'Priya S. (South Zone)' : 'Raj K. (Central Zone)';
        const visitDetails = { ...slot, location: lead.location || 'Ushnik Technologies Office', rep };

        leads.update(lead.id, { siteVisit: visitDetails, status: 'Engaged', meetingLink: meetLink || null });
        interactions.create({ leadId: lead.id, type: 'meeting_scheduled', content: `Meeting booked: ${date} at ${time} with ${rep}` });

        // Send confirmation email
        if (lead.email) {
            await sendEmail({
                to: lead.email,
                subject: `✅ Meeting Confirmed — ${date} at ${time}`,
                html: meetingBookedEmailHtml(lead, slot),
            });
        }

        // Also generate docs
        const agreement = await generateSaleAgreement(lead);
        const bookingForm = await generateBookingForm(lead);
        leads.update(lead.id, { generatedDocuments: { agreement, bookingForm } });
        interactions.create({ leadId: lead.id, type: 'documents_generated', content: 'Auto-generated agreement & booking form on meeting confirmation.' });

        res.json({ success: true, visit: visitDetails, message: 'Meeting booked and confirmation sent.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/book/:leadId ─────────────────────────────────────────────────────
exports.getBookingInfo = (req, res) => {
    const lead = leads.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    // Return safe public fields only
    res.json({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        requirement: lead.requirement,
        existingVisit: lead.siteVisit || null,
    });
};
