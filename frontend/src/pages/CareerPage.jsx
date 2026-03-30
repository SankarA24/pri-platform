import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileSetupPanel from '../components/ProfileSetupPanel';

const sid = () => {
  const k = 'career_session_id';
  let id = localStorage.getItem(k);
  if (!id) { id = 'cs_' + Math.random().toString(36).slice(2); localStorage.setItem(k, id); }
  return id;
};

const scoreColor = (n) => n >= 75 ? '#34d399' : n >= 55 ? '#fbbf24' : '#f87171';
const scoreLabel = (n) => n >= 75 ? 'Strong' : n >= 55 ? 'Developing' : 'Early Stage';

function ScoreRing({ value, size = 80 }) {
  const r = (size / 2) - 8, circ = 2 * Math.PI * r, fill = (value / 100) * circ, color = scoreColor(value);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" style={{ transition:'stroke-dasharray 1s ease', filter:`drop-shadow(0 0 6px ${color}88)` }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size*0.22} fontWeight={700} fontFamily="monospace" style={{ transform:'rotate(90deg)', transformOrigin:`${size/2}px ${size/2}px` }}>{value}</text>
    </svg>
  );
}

function Bar({ label, value, weight }) {
  const c = scoreColor(value);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'var(--muted2)', fontFamily:'var(--mono)' }}>{label}</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--mono)' }}>×{weight}</span>
          <span style={{ fontSize:12, fontWeight:700, color:c, fontFamily:'var(--mono)' }}>{value}</span>
        </div>
      </div>
      <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.05)' }}>
        <div style={{ height:'100%', borderRadius:2, width:`${value}%`, background:c, transition:'width 1s ease', boxShadow:`0 0 8px ${c}66` }} />
      </div>
    </div>
  );
}

function GapCard({ gap }) {
  const colors = { critical:'#f87171', high:'#fbbf24', medium:'#60a5fa' };
  const icons = { critical:'✕', high:'⚠', medium:'○' };
  const c = colors[gap.severity] || '#60a5fa';
  return (
    <div style={{ padding:'10px 14px', borderRadius:8, background:`${c}0d`, border:`1px solid ${c}33`, display:'flex', gap:10 }}>
      <span style={{ color:c, fontSize:12, fontWeight:700, marginTop:1, flexShrink:0 }}>{icons[gap.severity]}</span>
      <span style={{ fontSize:12, color:'var(--muted2)', lineHeight:1.5 }}>{gap.message}</span>
    </div>
  );
}

