/**
 * Lightweight JSON-file based data store.
 * No external DB required — persists data in data/leads.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file, fallback = []) {
    try {
        if (!fs.existsSync(file)) return fallback;
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── LEADS ────────────────────────────────────────────────────────────────────

const leads = {
    findAll(filter = {}) {
        let all = readJSON(LEADS_FILE);
        if (filter.qualification) all = all.filter(l => l.qualification === filter.qualification);
        if (filter.status) all = all.filter(l => l.status === filter.status);
        if (filter.source) all = all.filter(l => l.source === filter.source);
        return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    findById(id) {
        const all = readJSON(LEADS_FILE);
        const lead = all.find(l => l.id === id);
        if (!lead) return null;
        const ints = interactions.findByLeadId(id);
        return { ...lead, interactions: ints };
    },

    findByEmailOrPhone(email, phone) {
        const all = readJSON(LEADS_FILE);
        return all.find(l =>
            (email && l.email && l.email.toLowerCase() === email.toLowerCase()) ||
            (phone && l.phone && l.phone === phone)
        ) || null;
    },

    create(data) {
        const all = readJSON(LEADS_FILE);
        const lead = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: '',
            email: '',
            phone: '',
            company: '',
            source: 'excel',
            channel: 'excel',
            requirement: 'Other',
            budget: null,
            timeline: null,
            location: null,
            qualification: 'Cold',
            score: 0,
            status: 'Captured',
            summary: '',
            assignedTeam: 'Sales',
            nextActionDate: null,
            followUpStage: 0,
            meetingLink: null,
            proposalStatus: 'None',
            proposalContent: null,
            emailSent: false,
            waSent: false,
            rawLeadData: null,
            ...data,
        };
        all.push(lead);
        writeJSON(LEADS_FILE, all);
        return lead;
    },

    update(id, data) {
        const all = readJSON(LEADS_FILE);
        const idx = all.findIndex(l => l.id === id);
        if (idx === -1) return null;
        all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
        writeJSON(LEADS_FILE, all);
        return all[idx];
    },

    stats() {
        const all = readJSON(LEADS_FILE);
        const total = all.length;
        const hot = all.filter(l => l.qualification === 'Hot').length;
        const warm = all.filter(l => l.qualification === 'Warm').length;
        const cold = all.filter(l => l.qualification === 'Cold').length;
        const converted = all.filter(l => l.status === 'Converted').length;
        const bySource = {};
        const byRequirement = {};
        const byTeam = { Sales: 0, Technical: 0, Management: 0 };
        const recentScores = [];

        all.forEach(l => {
            bySource[l.source] = (bySource[l.source] || 0) + 1;
            byRequirement[l.requirement || 'Other'] = (byRequirement[l.requirement || 'Other'] || 0) + 1;
            if (l.assignedTeam) byTeam[l.assignedTeam] = (byTeam[l.assignedTeam] || 0) + 1;
            recentScores.push(l.score || 0);
        });

        const avgScore = recentScores.length ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length) : 0;
        const conversionRate = total ? Math.round((converted / total) * 100) : 0;

        return { total, hot, warm, cold, converted, avgScore, conversionRate, bySource, byRequirement, byTeam };
    }
};

// ── INTERACTIONS ──────────────────────────────────────────────────────────────

const interactions = {
    findByLeadId(leadId) {
        const all = readJSON(INTERACTIONS_FILE);
        return all.filter(i => i.leadId === leadId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    create(data) {
        const all = readJSON(INTERACTIONS_FILE);
        const interaction = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            type: 'note',
            content: '',
            leadId: '',
            ...data,
        };
        all.push(interaction);
        writeJSON(INTERACTIONS_FILE, all);
        return interaction;
    }
};

module.exports = { leads, interactions };
