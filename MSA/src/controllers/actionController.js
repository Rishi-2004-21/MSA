/**
 * Action Controller — AI-powered actions on existing leads
 */
const { leads, interactions } = require('../db');
const { generateAutoResponse, generateProposal, generateSaleAgreement, generateBookingForm, verifyKYCDocuments } = require('../services/aiAgent');
const { sendEmail, proposalEmailHtml } = require('../services/emailService');
require('dotenv').config();

// ── POST /api/leads/:id/generate-response ─────────────────────────────────────
exports.generateAutoResponse = async (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        const message = await generateAutoResponse(lead);
        interactions.create({ leadId: lead.id, type: 'auto_reply_queued', content: message });

        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/leads/:id/send-response ────────────────────────────────────────
exports.sendResponse = async (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });
        if (!lead.email) return res.status(400).json({ error: 'Lead has no email.' });

        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message content required.' });

        const result = await sendEmail({
            to: lead.email,
            subject: `Response from Ushnik Technologies regarding your enquiry`,
            text: message,
            html: `<p>Hi ${lead.name || 'there'},</p><p>${message.replace(/\n/g, '<br>')}</p>`,
        });

        if (result.success) {
            interactions.create({ leadId: lead.id, type: 'email_sent', content: `Manual AI response sent to ${lead.email}.` });
        }

        res.json({ success: result.success });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/leads/:id/generate-proposal ────────────────────────────────────
