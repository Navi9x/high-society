'use strict';

const express   = require('express');
const rateLimit = require('express-rate-limit');
const db        = require('../db/database');
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

  const ticket = rawToken
    ? db.prepare('SELECT * FROM tickets WHERE token = ?').get(rawToken)
    : null;

  const deviceInfo = req.headers['user-agent'] || null;
  const operator   = req.admin ? req.admin.username : 'admin';

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!ticket) {
    db.prepare(
      'INSERT INTO scans (ticket_id, raw_token, result, operator, device_info) VALUES (NULL, ?, ?, ?, ?)'
    ).run(rawToken.slice(0, 64), 'invalid', operator, deviceInfo);
    return res.json({ result: 'invalid' });
  }

  // ── Voided ticket ──────────────────────────────────────────────────────────
  if (ticket.status === 'voided') {
    db.prepare(
      'INSERT INTO scans (ticket_id, raw_token, result, operator, device_info) VALUES (?, ?, ?, ?, ?)'
    ).run(ticket.id, rawToken, 'voided', operator, deviceInfo);
    return res.json({ result: 'voided', type: ticket.type });
  }

  // ── Check if already scanned (first valid scan locks the QR) ───────────────
  const previousValidScan = db.prepare(
    "SELECT scanned_at FROM scans WHERE ticket_id = ? AND result = 'valid' ORDER BY scanned_at ASC LIMIT 1"
  ).get(ticket.id);

  if (previousValidScan) {
    // QR already used — record the attempt but block entry
    db.prepare(
      'INSERT INTO scans (ticket_id, raw_token, result, operator, device_info) VALUES (?, ?, ?, ?, ?)'
    ).run(ticket.id, rawToken, 'invalid', operator, deviceInfo + ' [RE-SCAN BLOCKED]');
    return res.json({
      result:       'used',
      type:         ticket.type,
      firstScanned: previousValidScan.scanned_at,
    });
  }

  // ── First valid scan ───────────────────────────────────────────────────────
  db.prepare(
    'INSERT INTO scans (ticket_id, raw_token, result, operator, device_info) VALUES (?, ?, ?, ?, ?)'
  ).run(ticket.id, rawToken, 'valid', operator, deviceInfo);

  return res.json({
    result:    'valid',
    type:      ticket.type,
    scannedAt: new Date().toISOString(),
  });
});

module.exports = router;
