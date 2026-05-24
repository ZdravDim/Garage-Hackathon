const { computeFit } = require('./fit');
const { getSizeGuide } = require('../data/sizeguides');

// Attach a fit result to each product for the given body measurements. Uses the
// merchant's published size guide when it has one, else a generated chart.
function scoreProducts(products, measurements) {
  return products.map((p) => {
    const chart = getSizeGuide(p.merchant, p.type);
    const { bestSize, fitPercent, notes } = computeFit(measurements, p.type, p.fit, chart);
    return { ...p, bestSize, fitPercent, notes };
  });
}

// AND-combine the supported filters. Unset (undefined/null/'') filters are ignored.
function applyFilters(scored, filters = {}) {
  const { minFit, merchant, category, size, maxPrice, gender } = filters;
  return scored.filter((p) => {
    if (minFit != null && p.fitPercent < minFit) return false;
    if (merchant && p.merchant !== merchant) return false;
    if (category && p.category !== category) return false;
    if (size && p.bestSize !== size) return false;
    if (maxPrice != null && p.price > maxPrice) return false;
    if (gender && p.gender !== gender) return false;
    return true;
  });
}

function sortProducts(list, sort = 'fit') {
  const copy = [...list];
  if (sort === 'price_asc') return copy.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') return copy.sort((a, b) => b.price - a.price);
  return copy.sort((a, b) => b.fitPercent - a.fitPercent); // 'fit' (default)
}

// Available filter options, derived from the full scored set so the UI choices
// stay stable as the user narrows results.
function facetsOf(scored) {
  const counts = {};
  const categories = new Set();
  const sizes = new Set();
  let min = Infinity;
  let max = -Infinity;

  for (const p of scored) {
    counts[p.merchant] = counts[p.merchant] || { key: p.merchant, name: p.merchantName, count: 0 };
    counts[p.merchant].count += 1;
    categories.add(p.category);
    sizes.add(p.bestSize);
    if (p.price < min) min = p.price;
    if (p.price > max) max = p.price;
  }

  const order = ['XS', 'S', 'M', 'L', 'XL'];
  return {
    merchants: Object.values(counts).sort((a, b) => a.name.localeCompare(b.name)),
    categories: [...categories].sort(),
    sizes: [...sizes].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    price: { min: Math.floor(min), max: Math.ceil(max) },
  };
}

module.exports = { scoreProducts, applyFilters, sortProducts, facetsOf };
