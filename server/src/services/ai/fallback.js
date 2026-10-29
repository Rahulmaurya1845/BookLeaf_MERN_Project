// Rule-based classifier + template drafts. Used when the LLM is down, rate-limited
// or not configured, so tickets are ALWAYS classified and admins always get a starting draft.
const { buildFacts, payoutSchedule, fmtDate, inr, monthsSince } = require('./facts');

const KEYWORDS = {
  'Royalty & Payments': ['royalt', 'payout', 'payment', 'paid', 'earning', 'bank', 'commission', 'income', 'rs ', '₹', 'amount'],
  'ISBN & Metadata Issues': ['isbn', 'barcode', 'metadata', 'wrong book', 'duplicate', 'wrong title', 'description', 'author name', 'blurb'],
  'Printing & Quality': ['print', 'misprint', 'binding', 'blurry', 'quality', 'damaged', 'defect', 'misaligned', 'reprint', 'colour', 'color', 'pages'],
  'Distribution & Availability': ['unavailable', 'amazon', 'flipkart', 'listing', 'not showing', 'out of stock', 'not available', 'store', 'listed'],
  'Book Status & Production Updates': ['status', 'production', 'typesetting', 'cover design', 'proof', 'editing', 'when will', 'delay', 'timeline', 'stage'],
};
const BASE_PRIORITY = {
  'ISBN & Metadata Issues': 'High',
  'Printing & Quality': 'High',
  'Distribution & Availability': 'High',
  'Royalty & Payments': 'Medium',
  'Book Status & Production Updates': 'Medium',
  'General Inquiry': 'Low',
};
const LADDER = ['Low', 'Medium', 'High', 'Critical'];
const bump = (p, n) => LADDER[Math.max(0, Math.min(3, LADDER.indexOf(p) + n))];

const URGENT = /(legal|lawyer|court|fraud|scam|cheat|never received|not received any|haven'?t received|still haven|urgent|immediately|asap|refund|[6-9]\s*months|1[0-9]\s*months|a year)/i;
const MINOR = /(update (my )?(bio|author bio)|change (my )?bio|can i (update|change)|how (do|can) i)/i;

function ruleClassify({ subject = '', description = '' }) {
  const text = `${subject} ${description}`.toLowerCase();
  let best = 'General Inquiry';
  let bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  let priority = BASE_PRIORITY[best];
  if (URGENT.test(text)) priority = bump(priority, 1);
  if (MINOR.test(text) && !URGENT.test(text)) priority = 'Low';
  return { category: best, priority, reasoning: 'Keyword-based classification (AI unavailable).' };
}

// Business rule applied on top of AI output too: ISBN errors are always >= High.
function applyPriorityFloor({ category, priority }, text) {
  if (category === 'ISBN & Metadata Issues' && /(wrong|different|duplicate|mismatch|error|incorrect)/i.test(text) && LADDER.indexOf(priority) < LADDER.indexOf('High')) return 'High';
  return priority;
}

const first = (name = '') => name.trim().split(/\s+/)[0] || 'there';

function templateDraft({ ticket, author, book, adminName, now = new Date() }) {
  const hi = `Hi ${first(author.name)},`;
  const title = book ? `"${book.title}"` : 'your account';
  const sign = `Warm regards,\n${adminName || 'BookLeaf Support'}\nBookLeaf Author Support`;
  const { nextDeadline } = payoutSchedule(now);
  let body;

  switch (ticket.category) {
    case 'Royalty & Payments': {
      const facts = book
        ? `For ${title}, our records show ${book.totalCopiesSold} copies sold, ${inr(book.totalRoyaltyEarned)} earned, ${inr(book.royaltyPaid)} paid and ${inr(book.royaltyPending)} pending.`
        : 'I am pulling up the royalty figures for your account.';
      const overdue = book && book.royaltyPending > 0 && !book.lastRoyaltyPayoutDate && monthsSince(book.publicationDate, now) >= 4;
      body = `Thank you for writing in, and I understand how frustrating it is to wait on royalties. ${facts} Royalties are calculated quarterly and paid within 45 days of the quarter ending, so your next payout window closes on ${fmtDate(nextDeadline)}. We pay by bank transfer, subject to a Rs 1,000 minimum (smaller balances roll over to the next quarter).${overdue ? ' Since no payout has been made yet on this book, that is not the experience we want for you; I am escalating it to our accounts team now and we will get back to you within 48 hours.' : ' I can also share a line-by-line breakdown of how net profit (MRP minus printing, platform commission and shipping, split 80/20) was calculated.'}\n\nNext step: please confirm your bank details are linked in your dashboard, and tell me if you would like the full breakdown.`;
      break;
    }
    case 'ISBN & Metadata Issues':
      body = `Thank you for flagging this. An ISBN or metadata mismatch is a serious data issue and we are treating it as high priority. I am escalating it to our production team right away, and we will get back to you within 48 hours with the corrected details${book ? ` for ${title}` : ''}.\n\nNext step: if you can send a screenshot of the listing or a photo of the copyright page, it will speed up the check.`;
      break;
    case 'Printing & Quality':
      body = `I am sorry your copies did not meet the standard you deserve. Quality issues like misprints, binding defects or colour problems are covered by a free reprint once we verify them. Could you share clear photos of the affected pages and the cover? Once verified, the reprint takes 5-7 business days.\n\nNext step: reply with the photos and we will start the verification straight away.`;
      break;
    case 'Distribution & Availability':
      body = `Thank you for letting us know. A book showing as unavailable usually points to a stock sync issue between our system and the platform${book ? `; ${title} is listed on ${(book.availableOn || []).join(', ') || 'our channels'}` : ''}. I am asking our distribution team to trigger a re-sync today, and it normally takes 24-48 hours for the listing to go live again.\n\nNext step: we will confirm here once it is back; please tell us if it is still unavailable after 48 hours.`;
      break;
    case 'Book Status & Production Updates':
      body = `Thank you for checking in. ${book ? `${title} is currently at: ${book.status}.` : 'I am checking the stage of your book.'} Our stages run from Manuscript Received through Cover Design, Typesetting, Proofreading, ISBN Assignment, Printing and Distribution Setup to Published & Live. Delays most often happen at Cover Design (awaiting approval) and Proofreading (revision rounds), and we are happy to work through these together to keep things moving.\n\nNext step: our production team will send you a specific updated timeline within 48 hours.`;
      break;
    default:
      body = `Thank you for reaching out. Metadata updates, such as a book description, can be submitted through your dashboard or by emailing the BookLeaf team, and changes usually reflect on the platforms within 3-5 business days.\n\nNext step: send us the updated text and we will take it from there.`;
  }
  return `${hi}\n\n${body}\n\n${sign}`;
}

module.exports = { ruleClassify, applyPriorityFloor, templateDraft };
