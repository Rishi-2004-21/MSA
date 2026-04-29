/**
 * Email Service — Nodemailer
 * Uses real SMTP if SMTP_* env vars set, otherwise mock/logs to console.
 */
const nodemailer = require('nodemailer');
const { marked } = require('marked');
require('dotenv').config();

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        console.log(`[Email] SMTP configured: ${process.env.SMTP_HOST}`);
    } else {
        transporter = {
            sendMail: async (opts) => {
                console.log(`[Email Mock] To: ${opts.to} | Subject: ${opts.subject}`);
                return { messageId: 'mock-' + Date.now(), accepted: [opts.to] };
            }
        };
        console.log('[Email] Mock mode active (no SMTP configured).');
    }
    return transporter;
}

async function sendEmail({ to, subject, text, html }) {
    if (!to) return { success: false, reason: 'no_recipient' };
    try {
        const t = await getTransporter();
        const from = `"${process.env.FROM_NAME || 'Ushnik Technologies'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ushnik.tech'}>`;
        const info = await t.sendMail({ from, to, subject, text, html });
        console.log(`[Email] ✅ Sent to ${to} | ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[Email] ❌ Failed to ${to}:`, err.message);
        return { success: false, error: err.message };
    }
}

// ── Email Templates ───────────────────────────────────────────────────────────

