const { test } = require('node:test');
const assert = require('node:assert');
const { sizeChart, garmentDimensions, computeFit } = require('../src/fit');

function midpoints(chart, size) {
  const out = {};
  for (const [dim, [lo, hi]] of Object.entries(chart[size])) {
    out[dim] = (lo + hi) / 2;
  }
  return out;
}

test('a body centered on size M scores M as the best size with a high fit', () => {
  const chart = sizeChart('top', 'regular');
  const body = midpoints(chart, 'M');
  const result = computeFit(body, 'top', 'regular');
  assert.strictEqual(result.bestSize, 'M');
  assert.ok(result.fitPercent >= 90, `expected >=90, got ${result.fitPercent}`);
});

test('a body far larger than every size picks the largest size', () => {
  const result = computeFit({ chest: 200, waist: 200, shoulder: 80 }, 'top', 'regular');
  assert.strictEqual(result.bestSize, 'XL');
});

test('a body far smaller than every size picks the smallest size', () => {
  const result = computeFit({ chest: 40, waist: 35, shoulder: 25 }, 'top', 'regular');
  assert.strictEqual(result.bestSize, 'XS');
});

test('fit percent is always within 0..100', () => {
  const tiny = computeFit({ chest: 40, waist: 35, shoulder: 25 }, 'top', 'regular');
  const huge = computeFit({ chest: 200, waist: 200, shoulder: 80 }, 'top', 'regular');
  for (const r of [tiny, huge]) {
    assert.ok(r.fitPercent >= 0 && r.fitPercent <= 100, `got ${r.fitPercent}`);
  }
});

test('bottoms are evaluated on waist/hips/inseam, ignoring chest', () => {
  assert.deepStrictEqual(garmentDimensions('bottom'), ['waist', 'hips', 'inseam']);
  const chart = sizeChart('bottom', 'slim');
  const body = midpoints(chart, 'L');
  body.chest = 999; // irrelevant for bottoms — must be ignored
  const result = computeFit(body, 'bottom', 'slim');
  assert.strictEqual(result.bestSize, 'L');
});

test('result includes a human-readable note', () => {
  const result = computeFit({ chest: 94, waist: 76, shoulder: 42 }, 'top', 'regular');
  assert.strictEqual(typeof result.notes, 'string');
  assert.ok(result.notes.length > 0);
});

test('a body just above a size range reads as snug at that dimension', () => {
  const chart = sizeChart('top', 'regular');
  const body = midpoints(chart, 'M');
  body.waist = chart.M.waist[1] + 2; // just above the M waist range — M still fits best
  const result = computeFit(body, 'top', 'regular');
  assert.match(result.notes.toLowerCase(), /snug|tight/);
});

test('an unknown garment type throws', () => {
  assert.throws(() => computeFit({ chest: 94 }, 'spaceship', 'regular'));
});
