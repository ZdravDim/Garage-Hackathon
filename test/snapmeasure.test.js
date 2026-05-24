const { test } = require('node:test');
const assert = require('node:assert');
const {
  analyzePhotos,
  parseRatios,
  ratiosToMeasurements,
  NoPersonError,
  ServiceError,
} = require('../src/snapmeasure');

// A realistic `data` string as returned by the live API (single-quoted, ratios of height).
const SAMPLE_DATA =
  "{'height': 1.0, 'chest circumference': 0.5862775226489679, " +
  "'waist circumference #1': 0.5468153420859023, 'hip circumference': 0.5924773055833216, " +
  "'inside leg height': 0.4225764334976514, 'shoulder breadth': 0.29425880963047446}";

function okResponse(json) {
  return { ok: true, status: 200, json: async () => json };
}

function fakeFetch(json, capture) {
  return async (url, init) => {
    if (capture) {
      capture.url = url;
      capture.init = init;
      capture.body = JSON.parse(init.body);
    }
    return okResponse(json);
  };
}

const images = [
  { buffer: Buffer.from('front-bytes'), originalname: 'front.jpeg' },
  { buffer: Buffer.from('side-bytes'), originalname: 'side.jpeg' },
];

test('parseRatios converts python-style single-quoted dict', () => {
  const r = parseRatios(SAMPLE_DATA);
  assert.strictEqual(r['chest circumference'], 0.5862775226489679);
  assert.strictEqual(r.height, 1.0);
});

test('parseRatios returns null for empty or malformed data', () => {
  assert.strictEqual(parseRatios(''), null);
  assert.strictEqual(parseRatios('   '), null);
  assert.strictEqual(parseRatios(undefined), null);
  assert.strictEqual(parseRatios('not json'), null);
});

test('ratiosToMeasurements multiplies ratios by height and rounds to 0.1', () => {
  const m = ratiosToMeasurements(parseRatios(SAMPLE_DATA), 178);
  assert.strictEqual(m.chest, 104.4); // 0.58628 * 178 = 104.36
  assert.strictEqual(m.waist, 97.3);
  assert.strictEqual(m.hips, 105.5);
  assert.strictEqual(m.inseam, 75.2);
  assert.strictEqual(m.shoulder, 52.4);
});

test('ratiosToMeasurements normalises against the reported height (not assumed 1.0)', () => {
  // Same body, same photos — but the API normalised every dimension against a
  // `height` value of 2.0 instead of 1.0. The centimetre output must be identical:
  // dimensions are fractions of the reported height, so the height base must cancel.
  const base = ratiosToMeasurements(parseRatios(SAMPLE_DATA), 178);
  const doubled = {};
  for (const [k, v] of Object.entries(parseRatios(SAMPLE_DATA))) doubled[k] = v * 2; // height -> 2.0
  const m = ratiosToMeasurements(doubled, 178);
  assert.deepStrictEqual(m, base);
});

test('analyzePhotos sends height as a string and base64 images', async () => {
  const capture = {};
  const m = await analyzePhotos(
    { heightCm: 178, images },
    { fetch: fakeFetch({ data: SAMPLE_DATA, html: '<div/>' }, capture), url: 'http://test/analyze' }
  );
  assert.strictEqual(capture.url, 'http://test/analyze');
  assert.strictEqual(capture.init.method, 'POST');
  assert.strictEqual(capture.init.headers['Content-Type'], 'application/json');
  assert.strictEqual(capture.body.height, '178'); // string, not number
  assert.strictEqual(capture.body.images.length, 2);
  assert.strictEqual(capture.body.images[0].fileName, 'front.jpeg');
  assert.strictEqual(capture.body.images[0].data, Buffer.from('front-bytes').toString('base64'));
  assert.strictEqual(m.chest, 104.4);
});

test('analyzePhotos throws NoPersonError when data is empty', async () => {
  await assert.rejects(
    analyzePhotos({ heightCm: 178, images }, { fetch: fakeFetch({ data: '', html: 'No person' }) }),
    NoPersonError
  );
});

test('analyzePhotos throws ServiceError on a non-OK status', async () => {
  const fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(analyzePhotos({ heightCm: 178, images }, { fetch }), ServiceError);
});

test('analyzePhotos throws ServiceError when the request aborts/times out', async () => {
  const fetch = async () => {
    const e = new Error('aborted');
    e.name = 'AbortError';
    throw e;
  };
  await assert.rejects(analyzePhotos({ heightCm: 178, images }, { fetch }), ServiceError);
});

test('analyzePhotos validates inputs', async () => {
  await assert.rejects(analyzePhotos({ heightCm: 0, images }, { fetch: fakeFetch({}) }));
  await assert.rejects(analyzePhotos({ heightCm: 178, images: [] }, { fetch: fakeFetch({}) }));
});
