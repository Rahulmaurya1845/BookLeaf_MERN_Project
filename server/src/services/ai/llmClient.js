// Thin Gemini REST client (free tier). Handles: missing key, timeout, one retry on
// 429/5xx, cut-off answers, and a tiny circuit breaker so a dead API never slows
// down ticket creation.
const env = require('../../config/env');

class AIUnavailableError extends Error {}

const BREAKER = { failures: 0, openUntil: 0 };
const MAX_FAILURES = 3;
const COOLDOWN_MS = 60_000;

const endpoint = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;

async function callOnce(body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Include Google's own error message so problems are easy to diagnose in the log.
      const errBody = await res.json().catch(() => ({}));
      const reason = (errBody?.error?.message || '').slice(0, 160);
      const e = new AIUnavailableError(`Gemini ${res.status}${reason ? `: ${reason}` : ''}`);
      e.retryable = res.status === 429 || res.status >= 500; // only retry rate limits / server errors
      throw e;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((p) => p.text || '').join('').trim();
    if (!text) throw new AIUnavailableError(`Empty AI response (finishReason: ${candidate?.finishReason || 'unknown'})`);
    // Never show a half-written reply: treat a cut-off answer as a failure so the safe fallback is used.
    if (candidate?.finishReason === 'MAX_TOKENS') throw new AIUnavailableError('AI answer was cut off (MAX_TOKENS)');
    return text;
  } catch (err) {
    if (err.name === 'AbortError') {
      // Timeouts are NOT retried: a second long wait would only make the user wait longer.
      const e = new AIUnavailableError(`AI request timed out after ${timeoutMs / 1000}s (model: ${env.GEMINI_MODEL})`);
      e.retryable = false;
      throw e;
    }
    throw err instanceof AIUnavailableError ? err : new AIUnavailableError(err.message);
  } finally {
    clearTimeout(timer);
  }
}

async function generate({ system, user, json = false, maxTokens = 600, temperature = 0.4, timeoutMs = env.AI_TIMEOUT_MS }) {
  if (!env.GEMINI_API_KEY) throw new AIUnavailableError('GEMINI_API_KEY not configured');
  if (Date.now() < BREAKER.openUntil) throw new AIUnavailableError('AI temporarily disabled (circuit open)');

  const generationConfig = { temperature, maxOutputTokens: maxTokens };
  if (json) generationConfig.responseMimeType = 'application/json';
  if (/2\.5/.test(env.GEMINI_MODEL)) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // 2.5 models only: no hidden "thinking" tokens
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig,
  };

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await callOnce(body, timeoutMs);
      BREAKER.failures = 0;
      return text;
    } catch (err) {
      lastErr = err;
      if (!err.retryable) break;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  BREAKER.failures += 1;
  if (BREAKER.failures >= MAX_FAILURES) BREAKER.openUntil = Date.now() + COOLDOWN_MS;
  throw lastErr;
}

module.exports = { generate, AIUnavailableError };