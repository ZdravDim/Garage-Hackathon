// Client for the SnapMeasureAI body-measurement API.
//
// Endpoint (reverse-engineered from demo.snapmeasureai.com):
//   POST https://api.snapmeasureai.com/smpl/v2/analyze
//   Content-Type: application/json
//   { "height": "178", images: [{ data: <base64, no data-url prefix>, fileName }] }
//
// Response: { data: "<python-dict-string>", html: "<rendered page>" }
//   `data` holds dimensions normalised against the reported `height`, which is
//   NOT always 1.0 (e.g. "{'height': 2.0, 'chest circumference': 1.17, ...}").
//   Actual centimetres = (dimension / height) * heightCm.
//   On failure `data` is "" and `html` carries a "No person detected" message.

const DEFAULT_URL =
  process.env.SNAPMEASURE_URL || 'https://api.snapmeasureai.com/smpl/v2/analyze';
const DEFAULT_TIMEOUT_MS = Number(process.env.SNAPMEASURE_TIMEOUT_MS) || 45000;

// The API could not find a person in the photos — a user-fixable problem.
class NoPersonError extends Error {
  constructor(message) {
    super(message || 'No person was detected in at least one image.');
    this.name = 'NoPersonError';
    this.code = 'NO_PERSON';
  }
}

// The service was unreachable, timed out, or returned something unusable.
class ServiceError extends Error {
  constructor(message) {
    super(message || 'The measurement service is unavailable.');
    this.name = 'ServiceError';
    this.code = 'SERVICE';
  }
}

// SnapMeasure dimension name -> FitMe measurement field.
const FIELD_MAP = {
  chest: 'chest circumference',
  waist: 'waist circumference #1',
  hips: 'hip circumference',
  inseam: 'inside leg height',
  shoulder: 'shoulder breadth',
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

// The API returns a Python-style dict string (single quotes). Convert and parse.
// Returns the ratio object, or null when there is no usable data.
function parseRatios(data) {
  if (typeof data !== 'string' || data.trim() === '') return null;
  let obj;
  try {
    obj = JSON.parse(data.replace(/'/g, '"'));
  } catch {
    return null;
  }
  return obj && typeof obj === 'object' ? obj : null;
}

// Map height-relative ratios to centimetre measurements for the FitMe fields.
// Dimensions are normalised against the API's own `height` value, which is NOT
// always 1.0 (it has been observed as 2.0). Divide by it to recover the true
// fraction of height before scaling to centimetres; otherwise every measurement
// comes out scaled by that factor (e.g. 2x too large).
function ratiosToMeasurements(ratios, heightCm) {
  const heightRatio = Number.isFinite(ratios.height) && ratios.height > 0 ? ratios.height : 1;
  const out = {};
  for (const [field, key] of Object.entries(FIELD_MAP)) {
    const ratio = ratios[key];
    out[field] = Number.isFinite(ratio) ? round1((ratio / heightRatio) * heightCm) : null;
  }
  return out;
}

// Analyse photos and return { chest, waist, hips, inseam, shoulder } in cm.
//   input: { heightCm, images: [{ buffer, originalname }] }
//   opts:  { url, fetch, timeoutMs } — injectable for tests.
// Throws NoPersonError (422-worthy) or ServiceError (502-worthy).
async function analyzePhotos({ heightCm, images }, opts = {}) {
  if (!(heightCm > 0)) throw new Error('heightCm must be a positive number');
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('at least one image is required');
  }

  const url = opts.url || DEFAULT_URL;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;

  const body = JSON.stringify({
    height: String(heightCm),
    images: images.map((img) => ({
      data: Buffer.isBuffer(img.buffer) ? img.buffer.toString('base64') : '',
      fileName: img.originalname || 'image',
    })),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ServiceError(
      err && err.name === 'AbortError'
        ? 'The measurement service took too long to respond.'
        : 'Could not reach the measurement service.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ServiceError(`The measurement service returned an error (${res.status}).`);
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new ServiceError('The measurement service returned an unreadable response.');
  }

  const ratios = parseRatios(payload && payload.data);
  if (!ratios) {
    throw new NoPersonError(
      'No person was detected in at least one image. Please upload clear, full-body front and side photos.'
    );
  }

  return ratiosToMeasurements(ratios, heightCm);
}

module.exports = {
  analyzePhotos,
  parseRatios,
  ratiosToMeasurements,
  FIELD_MAP,
  NoPersonError,
  ServiceError,
};
