import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function Upload() {
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const nav = useNavigate();

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.match(/\.(xlsx|xls)$/i)) { toast.error('Please upload a .xlsx or .xls file'); return; }
        setFile(f);
        setResult(null);
    };

    const onDrop = (e) => {
        e.preventDefault(); setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const onUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const res = await api.uploadExcel(file);
            setResult(res);
            toast.success(`Processed ${res.processed} lead(s)!`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setUploading(false);
        }
    };

    const statusIcon = (status) => {
        if (status === 'processed') return <CheckCircle size={14} color="var(--emerald)" />;
        if (status === 'duplicate') return <AlertTriangle size={14} color="var(--amber)" />;
        return <XCircle size={14} color="var(--rose)" />;
    };

    return (
        <div>
            <div className="page-header">
                <h1>Upload Excel Leads</h1>
                <p>Import leads from a spreadsheet. Supports .xlsx and .xls files.</p>
            </div>

            {/* Format guide */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '.75rem', fontSize: '.95rem' }}>Expected Column Format</h3>
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Requirement</th><th>Company</th><th>Location</th></tr></thead>
                        <tbody>
                            <tr>
                                <td>Rahul Sharma</td>
                                <td>rahul@company.com</td>
                                <td>9876543210</td>
                                <td>We need AI/ML for our chatbot ASAP</td>
                                <td>TechCorp Pvt Ltd</td>
                                <td>Mumbai</td>
                            </tr>
                            <tr>
                                <td>Priya Patel</td>
                                <td>priya@startup.io</td>
                                <td>8765432109</td>
                                <td>Looking for cybersecurity audit, budget 5 lakh</td>
                                <td>Startup Inc</td>
                                <td>Pune</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '.8rem', marginTop: '.75rem' }}>
                    ℹ️ Column names are flexible — variations like "Full Name", "Mobile", "Inquiry" etc. are also accepted.
                </p>
            </div>

            {/* Upload Zone */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div
                    className={`upload-zone${dragging ? ' drag' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => document.getElementById('file-input').click()}
                >
                    <input id="file-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    {file ? (
                        <>
                            <FileSpreadsheet size={48} style={{ color: 'var(--emerald)' }} />
                            <h3>{file.name}</h3>
                            <p style={{ color: 'var(--emerald)' }}>{(file.size / 1024).toFixed(1)} KB — Ready to upload</p>
                        </>
                    ) : (
                        <>
                            <UploadCloud size={48} />
                            <h3>Drag & drop your Excel file here</h3>
                            <p>or click to browse — .xlsx / .xls supported</p>
                        </>
                    )}
                </div>

                {file && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); }}>Clear</button>
                        <button className="btn btn-primary" onClick={onUpload} disabled={uploading}>
                            <UploadCloud size={15} />{uploading ? 'Processing leads…' : 'Upload & Process'}
                        </button>
                    </div>
                )}
            </div>

            {/* Result */}
            {result && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Upload Results</h2>
                        <button className="btn btn-secondary btn-sm" onClick={() => nav('/leads')}>
                            View All Leads <ArrowRight size={13} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: '.75rem 1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: 1.5 + 'rem', fontWeight: 800, color: 'var(--emerald)' }}>{result.processed}</p>
                            <p style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Processed</p>
                        </div>
                        <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: '.75rem 1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: 1.5 + 'rem', fontWeight: 800, color: 'var(--amber)' }}>{result.duplicates}</p>
                            <p style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Duplicates</p>
                        </div>
                        <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 8, padding: '.75rem 1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: 1.5 + 'rem', fontWeight: 800, color: 'var(--rose)' }}>{result.errors}</p>
                            <p style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Errors</p>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Status</th><th>Name</th><th>Email</th><th>Qualification</th><th>Score</th></tr></thead>
                            <tbody>
                                {(result.results || []).map((r, i) => (
                                    <tr key={i} className={`result-row-${r.status}`}>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>{statusIcon(r.status)} {r.status}</td>
                                        <td>{r.name || '—'}</td>
                                        <td>{r.email || '—'}</td>
                                        <td>{r.qualification || '—'}</td>
                                        <td>{r.score !== undefined ? r.score : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
