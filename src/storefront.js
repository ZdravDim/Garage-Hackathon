const { listProducts, getProduct } = require('../data/products');
const { computeFit, garmentDimensions, applyFitStyle } = require('./fit');
const { getSizeGuide } = require('../data/sizeguides');
const { readMeasurements } = require('./measurements');
const { linkedFitmeUserId } = require('./links');

// GET /api/:app/products[?gender=women|men]
function getProducts(req, res) {
  res.json({ products: listProducts(req.params.app, req.query.gender) });
}

// GET /api/:app/products/:id
function getProductById(req, res) {
  const product = getProduct(req.params.app, req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
}

// GET /api/:app/fit?product=ID  (store session required)
function getFit(db, req, res) {
  const storeApp = req.params.app;
  const product = getProduct(storeApp, String(req.query.product || ''));
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const fitmeId = linkedFitmeUserId(db, req.user.id, storeApp);
  if (!fitmeId) return res.json({ available: false, reason: 'not_linked' });

  const measurements = readMeasurements(db, fitmeId);
  const dims = garmentDimensions(product.type);
  const hasAll = measurements && dims.every((d) => measurements[d] != null);
  if (!hasAll) return res.json({ available: false, reason: 'no_measurements' });

  // Shape the merchant's per-type guide by this garment's fit style so slim,
  // regular and relaxed cuts score differently instead of sharing one chart.
  const baseChart = getSizeGuide(storeApp, product.type);
  const chart = baseChart ? applyFitStyle(baseChart, product.fit) : null;
  const result = computeFit(measurements, product.type, product.fit, chart);
  res.json({ available: true, ...result });
}

module.exports = { getProducts, getProductById, getFit };
