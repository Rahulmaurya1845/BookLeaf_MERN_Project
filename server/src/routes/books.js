const router = require('express').Router();
const Book = require('../models/Book');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { bookView } = require('../utils/serializers');

router.use(authenticate);

// Authors: only their own books. Admins: all books (optionally ?authorId=<user _id>).
router.get('/', asyncHandler(async (req, res) => {
  const filter = req.user.role === 'author' ? { author: req.user._id } : req.query.authorId ? { author: req.query.authorId } : {};
  const books = await Book.find(filter).sort({ publicationDate: -1, bookId: 1 }).lean();
  res.json({ books: books.map(bookView) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === 'author') filter.author = req.user._id; // others' books look like "not found"
  const book = await Book.findOne(filter).lean();
  if (!book) throw new ApiError(404, 'Book not found');
  res.json({ book: bookView(book) });
}));

module.exports = router;
