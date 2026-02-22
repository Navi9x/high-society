'use strict';

const { nanoid } = require('nanoid');

/**
 * Generate a cryptographically-random 32-character URL-safe token.
 * Alphabet: A-Za-z0-9_- (nanoid default)
 * Approx 192 bits of entropy — unguessable within any realistic brute-force window.
 */
function generateToken() {
    return nanoid(32);
}

module.exports = { generateToken };
