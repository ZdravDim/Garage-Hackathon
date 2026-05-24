const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../db');

function freshApp() {
  return createApp(createDb(':memory:'));
}

test('register creates a user and logs them in', async () => {
  const app = freshApp();
  const res = await request(app)
    .post('/api/zara/register')
    .send({ email: 'a@example.com', password: 'secret123' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, 'a@example.com');
  assert.strictEqual(res.body.user.app, 'zara');
  assert.ok(!('password_hash' in res.body.user), 'must not leak password hash');
});

test('register rejects duplicate email within the same app', async () => {
  const app = freshApp();
  const agent = request(app);
  await agent.post('/api/zara/register').send({ email: 'dup@x.com', password: 'secret123' });
  const res = await agent.post('/api/zara/register').send({ email: 'dup@x.com', password: 'secret123' });
  assert.strictEqual(res.status, 409);
});

test('same email is allowed on different apps', async () => {
  const app = freshApp();
  await request(app).post('/api/zara/register').send({ email: 'same@x.com', password: 'secret123' });
  const res = await request(app).post('/api/fitme/register').send({ email: 'same@x.com', password: 'secret123' });
  assert.strictEqual(res.status, 200);
});

test('register requires email and a password of at least 6 chars', async () => {
  const app = freshApp();
  const r1 = await request(app).post('/api/zara/register').send({ email: '', password: 'secret123' });
  assert.strictEqual(r1.status, 400);
  const r2 = await request(app).post('/api/zara/register').send({ email: 'x@x.com', password: '123' });
  assert.strictEqual(r2.status, 400);
});

test('login succeeds with correct credentials and fails with wrong password', async () => {
  const app = freshApp();
  await request(app).post('/api/massimo/register').send({ email: 'b@x.com', password: 'secret123' });
  const ok = await request(app).post('/api/massimo/login').send({ email: 'b@x.com', password: 'secret123' });
  assert.strictEqual(ok.status, 200);
  const bad = await request(app).post('/api/massimo/login').send({ email: 'b@x.com', password: 'wrong' });
  assert.strictEqual(bad.status, 401);
});

test('me returns 401 when logged out and the user when logged in', async () => {
  const app = freshApp();
  const agent = request.agent(app);
  const out = await agent.get('/api/fitme/me');
  assert.strictEqual(out.status, 401);
  await agent.post('/api/fitme/register').send({ email: 'me@x.com', password: 'secret123' });
  const inn = await agent.get('/api/fitme/me');
  assert.strictEqual(inn.status, 200);
  assert.strictEqual(inn.body.user.email, 'me@x.com');
});

test('logout ends the session', async () => {
  const app = freshApp();
  const agent = request.agent(app);
  await agent.post('/api/fitme/register').send({ email: 'lo@x.com', password: 'secret123' });
  await agent.post('/api/fitme/logout');
  const res = await agent.get('/api/fitme/me');
  assert.strictEqual(res.status, 401);
});

test('a session for one app does not authenticate another app', async () => {
  const app = freshApp();
  const agent = request.agent(app);
  await agent.post('/api/zara/register').send({ email: 'cross@x.com', password: 'secret123' });
  const res = await agent.get('/api/massimo/me');
  assert.strictEqual(res.status, 401);
});

test('an unknown app is rejected', async () => {
  const app = freshApp();
  const res = await request(app).post('/api/shopify/register').send({ email: 'q@x.com', password: 'secret123' });
  assert.strictEqual(res.status, 404);
});
