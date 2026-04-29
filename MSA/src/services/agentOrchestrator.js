/**
 * Multi-Agent Orchestrator
 * 7-Agent Pipeline: Lead → Qualification → Sales Bot → Recommendation → Site Visit → CRM → Closure → Post-Sales
 * Works via chat messages, WhatsApp webhooks, and API calls — NO n8n required.
 */
const { leads, interactions } = require('../db');
const { qualifyLead, generateAutoResponse, generateProposal, generateSaleAgreement, generateBookingForm, verifyKYCDocuments } = require('./aiAgent');
const { sendEmail, welcomeEmailHtml, ownerNotificationHtml } = require('./emailService');

// ── Agent Definitions ────────────────────────────────────────────────────────
const AGENTS = {
    LEAD:           { id: 1, name: 'Lead Capture Agent',      emoji: '📥', color: '#6366f1' },
    QUALIFICATION:  { id: 2, name: 'Qualification Agent',     emoji: '🧠', color: '#8b5cf6' },
    SALES_BOT:      { id: 3, name: 'Sales Bot',               emoji: '💬', color: '#06b6d4' },
    RECOMMENDATION: { id: 4, name: 'Recommendation Agent',    emoji: '🎯', color: '#f59e0b' },
    SITE_VISIT:     { id: 5, name: 'Site Visit Agent',        emoji: '🏢', color: '#10b981' },
    CRM:            { id: 6, name: 'CRM Agent',               emoji: '🗂️', color: '#ec4899' },
    POST_SALES:     { id: 7, name: 'Post-Sales Agent',        emoji: '🌟', color: '#14b8a6' },
};

// ── Conversation State Store (in-memory for demo, extend with DB for prod) ───
const conversations = new Map(); // sessionId → { leadId, stage, history, context }

function getOrCreateSession(sessionId) {
    if (!conversations.has(sessionId)) {
        conversations.set(sessionId, {
            leadId: null,
            stage: 'capture',   // capture → qualify → sales → recommend → sitevisit → crm → postsales
            history: [],
            context: {},
            lastActivity: new Date(),
        });
    }
    const s = conversations.get(sessionId);
    s.lastActivity = new Date();
    return s;
}

function addToHistory(session, role, content, agentName = null) {
    session.history.push({ role, content, agentName, ts: new Date().toISOString() });
}

// ── Intent Classification (rules-based, no AI required) ─────────────────────
function classifyIntent(text) {
    const t = text.toLowerCase();
    if (/hi|hello|hey|start|begin|namaste/i.test(t))     return 'greeting';
    if (/book|schedule|meeting|call|appointment|visit/i.test(t)) return 'book_meeting';
    if (/proposal|quote|pricing|cost|rate/i.test(t))     return 'proposal';
    if (/document|kyc|verify|id|passport|address proof/i.test(t)) return 'kyc';
    if (/status|update|progress|stage/i.test(t))         return 'status';
    if (/recommend|suggest|solution|what.*offer/i.test(t)) return 'recommend';
    if (/urgent|asap|immediately|priority/i.test(t))     return 'urgent';
    if (/whatsapp|wa|msg/i.test(t))                      return 'channel_whatsapp';
    if (/thank|thanks|bye|done|close|finish/i.test(t))   return 'close';
    return 'general';
}

// ── Agent 1: Lead Capture ────────────────────────────────────────────────────
async function agentLeadCapture(session, userMsg) {
    const ctx = session.context;
    const responses = [];
    responses.push({ agent: AGENTS.LEAD, text: `👋 Welcome to **Ushnik Technologies**! I'm your AI assistant.\n\nI'll need a few details to get started. What's your **name**?` });

    // Collect fields step by step
    if (!ctx.name) {
        if (userMsg && userMsg.length > 1 && !/hi|hello|hey/i.test(userMsg)) {
            ctx.name = userMsg.trim();
            responses.push({ agent: AGENTS.LEAD, text: `Great, **${ctx.name}**! What's your **email address**?` });
        }
    } else if (!ctx.email) {
        if (/\S+@\S+\.\S+/.test(userMsg)) {
            ctx.email = userMsg.trim();
            responses.push({ agent: AGENTS.LEAD, text: `Got it! What's your **phone number**?` });
        } else {
            responses.push({ agent: AGENTS.LEAD, text: `Please enter a valid email (e.g. name@company.com).` });
        }
    } else if (!ctx.phone) {
        if (userMsg.replace(/\D/g, '').length >= 10) {
            ctx.phone = userMsg.replace(/\D/g, '');
            responses.push({ agent: AGENTS.LEAD, text: `Perfect! What **company** are you from?` });
        } else {
            responses.push({ agent: AGENTS.LEAD, text: `Please enter a valid phone number.` });
        }
    } else if (!ctx.company) {
        ctx.company = userMsg.trim();
        responses.push({ agent: AGENTS.LEAD, text: `And what **service** are you interested in?\n\n1️⃣ AI/ML Solutions\n2️⃣ Cybersecurity\n3️⃣ Data Center\n4️⃣ IT Staffing\n5️⃣ Other` });
    } else if (!ctx.requirement) {
        const reqMap = { '1': 'AI/ML', '2': 'Cybersecurity', '3': 'Data Center', '4': 'Staffing', '5': 'Other' };
        const t = userMsg.toLowerCase();
        ctx.requirement = reqMap[userMsg.trim()] ||
            (t.includes('ai') || t.includes('ml') ? 'AI/ML' :
             t.includes('cyber') ? 'Cybersecurity' :
             t.includes('data') ? 'Data Center' :
             t.includes('staff') || t.includes('hire') ? 'Staffing' : 'Other');
        responses.push({ agent: AGENTS.LEAD, text: `Brief description of your requirement (or press Enter to skip):` });
    } else if (!ctx.message) {
        ctx.message = userMsg.trim() || ctx.requirement;
        // All data collected — move to qualification
        session.stage = 'qualify';
        responses.push({ agent: AGENTS.LEAD, text: `✅ Lead captured! Handing over to our **Qualification Agent**...` });
    }
    return responses;
}

