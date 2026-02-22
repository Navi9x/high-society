'use strict';

const express = require('express');
const QRCode = require('qrcode');
const db = require('../db/database');
const { requireAuth } = require('../middleware/requireAuth');
const { generateToken } = require('../utils/token');

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

// ─── Dashboard ───────────────────────────────────────────────────────────────
// GET /admin
router.get('/', (req, res) => {
    const stats = db.prepare(`
    SELECT
      COUNT(*)                                        AS total,
      SUM(CASE WHEN type = 'VIP'     THEN 1 ELSE 0 END) AS vip,
      SUM(CASE WHEN type = 'General' THEN 1 ELSE 0 END) AS general,
      SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) AS voided
    FROM tickets
  `).get();

    const { q = '', filterType = '', page = 1, err = '', can = '', success = '' } = req.query;
    const limit = 50;
    const offset = (Math.max(1, parseInt(page)) - 1) * limit;

    let sql = 'FROM tickets WHERE 1=1';
    const params = [];

    if (q) {
        sql += ' AND token LIKE ?';
        params.push(q + '%');
    }
    if (filterType === 'VIP' || filterType === 'General') {
        sql += ' AND type = ?';
        params.push(filterType);
    }

    const totalRows = db.prepare(`SELECT COUNT(*) AS n ${sql}`).get(...params).n;
    const tickets = db.prepare(`SELECT * ${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    res.render('admin/index', {
        admin: req.admin,
        stats,
        tickets,
        q,
        filterType,
        page: parseInt(page),
        totalPages: Math.ceil(totalRows / limit),
        err,
        can,
        success,
    });
});

// ─── Generate Tickets ────────────────────────────────────────────────────────
// POST /admin/generate
router.post('/generate', (req, res) => {
    const existingCount = db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n;
    const maxTickets = 200;

    let vipCount = Math.max(0, parseInt(req.body.vipCount) || 0);
    let generalCount = Math.max(0, parseInt(req.body.generalCount) || 0);
    const total = vipCount + generalCount;

    if (total === 0) {
        return res.redirect('/admin?err=zero');
    }
    if (existingCount + total > maxTickets) {
        const canCreate = maxTickets - existingCount;
        return res.redirect(`/admin?err=limit&can=${canCreate}`);
    }

    const insert = db.prepare('INSERT INTO tickets (token, type) VALUES (?, ?)');

    const insertMany = db.transaction(() => {
        for (let i = 0; i < vipCount; i++)     insert.run(generateToken(), 'VIP');
        for (let i = 0; i < generalCount; i++) insert.run(generateToken(), 'General');
    });

    insertMany();
    res.redirect('/admin?success=1');
});

// ─── Ticket Detail ───────────────────────────────────────────────────────────
// GET /admin/ticket/:token
router.get('/ticket/:token', async (req, res) => {
    const ticket = db.prepare('SELECT * FROM tickets WHERE token = ?').get(req.params.token);
    if (!ticket) return res.status(404).render('404', { message: 'Ticket not found' });

    const scans = db.prepare(
        'SELECT * FROM scans WHERE ticket_id = ? ORDER BY scanned_at DESC'
    ).all(ticket.id);

    const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const qrUrl = `${BASE_URL}/t/${ticket.token}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
    });

    res.render('admin/ticket', {
        admin: req.admin,
        ticket,
        scans,
        qrDataUrl,
        qrUrl,
    });
});

// ─── Void / Unvoid ───────────────────────────────────────────────────────────
// POST /admin/ticket/:token/void
router.post('/ticket/:token/void', (req, res) => {
    const ticket = db.prepare('SELECT * FROM tickets WHERE token = ?').get(req.params.token);
    if (!ticket) return res.status(404).json({ error: 'Not found' });

    const newStatus = ticket.status === 'active' ? 'voided' : 'active';
    db.prepare('UPDATE tickets SET status = ? WHERE token = ?').run(newStatus, ticket.token);

    res.redirect(`/admin/ticket/${ticket.token}`);
});

// ─── Scanner page ────────────────────────────────────────────────────────────
// GET /admin/scanner
router.get('/scanner', (req, res) => {
    res.render('scanner', { admin: req.admin });
});

module.exports = router;
