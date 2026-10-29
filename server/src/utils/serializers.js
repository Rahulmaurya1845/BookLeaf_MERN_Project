const { SLA_HOURS } = require('../constants');

const id = (x) => (x && x._id ? String(x._id) : x ? String(x) : null);

function bookView(b) {
  return {
    id: id(b),
    bookId: b.bookId,
    title: b.title,
    isbn: b.isbn,
    genre: b.genre,
    publicationDate: b.publicationDate,
    status: b.status,
    inProduction: /in production/i.test(b.status || ''),
    mrp: b.mrp,
    authorRoyaltyPerCopy: b.authorRoyaltyPerCopy,
    totalCopiesSold: b.totalCopiesSold,
    totalRoyaltyEarned: b.totalRoyaltyEarned,
    royaltyPaid: b.royaltyPaid,
    royaltyPending: b.royaltyPending,
    lastRoyaltyPayoutDate: b.lastRoyaltyPayoutDate,
    printPartner: b.printPartner,
    availableOn: b.availableOn || [],
  };
}

const bookRef = (b) => (b && b.title ? { id: id(b), bookId: b.bookId, title: b.title } : null);

// What an AUTHOR may see: no internal notes, no AI metadata, no priority.
function ticketForAuthor(t) {
  return {
    id: id(t),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    attachmentName: t.attachmentName || null,
    status: t.status,
    category: t.category,
    book: bookRef(t.book),
    responses: (t.responses || []).map((r) => ({
      id: id(r),
      from: r.from,
      authorName: r.authorName,
      message: r.message,
      createdAt: r.createdAt,
    })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function ageInfo(t) {
  const ageHours = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 36e5);
  const overdue = !!t.isActive && ageHours > (SLA_HOURS[t.priority] || 72);
  return { ageHours, overdue };
}

// What an ADMIN sees in the queue (summary) or on the detail screen (full).
function ticketForAdmin(t, { full = false } = {}) {
  const base = {
    id: id(t),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    category: t.category,
    categorySource: t.categorySource,
    priority: t.priority,
    prioritySource: t.prioritySource,
    author: t.author && t.author.name ? { id: id(t.author), name: t.author.name, email: t.author.email } : null,
    book: bookRef(t.book),
    assignedTo: t.assignedTo && t.assignedTo.name ? { id: id(t.assignedTo), name: t.assignedTo.name } : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    responseCount: (t.responses || []).length,
    ...ageInfo(t),
  };
  if (!full) return base;
  return {
    ...base,
    description: t.description,
    attachmentName: t.attachmentName || null,
    aiReasoning: t.aiReasoning,
    responses: (t.responses || []).map((r) => ({ ...r, id: id(r) })),
    internalNotes: (t.internalNotes || []).map((n) => ({ ...n, id: id(n) })),
    aiDraft: t.aiDraft && t.aiDraft.text ? t.aiDraft : null,
    bookDetails: t.book && t.book.title ? bookView(t.book) : null,
  };
}

const publicUser = (u) => ({ id: id(u), name: u.name, email: u.email, role: u.role, authorId: u.authorId || null });

module.exports = { bookView, ticketForAuthor, ticketForAdmin, publicUser };
