const Database = require('better-sqlite3');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  app           TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (app, email)
);

CREATE TABLE IF NOT EXISTS measurements (
  fitme_user_id INTEGER PRIMARY KEY,
  height_cm     REAL,
  chest         REAL,
  waist         REAL,
  hips          REAL,
  inseam        REAL,
  shoulder      REAL,
  source        TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (fitme_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS photos (
  fitme_user_id INTEGER NOT NULL,
  slot          INTEGER NOT NULL,
  filename      TEXT NOT NULL,
  PRIMARY KEY (fitme_user_id, slot),
  FOREIGN KEY (fitme_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fitme_links (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  store_user_id INTEGER NOT NULL,
  store_app     TEXT NOT NULL,
  fitme_user_id INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (store_user_id, store_app),
  FOREIGN KEY (fitme_user_id) REFERENCES users(id)
);
`;

function createDb(path = 'db.sqlite') {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDb };
