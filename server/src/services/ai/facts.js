// Deterministic "account facts" computed in code, not by the LLM. The model only
// phrases them, so numbers/dates in drafts are always correct.

const DAY = 864e5;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
const inr = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN')}`;

// Royalties: quarterly, paid within 45 days of quarter end.
function payoutSchedule(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3);
  const prevEnd = new Date(now.getFullYear(), q * 3, 0);
  const currEnd = new Date(now.getFullYear(), q * 3 + 3, 0);
  const prevDeadline = new Date(prevEnd.getTime() + 45 * DAY);
  const currDeadline = new Date(currEnd.getTime() + 45 * DAY);
  const nextDeadline = prevDeadline >= now ? prevDeadline : currDeadline;
  return { nextDeadline, quarterEnd: nextDeadline === prevDeadline ? prevEnd : currEnd };
}

function monthsSince(date, now = new Date()) {
  if (!date) return null;
  const d = new Date(date);
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function bookFactLines(b, now = new Date()) {
  if (!b) return [];
  const lines = [`Book: "${b.title}" (${b.bookId}), genre ${b.genre}, status: ${b.status}`];
  if (b.publicationDate) lines.push(`Published: ${fmtDate(b.publicationDate)} (${monthsSince(b.publicationDate, now)} months ago)`);
  if (b.isbn) lines.push(`ISBN on record: ${b.isbn}`);
  if (b.mrp) lines.push(`MRP: ${inr(b.mrp)}; author royalty per copy: ${inr(b.authorRoyaltyPerCopy)}`);
  lines.push(`Copies sold: ${b.totalCopiesSold}; royalty earned: ${inr(b.totalRoyaltyEarned)}; paid: ${inr(b.royaltyPaid)}; pending: ${inr(b.royaltyPending)}`);
  lines.push(`Last royalty payout: ${fmtDate(b.lastRoyaltyPayoutDate) || 'none yet'}`);
  if (b.royaltyPending > 0 && b.royaltyPending < 1000) lines.push('Pending royalty is below the Rs 1,000 threshold, so it rolls over to next quarter');
  if (b.printPartner) lines.push(`Print partner: ${b.printPartner}`);
  lines.push(`Listed on: ${(b.availableOn || []).join(', ') || 'not listed yet'}`);
  return lines;
}

// Compact view of all an author's books (used only for account-level tickets).
function accountFactLines(books = []) {
  return books.slice(0, 6).map((b) => `- "${b.title}": ${b.status}; sold ${b.totalCopiesSold}; pending ${inr(b.royaltyPending)}`);
}

function buildFacts({ book, books, now = new Date() }) {
  const { nextDeadline, quarterEnd } = payoutSchedule(now);
  const lines = [`Today: ${fmtDate(now)}`, `Next royalty payout window closes: ${fmtDate(nextDeadline)} (quarter ending ${fmtDate(quarterEnd)} + 45 days)`];
  if (book) lines.push(...bookFactLines(book, now));
  else if (books && books.length) lines.push('Author books:', ...accountFactLines(books));
  return lines.join('\n');
}

module.exports = { buildFacts, payoutSchedule, monthsSince, fmtDate, inr };
