const FIELDS = ['height_cm', 'chest', 'waist', 'hips', 'inseam', 'shoulder'];

function readMeasurements(db, fitmeUserId) {
  return db.prepare('SELECT * FROM measurements WHERE fitme_user_id = ?').get(fitmeUserId) || null;
}

// Insert or update the single measurements row for a FitMe user.
function writeMeasurements(db, fitmeUserId, values, source) {
  db.prepare(
    `INSERT INTO measurements (fitme_user_id, height_cm, chest, waist, hips, inseam, shoulder, source, updated_at)
     VALUES (@fitme_user_id, @height_cm, @chest, @waist, @hips, @inseam, @shoulder, @source, datetime('now'))
     ON CONFLICT(fitme_user_id) DO UPDATE SET
       height_cm=@height_cm, chest=@chest, waist=@waist, hips=@hips,
       inseam=@inseam, shoulder=@shoulder, source=@source, updated_at=datetime('now')`
  ).run({ fitme_user_id: fitmeUserId, source, ...values });
  return readMeasurements(db, fitmeUserId);
}

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// GET /api/measurements
function getMeasurements(db, req, res) {
  res.json({ measurements: readMeasurements(db, req.user.id) });
}

// PUT /api/measurements — manual entry/update; merges with existing values.
function putMeasurements(db, req, res) {
  const existing = readMeasurements(db, req.user.id) || {};
  const merged = {};
  for (const field of FIELDS) {
    merged[field] =
      req.body[field] !== undefined ? toNumberOrNull(req.body[field]) : existing[field] ?? null;
  }
  const saved = writeMeasurements(db, req.user.id, merged, 'manual');
  res.json({ measurements: saved });
}

module.exports = { FIELDS, readMeasurements, writeMeasurements, getMeasurements, putMeasurements };
