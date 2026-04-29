/**
 * Follow-Up Scheduler
 * Automatically sends follow-up messages on Day 1, 3, 5, 7 cadence.
 */
const { leads, interactions } = require('../db');
const { sendEmail, followUpEmailHtml } = require('./emailService');

const FOLLOW_UP_DAYS = [1, 3, 5, 7];

function getFollowUpMessage(lead, day) {
    const name = lead.name || 'there';
    const req = lead.requirement || 'IT solutions';
    const msgs = {
        1: `Just checking in to ensure you received our initial response regarding your ${req} enquiry. Our team is ready to assist — is there a convenient time to connect?`,
        3: `We wanted to share some insights that may be relevant to your ${req} needs. Ushnik Technologies has recently delivered similar projects with measurable ROI. Would you like us to share a case study?`,
        5: `We're very interested in your ${req} requirements. A quick 15-minute discovery call could save weeks of back-and-forth. Would you be open to one this week?`,
        7: `This will be our last follow-up for now — we don't want to crowd your inbox! If your ${req} requirements are still active, we'd love to reconnect. Otherwise, feel free to reach out whenever you're ready.`,
    };
    return msgs[day] || `Following up on your ${req} enquiry with Ushnik Technologies.`;
}

async function runFollowUpCheck() {
    const now = new Date();
    console.log(`[FollowUp] Running check at ${now.toISOString()}`);

    const allLeads = leads.findAll();
    const due = allLeads.filter(lead => {
        if (['Converted', 'Closed'].includes(lead.status)) return false;
        if (lead.followUpStage >= FOLLOW_UP_DAYS.length) return false;
        if (!lead.nextActionDate) return false;
        return new Date(lead.nextActionDate) <= now;
    });

    console.log(`[FollowUp] ${due.length} lead(s) due for follow-up.`);

    for (const lead of due) {
        const stageIdx = lead.followUpStage; // index into FOLLOW_UP_DAYS
        const day = FOLLOW_UP_DAYS[stageIdx];
        const message = getFollowUpMessage(lead, day);

        if (lead.email) {
            await sendEmail({
                to: lead.email,
                subject: `Follow-up: Your ${lead.requirement || 'enquiry'} with Ushnik Technologies`,
                text: message,
                html: followUpEmailHtml(lead, day, message),
            });
        }

        // Advance to next stage
        const nextStageIdx = stageIdx + 1;
        const nextDay = FOLLOW_UP_DAYS[nextStageIdx];
        let nextActionDate = null;
        if (nextDay) {
            const d = new Date();
            d.setDate(d.getDate() + (nextDay - day));
            nextActionDate = d.toISOString();
        }

        leads.update(lead.id, {
            followUpStage: nextStageIdx,
            status: 'Engaged',
            nextActionDate,
        });

        interactions.create({
            leadId: lead.id,
            type: 'follow_up',
            content: `Day ${day} automated follow-up sent via email.`,
        });

        console.log(`[FollowUp] Lead ${lead.id} → Day ${day} sent. Next: ${nextDay ? 'Day ' + nextDay : 'None'}`);
    }
}

function startFollowUpScheduler() {
    const intervalMs = process.env.NODE_ENV === 'production' ? 10 * 60 * 1000 : 60 * 1000;
    console.log(`[FollowUp Scheduler] Started. Interval: ${intervalMs / 1000}s`);
    setInterval(runFollowUpCheck, intervalMs);
}

module.exports = { startFollowUpScheduler, runFollowUpCheck };