// ── Agent 2: Qualification Agent ─────────────────────────────────────────────
async function agentQualification(session) {
    const ctx = session.context;
    const rawData = {
        name: ctx.name, email: ctx.email, phone: ctx.phone,
        company: ctx.company, requirement: ctx.requirement, message: ctx.message,
        source: ctx.source || 'chat',
    };

    const qualified = await qualifyLead(rawData);

    // Create or update lead in DB
    const existing = leads.findByEmailOrPhone(ctx.email, ctx.phone);
    let lead;
    if (existing) {
        lead = existing;
        interactions.create({ leadId: lead.id, type: 'note', content: `Re-engaged via chat (${ctx.source || 'web'}).` });
    } else {
        lead = leads.create({
            ...qualified,
            name: ctx.name, email: ctx.email, phone: ctx.phone,
            company: ctx.company, requirement: qualified.requirement || ctx.requirement,
            source: ctx.source || 'chat', channel: ctx.channel || 'web',
            status: 'Captured', followUpStage: 0,
        });
        // Send welcome email
        if (lead.email) {
            sendEmail({
                to: lead.email,
                subject: `Welcome to Ushnik Technologies!`,
                text: `Hi ${lead.name}, thank you for reaching out.`,
                html: welcomeEmailHtml(lead, `Thank you for your interest in our ${lead.requirement} services. Our team will reach out within 2 hours.`),
            }).catch(console.error);
        }
        // Owner alert
        const ownerEmail = process.env.OWNER_EMAIL;
        if (ownerEmail) {
            sendEmail({
                to: ownerEmail,
                subject: `🔥 New Lead: ${lead.name} [${lead.qualification}]`,
                html: ownerNotificationHtml(lead),
            }).catch(console.error);
        }
    }

    session.leadId = lead.id;
    session.context.leadId = lead.id;
    session.stage = 'sales';

    const scoreBar = '█'.repeat(Math.floor(qualified.score / 10)) + '░'.repeat(10 - Math.floor(qualified.score / 10));
    return [{
        agent: AGENTS.QUALIFICATION,
        text: `🧠 **Lead Qualified!**\n\n` +
              `**Score:** ${scoreBar} ${qualified.score}/100\n` +
              `**Status:** ${qualified.qualification === 'Hot' ? '🔥 Hot' : qualified.qualification === 'Warm' ? '☀️ Warm' : '❄️ Cold'}\n` +
              `**Requirement:** ${qualified.requirement}\n` +
              `**AI Summary:** ${qualified.summary}\n\n` +
              `Routing to **Sales Bot** →`
    }];
}