function welcomeEmailHtml(lead, message) {
    const qualColor = lead.qualification === 'Hot' ? '#dc2626' : lead.qualification === 'Warm' ? '#d97706' : '#2563eb';
    const qualBg   = lead.qualification === 'Hot' ? '#fef2f2' : lead.qualification === 'Warm' ? '#fffbeb' : '#eff6ff';
    const bookingLink = `${APP_URL}/book/${lead.id}`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:2rem;text-align:center}
  .hdr h1{color:#fff;font-size:1.5rem;margin:0}
  .hdr p{color:rgba(255,255,255,.8);margin:.5rem 0 0;font-size:.9rem}
  .body{padding:2rem}.body p{color:#374151;line-height:1.7;margin:0 0 1rem}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.78rem;font-weight:700;background:${qualBg};color:${qualColor}}
  .cta{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:.75rem 2rem;border-radius:8px;text-decoration:none;font-weight:600}
  .info-box{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:1.5rem;margin:1.5rem 0}
  .footer{background:#f8fafc;padding:1.5rem;text-align:center;color:#9ca3af;font-size:.8rem;border-top:1px solid #e5e7eb}
</style></head><body><div class="wrap">
  <div class="hdr"><h1>Ushnik Technologies</h1><p>AI · Cybersecurity · Data Center · Staffing</p></div>
  <div class="body">
    <p>Dear ${lead.name || 'there'},</p>
    <p>${message}</p>
    ${lead.requirement ? `<p><strong>Your Requirement:</strong> <span class="badge">${lead.requirement}</span></p>` : ''}
    ${lead.company ? `<p><strong>Company:</strong> ${lead.company}</p>` : ''}
    <div class="info-box">
      <p style="margin-top:0;font-weight:600">📅 Book Your Discovery Call:</p>
      <ul style="margin-bottom:1rem;color:#4b5563;font-size:.9rem">
        <li>Tomorrow at 11:00 AM (IST)</li>
        <li>Tomorrow at 3:30 PM (IST)</li>
        <li>Or pick any slot via our scheduler →</li>
      </ul>
      <a href="${bookingLink}" class="cta" style="margin:0">Book a Free Call →</a>
    </div>
    <p style="color:#6b7280;font-size:.85rem">Questions? Reply to this email or WhatsApp us at ${process.env.WHATSAPP_NUMBER || '+91-6304757347'}.</p>
  </div>
  <div class="footer">© 2025 Ushnik Technologies Pvt. Ltd.</div>
</div></body></html>`;
}

function followUpEmailHtml(lead, day, message) {
    const bookingLink = `${APP_URL}/book/${lead.id}`;
    const headlines = { 1: '👋 Just checking in!', 3: '📊 Insights for your industry', 5: '🚀 Ready for a discovery call?', 7: '⏰ Final follow-up from Ushnik' };
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:linear-gradient(135deg,#6366f1,#06b6d4);padding:2rem}
  .hdr h1{color:#fff;font-size:1.3rem;margin:0}
  .body{padding:2rem}.body p{color:#374151;line-height:1.7;margin:0 0 1rem}
  .cta{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff!important;padding:.75rem 2rem;border-radius:8px;text-decoration:none;font-weight:600}
  .footer{background:#f8fafc;padding:1.5rem;text-align:center;color:#9ca3af;font-size:.8rem;border-top:1px solid #e5e7eb}
</style></head><body><div class="wrap">
  <div class="hdr"><h1>${headlines[day] || '📩 Follow-up from Ushnik'}</h1></div>
  <div class="body">
    <p>Hi ${lead.name || 'there'},</p>
    <p>${message}</p>
    <a href="${bookingLink}" class="cta">Book a Free 30-min Call →</a>
  </div>
  <div class="footer">© 2025 Ushnik Technologies · <a href="#" style="color:#9ca3af">Unsubscribe</a></div>
</div></body></html>`;
}

function ownerNotificationHtml(lead) {
    const dashboardLink = `${APP_URL}/leads/${lead.id}`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:linear-gradient(135deg,#10b981,#047857);padding:2rem}
  .hdr h1{color:#fff;font-size:1.3rem;margin:0}
  .body{padding:2rem}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th,td{padding:.75rem;border:1px solid #e5e7eb;text-align:left}
  th{background:#f9fafb;width:30%;font-weight:600;color:#4b5563}
  .cta{display:inline-block;background:#10b981;color:#fff!important;padding:.75rem 2rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:1.5rem}
  .footer{background:#f8fafc;padding:1.5rem;text-align:center;color:#9ca3af;font-size:.8rem;border-top:1px solid #e5e7eb}
</style></head><body><div class="wrap">
  <div class="hdr"><h1>🔥 New Lead Captured!</h1></div>
  <div class="body">
    <p>A new lead has been routed to <strong>${lead.assignedTeam || 'the team'}</strong>.</p>
    <table>
      <tr><th>Name</th><td>${lead.name || 'N/A'}</td></tr>
      <tr><th>Email</th><td>${lead.email || 'N/A'}</td></tr>
      <tr><th>Phone</th><td>${lead.phone || 'N/A'}</td></tr>
      <tr><th>Company</th><td>${lead.company || 'N/A'}</td></tr>
      <tr><th>Source</th><td>${lead.source || 'N/A'}</td></tr>
      <tr><th>Requirement</th><td>${lead.requirement || 'N/A'}</td></tr>
      <tr><th>AI Score</th><td>${lead.qualification || 'N/A'} (${lead.score || 0}/100)</td></tr>
    </table>
    ${lead.summary ? `<p style="margin-top:1rem"><strong>AI Summary:</strong></p><p style="font-size:.9rem;background:#f3f4f6;padding:1rem;border-radius:6px">${lead.summary}</p>` : ''}
    <a href="${dashboardLink}" class="cta">View in MSA Dashboard →</a>
  </div>
  <div class="footer">MSA Agent Automation System</div>
</div></body></html>`;
}

function meetingBookedEmailHtml(lead, slot) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .hdr{background:linear-gradient(135deg,#10b981,#06b6d4);padding:2rem;text-align:center}
  .hdr h1{color:#fff;font-size:1.5rem;margin:0}
  .body{padding:2rem}.body p{color:#374151;line-height:1.7;margin:0 0 1rem}
  .confirm-box{background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:1.5rem;margin:1.5rem 0;text-align:center}
  .footer{background:#f8fafc;padding:1.5rem;text-align:center;color:#9ca3af;font-size:.8rem;border-top:1px solid #e5e7eb}
</style></head><body><div class="wrap">
  <div class="hdr"><h1>✅ Meeting Confirmed!</h1></div>
  <div class="body">
    <p>Hi ${lead.name || 'there'},</p>
    <p>Your discovery call with <strong>Ushnik Technologies</strong> has been confirmed.</p>
    <div class="confirm-box">
      <p style="font-size:1.1rem;font-weight:700;color:#15803d;margin:0">📅 ${slot.date} at ${slot.time} (IST)</p>
      <p style="margin:.5rem 0 0;color:#4b5563">Regarding: <strong>${lead.requirement || 'General Enquiry'}</strong></p>
      ${lead.company ? `<p style="margin:.25rem 0 0;color:#6b7280">${lead.company}</p>` : ''}
      ${slot.meetLink ? `<p style="margin:.75rem 0 0"><a href="${slot.meetLink}" style="color:#6366f1;font-weight:600">🎥 Join Google Meet →</a></p>` : ''}
    </div>
    <p>Our rep will contact you at <strong>${lead.phone || 'your registered number'}</strong>.</p>
    <p style="color:#6b7280;font-size:.85rem">Need to reschedule? Reply to this email or WhatsApp ${process.env.WHATSAPP_NUMBER || '+91-6304757347'}.</p>
  </div>
  <div class="footer">© 2025 Ushnik Technologies Pvt. Ltd.</div>
</div></body></html>`;
}

function proposalEmailHtml(lead, proposalMarkdown) {
    const proposalHtml = marked(proposalMarkdown, {
        breaks: true,
        gfm: true
    });
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 0; }
  .wrap { max-width: 700px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .hdr { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 2.5rem 2rem; text-align: center; }
  .hdr h1 { color: #fff; font-size: 1.8rem; margin-bottom: .5rem; }
  .hdr p { color: rgba(255,255,255,0.9); font-size: .95rem; }
  .body { padding: 2.5rem; color: #374151; line-height: 1.8; }
  .body h1 { font-size: 1.5rem; color: #1f2937; margin-top: 1.5rem; margin-bottom: .75rem; border-bottom: 2px solid #e5e7eb; padding-bottom: .5rem; }
  .body h1:first-child { margin-top: 0; }
  .body h2 { font-size: 1.25rem; color: #374151; margin-top: 1.25rem; margin-bottom: .5rem; }
  .body h3 { font-size: 1.1rem; color: #4b5563; margin-top: 1rem; margin-bottom: .4rem; }
  .body p { margin-bottom: 1rem; }
  .body ul, .body ol { margin: .75rem 0 1rem 2rem; }
  .body li { margin-bottom: .5rem; }
  .body strong { color: #1f2937; font-weight: 700; }
  .body em { color: #6b7280; }
  .body table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  .body th, .body td { padding: .75rem; border: 1px solid #e5e7eb; text-align: left; }
  .body th { background: #f9fafb; font-weight: 700; color: #374151; }
  .body blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0; color: #6b7280; font-style: italic; }
  .body code { background: #f3f4f6; padding: .2rem .4rem; border-radius: 4px; font-family: 'Courier New', monospace; color: #d97706; }
  .body pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0; }
  .body pre code { background: none; color: inherit; padding: 0; }
  .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important; padding: .875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 1.5rem 0; }
  .divider { border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
  .footer { background: #f8fafc; padding: 1.5rem; text-align: center; color: #9ca3af; font-size: .8rem; border-top: 1px solid #e5e7eb; }
  .footer a { color: #6366f1; text-decoration: none; }
</style></head><body><div class="wrap">
  <div class="hdr">
    <h1>📋 Your Custom Proposal</h1>
    <p>From Ushnik Technologies</p>
  </div>
  <div class="body">
    ${proposalHtml}
    <div class="divider"></div>
    <p style="text-align: center; color: #6b7280; font-size: .9rem;">
      Have questions about this proposal? Reply to this email or contact us at
      <strong>${process.env.WHATSAPP_NUMBER || '+91-6304757347'}</strong>
    </p>
    <p style="text-align: center; margin-top: 1.5rem;">
      <a href="${APP_URL}/book/${lead.id}" class="cta">Schedule Your Discovery Call →</a>
    </p>
  </div>
  <div class="footer">
    © 2025 Ushnik Technologies Pvt. Ltd. | All Rights Reserved<br>
    <a href="#">Unsubscribe</a> | <a href="#">Privacy Policy</a>
  </div>
</div></body></html>`;
}

module.exports = { sendEmail, welcomeEmailHtml, followUpEmailHtml, ownerNotificationHtml, meetingBookedEmailHtml, proposalEmailHtml };
