'use strict';

const jwt = require('jsonwebtoken');

/**
 * Express middleware that requires a valid admin JWT (stored in httpOnly cookie).
 * On failure, redirects to /auth/login for page requests or returns 401 for API requests.
 */
function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies.adminToken;

    if (!token) {
        return _deny(req, res);
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = payload;
        return next();
    } catch {
        return _deny(req, res);
    }
}

function _deny(req, res) {
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/auth/login');
}

module.exports = { requireAuth };
