const BASE = 'http://localhost:5000/api';

async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    // Leads
    getLeads: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return req('GET', `/leads${q ? '?' + q : ''}`);
    },
    getLead: (id) => req('GET', `/leads/${id}`),
    captureLead: (data) => req('POST', '/leads/capture', data),
    updateLead: (id, data) => req('PATCH', `/leads/${id}`, data),
    addInteraction: (id, type, content) => req('POST', `/leads/${id}/interaction`, { type, content }),

    // Excel upload
    uploadExcel: async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(BASE + '/leads/upload-excel', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    },

    // AI Actions
    generateResponse: (id) => req('POST', `/leads/${id}/generate-response`),
    sendResponse: (id, message) => req('POST', `/leads/${id}/send-response`, { message }),
    generateProposal: (id) => req('POST', `/leads/${id}/generate-proposal`),
    sendProposal: (id) => req('POST', `/leads/${id}/send-proposal`),
    scheduleMeeting: (id, meetingLink) => req('POST', `/leads/${id}/schedule-meeting`, { meetingLink }),

    // Site Visit Agent Actions
    scheduleSiteVisit: (id, data) => req('POST', `/leads/${id}/schedule-site-visit`, data),
    remindSiteVisit: (id) => req('POST', `/leads/${id}/remind-site-visit`),
    rescheduleSiteVisit: (id, data) => req('POST', `/leads/${id}/reschedule-site-visit`, data),
    generateSiteVisitDocuments: (id) => req('POST', `/leads/${id}/generate-documents`),
    verifyKYC: (id, documentsText) => req('POST', `/leads/${id}/verify-kyc`, { documentsText }),

    // Stats
    getStats: () => req('GET', '/stats'),

    // Chat / Multi-Agent
    chat: (sessionId, message, source = 'web') => req('POST', '/chat', { sessionId, message, source }),
    getChatSession: (sessionId) => req('GET', `/chat/session/${sessionId}`),
    resetChatSession: (sessionId) => req('DELETE', `/chat/session/${sessionId}`),

    // Meeting Booking
    getBookingInfo: (leadId) => req('GET', `/book/${leadId}`),
    bookMeeting: (leadId, date, time) => req('POST', `/book/${leadId}`, { date, time }),
};
