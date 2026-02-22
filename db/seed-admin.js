'use strict';

/**
 * One-time script: creates the first admin account.
 * Usage: node db/seed-admin.js <username> <password>
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const db = require('./database');

const [, , username, password] = process.argv;

if (!username || !password) {
    console.error('Usage: node db/seed-admin.js <username> <password>');
    process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

try {
    db.prepare(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)'
    ).run(username, hash);
    console.log(`✅  Admin account created: ${username}`);
} catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.error(`❌  Admin "${username}" already exists.`);
    } else {
        throw err;
    }
}
