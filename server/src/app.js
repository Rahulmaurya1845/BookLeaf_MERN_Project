const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const connectDB = require('./config/db');
const ApiError = require('./utils/ApiError');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => (!origin || env.CLIENT_URL.includes(origin) ? cb(null, true) : cb(new ApiError(403, 'Origin not allowed'))),
  })
);
app.use(express.json({ limit: '100kb' }));
if (env.NODE_ENV !== 'test') app.use(morgan('tiny'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', aiConfigured: !!env.GEMINI_API_KEY }));

// Lazy DB connection (reused across serverless invocations).
app.use('/api', async (req, res, next) => {
  try { await connectDB(); next(); } catch (e) { console.error('[db]', e.message); next(new ApiError(503, 'Database unavailable')); }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/admin', require('./routes/admin'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
