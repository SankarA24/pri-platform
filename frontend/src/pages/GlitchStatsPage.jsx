import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const C = { card:'#111827', border:'#1e2a45', muted:'#64748b', text:'#e2e8f0', accent:'#6366f1', green:'#34d399', yellow:'#fbbf24', red:'#f87171' };
const CHALLENGES = { ch_001:'Responsive Layouts', ch_002:'API Integration', ch_003:'React State Management', ch_004:'CSS Architecture' };
const priColor = (n) => n >= 0.75 ? '#34d399' : n >= 0.55 ? '#fbbf24' : '#f87171';

function QualityBar({ label, value, max = 1, description }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = priColor(value / (max || 1));
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</div>
          {description && <div style={{ fontSize:11, color:C.muted }}>{description}</div>}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:20, fontWeight:800, color, fontFamily:'monospace' }}>{(value*100).toFixed(0)}</div>
          <div style={{ fontSize:10, color:C.muted }}>/ 100</div>
        </div>
      </div>
      <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:4, width:`${pct}%`, background:`linear-gradient(90deg, ${color}88, ${color})`, transition:'width 1s ease', boxShadow:`0 0 8px ${color}44` }} />
      </div>
    </div>
  );
}

function RadarHex({ scores }) {
  // Simple hexagonal radar as SVG
  const labels = ['Clarity', 'Constraints', 'Output Spec', 'Edge Cases', 'Precision'];
  const cx = 110, cy = 110, r = 80;
  const angles = labels.map((_, i) => (i * 2 * Math.PI / labels.length) - Math.PI / 2);
  const toXY = (angle, radius) => ({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = (scores || [0.5,0.5,0.5,0.5,0.5]).map((s, i) => toXY(angles[i], s * r));
  const dataPath = dataPoints.map((p, i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <svg width={220} height={220} style={{ overflow:'visible' }}>
      {gridLevels.map(level => {
        const pts = angles.map(a => toXY(a, level * r));
        return <polygon key={level} points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
      })}
      {angles.map((angle, i) => {
        const end = toXY(angle, r);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
      })}
      <path d={dataPath} fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth={2} />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="#6366f1" />)}
      {angles.map((angle, i) => {
        const pos = toXY(angle, r + 18);
        return <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#64748b">{labels[i]}</text>;
      })}
    </svg>
  );
}

export default function GlitchStatsPage() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    authFetch('/api/stats/glitch').then(r => r.json()).then(data => {
      setStats(data);
      if (data?.byChallenge?.length > 0) setSelected(data.byChallenge[0].challenge_id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color:C.muted, padding:40 }}>Loading stats...</div>;

  const o = stats?.overall || {};
  const byChallenge = stats?.byChallenge || [];
  const recent = stats?.recent || [];
  const total = parseInt(o.total || 0);

  const selectedChallenge = byChallenge.find(c => c.challenge_id === selected);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, fontFamily:'Inter,sans-serif' }}>
      <div>
        <div style={{ fontSize:11, color:C.muted, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Analytics</div>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text }}>⚡ Glitch Stats</h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:C.muted }}>Detailed prompt quality breakdown across all challenges.</p>
      </div>

      {total === 0 ? (
        <div style={{ textAlign:'center', padding:80, color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⚡</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:8, color:C.text }}>No data yet</div>
          <div style={{ fontSize:13 }}>Complete challenges in the Challenge Arena to see your prompt quality analysis here.</div>
        </div>
      ) : (
        <>
          {/* Overall prompt quality */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Radar chart */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:16 }}>Overall Prompt Quality Profile</div>
              <RadarHex scores={[
                parseFloat(o.avg_prompt||0),
                parseFloat(o.avg_prompt||0) * 0.9,
                parseFloat(o.avg_prompt||0) * 0.85,
                parseFloat(o.avg_bug_detection||0) * 0.8,
                parseFloat(o.avg_reasoning||0)
              ]} />
              <div style={{ fontSize:11, color:C.muted, marginTop:8, textAlign:'center' }}>Based on {total} attempt{total>1?'s':''}</div>
            </div>

            {/* Quality breakdown bars */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:20 }}>Prompt Dimension Scores</div>
              <QualityBar label="Prompt Clarity" value={parseFloat(o.avg_prompt||0)} description="How clear and specific your prompts are" />
              <QualityBar label="Bug Detection" value={parseFloat(o.avg_bug_detection||0)} description="Ability to identify code issues" />
              <QualityBar label="Reasoning Depth" value={parseFloat(o.avg_reasoning||0)} description="Quality of technical analysis" />
              <div style={{ marginTop:16, padding:'12px 14px', borderRadius:8, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontSize:10, color:'#6366f1', fontFamily:'monospace', textTransform:'uppercase', marginBottom:4 }}>Overall PRI</div>
                <div style={{ fontSize:24, fontWeight:800, color:priColor(parseFloat(o.avg_pri||0)), fontFamily:'monospace' }}>{(parseFloat(o.avg_pri||0)*100).toFixed(0)}<span style={{ fontSize:12, color:C.muted }}> / 100</span></div>
              </div>
            </div>
          </div>

          {/* Per-challenge prompt breakdown */}
          {byChallenge.length > 0 && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text, marginRight:8 }}>Per-Challenge Breakdown</span>
                {byChallenge.map(ch => (
                  <button key={ch.challenge_id} onClick={() => setSelected(ch.challenge_id)} style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${selected===ch.challenge_id?C.accent:C.border}`, background:selected===ch.challenge_id?'rgba(99,102,241,0.15)':'transparent', color:selected===ch.challenge_id?C.accent:C.muted, fontSize:11, cursor:'pointer' }}>
                    {CHALLENGES[ch.challenge_id] || ch.challenge_id}
                  </button>
                ))}
              </div>
              {selectedChallenge && (
                <div style={{ padding:24 }}>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>{selectedChallenge.attempts_per_challenge} attempt{selectedChallenge.attempts_per_challenge>1?'s':''} on this challenge</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                    <div>
                      <QualityBar label="Prompt Clarity" value={parseFloat(selectedChallenge.avg_prompt||0)} description="Clarity and specificity of your prompts" />
                      <QualityBar label="Bug Detection Rate" value={parseFloat(selectedChallenge.avg_bug_detection||0)} description="How well you spotted the injected bug" />
                      <QualityBar label="Reasoning Depth" value={parseFloat(selectedChallenge.avg_reasoning||0)} description="Technical explanation quality" />
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>What good scores mean for this challenge:</div>
                      {[
                        ['Prompt Clarity', 'Your prompt should specify: output format, constraints, edge cases, and tech stack explicitly.'],
                        ['Bug Detection', 'Look for: event listener placement, closure issues, dependency arrays, selector mismatches.'],
                        ['Reasoning Depth', 'Explain WHY the bug causes the problem, not just WHAT the bug is.']
                      ].map(([label, tip]) => (
                        <div key={label} style={{ marginBottom:10, padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:11, fontWeight:600, color:C.text, marginBottom:3 }}>{label}</div>
                          <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent attempts mini table */}
          {recent.length > 0 && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.text }}>Recent 10 Attempts</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                    {['Challenge','PRI','Clarity','Bug Det.','Reasoning','Bug Found','Date'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, color:C.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:'11px 16px', fontSize:12, color:C.text }}>{CHALLENGES[r.challenge_id]||r.challenge_id}</td>
                      <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:priColor(r.pri_total), fontFamily:'monospace' }}>{r.pri_total?(r.pri_total*100).toFixed(0):'—'}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, color:priColor(r.prompt_score||0) }}>{r.prompt_score?(r.prompt_score*100).toFixed(0):'—'}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, color:priColor(r.bug_detection||0) }}>{r.bug_detection?(r.bug_detection*100).toFixed(0):'—'}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, color:priColor(r.reasoning_depth||0) }}>{r.reasoning_depth?(r.reasoning_depth*100).toFixed(0):'—'}</td>
                      <td style={{ padding:'11px 16px' }}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:r.detected_bug?'rgba(52,211,153,0.1)':'rgba(248,113,113,0.1)', color:r.detected_bug?C.green:C.red }}>{r.detected_bug?'✓':'✗'}</span></td>
                      <td style={{ padding:'11px 16px', fontSize:11, color:C.muted }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
