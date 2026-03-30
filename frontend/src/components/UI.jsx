import React from 'react';

/* ── SPINNER ─────────────────────────────────────────────────────────── */
export function Spinner({ size = 14 }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: `2px solid rgba(255,255,255,0.2)`,
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
      flexShrink: 0,
    }} />
  );
}

/* ── SHIMMER SKELETON ─────────────────────────────────────────────────── */
export function Skeleton({ width = '100%', height = 14, style = {} }) {
  return (
    <div style={{
      width, height,
      borderRadius: 6,
      background: 'linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  );
}

/* ── BADGE ────────────────────────────────────────────────────────────── */
export function Badge({ children, color = 'default', style = {} }) {
  const colors = {
    default: { bg: 'rgba(139,144,170,0.1)', border: 'var(--border2)', text: 'var(--muted2)' },
    accent:  { bg: 'rgba(124,109,250,0.1)', border: 'rgba(124,109,250,0.3)', text: 'var(--accent)' },
    good:    { bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.25)', text: 'var(--good)' },
    warn:    { bg: 'rgba(251,146,60,0.06)',  border: 'rgba(251,146,60,0.25)',  text: 'var(--warn)' },
    info:    { bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.25)',  text: 'var(--accent2)' },
    pink:    { bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)', text: 'var(--accent3)' },
  };
  const c = colors[color] || colors.default;
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.07em',
      padding: '3px 8px', borderRadius: 4,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </span>
  );
}

/* ── SCORE BAR ────────────────────────────────────────────────────────── */
export function ScoreBar({ val, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {label && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted2)', width: 180, flexShrink: 0 }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${val * 100}%`,
          background: color,
          transition: 'width 0.9s cubic-bezier(0.25,1,0.5,1)',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color, width: 36, textAlign: 'right' }}>
        {val.toFixed(2)}
      </span>
    </div>
  );
}

/* ── CARD ─────────────────────────────────────────────────────────────── */
export function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      border: `1px solid ${accent ? 'rgba(124,109,250,0.2)' : 'var(--border2)'}`,
      borderRadius: 12,
      background: accent
        ? 'linear-gradient(135deg, rgba(124,109,250,0.06), rgba(56,189,248,0.03))'
        : 'var(--surface)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── PANEL HEADER ─────────────────────────────────────────────────────── */
export function PanelHeader({ title, titleColor = 'var(--accent)', right, accentBg }) {
  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: accentBg || 'transparent',
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em',
        color: titleColor, textTransform: 'uppercase',
      }}>{title}</span>
      {right}
    </div>
  );
}

/* ── BUTTON ───────────────────────────────────────────────────────────── */
export function Button({ children, onClick, disabled, variant = 'primary', style = {} }) {
  const base = {
    padding: '9px 20px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)',
    letterSpacing: '0.02em', transition: 'all 0.18s',
    display: 'flex', alignItems: 'center', gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  const variants = {
    primary: { background: 'linear-gradient(135deg, var(--accent), #5b4dd4)', color: '#fff' },
    ghost:   { background: 'rgba(124,109,250,0.1)', border: '1px solid rgba(124,109,250,0.25)', color: 'var(--accent)' },
    danger:  { background: 'rgba(251,146,60,0.1)',  border: '1px solid rgba(251,146,60,0.25)',  color: 'var(--warn)' },
  };
  return (
    <button onClick={!disabled ? onClick : undefined} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}
