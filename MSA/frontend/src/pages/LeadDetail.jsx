import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import {
    ArrowLeft, Mail, Phone, Building, MapPin, Calendar, Flame, Wind, Snowflake,
    MessageSquare, FileText, Send, Video, RefreshCw, Star, CheckCircle, AlertTriangle
} from 'lucide-react';
import { api } from '../api';

const REQ_COLORS = { 'AI/ML': 'badge-ai', Cybersecurity: 'badge-cyber', 'Data Center': 'badge-data', Staffing: 'badge-staff', Other: 'badge-other' };
const INT_ICONS = {
    email_sent:             { icon: '📧', color: '#6366f1' },
    auto_reply_queued:      { icon: '🤖', color: '#8b5cf6' },
    follow_up:              { icon: '🔔', color: '#f59e0b' },
    proposal_sent:          { icon: '📄', color: '#10b981' },
    meeting_scheduled:      { icon: '📅', color: '#06b6d4' },
    site_visit_scheduled:   { icon: '🏢', color: '#10b981' },
    site_visit_rescheduled: { icon: '🔄', color: '#f59e0b' },
    reminder_sent:          { icon: '🔔', color: '#06b6d4' },
    documents_generated:    { icon: '📋', color: '#8b5cf6' },
    kyc_verified:           { icon: '✅', color: '#10b981' },
    kyc_failed:             { icon: '⚠️', color: '#ef4444' },
    note:                   { icon: '📝', color: '#6b7280' },
};

