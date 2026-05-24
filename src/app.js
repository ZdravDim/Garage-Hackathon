const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const auth = require('./auth');
const measurements = require('./measurements');
const snapmeasure = require('./snapmeasure');
const links = require('./links');
const storefront = require('./storefront');
const marketplace = require('./marketplace');
const { marketplaceProducts } = require('../data/merchants');

function createApp(db, options = {}) {
  const app = express();
  const uploadsDir = options.uploadsDir || path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: options.sessionSecret || 'fitme-demo-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    })
  );

  const requireAuth = auth.requireAuth(db);
  // The body-measurement client; injectable so tests can run without the network.
  const analyzePhotos = options.analyzePhotos || snapmeasure.analyzePhotos;
  // For endpoints that always operate on the FitMe app regardless of URL.
  const asFitme = (req, _res, next) => {
    req.params.app = 'fitme';
    next();
  };

  // --- Auth (per app) ---
  app.post('/api/:app/register', auth.requireValidApp, (req, res) => auth.register(db, req, res));
  app.post('/api/:app/login', auth.requireValidApp, (req, res) => auth.login(db, req, res));
  app.post('/api/:app/logout', auth.requireValidApp, (req, res) => auth.logout(req, res));
  app.get('/api/:app/me', auth.requireValidApp, (req, res) => auth.me(db, req, res));

  // --- FitMe: measurements ---
  app.get('/api/measurements', asFitme, requireAuth, (req, res) =>
    measurements.getMeasurements(db, req, res)
  );
  app.put('/api/measurements', asFitme, requireAuth, (req, res) =>
    measurements.putMeasurements(db, req, res)
  );

  // --- FitMe: marketplace (fit-filtered products across merchants) ---
  app.get('/api/marketplace', asFitme, requireAuth, (req, res) =>
    handleMarketplace(db, req, res)
  );

  // --- FitMe: photo-based measurement (SnapMeasureAI vision API) ---
  app.post(
    '/api/measure',
    asFitme,
    requireAuth,
    upload.fields([
      { name: 'front', maxCount: 1 },
      { name: 'side', maxCount: 1 },
    ]),
    (req, res) => handleMeasure(db, uploadsDir, analyzePhotos, req, res)
  );

  // --- Storefront: products ---
  app.get('/api/:app/products', auth.requireValidApp, storefront.getProducts);
  app.get('/api/:app/products/:id', auth.requireValidApp, storefront.getProductById);

  // --- Storefront: link to FitMe + fit percentage ---
  app.post('/api/:app/link', auth.requireValidApp, requireAuth, (req, res) =>
    links.createLink(db, req, res)
  );
  app.get('/api/:app/link', auth.requireValidApp, requireAuth, (req, res) =>
    links.getLink(db, req, res)
  );
  app.delete('/api/:app/link', auth.requireValidApp, requireAuth, (req, res) =>
    links.deleteLink(db, req, res)
  );
  app.get('/api/:app/fit', auth.requireValidApp, requireAuth, (req, res) =>
    storefront.getFit(db, req, res)
  );

  // --- Static frontends ---
  if (options.serveStatic !== false) {
    app.get('/favicon.ico', (_req, res) => res.status(204).end());
    app.use('/uploads', express.static(uploadsDir));
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.get('/', (_req, res) => res.redirect('/portal/'));
  }

  return app;
}

// Fit-scored, filtered marketplace feed for the logged-in FitMe user.
function handleMarketplace(db, req, res) {
  const m = measurements.readMeasurements(db, req.user.id);
  if (!m || m.chest == null || m.waist == null || m.hips == null) {
    return res.json({ available: false, reason: 'no_measurements' });
  }

  const num = (v) => (v === undefined || v === '' ? undefined : Number(v));
  const gender = req.query.gender === 'women' || req.query.gender === 'men' ? req.query.gender : undefined;
  const filters = {
    minFit: num(req.query.minFit),
    merchant: req.query.merchant || undefined,
    category: req.query.category || undefined,
    size: req.query.size || undefined,
    maxPrice: num(req.query.maxPrice),
    gender,
  };

  const scored = marketplace.scoreProducts(marketplaceProducts(), m);
  // Facets follow the active gender tab so the category/size/merchant choices
  // only list what's actually shoppable under it.
  const genderScoped = gender ? scored.filter((p) => p.gender === gender) : scored;
  const facets = marketplace.facetsOf(genderScoped);
  const filtered = marketplace.applyFilters(scored, filters);
  const products = marketplace.sortProducts(filtered, req.query.sort || 'fit');

  res.json({ available: true, total: products.length, products, facets });
}

// Photo-based measurement: needs height + both photos, calls SnapMeasureAI, stores.
async function handleMeasure(db, uploadsDir, analyzePhotos, req, res) {
  const heightCm = Number(req.body.height_cm);
  if (!(heightCm > 0)) {
    return res.status(400).json({ error: 'A valid height (cm) is required' });
  }
  const front = req.files && req.files.front && req.files.front[0];
  const side = req.files && req.files.side && req.files.side[0];
  if (!front || !side) {
    return res.status(400).json({ error: 'Both a front and a side photo are required' });
  }

  let derived;
  try {
    derived = await analyzePhotos({
      heightCm,
      images: [
        { buffer: front.buffer, originalname: front.originalname },
        { buffer: side.buffer, originalname: side.originalname },
      ],
    });
  } catch (err) {
    if (err instanceof snapmeasure.NoPersonError) {
      return res.status(422).json({ error: err.message });
    }
    if (err instanceof snapmeasure.ServiceError) {
      return res.status(502).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Could not analyse the photos. Please try again.' });
  }

  // Persist the photos so the profile can show them back.
  const saved = {};
  for (const [slot, file] of [[1, front], [2, side]]) {
    const ext = (path.extname(file.originalname) || '.jpg').slice(0, 5);
    const filename = `u${req.user.id}-slot${slot}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    db.prepare(
      `INSERT INTO photos (fitme_user_id, slot, filename) VALUES (?, ?, ?)
       ON CONFLICT(fitme_user_id, slot) DO UPDATE SET filename = excluded.filename`
    ).run(req.user.id, slot, filename);
    saved[slot] = filename;
  }

  const stored = measurements.writeMeasurements(
    db,
    req.user.id,
    { height_cm: heightCm, ...derived },
    'photo'
  );
  res.json({ measurements: stored, photos: saved });
}

module.exports = { createApp };
