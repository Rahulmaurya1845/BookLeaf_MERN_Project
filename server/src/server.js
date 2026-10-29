const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

connectDB()
  .then(() => app.listen(env.PORT, () => console.log(`BookLeaf API running on http://localhost:${env.PORT}  (AI: ${env.GEMINI_API_KEY ? 'Gemini' : 'rules/template fallback'})`)))
  .catch((err) => { console.error('Could not connect to MongoDB:', err.message); process.exit(1); });
