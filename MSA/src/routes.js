const express = require('express');
const router = express.Router();
const leadController = require('./controllers/leadController');
const actionController = require('./controllers/actionController');
const chatController = require('./controllers/chatController');

// ── Lead Routes ───────────────────────────────────────────────────────────────
router.post('/leads/capture', leadController.captureLead);
router.post('/leads/upload-excel', leadController.uploadExcelMiddleware, leadController.uploadExcel);
router.get('/leads', leadController.getAllLeads);
router.get('/leads/:id', leadController.getLeadById);
router.patch('/leads/:id', leadController.updateLead);
router.post('/leads/:id/interaction', leadController.addInteraction);

// ── AI Action Routes ──────────────────────────────────────────────────────────
router.post('/leads/:id/generate-response', actionController.generateAutoResponse);
router.post('/leads/:id/send-response', actionController.sendResponse);
router.post('/leads/:id/generate-proposal', actionController.generateProposal);
router.post('/leads/:id/send-proposal', actionController.sendProposal);
router.post('/leads/:id/schedule-meeting', actionController.scheduleMeeting);

// ── Site Visit Agent Routes ───────────────────────────────────────────────────
router.post('/leads/:id/schedule-site-visit', actionController.scheduleSiteVisit);
router.post('/leads/:id/remind-site-visit', actionController.sendSiteVisitReminder);
router.post('/leads/:id/reschedule-site-visit', actionController.rescheduleSiteVisit);
router.post('/leads/:id/generate-documents', actionController.generateSiteVisitDocuments);
router.post('/leads/:id/verify-kyc', actionController.verifyKYC);

// ── Multi-Agent Chat Routes ───────────────────────────────────────────────────
router.post('/chat', chatController.chat);
router.get('/chat/sessions', chatController.getSessions);
router.get('/chat/session/:sessionId', chatController.getSession);
router.delete('/chat/session/:sessionId', chatController.resetSession);

// ── WhatsApp Webhook ──────────────────────────────────────────────────────────
router.get('/whatsapp/webhook', chatController.whatsappWebhook);
router.post('/whatsapp/webhook', chatController.whatsappWebhook);

// ── Booking Page API ──────────────────────────────────────────────────────────
router.get('/book/:leadId', chatController.getBookingInfo);
router.post('/book/:leadId', chatController.bookMeeting);

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', leadController.getStats);

module.exports = router;
