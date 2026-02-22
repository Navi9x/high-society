'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// Rate limit: max 30 scan calls per minute per IP
const scanLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});

// POST /api/scan  — requires admin login
router.post('/scan', requireAuth, scanLimiter, (req, res) => {
    const rawToken = (req.body.token || '').trim();

    // Always do a DB lookup — never reveal whether "close" tokens exist
    const ticket = rawToken
        ? db.prepare('SELECT * FROM tickets WHERE token = ?').get(rawToken)
        : null;

    const deviceInfo = req.headers['user-agent'] || null;
    const operator = req.admin ? req.admin.username : 'admin';

    if (!ticket) {
        // Record invalid scan (no ticket_id)
        db.prepare(
            'INSERT INTO scans (ticket_id, raw_token, result, operator, device_info) VALUES (NULL, ?, ?, ?, ?)'
        ).run(rawToken.slice(0, 64), 'invalid', operator, deviceInfo);

        return res.json({ result: 'invalid' });
    }

    const result = ticket.status === 'voided' ? 'voided' : 'valid';

    db.prepare(
        'INSERT INTO scans (ticket_id, raw_token, result, operator, device_info) VALUES (?, ?, ?, ?, ?)'
    ).run(ticket.id, rawToken, result, operator, deviceInfo);

    const scanCount = db.prepare(
        "SELECT COUNT(*) AS n FROM scans WHERE ticket_id = ? AND result != 'invalid'"
    ).get(ticket.id).n;

    const lastScan = db.prepare(
        "SELECT scanned_at FROM scans WHERE ticket_id = ? AND id != last_insert_rowid() ORDER BY scanned_at DESC LIMIT 1"
    ).get(ticket.id);

    return res.json({
        result,
        type: ticket.type,
        status: ticket.status,
        scanCount,
        lastScan: lastScan ? lastScan.scanned_at : null,
        scannedAt: new Date().toISOString(),
    });
});

module.exports = router;
