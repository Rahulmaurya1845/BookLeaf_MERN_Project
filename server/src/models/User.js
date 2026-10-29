const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['author', 'admin'], default: 'author', index: true },
    authorId: { type: String, index: true }, // e.g. AUTH001 (authors only)
    phone: String,
    city: String,
    joinedDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
