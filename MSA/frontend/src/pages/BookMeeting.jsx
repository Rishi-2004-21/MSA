import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, Building } from 'lucide-react';

const API = 'http://localhost:5000/api';

const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

function getNextDays(n) {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= n; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const label = i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
        days.push({ label, value: d.toISOString().split('T')[0], date: d });
    }
    return days;
}

export default function BookMeeting() {
    const { leadId } = useParams();
    const [leadInfo, setLeadInfo] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [booked, setBooked] = useState(null);
    const [error, setError] = useState(null);
    const days = getNextDays(7);

    useEffect(() => {
        fetch(`${API}/book/${leadId}`)
            .then(r => r.json())
            .then(data => { if (!data.error) setLeadInfo(data); else setError('Lead not found.'); })
            .catch(() => setError('Unable to load booking info.'));
    }, [leadId]);

    async function confirmBooking() {
        if (!selectedDate || !selectedTime) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/book/${leadId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate, time: selectedTime }),
            });
            const data = await res.json();
            if (data.success) setBooked(data.visit);
            else setError(data.error || 'Booking failed.');
        } catch {
            setError('Connection error.');
        } finally {
            setLoading(false);
        }
    }

    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
            <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
                <p style={{ color: 'var(--rose)', fontSize: '1.1rem' }}>⚠️ {error}</p>
            </div>
        </div>
    );

    if (booked) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: 480, textAlign: 'center', borderTop: '4px solid var(--emerald)' }}>
                <CheckCircle size={52} color="var(--emerald)" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.5rem' }}>Meeting Confirmed! 🎉</h2>
                <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>
                    Hi {leadInfo?.name}, your discovery call is booked.
                </p>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--emerald)', marginBottom: '.5rem' }}>
                        📅 {booked.date} at {booked.time} (IST)
                    </p>
                    <p style={{ color: 'var(--text-2)', fontSize: '.9rem' }}>With: {booked.rep}</p>
                    <p style={{ color: 'var(--text-2)', fontSize: '.9rem' }}>Location: {booked.location}</p>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>
                    A confirmation email has been sent to <strong>{leadInfo?.email}</strong>.
                </p>
                <p style={{ color: 'var(--text-3)', fontSize: '.85rem', marginTop: '.5rem' }}>
                    Need to reschedule? WhatsApp us at {import.meta.env.VITE_WHATSAPP || '+91-6304757347'}
                </p>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem' }}>
            <div style={{ width: '100%', maxWidth: 600 }}>
                {/* Header */}
                <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.75rem' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                            <Building size={26} color="#fff" />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '.25rem' }}>Ushnik Technologies</h1>
                    <p style={{ color: 'var(--text-2)', fontSize: '.9rem' }}>Book your free 30-min discovery call</p>
                    {leadInfo && (
                        <div style={{ marginTop: '1rem', padding: '.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: '.875rem', color: 'var(--text-2)' }}>
                            Welcome back, <strong style={{ color: 'var(--text)' }}>{leadInfo.name}</strong>
                            {leadInfo.company ? ` · ${leadInfo.company}` : ''}
                            {leadInfo.requirement ? ` · ${leadInfo.requirement}` : ''}
                        </div>
                    )}
                </div>

                {/* Date Selection */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <Calendar size={16} /> Select a Date
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '.5rem' }}>
                        {days.map(d => (
                            <button key={d.value} onClick={() => setSelectedDate(d.value)} style={{
                                padding: '.65rem', borderRadius: 8, border: `2px solid ${selectedDate === d.value ? 'var(--indigo)' : 'var(--border)'}`,
                                background: selectedDate === d.value ? 'rgba(99,102,241,0.15)' : 'var(--bg-card2)',
                                color: selectedDate === d.value ? 'var(--indigo)' : 'var(--text-2)',
                                fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', transition: 'all .2s',
                            }}>
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                    <div className="card" style={{ marginBottom: '1rem', animation: 'fadeIn .3s ease' }}>
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            <Clock size={16} /> Select a Time (IST)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.5rem' }}>
                            {TIME_SLOTS.map(t => (
                                <button key={t} onClick={() => setSelectedTime(t)} style={{
                                    padding: '.6rem', borderRadius: 8, border: `2px solid ${selectedTime === t ? 'var(--indigo)' : 'var(--border)'}`,
                                    background: selectedTime === t ? 'rgba(99,102,241,0.15)' : 'var(--bg-card2)',
                                    color: selectedTime === t ? 'var(--indigo)' : 'var(--text-2)',
                                    fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', transition: 'all .2s',
                                }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Confirm */}
                {selectedDate && selectedTime && (
                    <button className="btn btn-primary" onClick={confirmBooking} disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1rem', animation: 'fadeIn .3s ease' }}>
                        {loading ? '⏳ Confirming...' : `✅ Confirm — ${selectedDate} at ${selectedTime}`}
                    </button>
                )}

                <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '.8rem', marginTop: '1rem' }}>
                    Powered by MSA Agent · Ushnik Technologies
                </p>
            </div>

            <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>
        </div>
    );
}
