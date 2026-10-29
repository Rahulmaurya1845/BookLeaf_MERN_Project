const { CATEGORIES, PRIORITIES } = require('../../constants');
const { COMPANY, TONE, POLICIES, EXAMPLES } = require('./knowledge');
const { buildFacts } = require('./facts');

const clip = (s = '', n) => (s.length > n ? `${s.slice(0, n)}...` : s);

// ---- 1. Classification + priority (small, cheap, no knowledge base needed) ----
const CLASSIFY_SYSTEM = `You triage support tickets for BookLeaf Publishing, a self-publishing company. Return ONLY a JSON object, no prose.

CATEGORIES (pick exactly one):
${CATEGORIES.map((c) => `- ${c}`).join('\n')}

Category hints: royalty amounts/payments/bank -> Royalty & Payments; ISBN, wrong title/author/description on a listing -> ISBN & Metadata Issues; misprints, binding, blurry, damaged copies, reprint -> Printing & Quality; unavailable/not showing on Amazon/Flipkart/store -> Distribution & Availability; where is my book, stage, delay, cover/typesetting/proof -> Book Status & Production Updates; everything else -> General Inquiry.

PRIORITY (pick exactly one of ${PRIORITIES.join(', ')}):
- Critical: money unpaid for many months (about 6+), legal/fraud threats, book wrongly live/removed, data integrity affecting sales, author very distressed with a hard deadline.
- High: ISBN errors, no royalty for 3+ months, defective printed copies, book unavailable on a sales platform.
- Medium: production status questions, royalty calculation questions, routine problems.
- Low: general questions, cosmetic or optional updates (e.g. update bio), how-to questions.

JSON shape: {"category": "...", "priority": "...", "reasoning": "max 20 words"}`;

function classificationUser({ subject, description, book }) {
  return [
    `Book: ${book ? `${book.title} (status: ${book.status})` : 'General / Account level'}`,
    `Subject: ${clip(subject, 150)}`,
    `Message: ${clip(description, 1200)}`,
  ].join('\n');
}

// ---- 2. Draft response (knowledge base trimmed to the ticket's category) ----
function draftSystem({ adminName }) {
  return `You are a senior author-support representative at BookLeaf Publishing writing a reply to an author. You write as a real, warm, competent person, never as an AI.

${COMPANY}

${TONE}

HARD RULES
- Use ONLY the policies and ACCOUNT FACTS provided. Never invent numbers, dates, ticket IDs or policies. If a fact is missing, say the team will confirm it and give a timeline.
- Plain text only. No markdown, no headings, no emojis. 110-190 words.
- Open with "Hi <author first name>," and acknowledge their concern in the first sentence.
- Mention concrete figures/dates from ACCOUNT FACTS where relevant (e.g. pending royalty, next payout date, book status).
- Close with one clear next step, then sign off exactly:
Warm regards,
${adminName || 'BookLeaf Support'}
BookLeaf Author Support`;
}

function draftUser({ ticket, author, book, books }) {
  const category = ticket.category;
  // Only the last 3 messages, each clipped: avoids sending the whole ticket history.
  const history = (ticket.responses || []).slice(-3).map((r) => `${r.from.toUpperCase()}: ${clip(r.message, 400)}`);
  return [
    `AUTHOR: ${author.name}`,
    `CATEGORY: ${category}`,
    `POLICY:\n${POLICIES[category] || POLICIES['General Inquiry']}`,
    `CALIBRATION (guidance only, do not copy): ${EXAMPLES[category] || EXAMPLES['General Inquiry']}`,
    `ACCOUNT FACTS:\n${buildFacts({ book, books })}`,
    history.length ? `RECENT MESSAGES:\n${history.join('\n')}` : '',
    `TICKET SUBJECT: ${clip(ticket.subject, 150)}`,
    `TICKET MESSAGE: ${clip(ticket.description, 1500)}`,
    'Write the reply now.',
  ].filter(Boolean).join('\n\n');
}

module.exports = { CLASSIFY_SYSTEM, classificationUser, draftSystem, draftUser };
