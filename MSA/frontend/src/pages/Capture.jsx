import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, Send } from 'lucide-react';
import { api } from '../api';

export default function Capture() {
    const nav = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', location: '', message: '', source: 'website' });
    const [loading, setLoading] = useState(false);

    const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name && !form.email) { toast.error('Name or email is required.'); return; }
        setLoading(true);
        try {
            const res = await api.captureLead(form);
            if (res.duplicate) {
                toast('Lead already exists.', { icon: '⚠️' });
            } else {
                toast.success('Lead captured and qualified!');
                nav(`/leads/${res.lead.id}`);
            }
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="page-header">
                <h1>Add Lead Manually</h1>
                <p>Capture a single lead — AI will qualify, score, and route automatically.</p>
            </div>

            <div className="card">
                <form onSubmit={submit}>
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" name="name" placeholder="Rahul Sharma" value={form.name} onChange={change} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company</label>
                            <input className="form-input" name="company" placeholder="TechCorp Pvt Ltd" value={form.company} onChange={change} />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" name="email" type="email" placeholder="rahul@company.com" value={form.email} onChange={change} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={change} />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input className="form-input" name="location" placeholder="Mumbai, India" value={form.location} onChange={change} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Source</label>
                            <select className="form-select" name="source" value={form.source} onChange={change}>
                                <option value="website">Website</option>
                                <option value="email">Email</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="referral">Referral</option>
                                <option value="excel">Excel</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Requirement / Message *</label>
                        <textarea className="form-textarea" name="message" rows={4}
                            placeholder="Describe what the lead is looking for — e.g. 'We need an AI chatbot for customer support ASAP, budget around 5 lakh'"
                            value={form.message} onChange={change} />
                        <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.3rem' }}>
                            💡 Tip: The more detail you add here, the more accurate the AI qualification will be.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setForm({ name: '', email: '', phone: '', company: '', location: '', message: '', source: 'website' })}>
                            Reset
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <UserPlus size={15} />{loading ? 'Processing…' : 'Add & Qualify Lead'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Info */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.75rem', color: 'var(--text-2)' }}>What happens after submission?</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {[
                        ['🤖', 'AI qualification', 'Lead is scored 0-100 and classified as Hot/Warm/Cold'],
                        ['🔀', 'Auto-routing', 'Assigned to Sales, Technical, or Management team'],
                        ['📧', 'Auto-response email', 'Instant welcome email sent to the lead\'s inbox'],
                        ['🔔', 'Owner alert', 'You receive a notification with lead details'],
                        ['📅', 'Follow-up scheduling', 'Day 1→3→5→7 sequence is automatically set up'],
                    ].map(([icon, title, desc]) => (
                        <div key={title} style={{ display: 'flex', gap: '.75rem', padding: '.5rem', background: 'var(--bg-card2)', borderRadius: 8 }}>
                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
                            <div>
                                <p style={{ fontWeight: 600, fontSize: '.875rem' }}>{title}</p>
                                <p style={{ fontSize: '.8rem', color: 'var(--text-3)' }}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
