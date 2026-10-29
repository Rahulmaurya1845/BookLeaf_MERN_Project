// Admin-only endpoints (mounted at /api/admin).
const router = require('express').Router();
const { z } = require('zod');
const Ticket = require('../models/Ticket');
const Book = require('../models/Book');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { ticketForAdmin } = require('../utils/serializers');
const { draftResponse } = require('../services/ai');
const { CATEGORIES, PRIORITIES, STATUSES } = require('../constants');

router.use(authenticate, requireRole('admin'));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const populateFull = (q) => q.populate('author', 'name email').populate('book').populate('assignedTo', 'name');

const listQuery = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigned: z.enum(['me', 'unassigned']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['urgency', 'newest', 'oldest']).default('urgency'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const SORTS = {
  urgency: { isActive: -1, priorityRank: -1, createdAt: 1 }, // active first, most urgent, then oldest
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
};

router.get('/tickets', validate(listQuery, 'query'), asyncHandler(async (req, res) => {
  const { status, category, priority, assigned, from, to, q, sort, page, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assigned === 'me') filter.assignedTo = req.user._id;
  if (assigned === 'unassigned') filter.assignedTo = null;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = new Date(to.getTime() + 864e5 - 1);
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ subject: rx }, { ticketNumber: rx }];
  }

  const [total, tickets] = await Promise.all([
    Ticket.countDocuments(filter),
    Ticket.find(filter)
      .select('-internalNotes -aiDraft')
      .populate('author', 'name email').populate('book', 'bookId title').populate('assignedTo', 'name')
      .sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({ tickets: tickets.map((t) => ticketForAdmin(t)), page, limit, total });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const active = await Ticket.find({ isActive: true }).select('priority createdAt isActive status').lean();
  const stats = { open: 0, inProgress: 0, critical: 0, high: 0, overdue: 0, resolved: 0 };
  active.forEach((t) => {
    if (t.status === 'Open') stats.open += 1; else stats.inProgress += 1;
    if (t.priority === 'Critical') stats.critical += 1;
    if (t.priority === 'High') stats.high += 1;
    if (ticketForAdmin({ ...t, responses: [] }).overdue) stats.overdue += 1;
  });
  stats.resolved = await Ticket.countDocuments({ isActive: false });
  res.json({ stats });
}));

async function loadTicket(id) {
  const t = await populateFull(Ticket.findById(id));
  if (!t) throw new ApiError(404, 'Ticket not found');
  return t;
}

router.get('/tickets/:id', asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id);
  res.json({ ticket: ticketForAdmin(t.toObject(), { full: true }) });
}));

// Status, category/priority overrides, self-assignment.
const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTo: z.enum(['me']).nullable().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

router.patch('/tickets/:id', validate(patchSchema), asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id);
  const { status, category, priority, assignedTo } = req.body;
  if (status) {
    t.status = status;
    t.resolvedAt = status === 'Resolved' || status === 'Closed' ? new Date() : undefined;
  }
  if (category && category !== t.category) { t.category = category; t.categorySource = 'admin'; t.aiDraft = undefined; } // draft was based on old category
  if (priority && priority !== t.priority) { t.priority = priority; t.prioritySource = 'admin'; }
  if (assignedTo === 'me') t.assignedTo = req.user._id;
  if (assignedTo === null) t.assignedTo = null;
  await t.save();
  const fresh = await loadTicket(t.id);
  res.json({ ticket: ticketForAdmin(fresh.toObject(), { full: true }) });
}));

// Generate (or return cached) AI draft. Cached so re-opening a ticket costs no tokens.
router.post('/tickets/:id/draft', validate(z.object({ regenerate: z.boolean().optional() })), asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id);
  if (t.aiDraft && t.aiDraft.text && !req.body.regenerate) return res.json({ draft: t.aiDraft });

  const books = t.book ? [] : await Book.find({ author: t.author._id }).limit(6).lean();
  const result = await draftResponse({ ticket: t.toObject(), author: t.author, book: t.book, books, adminName: req.user.name });
  t.aiDraft = { text: result.text, source: result.source, generatedAt: new Date() };
  await t.save();
  res.json({ draft: t.aiDraft });
}));

const respondSchema = z.object({
  message: z.string().trim().min(5, 'Response is too short').max(5000),
  status: z.enum(STATUSES).optional(),
  fromDraft: z.boolean().optional(),
});

router.post('/tickets/:id/respond', validate(respondSchema), asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id);
  const { message, status, fromDraft } = req.body;
  t.responses.push({ from: 'admin', authorName: req.user.name, message, aiAssisted: !!fromDraft });
  if (!t.firstResponseAt) t.firstResponseAt = new Date();
  if (!t.assignedTo) t.assignedTo = req.user._id;
  t.status = status || (t.status === 'Open' ? 'In Progress' : t.status);
  if (t.status === 'Resolved' || t.status === 'Closed') t.resolvedAt = new Date();
  await t.save();
  const fresh = await loadTicket(t.id);
  res.status(201).json({ ticket: ticketForAdmin(fresh.toObject(), { full: true }) });
}));

router.post('/tickets/:id/notes', validate(z.object({ text: z.string().trim().min(1).max(2000) })), asyncHandler(async (req, res) => {
  const t = await loadTicket(req.params.id);
  t.internalNotes.push({ admin: req.user._id, adminName: req.user.name, text: req.body.text });
  await t.save();
  const fresh = await loadTicket(t.id);
  res.status(201).json({ ticket: ticketForAdmin(fresh.toObject(), { full: true }) });
}));

module.exports = router;
