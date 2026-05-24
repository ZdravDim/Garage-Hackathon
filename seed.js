// Seeds a ready-to-demo account: a FitMe profile with measurements, plus Zara
// and Massimo Dutti accounts already connected to it. Idempotent.
const bcrypt = require('bcryptjs');
const { createDb } = require('./db');
const { writeMeasurements } = require('./src/measurements');

const EMAIL = 'demo@fitme.test';
const PASSWORD = 'demo1234';

const db = createDb(process.env.DB_PATH || 'db.sqlite');
const hash = bcrypt.hashSync(PASSWORD, 10);

function ensureUser(app) {
  let user = db.prepare('SELECT * FROM users WHERE app = ? AND email = ?').get(app, EMAIL);
  if (!user) {
    const info = db.prepare('INSERT INTO users (app, email, password_hash) VALUES (?, ?, ?)').run(app, EMAIL, hash);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    console.log(`  created ${app} user #${user.id}`);
  } else {
    console.log(`  ${app} user already exists (#${user.id})`);
  }
  return user;
}

const fitme = ensureUser('fitme');
writeMeasurements(
  db,
  fitme.id,
  { height_cm: 178, chest: 98, waist: 84, hips: 102, inseam: 81, shoulder: 45 },
  'photo'
);
console.log('  set FitMe measurements');

for (const app of ['zara', 'massimo']) {
  const store = ensureUser(app);
  db.prepare(
    `INSERT INTO fitme_links (store_user_id, store_app, fitme_user_id) VALUES (?, ?, ?)
     ON CONFLICT(store_user_id, store_app) DO UPDATE SET fitme_user_id = excluded.fitme_user_id`
  ).run(store.id, app, fitme.id);
  console.log(`  linked ${app} → FitMe`);
}

console.log(`\nSeed complete. Log in anywhere with ${EMAIL} / ${PASSWORD}`);
