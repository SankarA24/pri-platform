import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Skeleton, Badge, ScoreBar, Card, PanelHeader } from '../components/UI.jsx';

const TIER = (s) => s >= 0.8 ? ['EXPERT', '#4ade80'] : s >= 0.65 ? ['PROFICIENT', '#38bdf8'] : ['DEVELOPING', '#fb923c'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(() => setData({
        totalSessions: 0, avgPRI: '0.00',
        avgPromptClarity: '0.00', bugDetectionRate: '0.00', sessions: []
      }))
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    { label: 'Total Sessions', val: data.totalSessions, sub: 'all time' },
    { label: 'Avg PRI Score', val: data.avgPRI, sub: 'across sessions' },
    { label: 'Prompt Clarity', val: data.avgPromptClarity, sub: 'avg score' },
    { label: 'Bug Detection', val: data.bugDetectionRate, sub: 'avg score' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 4 }}>Your prompt engineering performance overview</div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} height={90} />) :
          stats.map((s, i) => (
            <div key={i} style={{
              border: '1px solid var(--border)', borderRadius: 10,
              background: 'var(--surface)', padding: 18,
              transition: 'all 0.18s',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))
        }
      </div>

      {/* Recent sessions */}
      <Card>
        <PanelHeader title="Recent Sessions" titleColor="var(--accent)" />
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} height={54} />) :
            data?.sessions?.length === 0 ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
                No sessions yet. Complete a challenge to see results.
              </div>
            ) :
            data?.sessions?.map((s, i) => {
              const [tierLabel, tierColor] = TIER(s.pri.total);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', width: 60 }}>
                    {s.challengeId}
                  </span>
                  <div style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ScoreBar val={s.pri.promptClarity} color="#7c6dfa" />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: s.pri.detected ? 'var(--good)' : 'var(--warn)' }}>
                    {s.pri.detected ? '✓ bug' : '✗ bug'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: tierColor }}>
                    {s.pri.total.toFixed(2)}
                  </span>
                  <Badge style={{ color: tierColor, borderColor: tierColor + '44', background: tierColor + '11' }}>{tierLabel}</Badge>
                </div>
              );
            })
          }
        </div>
      </Card>

      {/* Prompt tips */}
      <Card>
        <PanelHeader title="Prompt Engineering Tips" titleColor="var(--accent3)" />
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[
            ['Always specify I/O format', 'Describe exact input types and expected output structure.'],
            ['Include complexity constraints', 'State time/space requirements like O(n) or O(1) space.'],
            ['Request edge case handling', 'Explicitly ask for null checks, empty states, error cases.'],
            ['Specify tech stack clearly', 'Name frameworks, versions, and style conventions to use.'],
          ].map(([title, desc]) => (
            <div key={title} style={{
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '14px 16px', background: 'var(--surface2)',
            }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
