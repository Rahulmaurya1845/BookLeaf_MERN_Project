// Author-facing ticket endpoints. Every query is scoped to req.user.
const router = require('express').Router();
const { z } = require('zod');
const Ticket = require('../models/Ticket');
const Book = require('../models/Book');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { ticketForAuthor } = require('../utils/serializers');
const { classifyTicket } = require('../services/ai');

router.use(authenticate, requireRole('author'));

const createSchema = z.object({
  bookId: z.union([z.literal('general'), z.string().regex(/^[a-f\d]{24}$/i, 'Invalid book'), z.null()]).optional(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Please describe your issue in at least 10 characters').max(5000),
  attachmentName: z.string().trim().max(200).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ author: req.user._id }).populate('book', 'bookId title').sort({ updatedAt: -1 }).lean();
  res.json({ tickets: tickets.map(ticketForAuthor) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const t = await Ticket.findOne({ _id: req.params.id, author: req.user._id }).populate('book', 'bookId title').lean();
  if (!t) throw new ApiError(404, 'Ticket not found');
  res.json({ ticket: ticketForAuthor(t) });
}));

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const { bookId, subject, description, attachmentName } = req.body;
  let book = null;
  if (bookId && bookId !== 'general') {
    book = await Book.findOne({ _id: bookId, author: req.user._id });
    if (!book) throw new ApiError(404, 'That book is not on your account');
  }

  // 1) Persist first: a ticket must never be lost because AI is down.
  const ticket = new Ticket({
    ticketNumber: await Ticket.nextNumber(),
    author: req.user._id,
    book: book ? book._id : null,
    subject,
    description,
    attachmentName,
  });
  await ticket.save();

  // 2) Classify. classifyTicket never throws (falls back to rules).
  const result = await classifyTicket({ subject, description, book });
  ticket.set({
    category: result.category,
    categorySource: result.source,
    priority: result.priority,
    prioritySource: result.source,
    aiReasoning: result.reasoning,
  });
  await ticket.save();

  await ticket.populate('book', 'bookId title');
  res.status(201).json({ ticket: ticketForAuthor(ticket) });
}));

module.exports = router;
