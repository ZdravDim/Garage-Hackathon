const { test } = require('node:test');
const assert = require('node:assert');
const { getSizeGuide } = require('../data/sizeguides');
const { computeFit } = require('../src/fit');

const BODY = { height_cm: 178, chest: 98, waist: 84, hips: 102, inseam: 81, shoulder: 45 };

test('getSizeGuide returns per-size body ranges for the right dimensions', () => {
  const top = getSizeGuide('zara', 'top');
  assert.ok(top.M.chest && top.M.waist && top.M.shoulder, 'top has chest/waist/shoulder');
  const bottom = getSizeGuide('zara', 'bottom');
  assert.ok(bottom.M.waist && bottom.M.hips && bottom.M.inseam, 'bottom has waist/hips/inseam');
});

test('an unknown merchant has no guide (caller falls back)', () => {
  assert.strictEqual(getSizeGuide('arket', 'top'), null);
  assert.strictEqual(getSizeGuide('zara', 'spacesuit'), null);
});

test('computeFit uses an explicit guide chart when given one', () => {
  const chart = getSizeGuide('zara', 'top');
  const r = computeFit(BODY, 'top', 'regular', chart);
  assert.ok(['XS', 'S', 'M', 'L', 'XL'].includes(r.bestSize));
  assert.ok(r.fitPercent >= 0 && r.fitPercent <= 100);
});

test('the same body gets a different recommended size across merchants (data-driven)', () => {
  const onZara = computeFit(BODY, 'top', 'regular', getSizeGuide('zara', 'top'));
  const onMassimo = computeFit(BODY, 'top', 'regular', getSizeGuide('massimo', 'top'));
  // Zara runs small → larger label; Massimo runs generous → smaller label.
  assert.strictEqual(onZara.bestSize, 'S');
  assert.strictEqual(onMassimo.bestSize, 'XS');
});

// Charts are calibrated around a broad, larger build: it should read M on most
// garments and L on the fuller-cut ones — never XL across the board.
test('a larger build (≈105 cm chest) is recommended M, occasionally L', () => {
  const BIG = { height_cm: 181, chest: 104.9, waist: 96.4, hips: 106.8, inseam: 76, shoulder: 51.1 };
  const sizes = [
    computeFit(BIG, 'top', 'regular', getSizeGuide('zara', 'top')).bestSize,
    computeFit(BIG, 'bottom', 'regular', getSizeGuide('zara', 'bottom')).bestSize,
    computeFit(BIG, 'top', 'regular', getSizeGuide('massimo', 'top')).bestSize,
    computeFit(BIG, 'dress', 'regular', getSizeGuide('massimo', 'dress')).bestSize,
  ];
  assert.ok(sizes.every((s) => s === 'M' || s === 'L'), `expected only M/L, got ${sizes}`);
  assert.ok(sizes.includes('M'), 'M should be the dominant recommendation');
});
