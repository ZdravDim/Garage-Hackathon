// Thin wrapper around the platform's JSON API. Same-origin so the session
// cookie rides along automatically.
const API = {
  async _json(method, url, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    return { ok: res.ok, status: res.status, data };
  },

  // --- auth ---
  register: (app, email, password) => API._json('POST', `/api/${app}/register`, { email, password }),
  login: (app, email, password) => API._json('POST', `/api/${app}/login`, { email, password }),
  logout: (app) => API._json('POST', `/api/${app}/logout`),
  me: (app) => API._json('GET', `/api/${app}/me`),

  // --- storefront ---
  products: (app, gender) =>
    API._json('GET', `/api/${app}/products${gender ? `?gender=${encodeURIComponent(gender)}` : ''}`),
  product: (app, id) => API._json('GET', `/api/${app}/products/${id}`),
  fit: (app, productId) => API._json('GET', `/api/${app}/fit?product=${encodeURIComponent(productId)}`),

  // --- linking (store apps) ---
  linkStatus: (app) => API._json('GET', `/api/${app}/link`),
  link: (app, email, password) => API._json('POST', `/api/${app}/link`, { email, password }),
  unlink: (app) => API._json('DELETE', `/api/${app}/link`),

  // --- FitMe marketplace ---
  marketplace: (filters = {}) => {
    const qs = Object.entries(filters)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return API._json('GET', `/api/marketplace${qs ? '?' + qs : ''}`);
  },

  // --- FitMe measurements ---
  measurements: () => API._json('GET', '/api/measurements'),
  saveMeasurements: (fields) => API._json('PUT', '/api/measurements', fields),
  async measure(heightCm, frontFile, sideFile) {
    const fd = new FormData();
    fd.append('height_cm', heightCm);
    fd.append('front', frontFile);
    fd.append('side', sideFile);
    const res = await fetch('/api/measure', { method: 'POST', credentials: 'same-origin', body: fd });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  },
};

// Product imagery: a real photo when the product carries one, otherwise a
// generated tinted silhouette tile (used by merchants without photos).
function productImage(product) {
  if (product.image) return product.image;
  const glyph = {
    top: 'M30 18 L48 8 L62 18 L80 8 L98 18 L92 40 L80 36 L80 96 L48 96 L48 36 L36 40 Z',
    bottom: 'M44 14 L84 14 L82 60 L78 118 L66 118 L64 64 L60 64 L58 118 L46 118 L42 60 Z',
    dress: 'M48 10 L80 10 L74 30 L98 104 L30 104 L54 30 Z',
  }[product.type] || 'M40 16 H88 V104 H40 Z';
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' preserveAspectRatio='xMidYMid meet'>
      <rect width='128' height='128' fill='${product.bg}'/>
      <g transform='translate(0,6)'>
        <path d='${glyph}' fill='${product.swatch}' opacity='0.92'/>
      </g>
    </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

window.API = API;
window.productImage = productImage;
