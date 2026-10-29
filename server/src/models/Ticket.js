const mongoose = require('mongoose');
const { CATEGORIES, PRIORITIES, STATUSES, PRIORITY_RANK } = require('../constants');

const { Schema } = mongoose;

const Counter = mongoose.models.Counter || mongoose.model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

const responseSchema = new Schema(
  {
    from: { type: String, enum: ['admin', 'author'], required: true },
    authorName: String,
    message: { type: String, required: true },
    aiAssisted: { type: Boolean, default: false }, // admin started from an AI draft
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const noteSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    adminName: String,
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SOURCES = ['pending', 'ai', 'rules', 'admin'];

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, unique: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', default: null },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    attachmentName: String, // UI-only attachment (file itself is not uploaded)

    status: { type: String, enum: STATUSES, default: 'Open' },
    category: { type: String, enum: CATEGORIES, default: 'General Inquiry' },
    categorySource: { type: String, enum: SOURCES, default: 'pending' },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    prioritySource: { type: String, enum: SOURCES, default: 'pending' },
    aiReasoning: String,

    // Denormalised for fast "most urgent / oldest first" sorting (set in pre-save).
    priorityRank: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    responses: [responseSchema],
    internalNotes: [noteSchema], // never serialised to authors

    aiDraft: {
      text: String,
      source: { type: String, enum: ['ai', 'template'] },
      generatedAt: Date,
    },
    firstResponseAt: Date,
    resolvedAt: Date,
  },
  { timestamps: true }
);

ticketSchema.pre('save', function (next) {
  this.priorityRank = PRIORITY_RANK[this.priority] || 2;
  this.isActive = this.status === 'Open' || this.status === 'In Progress';
  next();
});

ticketSchema.index({ isActive: -1, priorityRank: -1, createdAt: 1 });
ticketSchema.index({ author: 1, updatedAt: -1 });
ticketSchema.index({ status: 1, category: 1 });

// Generates BL-00001, BL-00002 ... and skips any number that is already taken,
// so it stays correct even if the counter gets out of sync (e.g. after re-seeding).
ticketSchema.statics.nextNumber = async function () {
  for (let i = 0; i < 20; i += 1) {
    let c;
    try {
      c = await Counter.findOneAndUpdate({ _id: 'ticket' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    } catch (e) {
      if (e.code === 11000) continue; // two requests created the counter at the same moment
      throw e;
    }
    const number = `BL-${String(c.seq).padStart(5, '0')}`;
    if (!(await this.exists({ ticketNumber: number }))) return number;
  }
  throw new Error('Could not generate a ticket number');
};

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);