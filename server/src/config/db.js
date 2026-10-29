const mongoose = require('mongoose');
const env = require('./env');

// Cache the connection on `global` so serverless invocations (Vercel) reuse it.
const cache = global._bookleafMongo || (global._bookleafMongo = { conn: null, promise: null });

async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}

module.exports = connectDB;
