import { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    RadialBarChart, RadialBar,
} from 'recharts';
import { api } from '../api';

const COLORS = ['#6366f1', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
const QUAL_COLORS = { Hot: '#ef4444', Warm: '#f59e0b', Cold: '#3b82f6' };

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.8rem' }}>
                {label && <p style={{ color: '#9ca3af', marginBottom: '.25rem' }}>{label}</p>}
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || '#f9fafb', fontWeight: 600 }}>{p.name}: {p.value}</p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Analytics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getStats().then(setStats).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
    if (!stats) return <div className="empty-state"><p>Could not load analytics.</p></div>;

    const qualData = [
        { name: 'Hot', value: stats.hot, fill: QUAL_COLORS.Hot },
        { name: 'Warm', value: stats.warm, fill: QUAL_COLORS.Warm },
        { name: 'Cold', value: stats.cold, fill: QUAL_COLORS.Cold },
    ];

    const sourceData = Object.entries(stats.bySource || {}).map(([name, value]) => ({ name, value }));
    const reqData = Object.entries(stats.byRequirement || {}).map(([name, value]) => ({ name, value }));
    const teamData = Object.entries(stats.byTeam || {}).map(([name, value]) => ({ name, value }));

    const convData = [
        { name: 'Total', value: stats.total, fill: '#6366f1' },
        { name: 'Converted', value: stats.converted, fill: '#10b981' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1>Analytics</h1>
                <p>Lead pipeline performance and conversion metrics</p>
            </div>

            {/* KPI Row */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                {[
                    { label: 'Total Leads', value: stats.total, color: '#6366f1' },
                    { label: 'Hot Leads', value: stats.hot, color: '#ef4444' },
                    { label: 'Converted', value: stats.converted, color: '#10b981' },
                    { label: 'Avg Score', value: stats.avgScore, color: '#f59e0b' },
                    { label: 'Conv. Rate', value: `${stats.conversionRate}%`, color: '#8b5cf6' },
                ].map(k => (
                    <div key={k.label} className="stat-card" style={{ '--grad': `linear-gradient(135deg,${k.color},${k.color}99)` }}>
                        <p className="stat-label">{k.label}</p>
                        <p className="stat-value" style={{ color: k.color }}>{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="analytics-grid">
                {/* Lead Qualification Pie */}
                <div className="chart-card">
                    <p className="chart-title">Lead Quality Distribution</p>
                    {stats.total === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No data</p> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={qualData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {qualData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '.5rem' }}>
                        {qualData.map(d => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.8rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: d.fill }} />
                                <span style={{ color: 'var(--text-3)' }}>{d.name}: {d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Source Distribution Bar */}
                <div className="chart-card">
                    <p className="chart-title">Leads by Source</p>
                    {sourceData.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No data</p> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={sourceData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Service Type Bar */}
                <div className="chart-card">
                    <p className="chart-title">Leads by Service Type</p>
                    {reqData.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No data</p> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={reqData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                                    {reqData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Team Routing */}
                <div className="chart-card">
                    <p className="chart-title">Team Routing Distribution</p>
                    {teamData.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No data</p> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={teamData} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                    {teamData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Conversion Funnel */}
                <div className="chart-card">
                    <p className="chart-title">Conversion Funnel</p>
                    <div style={{ padding: '1rem 0' }}>
                        {[
                            { label: 'Total Leads', val: stats.total, w: '100%', color: '#6366f1' },
                            { label: 'Hot Leads', val: stats.hot, w: stats.total ? `${(stats.hot / stats.total) * 100}%` : '0%', color: '#ef4444' },
                            { label: 'Engaged', val: stats.warm + stats.hot, w: stats.total ? `${((stats.warm + stats.hot) / stats.total) * 100}%` : '0%', color: '#f59e0b' },
                            { label: 'Converted', val: stats.converted, w: stats.total ? `${(stats.converted / stats.total) * 100}%` : '0%', color: '#10b981' },
                        ].map(f => (
                            <div key={f.label} style={{ marginBottom: '.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.3rem', color: 'var(--text-2)' }}>
                                    <span>{f.label}</span><span style={{ fontWeight: 700 }}>{f.val}</span>
                                </div>
                                <div style={{ height: 10, background: 'rgba(255,255,255,.06)', borderRadius: 5, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: f.w, background: f.color, borderRadius: 5, transition: 'width .8s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary stats */}
                <div className="chart-card">
                    <p className="chart-title">Pipeline Summary</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        {[
                            { label: 'Conversion Rate', value: `${stats.conversionRate}%`, color: '#10b981' },
                            { label: 'Average Score', value: `${stats.avgScore}/100`, color: '#6366f1' },
                            { label: 'Hot Leads', value: stats.hot, color: '#ef4444' },
                            { label: 'Warm Leads', value: stats.warm, color: '#f59e0b' },
                            { label: 'Cold Leads', value: stats.cold, color: '#3b82f6' },
                            { label: 'Total Pipeline', value: stats.total, color: '#8b5cf6' },
                        ].map(s => (
                            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.5rem .75rem', background: 'var(--bg-card2)', borderRadius: 8 }}>
                                <span style={{ fontSize: '.875rem', color: 'var(--text-2)' }}>{s.label}</span>
                                <span style={{ fontWeight: 700, color: s.color, fontSize: '1rem' }}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
