const { z } = require('zod');
const { CATEGORIES, PRIORITIES } = require('../../constants');
const { generate } = require('./llmClient');
const { CLASSIFY_SYSTEM, classificationUser, draftSystem, draftUser } = require('./prompts');
const { ruleClassify, applyPriorityFloor, templateDraft } = require('./fallback');

const classificationSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  reasoning: z.string().max(300).optional(),
});

const parseJson = (raw) => JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());

/** Never throws. Returns { category, priority, reasoning, source: 'ai' | 'rules' }. */
async function classifyTicket({ subject, description, book }) {
  const text = `${subject} ${description}`;
  try {
    const raw = await generate({
      system: CLASSIFY_SYSTEM,
      user: classificationUser({ subject, description, book }),
      json: true,
      maxTokens: 1024, // headroom: newer models may spend part of the limit on internal thinking
      temperature: 0,
    });
    const parsed = classificationSchema.parse(parseJson(raw));
    return { ...parsed, priority: applyPriorityFloor(parsed, text), source: 'ai' };
  } catch (err) {
    console.warn(`[ai] classification fell back to rules: ${err.message}`);
    const r = ruleClassify({ subject, description });
    return { ...r, priority: applyPriorityFloor(r, text), source: 'rules' };
  }
}

/** Never throws. Returns { text, source: 'ai' | 'template' }. */
async function draftResponse({ ticket, author, book, books, adminName }) {
  try {
    const out = await generate({
      system: draftSystem({ adminName }),
      user: draftUser({ ticket, author, book, books }),
      maxTokens: 4096, // you only pay for tokens actually used
      temperature: 0.5,
    });
    if (out.length < 60) throw new Error('AI draft too short');
    return { text: out, source: 'ai' };
  } catch (err) {
    console.warn(`[ai] draft fell back to template: ${err.message}`);
    return { text: templateDraft({ ticket, author, book, adminName }), source: 'template' };
  }
}

module.exports = { classifyTicket, draftResponse };