function PhaseCard({ phase }) {
  const colors = ['#7c6dfa','#f472b6','#34d399'];
  const c = colors[(phase.phase - 1) % 3];
  return (
    <div style={{ padding:'18px 20px', borderRadius:10, background:`${c}0a`, border:`1px solid ${c}22`, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div style={{ width:26, height:26, borderRadius:'50%', background:c, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{phase.phase}</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--fg)' }}>{phase.title}</div>
          <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)' }}>{phase.duration}</div>
        </div>
        <div style={{ marginLeft:'auto', fontSize:11, color:c, fontFamily:'var(--mono)', padding:'3px 8px', borderRadius:6, background:`${c}18` }}>{phase.focus}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, paddingLeft:36 }}>
        {(phase.actions||[]).map((a,i) => (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <span style={{ color:c, fontSize:10, marginTop:3, flexShrink:0 }}>▸</span>
            <span style={{ fontSize:12, color:'var(--muted2)', lineHeight:1.5 }}>{a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceLink({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', textDecoration:'none', transition:'border-color 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(124,109,250,0.4)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
      <span style={{ fontSize:10, color:item.free?'#34d399':'#fbbf24', fontFamily:'var(--mono)', padding:'2px 5px', borderRadius:4, background:item.free?'rgba(52,211,153,0.1)':'rgba(251,191,36,0.1)', flexShrink:0 }}>
        {item.free===undefined?'↗':item.free?'FREE':'PAID'}
      </span>
      <span style={{ fontSize:12, color:'var(--muted2)' }}>{item.name}</span>
      <span style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)' }}>↗</span>
    </a>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', marginBottom:12 }}>
      {!isUser && <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--accent),var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, marginRight:10, marginTop:2 }}>◉</div>}
      <div style={{ maxWidth:'75%', padding:'10px 14px', borderRadius:isUser?'14px 14px 4px 14px':'14px 14px 14px 4px', background:isUser?'rgba(124,109,250,0.18)':'rgba(255,255,255,0.04)', border:`1px solid ${isUser?'rgba(124,109,250,0.3)':'var(--border)'}`, fontSize:13, color:'var(--fg)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
        {msg.content}
      </div>
    </div>
  );
}


function generateResumeHTML(r) {
  const edu = (r.education||[]).map(e => `<div><strong>${e.degree}</strong> — ${e.institution} (${e.year})${e.gpa ? ' | GPA: '+e.gpa : ''}</div>`).join('');
  const skills = [...(r.skills?.technical||[]), ...(r.skills?.tools||[])].map(s => `<span class="skill">${s}</span>`).join('');
  const exp = (r.experience||[]).map(e => `<div><span class="job-title">${e.title}</span> — <span class="company">${e.company}</span> (${e.duration})</div>${(e.bullets||[]).map(b => `<div class="bullet">• ${b}</div>`).join('')}`).join('<br>');
  const projects = (r.projects||[]).map(p => `<div><strong>${p.name}</strong> | ${p.tech}</div><div class="proj-desc">${p.description}</div>`).join('<br>');
  const certs = (r.certifications||[]).filter(c => c.name).map(c => `<div class="cert">• ${c.name} — ${c.issuer} (${c.year})</div>`).join('');
  const acts = (r.activities||[]).map(a => `<div>• ${a}</div>`).join('');
  const contact = [r.email, r.phone, r.location].filter(Boolean).join(' · ');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${r.name} Resume</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 32px;color:#111;font-size:13px;line-height:1.5}h1{font-size:22px;margin:0 0 4px}h2{font-size:13px;border-bottom:1px solid #333;padding-bottom:3px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:0.05em}.contact{color:#555;font-size:12px}.skill{background:#f0f0f0;padding:2px 8px;border-radius:3px;font-size:11px;margin:2px}.job-title{font-weight:700}.company{color:#555}.bullet{margin:2px 0 2px 16px}.cert{margin:4px 0}.proj-desc{color:#555;font-size:12px}</style></head><body><h1>${r.name}</h1><div class="contact">${contact}</div>${r.summary ? '<h2>Summary</h2><p>'+r.summary+'</p>' : ''}${edu ? '<h2>Education</h2>'+edu : ''}${skills ? '<h2>Skills</h2><div style="display:flex;flex-wrap:wrap;gap:4px">'+skills+'</div>' : ''}${exp ? '<h2>Experience</h2>'+exp : ''}${projects ? '<h2>Projects</h2>'+projects : ''}${certs ? '<h2>Certifications</h2>'+certs : ''}${acts ? '<h2>Activities</h2>'+acts : ''}</body></html>`;
}

function generateResumeTXT(r) {
  return [
    r.name, r.email, r.phone, r.location, '',
    'SUMMARY', r.summary || '', '',
    'EDUCATION', ...(r.education||[]).map(e => `${e.degree} — ${e.institution} (${e.year})${e.gpa ? ' GPA:'+e.gpa : ''}`), '',
    'SKILLS', 'Technical: '+((r.skills?.technical||[]).join(', ')), 'Tools: '+((r.skills?.tools||[]).join(', ')), '',
    'PROJECTS', ...(r.projects||[]).map(p => p.name+' | '+p.tech+'\n'+p.description), '',
    'CERTIFICATIONS', ...(r.certifications||[]).filter(c => c.name).map(c => c.name+' — '+c.issuer+' ('+c.year+')')
  ].join('\n');
}

const TABS = ['Overview','Gaps','Roadmap','Resume','Resources'];

export default function CareerPage({ onCareerScoreUpdate }) {
  const { token } = useAuth();
  const sessionId = sid();

  // ── Persist state to localStorage so refresh doesn't lose data ──
  const [phase, setPhaseRaw] = useState(() => localStorage.getItem('career_phase') || 'chat');
  const [messages, setMessagesRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('career_messages') || '[]'); } catch { return []; }
  });
  const [results, setResultsRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('career_results') || 'null'); } catch { return null; }
  });
  const [profileReady, setProfileReadyRaw] = useState(() => localStorage.getItem('career_profile_ready') === 'true');
  const [generatedResume, setGeneratedResumeRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('career_generated_resume') || 'null'); } catch { return null; }
  });

  // Wrapped setters that also persist to localStorage
  const setPhase = (v) => { setPhaseRaw(v); localStorage.setItem('career_phase', v); };
  const setMessages = (fn) => {
    setMessagesRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      localStorage.setItem('career_messages', JSON.stringify(next));
      return next;
    });
  };
  const setResults = (v) => { setResultsRaw(v); localStorage.setItem('career_results', JSON.stringify(v)); };
  const setProfileReady = (v) => { setProfileReadyRaw(v); localStorage.setItem('career_profile_ready', String(v)); };
  const setGeneratedResume = (v) => { setGeneratedResumeRaw(v); localStorage.setItem('career_generated_resume', JSON.stringify(v)); };

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [resumeNeeded, setResumeNeeded] = useState(false);
  const [floatOpen, setFloatOpen] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);
  const chatEnd = useRef(null);

  const authHeaders = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);
  useEffect(() => {
    if (messages.length === 0 && phase === 'chat') kick();
    // Restore career score on mount if results exist
    if (results?.scores?.overall && onCareerScoreUpdate) onCareerScoreUpdate(results.scores.overall);
  }, []);

  async function kick() {
    setLoading(true);
    try {
      const res = await fetch('/api/career/chat', { method:'POST', headers:authHeaders, body:JSON.stringify({ messages:[{ role:'user', content:'hi' }], sessionId }) });
      const data = await res.json();
      setMessages([{ role:'assistant', content:data.reply }]);
      if (data.profileReady) setProfileReady(true);
      if (data.resumeNeeded) setResumeNeeded(true);
    } catch(e) {
      setMessages([{ role:'assistant', content:"Hi! I'm your Career Intelligence assistant. Tell me your name and what you're studying!" }]);
    } finally { setLoading(false); }
  }

  async function send(text) {
    if (!text.trim()) return;
    const next = [...messages, { role:'user', content:text }];
    setMessages(next); setInput(''); setLoading(true);
    try {
      const res = await fetch('/api/career/chat', { method:'POST', headers:authHeaders, body:JSON.stringify({ messages:next, sessionId }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role:'assistant', content:data.reply }]);
      if (data.profileReady) setProfileReady(true);
      if (data.resumeNeeded) setResumeNeeded(true);
    } catch(e) {
      setMessages(prev => [...prev, { role:'assistant', content:'Sorry, something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  }


  async function generateResume() {
    setGeneratingResume(true);
    try {
      const res = await fetch('/api/resume/generate', { method:'POST', headers:authHeaders, body:JSON.stringify({ messages }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedResume(data);
      setResumeNeeded(false);
    } catch(e) { alert('Resume generation failed: ' + e.message); }
    finally { setGeneratingResume(false); }
  }

  async function analyze() {
    setPhase('analyzing');
    try {
      const endpoint = token ? '/api/career/analyze/full' : '/api/career/analyze';
      const res = await fetch(endpoint, { method:'POST', headers:authHeaders, body:JSON.stringify({ messages, sessionId }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data); setPhase('results');
      if (onCareerScoreUpdate && data.scores?.overall) onCareerScoreUpdate(data.scores.overall);
    } catch(e) { console.error(e); setPhase('chat'); alert('Analysis failed: ' + e.message); }
  }

  function reset() {
    ['career_session_id','career_phase','career_messages','career_results','career_profile_ready','career_generated_resume'].forEach(k => localStorage.removeItem(k));
    setPhaseRaw('chat'); setMessagesRaw([]); setResultsRaw(null); setProfileReadyRaw(false); setGeneratedResumeRaw(null);
    setTab('Overview'); setResumeNeeded(false); setFloatOpen(false);
    setTimeout(() => kick(), 100);
  }

  if (phase === 'analyzing') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pdot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}`}</style>
      <div style={{ position:'relative', width:80, height:80 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'var(--accent)', animation:'spin 1s linear infinite' }} />
        <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'var(--accent2)', animation:'spin 1.5s linear infinite reverse' }} />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>◉</div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--fg)', marginBottom:6 }}>Running Career Analysis</div>
        <div style={{ fontSize:12, color:'var(--muted)', fontFamily:'var(--mono)' }}>{token ? '5 AI agents: profile + resume + GitHub + LeetCode…' : '4 AI agents processing your profile…'}</div>
      </div>
      <div style={{ display:'flex', gap:24 }}>
        {(token ? ['Extracting','Scoring','Gap Analysis','Resume','Roadmap'] : ['Extracting','Scoring','Gap Analysis','Roadmap']).map((s,i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', animation:`pdot 1.5s ease-in-out ${i*0.3}s infinite` }} />
            <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--mono)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === 'results' && results) {
    const { profile, scores, gapAnalysis, roadmap, resources } = results;
    const criticals = (gapAnalysis?.gaps||[]).filter(g => g.severity==='critical');
    const others = (gapAnalysis?.gaps||[]).filter(g => g.severity!=='critical');
    return (
      <>
      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Career Intelligence Report</div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0, color:'var(--fg)' }}>
              {profile?.name ? `${profile.name}'s Profile` : 'Your Career Profile'}
              <span style={{ marginLeft:12, fontSize:13, fontWeight:500, color:scoreColor(scores.overall), fontFamily:'var(--mono)', padding:'3px 10px', borderRadius:20, background:`${scoreColor(scores.overall)}18` }}>{gapAnalysis?.readinessLevel}</span>
            </h1>
            <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Target: <span style={{ color:'var(--accent)' }}>{profile?.targetRole}</span>{profile?.targetSalary && <span style={{ marginLeft:8 }}>· {profile.targetSalary}</span>}</div>
          </div>
          <button onClick={reset} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--mono)' }}>↺ Retake</button>
        </div>

        <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border)' }}>
          {TABS.map(t => <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px', border:'none', background:'transparent', color:tab===t?'var(--accent)':'var(--muted)', fontSize:13, cursor:'pointer', fontWeight:tab===t?600:400, borderBottom:tab===t?'2px solid var(--accent)':'2px solid transparent', transition:'all .15s', marginBottom:-1 }}>{t}</button>)}
        </div>

        {tab==='Overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
              <div style={{ padding:'24px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <ScoreRing value={scores.overall} size={100} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--fg)' }}>Overall Score</div>
                  <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', marginTop:2 }}>{scoreLabel(scores.overall)}</div>
                </div>
              </div>
              <div style={{ padding:'20px 24px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>Score Breakdown</div>
                <Bar label="Internship" value={scores.breakdown?.internship||0} weight="0.45" />
                <Bar label="Skills" value={scores.breakdown?.skills||0} weight="0.25" />
                <Bar label="Academic" value={scores.breakdown?.academic||0} weight="0.20" />
                <Bar label="Activities" value={scores.breakdown?.activities||0} weight="0.10" />
              </div>
              <div style={{ padding:'20px 24px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Salary Expectation</div>
                <div style={{ fontSize:13, color:'var(--muted2)', lineHeight:1.6 }}>{roadmap?.salaryRealistic}</div>
                <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--mono)', marginBottom:4 }}>MARKET RANGE</div>
                  <div style={{ fontSize:12, color:'#34d399', fontWeight:600 }}>Entry: {resources?.avgSalary?.entry}</div>
                  <div style={{ fontSize:12, color:'#fbbf24', fontWeight:600, marginTop:3 }}>Mid: {resources?.avgSalary?.mid}</div>
                </div>
              </div>
            </div>
            {(results.github||results.leetcode) && (
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {results.github && (
                  <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center' }}>
                    <span style={{ fontSize:18 }}>🐙</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)' }}>GitHub: {results.github.username}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{results.github.public_repos} repos · {results.github.total_stars} stars · {results.github.top_languages?.join(', ')}</div>
                    </div>
                  </div>
                )}
                {results.leetcode && (
                  <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center' }}>
                    <span style={{ fontSize:18 }}>🧩</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)' }}>LeetCode: {results.leetcode.username}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{results.leetcode.total_solved} solved · E:{results.leetcode.easy_solved} M:{results.leetcode.medium_solved} H:{results.leetcode.hard_solved}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ padding:'18px 22px', borderRadius:12, background:'rgba(124,109,250,0.06)', border:'1px solid rgba(124,109,250,0.2)' }}>
              <div style={{ fontSize:11, color:'var(--accent)', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>AI Assessment</div>
              <p style={{ margin:0, fontSize:13, color:'var(--muted2)', lineHeight:1.7 }}>{roadmap?.summary}</p>
            </div>
            {profile?.skills?.length > 0 && (
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Skills Detected</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {profile.skills.map(s => <span key={s} style={{ padding:'4px 10px', borderRadius:20, background:'rgba(124,109,250,0.1)', border:'1px solid rgba(124,109,250,0.2)', fontSize:11, color:'var(--accent)', fontFamily:'var(--mono)' }}>{s}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='Gaps' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {criticals.length>0 && <div><div style={{ fontSize:11, color:'#f87171', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Critical — Fix These First</div><div style={{ display:'flex', flexDirection:'column', gap:8 }}>{criticals.map((g,i)=><GapCard key={i} gap={g}/>)}</div></div>}
            {others.length>0 && <div><div style={{ fontSize:11, color:'#fbbf24', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>High / Medium Priority</div><div style={{ display:'flex', flexDirection:'column', gap:8 }}>{others.map((g,i)=><GapCard key={i} gap={g}/>)}</div></div>}
            {(gapAnalysis?.strengths||[]).length>0 && <div><div style={{ fontSize:11, color:'#34d399', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Strengths</div><div style={{ display:'flex', flexDirection:'column', gap:8 }}>{gapAnalysis.strengths.map((s,i)=><div key={i} style={{ padding:'8px 14px', borderRadius:8, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', display:'flex', gap:10, alignItems:'center' }}><span style={{ color:'#34d399', fontSize:12 }}>✓</span><span style={{ fontSize:12, color:'var(--muted2)' }}>{s.message}</span></div>)}</div></div>}
          </div>
        )}

        {tab==='Roadmap' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ padding:'14px 18px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', fontSize:13, color:'var(--muted2)', lineHeight:1.6 }}>{roadmap?.summary}</div>
            {(roadmap?.phases||[]).map((p,i)=><PhaseCard key={i} phase={p}/>)}
          </div>
        )}

        {tab==='Resume' && (
          <div>
            {results.resumeFeedback ? (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16 }}>
                  {[['Overall Score',results.resumeFeedback.overall_score,'#6366f1'],['ATS Score',results.resumeFeedback.ats_score,'#10b981']].map(([label,val,color])=>(
                    <div key={label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:10, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
                      <div style={{ fontSize:32, fontWeight:800, color }}>{val}/100</div>
                    </div>
                  ))}
                </div>
                {results.resumeFeedback.sections && (
                  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:10, padding:20 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:16 }}>Section Scores</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {Object.entries(results.resumeFeedback.sections).map(([key,val])=>{
                        const c = val>=75?'#10b981':val>=50?'#fbbf24':'#f87171';
                        return <div key={key}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:12, color:'var(--muted2)', textTransform:'capitalize' }}>{key}</span><span style={{ fontSize:12, fontWeight:700, color:c, fontFamily:'var(--mono)' }}>{val}/100</span></div><div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.05)' }}><div style={{ height:'100%', borderRadius:2, width:`${val}%`, background:c, transition:'width 1s ease' }}/></div></div>;
                      })}
                    </div>
                  </div>
                )}
                <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:16 }}>
                  <div style={{ fontSize:11, color:'#6366f1', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:8 }}>Verdict</div>
                  <div style={{ fontSize:13, color:'var(--muted2)', lineHeight:1.6 }}>{results.resumeFeedback.verdict}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:11, color:'#10b981', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:12 }}>Strengths</div>
                    {(results.resumeFeedback.strengths||[]).map((s,i)=><div key={i} style={{ fontSize:12, color:'var(--muted2)', marginBottom:8, paddingLeft:12, borderLeft:'2px solid #10b981' }}>{s}</div>)}
                  </div>
                  <div style={{ background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:11, color:'#f87171', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:12 }}>Improvements</div>
                    {(results.resumeFeedback.improvements||[]).map((s,i)=><div key={i} style={{ fontSize:12, color:'var(--muted2)', marginBottom:8, paddingLeft:12, borderLeft:'2px solid #f87171' }}>{s}</div>)}
                  </div>
                </div>
                {results.resumeFeedback.missing_keywords?.length>0 && (
                  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:12 }}>Missing Keywords for {profile?.targetRole}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {results.resumeFeedback.missing_keywords.map((kw,i)=><span key={i} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171', fontFamily:'var(--mono)' }}>{kw}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📄</div>
                <div style={{ fontSize:14, marginBottom:8 }}>No resume uploaded</div>
                <div style={{ fontSize:12 }}>Use the "Enrich Profile" panel on the chat screen to upload your resume PDF before running analysis.</div>
              </div>
            )}
          </div>
        )}

        {tab==='Resources' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24 }}>
            {[['Courses',resources?.courses],['Find Internships',resources?.internships],['Certifications',resources?.certifications]].map(([title,items])=>(
              <div key={title}>
                <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>{title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{(items||[]).map((c,i)=><ResourceLink key={i} item={c}/>)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FLOATING CHATBOT ── */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:500 }}>
        {floatOpen ? (
          <div style={{ width:340, background:'#111827', border:'1px solid #1e2a45', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.5)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'rgba(99,102,241,0.15)', borderBottom:'1px solid #1e2a45', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>◉ Career Assistant</span>
              <button onClick={()=>setFloatOpen(false)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ height:200, overflowY:'auto', padding:12 }}>
              {messages.slice(-6).map((msg,i)=><Bubble key={i} msg={msg}/>)}
              {loading && <div style={{ fontSize:11, color:'#64748b', padding:'4px 8px' }}>Thinking…</div>}
            </div>
            <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2a45', display:'flex', gap:8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(input)} placeholder="Ask or update anything…" style={{ flex:1, padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid #1e2a45', color:'#e2e8f0', fontSize:12, outline:'none' }} />
              <button onClick={()=>send(input)} disabled={!input.trim()||loading} style={{ padding:'8px 12px', borderRadius:8, background:'#6366f1', border:'none', color:'#fff', fontSize:12, cursor:'pointer', opacity:!input.trim()||loading?0.5:1 }}>↑</button>
            </div>
            <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2a45', display:'flex', gap:6, flexWrap:'wrap' }}>
              {['Update my skills','I got a new cert','Re-run analysis','Change target role'].map(q=>(
                <button key={q} onClick={()=>send(q)} style={{ fontSize:10, padding:'4px 8px', borderRadius:6, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', color:'#7c6dfa', cursor:'pointer' }}>{q}</button>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={()=>setFloatOpen(true)} style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:22, cursor:'pointer', boxShadow:'0 8px 24px rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>◉</button>
        )}
      </div>
      </>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <style>{`@keyframes pdot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
      <div>
        <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Career Intelligence</div>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--fg)' }}>Employability Analysis</h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--muted)' }}>Chat naturally — our AI collects your profile and runs a {token?'5':'4'}-agent analysis. Based on IEEE research.</p>
      </div>

      {token && <ProfileSetupPanel onUpdate={()=>{}} />}
      {generatedResume && (
        <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>📄 Generated Resume — {generatedResume.name}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{
                const html = generateResumeHTML(generatedResume);
                const blob = new Blob([html], { type:'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (generatedResume.name||'Resume').replace(/\s+/g,'_') + '_Resume.html';
                a.click();
                URL.revokeObjectURL(url);
              }} style={{ padding:'6px 14px', borderRadius:6, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>⬇ Download</button>
              <button onClick={()=>{
                const r = generatedResume;
                const text = [r.name, r.email, r.phone, r.location,'',
                  'SUMMARY', r.summary,'',
                  'EDUCATION', ...(r.education||[]).map(e=>`${e.degree} — ${e.institution} (${e.year})${e.gpa?' GPA:'+e.gpa:''}`), '',
                  'SKILLS', 'Technical: '+(r.skills?.technical||[]).join(', '), 'Tools: '+(r.skills?.tools||[]).join(', '),'',
                  'PROJECTS', ...(r.projects||[]).map(p=>`${p.name} | ${p.tech}
${p.description}`),'',
                  'CERTIFICATIONS', ...(r.certifications||[]).filter(c=>c.name).map(c=>`${c.name} — ${c.issuer} (${c.year})`)
                ].join('\n');
                navigator.clipboard.writeText(text);
                alert('Copied to clipboard!');
              }} style={{ padding:'6px 14px', borderRadius:6, background:'#1e2a45', border:'none', color:'#94a3b8', fontSize:11, cursor:'pointer' }}>Copy</button>
            </div>
          </div>

          {/* Resume Preview */}
          <div style={{ background:'#fff', borderRadius:8, padding:'24px 28px', color:'#111', fontFamily:'Arial,sans-serif', fontSize:13, lineHeight:1.5 }}>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:2 }}>{generatedResume.name}</div>
            <div style={{ color:'#555', fontSize:11, marginBottom:12 }}>{[generatedResume.email, generatedResume.phone, generatedResume.location].filter(Boolean).join(' · ')}</div>
            {generatedResume.summary && <p style={{ marginBottom:12, borderLeft:'3px solid #6366f1', paddingLeft:10, color:'#333' }}>{generatedResume.summary}</p>}
            {(generatedResume.education||[]).length>0 && <div style={{ marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #ddd', paddingBottom:3, marginBottom:6 }}>Education</div>
              {generatedResume.education.map((e,i)=><div key={i}><strong>{e.degree}</strong> — {e.institution} ({e.year}){e.gpa&&` | GPA: ${e.gpa}`}</div>)}
            </div>}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #ddd', paddingBottom:3, marginBottom:8 }}>Skills</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {[...(generatedResume.skills?.technical||[]),...(generatedResume.skills?.tools||[])].map((s,i)=><span key={i} style={{ fontSize:11, padding:'2px 7px', borderRadius:3, background:'#f0f0f0' }}>{s}</span>)}
              </div>
            </div>
            {(generatedResume.projects||[]).length>0 && <div style={{ marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #ddd', paddingBottom:3, marginBottom:6 }}>Projects</div>
              {generatedResume.projects.map((p,i)=><div key={i} style={{ marginBottom:6 }}><strong>{p.name}</strong> | <span style={{ color:'#555' }}>{p.tech}</span><div style={{ color:'#555', fontSize:12 }}>{p.description}</div></div>)}
            </div>}
            {(generatedResume.certifications||[]).filter(c=>c.name).length>0 && <div>
              <div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #ddd', paddingBottom:3, marginBottom:6 }}>Certifications</div>
              {generatedResume.certifications.filter(c=>c.name).map((c,i)=><div key={i}>• {c.name} — {c.issuer} ({c.year})</div>)}
            </div>}
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ height:420, overflowY:'auto', padding:'16px', background:'rgba(255,255,255,0.01)' }}>
          {messages.map((msg,i)=><Bubble key={i} msg={msg}/>)}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>◉</div>
              <div style={{ display:'flex', gap:4, padding:'10px 14px', borderRadius:'14px 14px 14px 4px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)' }}>
                {[0,.2,.4].map((d,i)=><div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--muted)', animation:`pdot 1.2s ease-in-out ${d}s infinite` }}/>)}
              </div>
            </div>
          )}
          <div ref={chatEnd}/>
        </div>
        <div style={{ padding:'12px 16px', background:'rgba(255,255,255,0.02)', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10 }}>
          {resumeNeeded && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'#7c6dfa' }}>📄 No resume? I can generate one from your chat</span>
              <button onClick={generateResume} disabled={generatingResume} style={{ padding:'6px 14px', borderRadius:6, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {generatingResume ? 'Generating…' : 'Generate Resume →'}
              </button>
            </div>
          )}
          {profileReady && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'#34d399' }}>✓ Profile collected — ready for full analysis</span>
              <button onClick={analyze} style={{ padding:'6px 18px', borderRadius:6, background:'linear-gradient(135deg,#34d399,#059669)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Run Analysis →</button>
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send(input)} placeholder="Tell me about yourself..." disabled={loading} style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', color:'var(--fg)', fontSize:13, outline:'none', fontFamily:'inherit' }} onFocus={e=>e.target.style.borderColor='rgba(124,109,250,0.5)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
            <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ padding:'10px 18px', borderRadius:8, background:'linear-gradient(135deg,var(--accent),var(--accent2))', border:'none', color:'#fff', fontSize:13, cursor:loading||!input.trim()?'not-allowed':'pointer', opacity:loading||!input.trim()?0.5:1, fontWeight:600 }}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}
