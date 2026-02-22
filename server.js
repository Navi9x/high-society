'use strict';

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Initialise DB (runs migrations on startup)
require('./db/database');

const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const scanRouter = require('./routes/scan');
const publicRouter = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Trust proxy (needed for rate-limiter behind nginx/reverse proxy) ─────────
app.set('trust proxy', 1);

// ─── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static assets ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body / cookie parsers ───────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// ─── Global light rate-limit (protect all routes) ────────────────────────────
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/api', scanRouter);
app.use('/t', publicRouter);

// Root → redirect to admin dashboard (will bounce to login if not authed)
app.get('/', (req, res) => res.redirect('/admin'));

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('404', { message: 'Page not found.' });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('404', { message: 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅  Ticket server running → http://localhost:${PORT}`);
    console.log(`    Admin dashboard  → http://localhost:${PORT}/admin`);
    console.log(`    Scanner page     → http://localhost:${PORT}/admin/scanner`);
});
