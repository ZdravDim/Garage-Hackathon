const bcrypt = require('bcryptjs');
const { readMeasurements } = require('./measurements');

// Returns the linked FitMe user id for a store user, or null.
function linkedFitmeUserId(db, storeUserId, storeApp) {
  const row = db
    .prepare('SELECT fitme_user_id FROM fitme_links WHERE store_user_id = ? AND store_app = ?')
    .get(storeUserId, storeApp);
  return row ? row.fitme_user_id : null;
}

function linkStatus(db, storeUserId, storeApp) {
  const fitmeId = linkedFitmeUserId(db, storeUserId, storeApp);
  if (!fitmeId) return { linked: false };
  const fitme = db.prepare('SELECT email FROM users WHERE id = ?').get(fitmeId);
  const measurements = readMeasurements(db, fitmeId);
  return {
    linked: true,
    fitmeEmail: fitme ? fitme.email : null,
    hasMeasurements: !!measurements,
  };
}

// POST /api/:app/link — verify FitMe credentials, then link.
function createLink(db, req, res) {
  const storeApp = req.params.app;
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const fitme = db.prepare('SELECT * FROM users WHERE app = ? AND email = ?').get('fitme', email);
  if (!fitme || !bcrypt.compareSync(password, fitme.password_hash)) {
    return res.status(401).json({ error: 'Invalid FitMe email or password' });
  }

  db.prepare(
    `INSERT INTO fitme_links (store_user_id, store_app, fitme_user_id)
     VALUES (?, ?, ?)
     ON CONFLICT(store_user_id, store_app) DO UPDATE SET fitme_user_id = excluded.fitme_user_id`
  ).run(req.user.id, storeApp, fitme.id);

  res.json(linkStatus(db, req.user.id, storeApp));
}

// GET /api/:app/link
function getLink(db, req, res) {
  res.json(linkStatus(db, req.user.id, req.params.app));
}

// DELETE /api/:app/link
function deleteLink(db, req, res) {
  db.prepare('DELETE FROM fitme_links WHERE store_user_id = ? AND store_app = ?').run(
    req.user.id,
    req.params.app
  );
  res.json({ linked: false });
}

module.exports = { linkedFitmeUserId, linkStatus, createLink, getLink, deleteLink };
