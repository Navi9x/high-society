'use strict';

const express = require('express');
const QRCode = require('qrcode');
const db = require('../db/database');

const router = express.Router();

// GET /t/:token  — public ticket page (no auth required)
router.get('/:token', async (req, res) => {
    const token = req.params.token;
    const ticket = db.prepare('SELECT * FROM tickets WHERE token = ?').get(token);

    if (!ticket) {
        return res.status(404).render('404', { message: 'Ticket not found or invalid link.' });
    }

    const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const qrUrl = `${BASE_URL}/t/${ticket.token}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'H',
        width: 500,
        margin: 2,
    });

    res.render('ticket-public', {
        ticket,
        qrDataUrl,
        qrUrl,
    });
});

module.exports = router;
