const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getChallenges: () => req('/challenges'),
  getChallenge: (id) => req(`/challenge/${id}`),
  startSession: (challengeId) =>
    req('/session/start', { method: 'POST', body: JSON.stringify({ challengeId }) }),
  evaluatePrompt: (data) =>
    req('/evaluate/prompt', { method: 'POST', body: JSON.stringify(data) }),
  getAIResponse: (challengeId) => req(`/challenge/${challengeId}/ai-response`),
  evaluateFeedback: (data) =>
    req('/evaluate/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getDashboard: () => req('/dashboard'),
};
