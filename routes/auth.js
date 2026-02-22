'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();

// GET /auth/login
router.get('/login', (req, res) => {
    // Already logged in?
    const token = req.cookies && req.cookies.adminToken;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/admin');
        } catch { /* fall through */ }
    }
    res.render('login', { error: null });
});

// POST /auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: 'Username and password are required.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    // Always compare to prevent timing attacks
    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhas';
    const hash = admin ? admin.password_hash : dummyHash;
    const match = bcrypt.compareSync(password, hash);

    if (!admin || !match) {
        return res.render('login', { error: 'Invalid username or password.' });
    }

    const jwtToken = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );

    res.cookie('adminToken', jwtToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 12 * 60 * 60 * 1000, // 12 hours in ms
        // secure: true  ← uncomment when serving over HTTPS
    });

    res.redirect('/admin');
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.redirect('/auth/login');
});

module.exports = router;