// ── Agent 3: Sales Bot ────────────────────────────────────────────────────────
async function agentSalesBot(session, userMsg) {
    const lead = session.leadId ? leads.findById(session.leadId) : null;
    const intent = classifyIntent(userMsg);
    const responses = [];

    if (intent === 'book_meeting' || intent === 'schedule') {
        session.stage = 'sitevisit';
        responses.push({
            agent: AGENTS.SALES_BOT,
            text: `📅 I'll connect you with our **Site Visit Agent** to schedule a call!\n\nWhat date works for you? (e.g. "Tomorrow", "Monday", or a specific date)`,
            action: 'schedule_meeting',
        });
    } else if (intent === 'proposal') {
        session.stage = 'recommend';
        responses.push({
            agent: AGENTS.SALES_BOT,
            text: `📄 Let me generate a **personalised proposal** for you based on your ${lead?.requirement || 'requirement'}.\n\n_Our Recommendation Agent is working on it..._`,
            action: 'generate_proposal',
            leadId: session.leadId,
        });
    } else if (intent === 'urgent') {
        responses.push({
            agent: AGENTS.SALES_BOT,
            text: `🚨 Understood — this is **urgent**! I'm flagging your lead as HOT priority.\n\nA senior account manager will call you at **${lead?.phone || 'your number'}** within **30 minutes**.\n\nAlternatively, book a call now:`,
            action: 'urgent_escalation',
            leadId: session.leadId,
        });
        if (session.leadId) leads.update(session.leadId, { qualification: 'Hot', score: 90, status: 'Engaged' });
    } else {
        const autoReply = await generateAutoResponse(lead || { name: session.context.name, requirement: session.context.requirement, qualification: 'Warm' });
        responses.push({ agent: AGENTS.SALES_BOT, text: autoReply });
        // Suggest next steps
        responses.push({
            agent: AGENTS.SALES_BOT,
            text: `**What would you like to do next?**\n\n📅 Book a meeting\n📄 Get a proposal\n🎯 See recommendations\n🏢 Schedule a site visit`,
        });
    }

    interactions.create({ leadId: session.leadId, type: 'note', content: `[Chat] User: ${userMsg}` });
    return responses;
}

// ── Agent 4: Recommendation Agent ─────────────────────────────────────────────
async function agentRecommendation(session) {
    const lead = session.leadId ? leads.findById(session.leadId) : null;
    if (!lead) return [{ agent: AGENTS.RECOMMENDATION, text: `Please complete your lead info first.` }];

    // Generate proposal
    const proposal = await generateProposal(lead);
    leads.update(lead.id, { proposalStatus: 'Drafted', proposalContent: proposal });
    interactions.create({ leadId: lead.id, type: 'note', content: 'Recommendation proposal generated via chat.' });
    session.stage = 'sales';

    return [{
        agent: AGENTS.RECOMMENDATION,
        text: `🎯 **Personalised Recommendation for ${lead.name}:**\n\n${proposal}\n\n---\n_Would you like to book a site visit or send this proposal to your email?_`,
        action: 'view_proposal',
        leadId: lead.id,
    }];
}

// ── Agent 5: Site Visit Agent ─────────────────────────────────────────────────
async function agentSiteVisit(session, userMsg) {
    const lead = session.leadId ? leads.findById(session.leadId) : null;
    const ctx = session.context;
    const responses = [];

    if (!ctx.visitDate) {
        ctx.visitDate = userMsg.trim();
        responses.push({ agent: AGENTS.SITE_VISIT, text: `Great! What **time** works for you? (e.g. "10:00 AM", "2:30 PM")` });
    } else if (!ctx.visitTime) {
        ctx.visitTime = userMsg.trim();
        // Auto-assign rep
        const rep = lead?.location?.toLowerCase().includes('south') ? 'Priya S. (South Zone)' : 'Raj K. (Central Zone)';
        ctx.visitRep = rep;

        const visitDetails = { date: ctx.visitDate, time: ctx.visitTime, location: lead?.location || 'Client Office', rep };
        if (session.leadId) {
            leads.update(session.leadId, { siteVisit: visitDetails, status: 'Site Visit Scheduled' });
            interactions.create({ leadId: session.leadId, type: 'site_visit_scheduled', content: `Site visit scheduled: ${ctx.visitDate} at ${ctx.visitTime} — ${rep}` });

            // Send confirmation email
            if (lead?.email) {
                const { meetingBookedEmailHtml } = require('./emailService');
                sendEmail({
                    to: lead.email,
                    subject: `✅ Site Visit Confirmed — ${ctx.visitDate} at ${ctx.visitTime}`,
                    html: meetingBookedEmailHtml(lead, visitDetails),
                }).catch(console.error);
            }
        }

        session.stage = 'crm';
        responses.push({
            agent: AGENTS.SITE_VISIT,
            text: `✅ **Site Visit Confirmed!**\n\n📅 **Date:** ${ctx.visitDate}\n⏰ **Time:** ${ctx.visitTime}\n👤 **Sales Rep:** ${rep}\n📍 **Location:** ${visitDetails.location}\n\n📧 A confirmation email has been sent to ${lead?.email || 'your email'}.\n\n_Handing over to **CRM Agent** to manage your records..._`,
            action: 'site_visit_confirmed',
        });
    }
    return responses;
}

// ── Agent 6: CRM Agent ────────────────────────────────────────────────────────
async function agentCRM(session) {
    const lead = session.leadId ? leads.findById(session.leadId) : null;
    if (!lead) return [{ agent: AGENTS.CRM, text: `CRM update: No lead found.` }];

    leads.update(lead.id, { status: 'Engaged', followUpStage: 1 });
    interactions.create({ leadId: lead.id, type: 'note', content: 'CRM Agent: Lead status updated to Engaged after site visit scheduling.' });
    session.stage = 'postsales';

    return [{
        agent: AGENTS.CRM,
        text: `🗂️ **CRM Updated!**\n\n- Status: **Engaged**\n- Follow-up Stage: **Day 1**\n- Next Action: Auto-reminder in 24 hours\n\n_Routing to **Post-Sales Agent** to complete the journey._`,
    }];
}

