import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.js';
import { Spinner, Skeleton, Badge, ScoreBar, Card, PanelHeader, Button } from '../components/UI.jsx';

const SCORE_COLORS = ['#7c6dfa', '#38bdf8', '#f472b6', '#fb923c', '#4ade80'];

const DIFF_COLOR = { easy: 'good', medium: 'warn', hard: 'pink' };

/* ── CODE HIGHLIGHTER (simple) ──────────────────────────────────────── */
function CodeLine({ text, isGlitch }) {
  const parts = text.split(/(\b(?:const|let|var|function|class|import|export|from|return|if|else|async|await|try|catch|new|this|true|false|null|undefined)\b|'[^']*'|"[^"]*"|`[^`]*`|\/\/.*$|\b\d+\b)/g);
  return (
    <span style={{
      display: 'block', whiteSpace: 'pre', lineHeight: 1.8,
      ...(isGlitch ? {
        background: 'rgba(251,146,60,0.10)',
        borderLeft: '3px solid var(--warn)',
        paddingLeft: 8, marginLeft: -8,
        animation: 'glitchFlicker 3s infinite',
      } : {}),
    }}>
      {parts.map((seg, i) => {
        if (/^(const|let|var|function|class|import|export|from|return|if|else|async|await|try|catch|new|this|true|false|null|undefined)$/.test(seg))
          return <span key={i} style={{ color: '#c792ea' }}>{seg}</span>;
        if (/^['"`]/.test(seg))
          return <span key={i} style={{ color: '#c3e88d' }}>{seg}</span>;
        if (/^\/\//.test(seg))
          return <span key={i} style={{ color: '#546e7a', fontStyle: 'italic' }}>{seg}</span>;
        if (/^\d+$/.test(seg))
          return <span key={i} style={{ color: '#f78c6c' }}>{seg}</span>;
        return <span key={i}>{seg}</span>;
      })}
    </span>
  );
}

function CodeBlock({ code }) {
  const lines = code.split('\n');
  return (
    <div style={{
      background: '#07080c', border: '1px solid var(--border)',
      borderRadius: 10, padding: '16px 20px',
      fontFamily: 'var(--mono)', fontSize: 12, overflowX: 'auto',
      maxHeight: 360, overflowY: 'auto',
    }}>
      {lines.map((line, i) => {
        const isGlitch = line.includes('← BUG');
        return <CodeLine key={i} text={line} isGlitch={isGlitch} />;
      })}
    </div>
  );
}

/* ── CHALLENGE SELECTOR ─────────────────────────────────────────────── */
function ChallengeSelector({ challenges, selected, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
      {challenges.map(c => (
        <div key={c.id} onClick={() => onSelect(c)}
          style={{
            border: `1px solid ${selected?.id === c.id ? 'rgba(124,109,250,0.45)' : 'var(--border2)'}`,
            background: selected?.id === c.id ? 'rgba(124,109,250,0.07)' : 'var(--surface)',
            borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Badge color={DIFF_COLOR[c.difficulty]}>{c.difficulty}</Badge>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
              avg {c.avgScore}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{c.category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.tags.slice(0,3).map(t => <Badge key={t}>{t}</Badge>)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── EVAL PANEL ─────────────────────────────────────────────────────── */
function EvalPanel({ result }) {
  return (
    <Card className="animate-fadeUp">
      <PanelHeader
        title="Prompt Analysis"
        titleColor="var(--accent2)"
        accentBg="linear-gradient(90deg, rgba(56,189,248,0.04), transparent)"
        right={
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{result.overall.toFixed(2)}</span>
        }
      />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {result.scores.map((s, i) => (
          <ScoreBar key={s.label} label={s.label} val={s.val} color={SCORE_COLORS[i]} />
        ))}
        {result.strengths?.length > 0 && (
          <div style={{
            border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8,
            background: 'rgba(74,222,128,0.04)', padding: '14px 16px',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--good)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>✓ Strengths</div>
            {result.strengths.map((s, i) => (
              <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted2)', padding: '3px 0', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--good)' }}>+</span>{s}
              </div>
            ))}
          </div>
        )}
        {result.issues?.length > 0 && (
          <div style={{
            border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8,
            background: 'rgba(251,146,60,0.04)', padding: '14px 16px',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--warn)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>⚠ Missing Elements</div>
            {result.issues.map((iss, i) => (
              <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted2)', padding: '3px 0', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--warn)' }}>→</span>{iss}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── PRI PANEL ──────────────────────────────────────────────────────── */
function PRIPanel({ pri }) {
  const tier = pri.total >= 0.8 ? 'EXPERT' : pri.total >= 0.65 ? 'PROFICIENT' : 'DEVELOPING';
  const scores = [
    { name: 'Prompt Clarity', val: pri.promptClarity, color: '#7c6dfa' },
    { name: 'Bug Detection', val: pri.bugDetection, color: '#38bdf8' },
    { name: 'Reasoning Depth', val: pri.reasoningDepth, color: '#f472b6' },
  ];
  return (
    <Card className="animate-fadeUp3">
      <PanelHeader
        title="Prompt Intelligence Score (PRI)"
        titleColor="var(--accent)"
        accentBg="linear-gradient(90deg, rgba(124,109,250,0.06), transparent)"
        right={<Badge color="accent">{tier}</Badge>}
      />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {scores.map(s => (
            <div key={s.name} style={{
              border: '1px solid var(--border)', borderRadius: 10,
              background: 'var(--surface2)', padding: 16,
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.06em', marginBottom: 8 }}>{s.name}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', marginBottom: 8 }}>{s.val.toFixed(2)}</div>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.val * 100}%`, background: s.color, borderRadius: 2, transition: 'width 1s cubic-bezier(0.25,1,0.5,1)' }} />
              </div>
            </div>
          ))}
        </div>
        {pri.summary && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted2)',
            padding: '10px 14px', background: 'var(--surface2)',
            borderRadius: 8, border: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <span>◎ {pri.summary}</span>
            <span style={{ color: pri.detected ? 'var(--good)' : 'var(--warn)', flexShrink: 0 }}>
              {pri.detected ? '✓ Bug detected' : '✗ Bug missed'}
            </span>
          </div>
        )}
        <div style={{
          padding: '18px 20px', borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(124,109,250,0.08), rgba(56,189,248,0.06))',
          border: '1px solid rgba(124,109,250,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Overall PRI Score</div>
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2, fontFamily: 'var(--mono)' }}>Clarity · Detection · Reasoning</div>
          </div>
          <div style={{
            fontSize: 32, fontWeight: 800, fontFamily: 'var(--mono)',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{pri.total.toFixed(2)}</div>
        </div>
      </div>
    </Card>
  );
}

/* ── MAIN PAGE ──────────────────────────────────────────────────────── */
export default function ChallengePage({ onPRIUpdate }) {
  const [challenges, setChallenges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [aiCode, setAiCode] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [pri, setPri] = useState(null);
  const mainRef = useRef(null);

  useEffect(() => {
    api.getChallenges().then(setChallenges).catch(console.error);
  }, []);

  async function handleSelectChallenge(c) {
    setSelected(c);
    setEvalResult(null);
    setAiCode(null);
    setPri(null);
    setPrompt('');
    setFeedback('');
    const { sessionId } = await api.startSession(c.id);
    setSessionId(sessionId);
  }

  async function handleEvaluate() {
    if (!prompt.trim() || !selected) return;
    setEvalLoading(true);
    setEvalResult(null);
    setAiCode(null);
    setPri(null);
    try {
      const result = await api.evaluatePrompt({ prompt, challengeId: selected.id, sessionId });
      const colors = SCORE_COLORS;
      result.scores = result.scores.map((s, i) => ({ ...s, color: colors[i] }));
      setEvalResult(result);
      // Load AI code
      const { code } = await api.getAIResponse(selected.id);
      setAiCode(code);
    } catch (err) {
      alert('Evaluation failed: ' + err.message);
    } finally {
      setEvalLoading(false);
    }
  }

  async function handleFeedback() {
    if (!feedback.trim() || !selected) return;
    setFbLoading(true);
    try {
      const result = await api.evaluateFeedback({ feedback, challengeId: selected.id, sessionId });
      setPri(result);
      onPRIUpdate?.(result.total);
      setTimeout(() => mainRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 100);
    } catch (err) {
      alert('Feedback evaluation failed: ' + err.message);
    } finally {
      setFbLoading(false);
    }
  }

  const hints = ['+ Input/Output Format', '+ Complexity Constraints', '+ Edge Cases', '+ Error Handling', '+ Code Style'];

  return (
    <div ref={mainRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Prompt Engineering Challenge</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 4 }}>Pick a web dev challenge and craft a prompt that maximally controls AI output quality</div>
      </div>

      {/* Challenge grid */}
      {challenges.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} height={100} />)}
        </div>
      ) : (
        <ChallengeSelector challenges={challenges} selected={selected} onSelect={handleSelectChallenge} />
      )}

      {/* Selected challenge detail */}
      {selected && (
        <Card className="animate-fadeUp">
          <PanelHeader
            title={`${selected.category} · ${selected.id}`}
            titleColor="var(--accent)"
            accentBg="linear-gradient(90deg, rgba(124,109,250,0.04), transparent)"
            right={
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge color={DIFF_COLOR[selected.difficulty]}>{selected.difficulty}</Badge>
                <Badge>{selected.attempts.toLocaleString()} attempts</Badge>
              </div>
            }
          />
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>{selected.task}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.tags.map(t => <Badge key={t}>{t}</Badge>)}
            </div>
          </div>
        </Card>
      )}

      {/* Prompt input */}
      {selected && (
        <div style={{
          border: '1px solid var(--border2)', borderRadius: 12,
          background: 'var(--surface)', overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Prompt</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {hints.map(h => (
                <button key={h} onClick={() => setPrompt(p => p + (p.endsWith('\n') || !p ? '' : '\n') + h.replace('+ ', '') + ': ')}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 8px', borderRadius: 4,
                    background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted2)',
                    transition: 'all 0.15s',
                  }}>{h}</button>
              ))}
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Write a prompt that instructs the AI to ${selected.task.toLowerCase().replace('design a prompt that ', '').replace('write a prompt that ', '').replace('craft a prompt to ', '')}...`}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', padding: '16px 20px', fontFamily: 'var(--mono)',
              fontSize: 13, color: 'var(--text)', lineHeight: 1.7, minHeight: 130,
            }}
          />
          <div style={{
            padding: '10px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              {prompt.length} chars · {prompt.split(/\s+/).filter(Boolean).length} words
            </span>
            <Button onClick={handleEvaluate} disabled={evalLoading || !prompt.trim()}>
              {evalLoading ? <><Spinner /> Evaluating…</> : '▶ Evaluate Prompt'}
            </Button>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {evalLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[100, 80, 60, 90, 70].map((w, i) => <Skeleton key={i} width={`${w}%`} />)}
        </div>
      )}

      {/* Eval result */}
      {evalResult && <EvalPanel result={evalResult} />}

      {/* AI Response + Glitch */}
      {aiCode && (
        <Card className="animate-fadeUp2">
          <PanelHeader
            title="AI-Generated Response"
            titleColor="var(--accent3)"
            accentBg="linear-gradient(90deg, rgba(244,114,182,0.04), transparent)"
            right={
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 8px', borderRadius: 4,
                background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
                color: 'var(--warn)', animation: 'glitchFlicker 3s infinite',
              }}>⚡ Glitch Injected</span>
            }
          />
          <div style={{ padding: 20 }}>
            <CodeBlock code={aiCode} />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Identify the Bug — Explain What's Wrong and Why
              </div>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Describe the bug you found in the AI's response..."
                style={{
                  width: '100%', background: '#07080c', border: '1px solid var(--border2)',
                  borderRadius: 8, outline: 'none', resize: 'none', padding: '12px 14px',
                  fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', lineHeight: 1.7, minHeight: 80,
                  transition: 'border-color 0.2s',
                }}
              />
              <Button variant="ghost" onClick={handleFeedback} disabled={fbLoading || !feedback.trim()} style={{ marginTop: 10 }}>
                {fbLoading ? <><Spinner size={12} /> Analyzing…</> : 'Submit Analysis →'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* PRI Score */}
      {pri && <PRIPanel pri={pri} />}
    </div>
  );
}
