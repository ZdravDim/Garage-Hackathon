const bcrypt = require('bcryptjs');

const APPS = ['zara', 'massimo', 'fitme'];

function isValidApp(app) {
  return APPS.includes(app);
}

function publicUser(row) {
  return { id: row.id, app: row.app, email: row.email };
}

// Express middleware: validates :app param, 404 on unknown app.
function requireValidApp(req, res, next) {
  if (!isValidApp(req.params.app)) {
    return res.status(404).json({ error: 'Unknown app' });
  }
  next();
}

// Returns the logged-in user row for req.params.app, or null.
function currentUser(db, req) {
  const sess = req.session && req.session.users && req.session.users[req.params.app];
  if (!sess) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(sess.id) || null;
}

// Express middleware factory: 401 unless logged into req.params.app.
function requireAuth(db) {
  return (req, res, next) => {
    const user = currentUser(db, req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
  };
}

function loginSession(req, user) {
  if (!req.session.users) req.session.users = {};
  req.session.users[user.app] = { id: user.id };
}

function register(db, req, res) {
  const app = req.params.app;
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE app = ? AND email = ?').get(app, email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (app, email, password_hash) VALUES (?, ?, ?)')
    .run(app, email, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  loginSession(req, user);
  res.json({ user: publicUser(user) });
}

function login(db, req, res) {
  const app = req.params.app;
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = db.prepare('SELECT * FROM users WHERE app = ? AND email = ?').get(app, email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  loginSession(req, user);
  res.json({ user: publicUser(user) });
}

function logout(req, res) {
  const app = req.params.app;
  if (req.session.users) delete req.session.users[app];
  res.json({ ok: true });
}

function me(db, req, res) {
  const user = currentUser(db, req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: publicUser(user) });
}

module.exports = {
  APPS,
  isValidApp,
  publicUser,
  requireValidApp,
  requireAuth,
  currentUser,
  register,
  login,
  logout,
  me,
};
