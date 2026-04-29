import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, UploadCloud, BarChart2, PlusCircle, MessageSquare } from 'lucide-react';

import Dashboard   from './pages/Dashboard';
import Leads       from './pages/Leads';
import LeadDetail  from './pages/LeadDetail';
import Upload      from './pages/Upload';
import Capture     from './pages/Capture';
import Analytics   from './pages/Analytics';
import ChatBot     from './pages/ChatBot';
import BookMeeting from './pages/BookMeeting';

const NAV = [
    { to: '/',          icon: <LayoutDashboard />, label: 'Dashboard'    },
    { to: '/leads',     icon: <Users />,           label: 'All Leads'    },
    { to: '/chat',      icon: <MessageSquare />,   label: 'AI Chatbot'   },
    { to: '/upload',    icon: <UploadCloud />,     label: 'Upload Excel' },
    { to: '/capture',   icon: <PlusCircle />,      label: 'Add Lead'     },
    { to: '/analytics', icon: <BarChart2 />,       label: 'Analytics'    },
];

export default function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" toastOptions={{ style: { background: '#1a2235', color: '#f9fafb', border: '1px solid rgba(255,255,255,.1)' } }} />

            {/* Booking page — full screen, no sidebar */}
            <Routes>
                <Route path="/book/:leadId" element={<BookMeeting />} />
                <Route path="*" element={
                    <div className="layout">
                        {/* Sidebar */}
                        <aside className="sidebar">
                            <div className="sidebar-logo">
                                <h2>MSA Agent</h2>
                                <p>Ushnik Technologies</p>
                            </div>
                            <nav className="sidebar-nav">
                                {NAV.map(n => (
                                    <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                                        {n.icon}
                                        <span>{n.label}</span>
                                        {n.to === '/chat' && (
                                            <span style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.2)', color: 'var(--indigo)', fontSize: '.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '10px' }}>7 AI</span>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                            <div className="sidebar-footer">
                                <p>AI Lead Management</p>
                                <p style={{ marginTop: '.25rem', fontSize: '.7rem' }}>v2.0 · 2025</p>
                            </div>
                        </aside>

                        {/* Main */}
                        <main className="main-content">
                            <Routes>
                                <Route path="/"          element={<Dashboard />}  />
                                <Route path="/leads"     element={<Leads />}      />
                                <Route path="/leads/:id" element={<LeadDetail />} />
                                <Route path="/upload"    element={<Upload />}     />
                                <Route path="/capture"   element={<Capture />}    />
                                <Route path="/analytics" element={<Analytics />}  />
                                <Route path="/chat"      element={<ChatBot />}    />
                            </Routes>
                        </main>
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    );
}
