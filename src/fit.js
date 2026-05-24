// Self-contained fit engine: builds a size chart for a garment and scores how
// well a set of body measurements fits each size. No external service.

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

// Body-measurement centre (cm) per size, per dimension. Index aligns with SIZES.
// Calibrated so a broad, larger build (≈105 cm chest) centres on M; merchants
// without a published guide score against this chart.
const CENTERS = {
  chest: [92, 98, 104, 110, 116],
  waist: [83, 89, 95, 101, 107],
  hips: [93, 99, 105, 111, 117],
  shoulder: [46, 48, 50, 52, 54],
  inseam: [73, 75, 77, 79, 81],
};

// Which body dimensions matter for each garment type.
const DIMENSIONS = {
  top: ['chest', 'waist', 'shoulder'],
  bottom: ['waist', 'hips', 'inseam'],
  dress: ['chest', 'waist', 'hips'],
};

// Fit style shifts the centre (slim runs small → larger body for same label)
// and sets how much tolerance each size allows.
const FIT_STYLE = {
  slim: { shift: 3, halfWidth: 2.5 },
  regular: { shift: 0, halfWidth: 3.5 },
  relaxed: { shift: -3, halfWidth: 4.5 },
};

function garmentDimensions(type) {
  const dims = DIMENSIONS[type];
  if (!dims) throw new Error(`Unknown garment type: ${type}`);
  return dims;
}

// Returns { XS: { chest:[lo,hi], ... }, S: {...}, ... } for the relevant dims.
function sizeChart(type, fit = 'regular') {
  const dims = garmentDimensions(type);
  const style = FIT_STYLE[fit] || FIT_STYLE.regular;
  const chart = {};
  SIZES.forEach((size, i) => {
    chart[size] = {};
    for (const dim of dims) {
      const center = CENTERS[dim][i] + style.shift;
      chart[size][dim] = [center - style.halfWidth, center + style.halfWidth];
    }
  });
  return chart;
}

// Re-shape an explicit (merchant) size guide by a garment's fit style: keep the
// merchant's centre for each size but apply the style's shift and tolerance, so
// a slim and a relaxed garment from the same merchant score differently instead
// of sharing one per-type chart. Mirrors how sizeChart() builds ranges.
function applyFitStyle(chart, fit = 'regular') {
  const style = FIT_STYLE[fit] || FIT_STYLE.regular;
  const out = {};
  for (const size of Object.keys(chart)) {
    out[size] = {};
    for (const dim of Object.keys(chart[size])) {
      const [lo, hi] = chart[size][dim];
      const center = (lo + hi) / 2 + style.shift;
      out[size][dim] = [center - style.halfWidth, center + style.halfWidth];
    }
  }
  return out;
}

// Score one dimension: 80..99 inside the range (dead-centre = 99, edge = 80),
// falling below 80 (and going negative) the further outside it is. The wide
// inside band keeps everyday fits realistically spread instead of pinned in the
// high 90s. Kept un-floored so that, even when a body is outside every size,
// the *closest* size still scores highest. The final fit percent is clamped to
// 0..100 by the caller.
function scoreDimension(value, [lo, hi]) {
  if (value >= lo && value <= hi) {
    const mid = (lo + hi) / 2;
    const half = (hi - lo) / 2 || 1;
    return 99 - (Math.abs(value - mid) / half) * 19; // 80..99 inside
  }
  const distance = value < lo ? lo - value : value - hi;
  return 80 - distance * 6;
}

function round(n) {
  return Math.round(n);
}

// measurements: { chest, waist, hips, inseam, shoulder } in cm.
// `explicitChart` (optional) is a merchant size guide; when given it overrides
// the generated chart and its dimensions drive the scoring.
// Returns { bestSize, fitPercent, notes, perSize }.
function computeFit(measurements, type, fit = 'regular', explicitChart = null) {
  let chart;
  let dims;
  if (explicitChart) {
    chart = explicitChart;
    dims = Object.keys(chart[Object.keys(chart)[0]]);
  } else {
    chart = sizeChart(type, fit);
    dims = garmentDimensions(type);
  }

  const perSize = {};
  for (const size of SIZES) {
    let total = 0;
    let counted = 0;
    for (const dim of dims) {
      const value = measurements[dim];
      if (value == null || Number.isNaN(value)) continue;
      total += scoreDimension(value, chart[size][dim]);
      counted += 1;
    }
    perSize[size] = counted ? total / counted : 0;
  }

  let bestSize = SIZES[0];
  for (const size of SIZES) {
    if (perSize[size] > perSize[bestSize]) bestSize = size;
  }

  const fitPercent = Math.max(0, Math.min(100, round(perSize[bestSize])));
  const notes = describeFit(measurements, chart[bestSize], dims);
  return { bestSize, fitPercent, notes, perSize };
}

function describeFit(measurements, sizeChartForBest, dims) {
  const issues = [];
  for (const dim of dims) {
    const value = measurements[dim];
    if (value == null || Number.isNaN(value)) continue;
    const [lo, hi] = sizeChartForBest[dim];
    if (value > hi) issues.push(`snug at ${dim}`);
    else if (value < lo) issues.push(`loose at ${dim}`);
  }
  if (issues.length === 0) return 'True to size — comfortable fit';
  // Capitalise first issue for a tidy sentence.
  const text = issues.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = { SIZES, garmentDimensions, sizeChart, applyFitStyle, computeFit, scoreDimension };
