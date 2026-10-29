const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };
// Hours an *active* ticket may wait before it is flagged overdue.
const SLA_HOURS = { Critical: 24, High: 48, Medium: 72, Low: 120 };

module.exports = { CATEGORIES, PRIORITIES, STATUSES, PRIORITY_RANK, SLA_HOURS };
