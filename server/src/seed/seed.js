// Usage: npm run seed   (wipes users, books, tickets and re-creates the demo data)
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
const { ruleClassify } = require('../services/ai/fallback');
const data = require('./bookleaf_sample_data.json');

const AUTHOR_PASSWORD = 'Author@123';
const ADMIN_PASSWORD = 'Admin@123';
const hoursAgo = (h) => new Date(Date.now() - h * 36e5);

// Realistic demo tickets (based on the sample queries in the brief).
const DEMO_TICKETS = [
  { email: 'ananya.reddy@email.com', book: 'BK005', hours: 120, subject: 'No royalty received yet', description: 'I published Between Two Temples in July 2024 and I still have not received any royalty. It has been over 14 months. What is going on?' },
  { email: 'rohit.kapoor@email.com', book: 'BK003', hours: 50, subject: 'Royalty amount seems too low', description: 'I sold 876 copies of Code & Karma but the amount I received seems too low compared to the MRP. Can you explain how it is calculated?' },
  { email: 'priya.sharma@email.com', book: 'BK001', hours: 30, subject: 'Different ISBN on Amazon', description: 'My book is showing a different ISBN on Amazon than what is printed on the physical copy. Please check this.' },
  { email: 'sneha.kulkarni@email.com', book: 'BK013', hours: 80, subject: 'Midnight in Mysore status', description: 'It has been 3 weeks and my book is still in cover design. When will it be done?' },
  { email: 'vikram.joshi@email.com', book: 'BK006', hours: 10, subject: 'Showing Currently Unavailable on Amazon', description: 'My book Debugging Life is published but it is showing as Currently Unavailable on Amazon.' },
  { email: 'diya.chatterjee@email.com', book: null, hours: 4, subject: 'Update my author bio', description: 'Can I update my author bio and the book description on Amazon after it is already live?' },
  { email: 'kavita.deshmukh@email.com', book: 'BK016', hours: 2, subject: 'Author copies print quality', description: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.' },
];

(async () => {
  await connectDB();
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Ticket.deleteMany({}), mongoose.connection.collection('counters').deleteMany({})]);

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const authorHash = await bcrypt.hash(AUTHOR_PASSWORD, 10);

  await User.create([
    { name: 'Asha Verma', email: 'admin@bookleaf.com', passwordHash: adminHash, role: 'admin' },
    { name: 'Karan Mehta', email: 'admin2@bookleaf.com', passwordHash: adminHash, role: 'admin' },
  ]);

  const userByEmail = {};
  const bookByCode = {};
  for (const a of data.authors) {
    const user = await User.create({
      name: a.name, email: a.email, passwordHash: authorHash, role: 'author',
      authorId: a.author_id, phone: a.phone, city: a.city, joinedDate: a.joined_date,
    });
    userByEmail[a.email] = user;
    for (const b of a.books) {
      bookByCode[b.book_id] = await Book.create({
        bookId: b.book_id, author: user._id, title: b.title, isbn: b.isbn, genre: b.genre,
        publicationDate: b.publication_date, status: b.status, mrp: b.mrp,
        authorRoyaltyPerCopy: b.author_royalty_per_copy, totalCopiesSold: b.total_copies_sold,
        totalRoyaltyEarned: b.total_royalty_earned, royaltyPaid: b.royalty_paid, royaltyPending: b.royalty_pending,
        lastRoyaltyPayoutDate: b.last_royalty_payout_date, printPartner: b.print_partner, availableOn: b.available_on,
      });
    }
  }

  for (const t of DEMO_TICKETS) {
    const c = ruleClassify(t); // seeding must not spend AI quota
    const createdAt = hoursAgo(t.hours);
    await Ticket.create({
      ticketNumber: await Ticket.nextNumber(),
      author: userByEmail[t.email]._id,
      book: t.book ? bookByCode[t.book]._id : null,
      subject: t.subject, description: t.description,
      category: c.category, categorySource: 'rules', priority: c.priority, prioritySource: 'rules', aiReasoning: c.reasoning,
      createdAt, updatedAt: createdAt,
    });
  }

  console.log(`Seeded ${data.authors.length} authors, ${Object.keys(bookByCode).length} books, ${DEMO_TICKETS.length} tickets.`);
  console.log(`Admin:  admin@bookleaf.com / ${ADMIN_PASSWORD}`);
  console.log(`Author: priya.sharma@email.com / ${AUTHOR_PASSWORD}  (all authors share this password)`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
