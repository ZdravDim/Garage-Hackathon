const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../db');

// Stand-in for the SnapMeasureAI client so /api/measure runs without the network.
// Mirrors the real client's contract: returns the 5 fields in cm, no height_cm.
async function fakeAnalyze({ heightCm }) {
  return {
    chest: heightCm * 0.52,
    waist: heightCm * 0.45,
    hips: heightCm * 0.535,
    inseam: heightCm * 0.47,
    shoulder: heightCm * 0.245,
  };
}

function freshApp() {
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitme-up-'));
  return createApp(createDb(':memory:'), {
    serveStatic: false,
    uploadsDir,
    analyzePhotos: fakeAnalyze,
  });
}

// Registers a fitme user (via agent) and gives them photo-based measurements.
async function fitmeWithMeasurements(app, email = 'fit@x.com') {
  const agent = request.agent(app);
  await agent.post('/api/fitme/register').send({ email, password: 'secret123' });
  await agent
    .post('/api/measure')
    .field('height_cm', '175')
    .attach('front', Buffer.from('front-photo-bytes'), 'front.jpg')
    .attach('side', Buffer.from('side-photo-bytes'), 'side.jpg');
  return { agent, email };
}

test('products can be listed and fetched by id', async () => {
  const app = freshApp();
  const list = await request(app).get('/api/zara/products');
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.products.length > 0);
  const id = list.body.products[0].id;
  const one = await request(app).get(`/api/zara/products/${id}`);
  assert.strictEqual(one.status, 200);
  assert.strictEqual(one.body.product.id, id);
  const missing = await request(app).get('/api/zara/products/nope');
  assert.strictEqual(missing.status, 404);
});

test('products can be filtered by gender, and an unknown gender returns all', async () => {
  const app = freshApp();
  const all = await request(app).get('/api/zara/products');
  const women = await request(app).get('/api/zara/products?gender=women');
  const men = await request(app).get('/api/zara/products?gender=men');
  assert.ok(women.body.products.length > 0 && men.body.products.length > 0);
  assert.ok(women.body.products.every((p) => p.gender === 'women'));
  assert.ok(men.body.products.every((p) => p.gender === 'men'));
  assert.strictEqual(women.body.products.length + men.body.products.length, all.body.products.length);
  const bogus = await request(app).get('/api/zara/products?gender=alien');
  assert.strictEqual(bogus.body.products.length, all.body.products.length);
});

test('measure requires a fitme login', async () => {
  const app = freshApp();
  const res = await request(app).post('/api/measure').field('height_cm', '175');
  assert.strictEqual(res.status, 401);
});

test('measure derives and stores measurements from height + two photos', async () => {
  const app = freshApp();
  const { agent } = await fitmeWithMeasurements(app);
  const res = await agent.get('/api/measurements');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.measurements.source, 'photo');
  assert.strictEqual(res.body.measurements.height_cm, 175);
  assert.ok(res.body.measurements.chest > 0);
});

test('measure rejects a request missing a photo', async () => {
  const app = freshApp();
  const agent = request.agent(app);
  await agent.post('/api/fitme/register').send({ email: 'p@x.com', password: 'secret123' });
  const res = await agent
    .post('/api/measure')
    .field('height_cm', '175')
    .attach('front', Buffer.from('only-front'), 'front.jpg');
  assert.strictEqual(res.status, 400);
});

test('measurements can be entered and updated manually', async () => {
  const app = freshApp();
  const agent = request.agent(app);
  await agent.post('/api/fitme/register').send({ email: 'man@x.com', password: 'secret123' });
  const res = await agent
    .put('/api/measurements')
    .send({ height_cm: 180, chest: 96, waist: 80, hips: 100, inseam: 82, shoulder: 44 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.measurements.source, 'manual');
  assert.strictEqual(res.body.measurements.chest, 96);

  const updated = await agent.put('/api/measurements').send({ chest: 99 });
  assert.strictEqual(updated.body.measurements.chest, 99);
  assert.strictEqual(updated.body.measurements.waist, 80, 'unspecified fields are preserved');
});

test('connecting a store account to FitMe requires valid FitMe credentials', async () => {
  const app = freshApp();
  await fitmeWithMeasurements(app, 'link@x.com');

  const store = request.agent(app);
  await store.post('/api/zara/register').send({ email: 'shopper@x.com', password: 'secret123' });

  const bad = await store.post('/api/zara/link').send({ email: 'link@x.com', password: 'wrong' });
  assert.strictEqual(bad.status, 401);

  const ok = await store.post('/api/zara/link').send({ email: 'link@x.com', password: 'secret123' });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.linked, true);
  assert.strictEqual(ok.body.fitmeEmail, 'link@x.com');

  const status = await store.get('/api/zara/link');
  assert.strictEqual(status.body.linked, true);

  await store.delete('/api/zara/link');
  const after = await store.get('/api/zara/link');
  assert.strictEqual(after.body.linked, false);
});

test('fit reports not_linked before connecting', async () => {
  const app = freshApp();
  const store = request.agent(app);
  await store.post('/api/zara/register').send({ email: 's2@x.com', password: 'secret123' });
  const res = await store.get('/api/zara/fit?product=z2');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.available, false);
  assert.strictEqual(res.body.reason, 'not_linked');
});

test('fit returns a percentage once linked to a FitMe account with measurements', async () => {
  const app = freshApp();
  await fitmeWithMeasurements(app, 'fitlink@x.com');
  const store = request.agent(app);
  await store.post('/api/zara/register').send({ email: 's3@x.com', password: 'secret123' });
  await store.post('/api/zara/link').send({ email: 'fitlink@x.com', password: 'secret123' });

  const res = await store.get('/api/zara/fit?product=z2');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.available, true);
  assert.ok(['XS', 'S', 'M', 'L', 'XL'].includes(res.body.bestSize));
  assert.ok(res.body.fitPercent >= 0 && res.body.fitPercent <= 100);
  assert.strictEqual(typeof res.body.notes, 'string');
});

test('fit 404s for an unknown product', async () => {
  const app = freshApp();
  await fitmeWithMeasurements(app, 'fl2@x.com');
  const store = request.agent(app);
  await store.post('/api/zara/register').send({ email: 's4@x.com', password: 'secret123' });
  await store.post('/api/zara/link').send({ email: 'fl2@x.com', password: 'secret123' });
  const res = await store.get('/api/zara/fit?product=does-not-exist');
  assert.strictEqual(res.status, 404);
});
