import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { section: 'Platform' },
  { icon: '◈', label: 'Challenge Arena', to: '/challenge' },
  { icon: '◎', label: 'Dashboard', to: '/dashboard' },
  { section: 'Career' },
  { icon: '◉', label: 'Career Intelligence', to: '/career', badge: 'AI', hot: true },
  { section: 'Analytics' },
  { icon: '⬡', label: 'History', to: '/history' },
  { icon: '⚡', label: 'Glitch Stats', to: '/glitch', badge: 'new' },
];

export default function Layout({ children, priScore = '—', careerScore = null }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/auth'); };
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows: '56px 1fr', position: 'relative', zIndex: 1 }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.25 }} />
      <header style={{ gridColumn: '1 / -1', height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'rgba(8,9,13,0.92)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 15, letterSpacing: '0.04em' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⬡</div>
          PRI <span style={{ color: 'var(--muted2)', fontWeight: 400, marginLeft: 4 }}>Prompt Intelligence Platform</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(124,109,250,0.12)', border: '1px solid rgba(124,109,250,0.3)', color: 'var(--accent)', letterSpacing: '0.05em' }}>PRI: {priScore}</span>
          {careerScore !== null && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', letterSpacing: '0.05em' }}>Career: {careerScore}/100</span>
          )}
          <div style={{ position: 'relative' }}>
            <div onClick={() => setDropOpen(o => !o)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: dropOpen ? '2px solid #6366f1' : '2px solid transparent', color: '#fff', userSelect: 'none' }}>
              {initials}
            </div>
            {dropOpen && (
              <div style={{ position: 'absolute', top: 40, right: 0, width: 200, background: '#111827', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
                  {user?.role === 'admin' && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.2)', color: '#6366f1', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>Admin</span>}
                </div>
                {user?.role === 'admin' && (
                  <button onClick={() => { navigate('/admin'); setDropOpen(false); }} style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.target.style.background='rgba(99,102,241,0.1)'} onMouseLeave={e => e.target.style.background='none'}>
                    🛡 Admin Dashboard
                  </button>
                )}
                <button onClick={() => { navigate('/career'); setDropOpen(false); }} style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.target.style.background='rgba(99,102,241,0.1)'} onMouseLeave={e => e.target.style.background='none'}>
                  ▲ Career Intelligence
                </button>
                <button onClick={handleLogout} style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#f87171', fontSize: 13, textAlign: 'left', cursor: 'pointer' }} onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e => e.target.style.background='none'}>
                  ⏻ Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <nav style={{ borderRight: '1px solid var(--border)', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(15,17,23,0.7)', position: 'relative', zIndex: 1 }}>
        {NAV.map((item, i) =>
          item.section ? (
            <div key={i} style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 12px 6px', fontFamily: 'var(--mono)' }}>{item.section}</div>
          ) : (
            <NavLink key={i} to={item.to} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, textDecoration: 'none', color: isActive ? 'var(--accent)' : 'var(--muted2)', background: isActive ? 'rgba(124,109,250,0.1)' : 'transparent', border: isActive ? '1px solid rgba(124,109,250,0.2)' : '1px solid transparent', transition: 'all 0.15s' })}>
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--mono)', background: item.hot ? 'rgba(52,211,153,0.15)' : 'var(--surface2)', color: item.hot ? '#34d399' : 'var(--muted2)', padding: '2px 6px', borderRadius: 10 }}>{item.badge}</span>}
            </NavLink>
          )
        )}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: '#f87171', fontSize: 13, fontWeight: 500, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>⏻</span>
            Logout
          </button>
        </div>
      </nav>
      <main style={{ overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }} onClick={() => dropOpen && setDropOpen(false)}>
        {children}
      </main>
    </div>
  );
}
