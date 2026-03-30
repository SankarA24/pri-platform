import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const C = { card:'#111827', border:'#1e2a45', muted:'#64748b', text:'#e2e8f0', accent:'#6366f1', green:'#34d399', yellow:'#fbbf24', red:'#f87171' };
const CHALLENGES = { ch_001:'Responsive Layouts', ch_002:'API Integration', ch_003:'React State Management', ch_004:'CSS Architecture' };
const DIFF = { ch_001:'medium', ch_002:'hard', ch_003:'hard', ch_004:'medium' };
const priColor = (n) => n >= 0.75 ? '#34d399' : n >= 0.55 ? '#fbbf24' : '#f87171';

function DiffBadge({ id }) {
  const d = DIFF[id] || 'medium';
  const color = d === 'hard' ? '#f87171' : '#fbbf24';
  return <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`${color}18`, border:`1px solid ${color}40`, color, fontWeight:600, textTransform:'uppercase' }}>{d}</span>;
}

function PRIBar({ label, value }) {
  const pct = Math.min((value||0)*100, 100);
  const color = priColor(value||0);
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:11, color:'#64748b' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color, fontFamily:'monospace' }}>{pct.toFixed(0)}</span>
      </div>
      <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.05)' }}>
        <div style={{ height:'100%', borderRadius:2, width:`${pct}%`, background:color, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { authFetch } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    authFetch('/api/history/challenges').then(r => r.json()).then(data => {
      setHistory(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? history : history.filter(h => h.challenge_id === filter);
  const avgPRI = history.length ? history.reduce((s,h) => s + parseFloat(h.pri_total||0), 0) / history.length : 0;
  const bugRate = history.length ? history.filter(h => h.detected_bug).length / history.length : 0;
  const bestPRI = history.length ? Math.max(...history.map(h => parseFloat(h.pri_total||0))) : 0;

  if (loading) return <div style={{ color:'#64748b', padding:40 }}>Loading history...</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, fontFamily:'Inter,sans-serif' }}>
      <div>
        <div style={{ fontSize:11, color:'#64748b', fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Analytics</div>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'#e2e8f0' }}>Challenge History</h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'#64748b' }}>All your PRI challenge attempts and prompt performance over time.</p>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign:'center', padding:80, color:'#64748b' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>◈</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:8, color:'#e2e8f0' }}>No attempts yet</div>
          <div style={{ fontSize:13 }}>Complete challenges in the Challenge Arena to see your history here.</div>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
            {[['Total Attempts', history.length, '#6366f1'], ['Avg PRI Score', (avgPRI*100).toFixed(0), priColor(avgPRI)], ['Best Score', (bestPRI*100).toFixed(0), '#34d399'], ['Bug Detection', `${(bugRate*100).toFixed(0)}%`, bugRate>=0.6?'#34d399':'#f87171']].map(([label, val, color]) => (
              <div key={label} style={{ background:'#111827', border:'1px solid #1e2a45', borderRadius:12, padding:'16px 18px' }}>
                <div style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
                <div style={{ fontSize:26, fontWeight:800, color }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['all','All'], ...Object.entries(CHALLENGES)].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${filter===id?'#6366f1':'#1e2a45'}`, background:filter===id?'rgba(99,102,241,0.15)':'transparent', color:filter===id?'#6366f1':'#64748b', fontSize:12, cursor:'pointer', fontWeight:filter===id?600:400 }}>{label}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((h, i) => {
              const pri = parseFloat(h.pri_total || 0);
              return (
                <div key={i} style={{ background:'#111827', border:'1px solid #1e2a45', borderRadius:12, padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:6 }}>{CHALLENGES[h.challenge_id] || h.challenge_id}</div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <DiffBadge id={h.challenge_id} />
                        <span style={{ fontSize:11, color:'#64748b' }}>{new Date(h.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:28, fontWeight:800, color:priColor(pri), fontFamily:'monospace', lineHeight:1 }}>{(pri*100).toFixed(0)}</div>
                      <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>PRI SCORE</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <PRIBar label="Prompt Clarity" value={h.prompt_score} />
                    <PRIBar label="Bug Detection" value={h.bug_detection} />
                    <PRIBar label="Reasoning Depth" value={h.reasoning_depth} />
                  </div>
                  <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:6, fontWeight:600, background:h.detected_bug?'rgba(52,211,153,0.1)':'rgba(248,113,113,0.1)', color:h.detected_bug?'#34d399':'#f87171', border:`1px solid ${h.detected_bug?'#34d39940':'#f8717140'}` }}>
                      {h.detected_bug ? '✓ Bug Detected' : '✗ Bug Missed'}
                    </span>
                    {h.summary && <span style={{ fontSize:11, color:'#64748b', fontStyle:'italic' }}>{h.summary}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
