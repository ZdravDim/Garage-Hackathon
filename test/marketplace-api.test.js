const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../db');

function freshApp() {
  return createApp(createDb(':memory:'), { serveStatic: false });
}

async function fitmeWithBody(app) {
  const agent = request.agent(app);
  await agent.post('/api/fitme/register').send({ email: 'mk@x.com', password: 'secret123' });
  await agent.put('/api/measurements').send({ height_cm: 178, chest: 98, waist: 84, hips: 102, inseam: 81, shoulder: 45 });
  return agent;
}

test('marketplace requires a FitMe login', async () => {
  const res = await request(freshApp()).get('/api/marketplace');
  assert.strictEqual(res.status, 401);
});

test('marketplace asks for measurements when there are none', async () => {
  const app = freshApp();
  const agent = request.agent(app);
  await agent.post('/api/fitme/register').send({ email: 'nm@x.com', password: 'secret123' });
  const res = await agent.get('/api/marketplace');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.available, false);
  assert.strictEqual(res.body.reason, 'no_measurements');
});

test('marketplace returns fit-scored products sorted best-fit-first with facets', async () => {
  const app = freshApp();
  const agent = await fitmeWithBody(app);
  const res = await agent.get('/api/marketplace');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.available, true);
  assert.ok(res.body.products.length > 30);
  const ps = res.body.products;
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i - 1].fitPercent >= ps[i].fitPercent);
  assert.ok(ps[0].merchant && ps[0].url && typeof ps[0].fitPercent === 'number');
  assert.ok(res.body.facets.merchants.length >= 3);
});

test('marketplace honours query filters', async () => {
  const app = freshApp();
  const agent = await fitmeWithBody(app);
  const res = await agent.get('/api/marketplace?merchant=uniqlo&minFit=60&maxPrice=45');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.products.length > 0);
  assert.ok(res.body.products.every((p) => p.merchant === 'uniqlo' && p.fitPercent >= 60 && p.price <= 45));
});

test('marketplace gender tab filters products and scopes facets', async () => {
  const app = freshApp();
  const agent = await fitmeWithBody(app);

  const men = await agent.get('/api/marketplace?gender=men&minFit=0');
  assert.strictEqual(men.status, 200);
  assert.ok(men.body.products.length > 0);
  assert.ok(men.body.products.every((p) => p.gender === 'men'));
  // Dresses are women-only, so the men tab's category facet must omit them.
  assert.ok(!men.body.facets.categories.includes('Dresses'), 'no Dresses under Men');

  const women = await agent.get('/api/marketplace?gender=women&minFit=0');
  assert.ok(women.body.products.every((p) => p.gender === 'women'));
  assert.ok(women.body.facets.categories.includes('Dresses'), 'Dresses appear under Women');

  // The two tabs partition the full catalog.
  const all = await agent.get('/api/marketplace?minFit=0');
  assert.strictEqual(men.body.total + women.body.total, all.body.total);
});
