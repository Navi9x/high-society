'use strict';

const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tickets.db');

// Ensure the directory exists (e.g. /data on Render's persistent disk)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT    UNIQUE NOT NULL,
    type       TEXT    NOT NULL CHECK(type IN ('VIP','General')),
    status     TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','voided')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_token  ON tickets(token);
  CREATE INDEX IF NOT EXISTS idx_tickets_type   ON tickets(type);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

  CREATE TABLE IF NOT EXISTS scans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER REFERENCES tickets(id),
    raw_token   TEXT    NOT NULL,
    scanned_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    result      TEXT    NOT NULL CHECK(result IN ('valid','invalid','voided')),
    operator    TEXT    NOT NULL DEFAULT 'admin',
    device_info TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_scans_ticket_id  ON scans(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
`);

// ─── Auto-seed admin on first run ────────────────────────────────────────────
const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
if (adminCount === 0) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (user && pass) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(pass, 12);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(user, hash);
    console.log(`✅  Auto-created admin: ${user}`);
  } else {
    console.warn('⚠️  No admins exist. Set ADMIN_USERNAME + ADMIN_PASSWORD env vars to auto-create one.');
  }
}

module.exports = db;
