import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Wind, Snowflake, Users } from 'lucide-react';
import { api } from '../api';

const QUAL_FILTERS = ['All', 'Hot', 'Warm', 'Cold'];
const REQ_COLORS = { 'AI/ML': 'badge-ai', Cybersecurity: 'badge-cyber', 'Data Center': 'badge-data', Staffing: 'badge-staff', Other: 'badge-other' };

function QualBadge({ q }) {
    const cls = q === 'Hot' ? 'badge-hot' : q === 'Warm' ? 'badge-warm' : 'badge-cold';
    const Icon = q === 'Hot' ? Flame : q === 'Warm' ? Wind : Snowflake;
    return <span className={`badge ${cls}`}><Icon size={11} />{q}</span>;
}

function ScoreBar({ score }) {
    const color = score >= 75 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#3b82f6';
    return (
        <div className="score-bar-wrap">
            <div className="score-bar"><div className="score-bar-fill" style={{ width: `${score}%`, background: color }} /></div>
            <span className="score-num" style={{ color }}>{score}</span>
        </div>
    );
}

export default function Leads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qFilter, setQFilter] = useState('All');
    const [search, setSearch] = useState('');
    const nav = useNavigate();

    useEffect(() => {
        api.getLeads({ limit: 200 }).then(setLeads).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let l = leads;
        if (qFilter !== 'All') l = l.filter(x => x.qualification === qFilter);
        if (search.trim()) {
            const s = search.toLowerCase();
            l = l.filter(x =>
                (x.name || '').toLowerCase().includes(s) ||
                (x.email || '').toLowerCase().includes(s) ||
                (x.company || '').toLowerCase().includes(s) ||
                (x.phone || '').includes(s)
            );
        }
        return l;
    }, [leads, qFilter, search]);

    if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1>All Leads</h1>
                <p>{leads.length} total leads in pipeline</p>
            </div>

            <div className="filters-bar">
                {QUAL_FILTERS.map(f => (
                    <button key={f} className={`filter-pill${qFilter === f ? ' active' : ''}`} onClick={() => setQFilter(f)}>{f}</button>
                ))}
                <div className="search-wrap" style={{ marginLeft: 'auto' }}>
                    <Search />
                    <input className="search-input" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <Users />
                    <h3>No leads found</h3>
                    <p>Try a different filter or upload an Excel file.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Requirement</th><th>Score</th><th>Status</th><th>Team</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(l => (
                                <tr key={l.id} onClick={() => nav(`/leads/${l.id}`)}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{l.name || '—'}</div>
                                        {l.company && <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{l.company}</div>}
                                    </td>
                                    <td>{l.email || '—'}</td>
                                    <td>{l.phone || '—'}</td>
                                    <td><span className={`badge ${REQ_COLORS[l.requirement] || 'badge-other'}`}>{l.requirement || 'Other'}</span></td>
                                    <td style={{ minWidth: 120 }}><ScoreBar score={l.score || 0} /></td>
                                    <td><QualBadge q={l.qualification} /></td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>{l.assignedTeam || '—'}</td>
                                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-3)', fontSize: '.8rem' }}>
                                        {new Date(l.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
