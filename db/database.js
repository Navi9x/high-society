'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tickets.db');
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

module.exports = db;
