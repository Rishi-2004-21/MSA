import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Flame, Wind, Snowflake, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { api } from '../api';

function StatCard({ label, value, sub, color, icon }) {
    return (
        <div className="stat-card" style={{ '--grad': color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p className="stat-label">{label}</p>
                    <p className="stat-value">{value}</p>
                    {sub && <p className="stat-sub">{sub}</p>}
                </div>
                <div style={{ opacity: .3, fontSize: '2rem' }}>{icon}</div>
            </div>
        </div>
    );
}

function QualBadge({ q }) {
    const cls = q === 'Hot' ? 'badge-hot' : q === 'Warm' ? 'badge-warm' : 'badge-cold';
    const Icon = q === 'Hot' ? Flame : q === 'Warm' ? Wind : Snowflake;
    return <span className={`badge ${cls}`}><Icon size={11} />{q}</span>;
}

function ScoreBar({ score }) {
    const color = score >= 75 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#3b82f6';
    return (
        <div className="score-bar-wrap">
            <div className="score-bar">
                <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
            </div>
            <span className="score-num" style={{ color }}>{score}</span>
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentLeads, setRecentLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();

    useEffect(() => {
        Promise.all([api.getStats(), api.getLeads({ limit: 8 })])
            .then(([s, l]) => { setStats(s); setRecentLeads(l); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

    const reqColors = { 'AI/ML': 'badge-ai', 'Cybersecurity': 'badge-cyber', 'Data Center': 'badge-data', 'Staffing': 'badge-staff', 'Other': 'badge-other' };

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Real-time overview of your lead pipeline</p>
            </div>

            <div className="stats-grid">
                <StatCard label="Total Leads" value={stats?.total ?? 0} sub="All time" icon={<Users />}
                    color="linear-gradient(135deg,#6366f1,#8b5cf6)" />
                <StatCard label="Hot Leads" value={stats?.hot ?? 0} sub="Immediate action" icon={<Flame />}
                    color="linear-gradient(135deg,#ef4444,#f97316)" />
                <StatCard label="Warm Leads" value={stats?.warm ?? 0} sub="In nurture sequence" icon={<Wind />}
                    color="linear-gradient(135deg,#f59e0b,#eab308)" />
                <StatCard label="Cold Leads" value={stats?.cold ?? 0} sub="Long-term pipeline" icon={<Snowflake />}
                    color="linear-gradient(135deg,#3b82f6,#06b6d4)" />
                <StatCard label="Converted" value={stats?.converted ?? 0} sub={`${stats?.conversionRate ?? 0}% rate`} icon={<CheckCircle />}
                    color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Avg Score" value={stats?.avgScore ?? 0} sub="out of 100" icon={<TrendingUp />}
                    color="linear-gradient(135deg,#8b5cf6,#6366f1)" />
            </div>

            {/* Recent Leads */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Leads</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => nav('/leads')}>
                        View All <ArrowRight size={13} />
                    </button>
                </div>

                {recentLeads.length === 0 ? (
                    <div className="empty-state"><p>No leads yet. Upload an Excel file or add a lead manually.</p></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th><th>Email</th><th>Requirement</th><th>Score</th><th>Status</th><th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLeads.map(l => (
                                    <tr key={l.id} onClick={() => nav(`/leads/${l.id}`)}>
                                        <td>
                                            <div>{l.name || '—'}</div>
                                            <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{l.company || ''}</div>
                                        </td>
                                        <td>{l.email || '—'}</td>
                                        <td><span className={`badge ${reqColors[l.requirement] || 'badge-other'}`}>{l.requirement || 'Other'}</span></td>
                                        <td style={{ minWidth: 120 }}><ScoreBar score={l.score || 0} /></td>
                                        <td><QualBadge q={l.qualification} /></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', color: 'var(--text-3)', fontSize: '.8rem' }}>
                                                <Clock size={12} />{new Date(l.createdAt).toLocaleDateString('en-IN')}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pipeline summary */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div className="card">
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>By Source</h3>
                        {Object.entries(stats.bySource || {}).length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No data</p> :
                            Object.entries(stats.bySource).map(([src, count]) => (
                                <div key={src} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '.875rem' }}>
                                    <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{src}</span>
                                    <span style={{ fontWeight: 700 }}>{count}</span>
                                </div>
                            ))
                        }
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>By Service</h3>
                        {Object.entries(stats.byRequirement || {}).length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No data</p> :
                            Object.entries(stats.byRequirement).map(([req, count]) => (
                                <div key={req} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '.875rem' }}>
                                    <span style={{ color: 'var(--text-2)' }}>{req}</span>
                                    <span style={{ fontWeight: 700 }}>{count}</span>
                                </div>
                            ))
                        }
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Team Routing</h3>
                        {Object.entries(stats.byTeam || {}).map(([team, count]) => (
                            <div key={team} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '.875rem' }}>
                                <span style={{ color: 'var(--text-2)' }}>{team}</span>
                                <span style={{ fontWeight: 700 }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
