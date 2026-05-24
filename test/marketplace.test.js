const { test } = require('node:test');
const assert = require('node:assert');
const { scoreProducts, applyFilters, sortProducts, facetsOf } = require('../src/marketplace');
const { marketplaceProducts } = require('../data/merchants');

// A typical seeded body.
const BODY = { height_cm: 178, chest: 98, waist: 84, hips: 102, inseam: 81, shoulder: 45 };

test('scoreProducts attaches fitPercent, bestSize and notes to every product', () => {
  const scored = scoreProducts(marketplaceProducts(), BODY);
  assert.ok(scored.length > 30, 'expected an aggregated catalog');
  for (const p of scored) {
    assert.strictEqual(typeof p.fitPercent, 'number');
    assert.ok(p.fitPercent >= 0 && p.fitPercent <= 100);
    assert.ok(['XS', 'S', 'M', 'L', 'XL'].includes(p.bestSize));
    assert.strictEqual(typeof p.notes, 'string');
  }
});

test('every product carries a women/men gender, and dresses are women-only', () => {
  const all = marketplaceProducts();
  for (const p of all) {
    assert.ok(p.gender === 'women' || p.gender === 'men', `${p.uid} has a valid gender`);
    if (p.type === 'dress') assert.strictEqual(p.gender, 'women', `${p.uid} dress is women`);
  }
});

test('every marketplace product carries a merchant and a destination url', () => {
  for (const p of marketplaceProducts()) {
    assert.ok(p.merchant && p.merchantName, 'merchant set');
    assert.ok(typeof p.url === 'string' && p.url.length > 0, 'url set');
  }
});

test('zara/massimo link internally; external merchants link out', () => {
  const products = marketplaceProducts();
  const zara = products.find((p) => p.merchant === 'zara');
  const arket = products.find((p) => p.merchant === 'arket');
  assert.strictEqual(zara.external, false);
  assert.match(zara.url, /^\/zara\/product\.html\?id=/);
  assert.strictEqual(arket.external, true);
  assert.match(arket.url, /^https?:\/\//);
});

const scored = () => scoreProducts(marketplaceProducts(), BODY);

test('minFit hides products below the threshold', () => {
  const filtered = applyFilters(scored(), { minFit: 80 });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((p) => p.fitPercent >= 80));
});

test('merchant filter keeps only that merchant', () => {
  const filtered = applyFilters(scored(), { merchant: 'cos' });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((p) => p.merchant === 'cos'));
});

test('category filter keeps only that category', () => {
  const filtered = applyFilters(scored(), { category: 'Jeans' });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((p) => p.category === 'Jeans'));
});

test('size filter matches the recommended (best) size', () => {
  const all = scored();
  const someSize = all[0].bestSize;
  const filtered = applyFilters(all, { size: someSize });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((p) => p.bestSize === someSize));
});

test('maxPrice keeps only products at or below the cap', () => {
  const filtered = applyFilters(scored(), { maxPrice: 50 });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((p) => p.price <= 50));
});

test('gender filter keeps only that gender', () => {
  const men = applyFilters(scored(), { gender: 'men' });
  assert.ok(men.length > 0);
  assert.ok(men.every((p) => p.gender === 'men'));
  const women = applyFilters(scored(), { gender: 'women' });
  assert.ok(women.every((p) => p.gender === 'women'));
  assert.strictEqual(men.length + women.length, scored().length, 'every product is one gender');
});

test('filters combine (AND semantics) and ignore unset filters', () => {
  const all = scored();
  const both = applyFilters(all, { merchant: 'uniqlo', maxPrice: 40 });
  assert.ok(both.every((p) => p.merchant === 'uniqlo' && p.price <= 40));
  assert.strictEqual(applyFilters(all, {}).length, all.length);
});

test('sortProducts defaults to best fit first', () => {
  const list = sortProducts(scored(), 'fit');
  for (let i = 1; i < list.length; i++) {
    assert.ok(list[i - 1].fitPercent >= list[i].fitPercent);
  }
});

test('sortProducts supports price ascending and descending', () => {
  const asc = sortProducts(scored(), 'price_asc');
  const desc = sortProducts(scored(), 'price_desc');
  assert.ok(asc[0].price <= asc[asc.length - 1].price);
  assert.ok(desc[0].price >= desc[desc.length - 1].price);
});

test('facetsOf reports merchants with counts, categories, sizes and price range', () => {
  const f = facetsOf(scored());
  assert.ok(f.merchants.some((m) => m.key === 'zara' && m.count > 0));
  assert.ok(f.categories.includes('Jeans'));
  assert.ok(f.sizes.length > 0 && f.sizes.every((s) => ['XS', 'S', 'M', 'L', 'XL'].includes(s)));
  assert.ok(f.price.min <= f.price.max);
});
