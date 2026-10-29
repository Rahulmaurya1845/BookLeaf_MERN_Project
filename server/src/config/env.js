const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  // API keys live ONLY here (server-side). They are never sent to the browser.
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS) || 12000,
};

if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
module.exports = env;