export default function LeadDetail() {
    const { id } = useParams();
    const nav = useNavigate();

    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState({});
    const [newNote, setNewNote] = useState('');
    const [statusUpdating, setStatusUpdating] = useState(false);

    const load = () => {
        setLoading(true);
        api.getLead(id).then(setLead).finally(() => setLoading(false));
    };

    useEffect(load, [id]);

    const act = async (key, fn, successMsg) => {
        setBusy(b => ({ ...b, [key]: true }));
        try {
            await fn();
            toast.success(successMsg);
            load();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(b => ({ ...b, [key]: false }));
        }
    };

    const addNote = () => {
        if (!newNote.trim()) return;
        act('note', () => api.addInteraction(id, 'note', newNote), 'Note added');
        setNewNote('');
    };

    const updateStatus = (status) => {
        setStatusUpdating(true);
        act('status', () => api.updateLead(id, { status }), `Status → ${status}`);
        setStatusUpdating(false);
    };

    const handleAutoResponse = async () => {
        setBusy(b => ({ ...b, resp: true }));
        try {
            const res = await api.generateResponse(id);
            if (res.message && lead.email) {
                await api.sendResponse(id, res.message);
                toast.success('AI Response sent to lead!');
            } else {
                toast.success('AI Response generated (queued)');
            }
            load();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(b => ({ ...b, resp: false }));
        }
    };

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
    if (!lead) return <div className="empty-state"><h3>Lead not found.</h3></div>;

    const QIcon = lead.qualification === 'Hot' ? Flame : lead.qualification === 'Warm' ? Wind : Snowflake;
    const qCls = lead.qualification === 'Hot' ? 'badge-hot' : lead.qualification === 'Warm' ? 'badge-warm' : 'badge-cold';
    const scoreColor = lead.score >= 75 ? '#ef4444' : lead.score >= 40 ? '#f59e0b' : '#3b82f6';

    return (
        <div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav(-1)} style={{ marginBottom: '1.5rem' }}>
                <ArrowLeft size={14} /> Back
            </button>

            <div className="lead-detail-grid">
                {/* LEFT: Lead info */}
                <div>
                    {/* Header Card */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{lead.name || 'Unknown Lead'}</h1>
                                {lead.company && <p style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.25rem' }}><Building size={14} />{lead.company}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className={`badge ${qCls}`}><QIcon size={12} />{lead.qualification}</span>
                                <span className={`badge ${REQ_COLORS[lead.requirement] || 'badge-other'}`}>{lead.requirement || 'Other'}</span>
                                <span className="badge badge-ai">Score: <strong style={{ marginLeft: '.2rem', color: scoreColor }}>{lead.score}</strong></span>
                            </div>
                        </div>

                        {/* Score bar */}
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--text-3)', marginBottom: '.3rem' }}>
                                <span>Lead Score</span><span>{lead.score}/100</span>
                            </div>
                            <div className="score-bar" style={{ height: 8 }}>
                                <div className="score-bar-fill" style={{ width: `${lead.score}%`, background: scoreColor }} />
                            </div>
                        </div>
                    </div>

                    {/* Contact Details */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="detail-section">
                            <h3>Contact Details</h3>
                            {lead.email && <div className="detail-row"><span className="key"><Mail size={13} /> Email</span><span className="val">{lead.email}</span></div>}
                            {lead.phone && <div className="detail-row"><span className="key"><Phone size={13} /> Phone</span><span className="val">{lead.phone}</span></div>}
                            {lead.location && <div className="detail-row"><span className="key"><MapPin size={13} /> Location</span><span className="val">{lead.location}</span></div>}
                        </div>

                        <div className="detail-section">
                            <h3>Lead Intelligence</h3>
                            <div className="detail-row"><span className="key">Source</span><span className="val" style={{ textTransform: 'capitalize' }}>{lead.source}</span></div>
                            <div className="detail-row"><span className="key">Status</span><span className="val">{lead.status}</span></div>
                            <div className="detail-row"><span className="key">Assigned Team</span><span className="val">{lead.assignedTeam || 'Unassigned'}</span></div>
                            {lead.budget && <div className="detail-row"><span className="key">Budget</span><span className="val">{lead.budget}</span></div>}
                            {lead.timeline && <div className="detail-row"><span className="key">Timeline</span><span className="val">{lead.timeline}</span></div>}
                            <div className="detail-row"><span className="key">Created</span><span className="val">{new Date(lead.createdAt).toLocaleString('en-IN')}</span></div>
                            {lead.nextActionDate && (
                                <div className="detail-row">
                                    <span className="key"><Calendar size={13} /> Next Action</span>
                                    <span className="val">{new Date(lead.nextActionDate).toLocaleDateString('en-IN')}</span>
                                </div>
                            )}
                        </div>

                        {lead.summary && (
                            <div>
                                <h3 className="detail-section" style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.5rem' }}>AI Summary</h3>
                                <p style={{ background: 'var(--bg-card2)', borderLeft: '3px solid var(--indigo)', padding: '.75rem 1rem', borderRadius: '0 8px 8px 0', fontSize: '.9rem', color: 'var(--text-2)', fontStyle: 'italic' }}>{lead.summary}</p>
                            </div>
                        )}
                    </div>

                    {/* Proposal */}
                    {lead.proposalContent && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>
                                AI Proposal Draft <span className="badge badge-ai" style={{ marginLeft: '.5rem' }}>{lead.proposalStatus}</span>
                            </h3>
                            <div className="proposal-box" dangerouslySetInnerHTML={{ __html: marked(lead.proposalContent, { breaks: true, gfm: true }) }} style={{
                                fontSize: '.95rem',
                                lineHeight: '1.7',
                                color: 'var(--text-2)'
                            }} />
                        </div>
                    )}

                    {/* Site Visit Details (always shown) */}
                    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: lead.siteVisit ? '4px solid var(--emerald)' : '4px solid var(--border)' }}>
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            🏢 Site Visit
                            {lead.siteVisit
                                ? <span className="badge badge-staff" style={{ marginLeft: 'auto' }}>Scheduled</span>
                                : <span className="badge badge-other" style={{ marginLeft: 'auto' }}>Not Scheduled</span>}
                        </h3>
                        {lead.siteVisit ? (
                            <>
                                <div className="detail-row"><span className="key"><Calendar size={13} /> Date / Time</span><span className="val">{lead.siteVisit.date} at {lead.siteVisit.time}</span></div>
                                <div className="detail-row"><span className="key"><MapPin size={13} /> Location</span><span className="val">{lead.siteVisit.location}</span></div>
                                <div className="detail-row"><span className="key"><Building size={13} /> Assigned Rep</span><span className="val" style={{ color: 'var(--indigo)' }}>{lead.siteVisit.rep}</span></div>
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No site visit scheduled yet. Use the actions panel to schedule one.</p>
                        )}
                    </div>

                    {/* Generated Documents */}
                    {lead.generatedDocuments && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>📋 Agreements & Booking Forms</h3>
                            <details style={{ marginBottom: '1rem' }}><summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-2)' }}>Sale Agreement</summary><div className="proposal-box" style={{ marginTop: '.5rem' }} dangerouslySetInnerHTML={{ __html: marked(lead.generatedDocuments.agreement, { breaks: true, gfm: true }) }} /></details>
                            <details><summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-2)' }}>Booking Form</summary><div className="proposal-box" style={{ marginTop: '.5rem' }} dangerouslySetInnerHTML={{ __html: marked(lead.generatedDocuments.bookingForm, { breaks: true, gfm: true }) }} /></details>
                        </div>
                    )}

                    {/* KYC Status (always shown if verified/failed) */}
                    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: lead.kycStatus ? (lead.kycStatus.verified ? '4px solid var(--emerald)' : '4px solid #ef4444') : '4px solid var(--border)' }}>
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            KYC Verification
                            {lead.kycStatus
                                ? lead.kycStatus.verified
                                    ? <CheckCircle size={15} color="var(--emerald)" style={{ marginLeft: 'auto' }} />
                                    : <AlertTriangle size={15} color="#ef4444" style={{ marginLeft: 'auto' }} />
                                : <span style={{ marginLeft: 'auto', fontSize: '.75rem' }}>Pending</span>}
                        </h3>
                        {lead.kycStatus ? (
                            <>
                                <p style={{ fontSize: '.9rem', color: 'var(--text-2)', marginBottom: '.5rem' }}>{lead.kycStatus.notes}</p>
                                {!lead.kycStatus.verified && (
                                    <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '.6rem .75rem', borderRadius: '6px', fontSize: '.85rem' }}>
                                        ⚠ Missing: {(lead.kycStatus.missingItems || []).join(', ')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>KYC documents have not been verified yet.</p>
                        )}
                    </div>

                    {/* Meeting Link */}
                    {lead.meetingLink && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.5rem' }}>Meeting Link</h3>
                            <a href={lead.meetingLink} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', fontSize: '.9rem' }}>{lead.meetingLink}</a>
                        </div>
                    )}

                    {/* Interaction Timeline */}
                    <div className="card">
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem' }}>Activity Timeline</h3>

                        {/* Add note */}
                        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem' }}>
                            <input className="form-input" placeholder="Add a note…" value={newNote} onChange={e => setNewNote(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addNote()} />
                            <button className="btn btn-primary btn-sm" onClick={addNote} disabled={busy.note}>Add</button>
                        </div>

                        <div className="timeline">
                            {(lead.interactions || []).map(i => {
                                const meta = INT_ICONS[i.type] || INT_ICONS.note;
                                return (
                                    <div className="timeline-item" key={i.id}>
                                        <div className="timeline-dot" style={{ background: `${meta.color}22`, color: meta.color, fontSize: '1rem' }}>{meta.icon}</div>
                                        <div className="timeline-body">
                                            <p>{i.content}</p>
                                            <time>{new Date(i.createdAt).toLocaleString('en-IN')}</time>
                                        </div>
                                    </div>
                                );
                            })}
                            {(lead.interactions || []).length === 0 && (
                                <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No interactions yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Action Panel */}
                <div>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem' }}>AI Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                            <button className="btn btn-primary" disabled={busy.resp || !lead.email}
                                onClick={handleAutoResponse}>
                                <MessageSquare size={15} />{busy.resp ? 'Processing…' : 'Generate & Send AI Response'}
                            </button>
                            <button className="btn btn-secondary" disabled={busy.prop}
                                onClick={() => act('prop', () => api.generateProposal(id), 'Proposal generated!')}>
                                <FileText size={15} />{busy.prop ? 'Generating…' : 'Generate Proposal'}
                            </button>
                            {lead.proposalContent && (
                                <button className="btn btn-success" disabled={busy.send || !lead.email}
                                    onClick={() => act('send', () => api.sendProposal(id), 'Proposal sent!')}>
                                    <Send size={15} />{busy.send ? 'Sending…' : 'Send Proposal'}
                                </button>
                            )}
                            <button className="btn btn-secondary" disabled={busy.meet}
                                onClick={() => act('meet', () => api.scheduleMeeting(id), 'Meeting link sent!')}>
                                <Video size={15} />{busy.meet ? 'Scheduling…' : 'Schedule Meeting'}
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem' }}>🏢 Site Visit Agent</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                            <button className="btn btn-primary" disabled={busy.siteVisit}
                                onClick={() => act('siteVisit', () => api.scheduleSiteVisit(id, { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '14:00' }), 'Site Visit Scheduled & Assigned!')}>
                                <Calendar size={15} />{busy.siteVisit ? 'Scheduling…' : lead.siteVisit ? 'Update Site Visit' : 'Schedule Site Visit'}
                            </button>
                            {lead.siteVisit && (
                                <button className="btn btn-secondary" disabled={busy.remind}
                                    onClick={() => act('remind', () => api.remindSiteVisit(id), 'Reminder Sent!')}>
                                    <MessageSquare size={15} />{busy.remind ? 'Sending…' : 'Send Reminder'}
                                </button>
                            )}
                            <button className="btn btn-success" disabled={busy.docs}
                                onClick={() => act('docs', () => api.generateSiteVisitDocuments(id), 'Agreements & Docs Generated!')}>
                                <FileText size={15} />{busy.docs ? 'Generating…' : 'Generate Agreement & Booking Form'}
                            </button>
                            <button
                                className={lead.kycStatus?.verified ? 'btn btn-success' : 'btn btn-secondary'}
                                disabled={busy.kyc}
                                onClick={() => {
                                    const docs = prompt('Enter documents provided by client (e.g. Passport, Bank Statement, Utility Bill):', 'Passport, Bank Statement');
                                    if (docs) act('kyc', () => api.verifyKYC(id, docs), 'KYC Verification Complete!');
                                }}>
                                {lead.kycStatus?.verified ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                                {busy.kyc ? 'Verifying…' : lead.kycStatus ? 'Re-Verify KYC' : 'Verify KYC Documents'}
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem' }}>Update Status</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                            {['Captured', 'Engaged', 'Forwarded', 'Converted', 'Closed'].map(s => (
                                <button key={s} disabled={lead.status === s}
                                    className={`btn btn-sm ${lead.status === s ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => updateStatus(s)} style={{ justifyContent: 'flex-start' }}>
                                    {lead.status === s && <Star size={12} />} {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>Follow-Up Stage</h3>
                        {[0, 1, 2, 3].map(s => {
                            const days = ['Day 0', 'Day 1', 'Day 3', 'Day 5'];
                            const active = lead.followUpStage === s;
                            const done = lead.followUpStage > s;
                            return (
                                <div key={s} style={{
                                    display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.4rem 0',
                                    borderBottom: '1px solid var(--border)', fontSize: '.85rem'
                                }}>
                                    <div style={{
                                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: done ? 'rgba(16,185,129,.2)' : active ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.05)',
                                        color: done ? '#10b981' : active ? '#6366f1' : 'var(--text-3)',
                                        fontSize: '.7rem', fontWeight: 700
                                    }}>{done ? '✓' : s}</div>
                                    <span style={{ color: active ? 'var(--text)' : 'var(--text-3)' }}>{days[s]}</span>
                                    {active && <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--indigo)' }}>Current</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
