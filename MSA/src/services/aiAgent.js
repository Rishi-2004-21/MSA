const { OpenAI } = require('openai');
require('dotenv').config();

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.warn('⚠️  OPENAI_API_KEY not set. Using mock qualification mode.');
}

// ── Qualification Agent ───────────────────────────────────────────────────────
async function qualifyLead(rawData) {
    if (!openai) return mockQualify(rawData);

    const systemPrompt = `
You are an AI Lead Management Agent for Ushnik Technologies Pvt. Ltd.
Ushnik Technologies specialises in: AI/ML Solutions, Cybersecurity, Data Center Services, IT Staffing.

Analyse the lead data and return ONLY a valid JSON object with these exact keys:
{
  "name": string,
  "email": string,
  "phone": string,
  "company": string,
  "requirement": "AI/ML" | "Cybersecurity" | "Data Center" | "Staffing" | "Other",
  "budget": string | null,
  "timeline": string | null,
  "location": string | null,
  "qualification": "Hot" | "Warm" | "Cold",
  "score": integer 0-100,
  "summary": string (max 25 words, for sales team)
}

Scoring rules:
- Clear requirement mentioned → +30
- Phone number present → +20
- Urgent keywords (ASAP, urgent, immediate) → +30
- Business/enterprise intent → +20
Hot ≥ 75, Warm 40-74, Cold < 40.
`;

    const userPrompt = `Lead Data: ${JSON.stringify(rawData)}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 400,
        });
        const result = JSON.parse(response.choices[0].message.content);
        console.log(`[AI] Qualified: ${result.qualification} (score: ${result.score}) — ${result.requirement}`);
        return result;
    } catch (err) {
        console.error('[AI Qualification] Error:', err.message);
        return mockQualify(rawData);
    }
}

// ── Auto-Response Agent ───────────────────────────────────────────────────────
async function generateAutoResponse(lead) {
    if (!openai) {
        return `Hi ${lead.name || 'there'}, thank you for reaching out to Ushnik Technologies! Our team will contact you within 2 hours. Feel free to reply with any questions.`;
    }

    const systemPrompt = `
You are a professional sales representative at Ushnik Technologies Pvt. Ltd.
Write a short, warm, professional auto-response email body for a new lead.
Rules:
- Greet by name
- Acknowledge their specific requirement
- Mention response within 2 hours
- 3-5 sentences max
- Sound human, not robotic
- End with a clear CTA (book a call / reply to email)
Return ONLY the message body text. No subject line.
`;

    const userPrompt = `Lead: ${JSON.stringify({ name: lead.name, requirement: lead.requirement, qualification: lead.qualification, budget: lead.budget, timeline: lead.timeline })}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.7,
            max_tokens: 200,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error('[Auto-Response] Error:', err.message);
        return `Hi ${lead.name || 'there'}, thank you for reaching out to Ushnik Technologies! We'll be in touch shortly.`;
    }
}

// ── Proposal Agent ────────────────────────────────────────────────────────────
async function generateProposal(lead) {
    if (!openai) {
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const budget = lead.budget ? `Budget Range: **${lead.budget}**\n` : '';
        const timeline = lead.timeline ? `Timeline: **${lead.timeline}**\n` : '';
        return `# Proposal for ${lead.name || 'Valued Client'}
**Prepared by:** Ushnik Technologies Pvt. Ltd.
**Date:** ${today}
**Client:** ${lead.name || 'N/A'} | ${lead.company || 'N/A'}
**Contact:** ${lead.email || ''} | ${lead.phone || ''}

---

## Executive Summary
We are pleased to present this proposal for **${lead.name || 'your organisation'}** regarding **${lead.requirement || 'your requirements'}**. Ushnik Technologies brings deep expertise across AI/ML, Cybersecurity, Data Center, and IT Staffing, with a track record of delivering measurable outcomes.

## Understanding of Requirements
Based on your enquiry, you are looking for **${lead.requirement || 'technology solutions'}** services.
${budget}${timeline}${lead.summary ? `\n> ${lead.summary}` : ''}

## Proposed Solution
${lead.requirement === 'AI/ML' ? `- Custom AI model development & deployment\n- LLM integration and fine-tuning\n- MLOps pipelines & monitoring\n- Chatbot & automation solutions` :
  lead.requirement === 'Cybersecurity' ? `- Security audit & penetration testing\n- SOC setup & managed security (MSSP)\n- Zero Trust architecture\n- Incident response & threat intelligence` :
  lead.requirement === 'Data Center' ? `- Private / hybrid cloud infrastructure\n- Colocation & managed hosting\n- Disaster recovery solutions\n- 24/7 network monitoring & SLA` :
  lead.requirement === 'Staffing' ? `- Dedicated developer teams\n- Contract-to-hire specialists\n- Offshore development centre (ODC)\n- IT talent sourcing & RPO` :
  `- End-to-end digital transformation consulting\n- Technology stack assessment\n- Custom solution design\n- Implementation & support`}

## Estimated Timeline
| Phase         | Duration      |
|---------------|---------------|
| Discovery     | Week 1        |
| Design        | Weeks 2–3     |
| Development   | Weeks 4–8     |
| Delivery      | Week 9        |

## Investment Overview
Customised pricing based on scope. Contact our team for a detailed quotation.

## Next Steps
1. ✅ Discovery call to finalise requirements
2. 📋 Detailed SOW & pricing
3. 🚀 Project kickoff

**Ready to move forward? Book your discovery call now.**`;
    }

    const systemPrompt = `
You are a senior solutions architect at Ushnik Technologies Pvt. Ltd.
Draft a professional proposal for the following lead.
Structure (Markdown format):
1. Executive Summary
2. Understanding of Requirements
3. Proposed Solution (bullet points)
4. Estimated Timeline
5. Investment Overview
6. Next Steps
Be specific to Ushnik's services: AI/ML, Cybersecurity, Data Center, IT Staffing.
Max 350 words. Clean Markdown.
`;

    const userPrompt = `Lead: ${JSON.stringify({ name: lead.name, company: lead.company, requirement: lead.requirement, budget: lead.budget, timeline: lead.timeline, summary: lead.summary })}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.5,
            max_tokens: 600,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error('[Proposal Agent] Error:', err.message);
        return `# Proposal Draft\n\nFailed to generate. Please draft manually.`;
    }
}