exports.generateProposal = async (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        const proposal = await generateProposal(lead);
        leads.update(lead.id, { proposalStatus: 'Drafted', proposalContent: proposal });
        interactions.create({ leadId: lead.id, type: 'note', content: 'AI Proposal Draft generated.' });

        res.json({ success: true, proposal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/leads/:id/send-proposal ────────────────────────────────────────
exports.sendProposal = async (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });
        if (!lead.email) return res.status(400).json({ error: 'Lead has no email address.' });
        if (!lead.proposalContent) return res.status(400).json({ error: 'Generate a proposal first.' });

        const result = await sendEmail({
            to: lead.email,
            subject: `Your Custom Proposal from Ushnik Technologies`,
            text: lead.proposalContent,
            html: proposalEmailHtml(lead, lead.proposalContent),
        });

        if (result.success) {
            leads.update(lead.id, { proposalStatus: 'Sent' });
            interactions.create({ leadId: lead.id, type: 'proposal_sent', content: `Proposal emailed to ${lead.email}.` });
        }

        res.json({ success: result.success, messageId: result.messageId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/leads/:id/schedule-meeting ─────────────────────────────────────
exports.scheduleMeeting = async (req, res) => {
    try {
        const { meetingLink } = req.body;
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        const calendlyUrl = process.env.CALENDLY_URL || 'https://calendly.com/your-calendly-username';
        const link = meetingLink || `${calendlyUrl}?name=${encodeURIComponent(lead.name || '')}&email=${encodeURIComponent(lead.email || '')}`;
        leads.update(lead.id, { meetingLink: link, status: 'Engaged' });
        interactions.create({ leadId: lead.id, type: 'meeting_scheduled', content: `Meeting link set: ${link}` });

        // Optionally email the meeting link
        if (lead.email) {
            await sendEmail({
                to: lead.email,
                subject: `Schedule your discovery call with Ushnik Technologies`,
                text: `Hi ${lead.name || 'there'}, please use this link to book a call: ${link}`,
                html: `<p>Hi ${lead.name || 'there'},</p><p>Please use the link below to schedule your discovery call:</p><p><a href="${link}" style="background:#6366f1;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none">Book Your Call →</a></p>`,
            });
        }

        res.json({ success: true, meetingLink: link });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── NEW: Site Visit Scheduling Agent ─────────────────────────────────────────

// POST /api/leads/:id/schedule-site-visit
exports.scheduleSiteVisit = async (req, res) => {
    try {
        const { date, time, location } = req.body;
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        // Mock: Auto-assigns nearest sales rep based on lead location.
        const nearestRep = lead.location && lead.location.toLowerCase().includes('south') ? "Rep B (South Zone)" : "Rep A (Central Zone)";

        const visitDetails = { date, time, location: location || 'Client Office', rep: nearestRep };
        
        leads.update(lead.id, { siteVisit: visitDetails, status: 'Site Visit Scheduled' });
        interactions.create({ leadId: lead.id, type: 'site_visit_scheduled', content: `Site visit synced. Rep: ${nearestRep}, Time: ${date} ${time}` });

        // Email calendar invite mock
        if (lead.email) {
            await sendEmail({
                to: lead.email,
                subject: `Site Visit Scheduled with Ushnik Technologies`,
                text: `Hi ${lead.name}, your site visit is scheduled on ${date} at ${time}. Rep ${nearestRep} will meet you at ${visitDetails.location}.`,
                html: `<p>Hi ${lead.name},</p><p>Your site visit is confirmed! Our representative <b>${nearestRep}</b> will arrive at ${visitDetails.location} on <b>${date}</b> at <b>${time}</b>.</p>`,
            });
        }

        res.json({ success: true, visit: visitDetails });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/leads/:id/remind-site-visit
exports.sendSiteVisitReminder = async (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead || !lead.siteVisit) return res.status(404).json({ error: 'Lead or site visit not found.' });

        if (lead.email) {
            await sendEmail({
                to: lead.email,
                subject: `Reminder: Upcoming Site Visit`,
                text: `Hi ${lead.name}, reminding you of our visit on ${lead.siteVisit.date} at ${lead.siteVisit.time}.`,
                html: `<p>Hi ${lead.name},</p><p>This is a gentle reminder of our site visit scheduled for <b>${lead.siteVisit.date}</b> at <b>${lead.siteVisit.time}</b>.</p>`,
            });
        }

        interactions.create({ leadId: lead.id, type: 'reminder_sent', content: `Site visit reminder sent for ${lead.siteVisit.date}` });
        res.json({ success: true, message: 'Reminder sent.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/leads/:id/reschedule-site-visit
exports.rescheduleSiteVisit = async (req, res) => {
    try {
        const { date, time } = req.body;
        const lead = leads.findById(req.params.id);
        if (!lead || !lead.siteVisit) return res.status(404).json({ error: 'Lead or active site visit not found.' });

        const oldDate = `${lead.siteVisit.date} ${lead.siteVisit.time}`;
        const visitDetails = { ...lead.siteVisit, date, time };
        
        leads.update(lead.id, { siteVisit: visitDetails });
        interactions.create({ leadId: lead.id, type: 'site_visit_rescheduled', content: `Rescheduled from ${oldDate} to ${date} ${time}` });

        if (lead.email) {
            await sendEmail({
                to: lead.email,
                subject: `Update: Site Visit Rescheduled`,
                text: `Your visit is rescheduled to ${date} at ${time}.`,
                html: `<p>Hi ${lead.name},</p><p>Your site visit has been <b>rescheduled</b> to <b>${date}</b> at <b>${time}</b>.</p>`,
            });
        }

        res.json({ success: true, visit: visitDetails });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/leads/:id/generate-documents
exports.generateSiteVisitDocuments = async (req, res) => {
    try {
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        const agreement = await generateSaleAgreement(lead);
        const bookingForm = await generateBookingForm(lead);

        leads.update(lead.id, { generatedDocuments: { agreement, bookingForm } });
        interactions.create({ leadId: lead.id, type: 'documents_generated', content: 'Sale Agreement and Booking Form generated.' });

        res.json({ success: true, documents: { agreement, bookingForm } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/leads/:id/verify-kyc
exports.verifyKYC = async (req, res) => {
    try {
        const { documentsText } = req.body;
        const lead = leads.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        const result = await verifyKYCDocuments(lead, documentsText || '');
        
        leads.update(lead.id, { kycStatus: result });
        interactions.create({ 
            leadId: lead.id, 
            type: result.verified ? 'kyc_verified' : 'kyc_failed', 
            content: result.verified ? 'KYC successfully verified.' : `KYC Missing Items: ${result.missingItems.join(', ')}`
        });

        res.json({ success: true, kyc: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