// ── Agent 7: Post-Sales Agent ─────────────────────────────────────────────────
async function agentPostSales(session) {
    const lead = session.leadId ? leads.findById(session.leadId) : null;
    interactions.create({ leadId: session.leadId, type: 'note', content: 'Post-Sales Agent: Welcome onboarding message sent.' });
    session.stage = 'complete';

    return [{
        agent: AGENTS.POST_SALES,
        text: `🌟 **Welcome to Ushnik Technologies, ${lead?.name || 'valued client'}!**\n\nYou've completed the onboarding pipeline. Here's what happens next:\n\n1. ✅ Discovery call confirmed\n2. 📋 Proposal on record\n3. 📞 Account manager assigned\n4. 🔔 Follow-up reminders set\n\nThank you for choosing us! Is there anything else I can help you with?`,
    }];
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────
async function processMessage(sessionId, userMsg, options = {}) {
    const session = getOrCreateSession(sessionId);
    if (options.source) session.context.source = options.source;
    if (options.channel) session.context.channel = options.channel;
    if (options.phone) session.context.phone = session.context.phone || options.phone;

    addToHistory(session, 'user', userMsg);

    let agentResponses = [];

    try {
        switch (session.stage) {
            case 'capture':
                agentResponses = await agentLeadCapture(session, userMsg);
                // Auto-advance when all fields collected
                if (session.stage === 'qualify') {
                    const qualResponses = await agentQualification(session);
                    agentResponses = [...agentResponses, ...qualResponses];
                    // Auto-advance to sales bot greeting
                    const salesGreeting = [{
                        agent: AGENTS.SALES_BOT,
                        text: `💬 Hi **${session.context.name}**! I'm your dedicated Sales Bot.\n\nHow can I help you today?\n\n📅 Book a meeting\n📄 Get a proposal\n🎯 Recommendations\n🏢 Site visit`,
                    }];
                    agentResponses = [...agentResponses, ...salesGreeting];
                }
                break;

            case 'sales':
                agentResponses = await agentSalesBot(session, userMsg);
                // Check for action triggers
                for (const r of agentResponses) {
                    if (r.action === 'generate_proposal') {
                        const recResponses = await agentRecommendation(session);
                        agentResponses = [...agentResponses, ...recResponses];
                    }
                }
                break;

            case 'sitevisit':
                agentResponses = await agentSiteVisit(session, userMsg);
                if (session.stage === 'crm') {
                    const crmResponses = await agentCRM(session);
                    agentResponses = [...agentResponses, ...crmResponses];
                    if (session.stage === 'postsales') {
                        const psResponses = await agentPostSales(session);
                        agentResponses = [...agentResponses, ...psResponses];
                    }
                }
                break;

            case 'recommend':
                agentResponses = await agentRecommendation(session);
                break;

            case 'complete':
                // Re-engage
                const intent = classifyIntent(userMsg);
                if (intent === 'book_meeting') { session.stage = 'sitevisit'; agentResponses = await agentSiteVisit(session, userMsg); }
                else agentResponses = [{ agent: AGENTS.POST_SALES, text: `I'm here to help! Ask me anything about your service, meetings, proposals, or site visits.` }];
                break;

            default:
                agentResponses = [{ agent: AGENTS.SALES_BOT, text: `I'm here to help with your enquiry. What would you like assistance with?` }];
                session.stage = 'sales';
        }
    } catch (err) {
        console.error('[Orchestrator Error]', err);
        agentResponses = [{ agent: AGENTS.SALES_BOT, text: `⚠️ I encountered an issue. Please try again or WhatsApp us directly.` }];
    }

    // Record in history
    agentResponses.forEach(r => addToHistory(session, 'agent', r.text, r.agent?.name));

    return {
        sessionId,
        stage: session.stage,
        leadId: session.leadId,
        responses: agentResponses,
        history: session.history,
    };
}

// ── Session management ─────────────────────────────────────────────────────────
function getSession(sessionId) {
    return conversations.get(sessionId) || null;
}

function resetSession(sessionId) {
    conversations.delete(sessionId);
}

function getAllSessions() {
    const result = [];
    conversations.forEach((v, k) => result.push({ sessionId: k, stage: v.stage, leadId: v.leadId, msgCount: v.history.length, lastActivity: v.lastActivity }));
    return result;
}

module.exports = { processMessage, getSession, resetSession, getAllSessions, AGENTS };