// ── Mock Fallback ─────────────────────────────────────────────────────────────
function mockQualify(rawData) {
    const msg = (rawData.message || rawData.requirement || rawData.inquiry || '').toLowerCase();
    const hasBudget = /\d+k|\d+ lakh|budget|₹|\$/i.test(msg);
    const hasUrgency = /urgent|asap|immediately|this week|this month|priority/i.test(msg);
    const hasPhone = !!(rawData.phone && rawData.phone.trim().length > 5);
    const hasClearReq = msg.length > 20;

    let score = 0;
    if (hasClearReq) score += 30;
    if (hasPhone) score += 20;
    if (hasUrgency) score += 30;
    if (hasBudget) score += 20;

    let qualification = 'Cold';
    if (score >= 75) qualification = 'Hot';
    else if (score >= 40) qualification = 'Warm';

    // Detect service type
    let requirement = 'Other';
    if (/ai|ml|machine learning|artificial intelligence|automation|chatbot|nlp/i.test(msg)) requirement = 'AI/ML';
    else if (/cyber|security|firewall|penetration|soc|siem|threat/i.test(msg)) requirement = 'Cybersecurity';
    else if (/data center|datacenter|server|cloud|infra|colocation|hosting/i.test(msg)) requirement = 'Data Center';
    else if (/staff|hire|recruit|talent|resource|developer|engineer/i.test(msg)) requirement = 'Staffing';

    return {
        name: rawData.name || '',
        email: rawData.email || '',
        phone: rawData.phone || '',
        company: rawData.company || '',
        requirement,
        budget: hasBudget ? 'Mentioned' : null,
        timeline: hasUrgency ? 'Urgent' : null,
        location: rawData.location || null,
        qualification,
        score,
        summary: 'Lead requires manual review — AI mock mode active.',
    };
}

// ── Site Visit Agent (Agreements & KYC) ──────────────────────────────────────
async function generateSaleAgreement(lead) {
    if (!openai) {
        return `# Sale Agreement\n\n**Client Name:** ${lead.name || 'Client'}\n**Company:** ${lead.company || 'Company'}\n**Scope:** ${lead.requirement}\n\n*This is a mock sale agreement generated by the Site Visit Agent.*`;
    }
    
    const systemPrompt = `You are a legal AI assistant. Draft a short, professional sale agreement for Ushnik Technologies and the given client based on their requirements.`;
    const userPrompt = `Client: ${lead.name}\nRequirement: ${lead.requirement}\nLocation: ${lead.location}`;
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.3,
            max_tokens: 400,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        return `# Sale Agreement\n\nFailed to generate agreement.`;
    }
}

async function generateBookingForm(lead) {
    if (!openai) {
        return `# Site Visit Booking Form\n\n**Client Name:** ${lead.name || 'Client'}\n**Company:** ${lead.company || 'Company'}\n**Phone:** ${lead.phone}\n**Status:** Confirmed`;
    }
    
    const systemPrompt = `You are an AI assistant. Generate a standard site visit booking form with client details filled in.`;
    const userPrompt = `Client: ${lead.name}, Phone: ${lead.phone}, Company: ${lead.company}`;
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: 0.3,
            max_tokens: 300,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        return `# Booking Form\n\nFailed to generate form.`;
    }
}

async function verifyKYCDocuments(lead, documentsText) {
    if (!openai) {
        let missing = [];
        if (!documentsText.toLowerCase().includes('id') && !documentsText.toLowerCase().includes('passport')) missing.push('Photo ID');
        if (!documentsText.toLowerCase().includes('address') && !documentsText.toLowerCase().includes('utility')) missing.push('Proof of Address');
        
        return {
            verified: missing.length === 0,
            missingItems: missing,
            notes: missing.length === 0 ? 'All standard KYC documents present.' : 'Some documents are missing.'
        };
    }
    
    const systemPrompt = `
You are a KYC Compliance Agent.
Review the list/text of provided documents from the client.
You need to verify if the client provided: 1) Photo ID (Passport/Driving License/National ID), and 2) Proof of Address (Utility bill, Bank statement).
Return a JSON object:
{
    "verified": boolean,
    "missingItems": [array of string describing what is missing],
    "notes": "string explanation"
}
`;
    const userPrompt = `Documents provided by ${lead.name}:\n${documentsText}`;
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 200,
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        return { verified: false, missingItems: ['System Error - Could not verify'], notes: err.message };
    }
}

module.exports = { 
    qualifyLead, 
    generateAutoResponse, 
    generateProposal,
    generateSaleAgreement,
    generateBookingForm,
    verifyKYCDocuments
};
