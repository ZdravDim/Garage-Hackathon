// Brand-agnostic storefront behaviour shared by Zara & Massimo Dutti.
// The active app is read from <body data-app="zara|massimo">. CSS gives each
// store its own look; the structure and logic live here.
(function () {
  const app = document.body.dataset.app;
  const $ = (sel, root = document) => root.querySelector(sel);
  const money = (n) => '$' + Number(n).toFixed(2).replace(/\.00$/, '');

  async function currentUser() {
    const r = await API.me(app);
    return r.ok ? r.data.user : null;
  }

  // Header account link reflects auth state on every page.
  async function initHeader() {
    const acct = $('[data-account-link]');
    if (!acct) return;
    const user = await currentUser();
    if (user) {
      acct.textContent = 'Account';
      acct.href = 'profile.html';
    } else {
      acct.textContent = 'Log in';
      acct.href = 'login.html';
    }
  }

  function productCard(p) {
    return `
      <a class="card" href="product.html?id=${p.id}">
        <div class="card__img"><img src="${productImage(p)}" alt="${p.name}" loading="lazy"></div>
        <div class="card__meta">
          <span class="card__cat">${p.category}</span>
          <h3 class="card__name">${p.name}</h3>
          <span class="card__price">${money(p.price)}</span>
        </div>
      </a>`;
  }

  const GENDERS = [['women', 'Women'], ['men', 'Men']];

  // ?gender= drives the Woman/Man tabs; default to women.
  function shopGender() {
    return new URLSearchParams(location.search).get('gender') === 'men' ? 'men' : 'women';
  }

  async function initShop() {
    const grid = $('#product-grid');
    if (!grid) return;
    let gender = shopGender();

    const load = async (g) => {
      const r = await API.products(app, g);
      const products = (r.data && r.data.products) || [];
      grid.innerHTML = products.map(productCard).join('');
      const count = $('[data-product-count]');
      if (count) count.textContent = `${products.length} items`;
      const heading = $('[data-shop-heading]');
      if (heading) heading.textContent = g === 'men' ? 'Men' : 'Women';
    };

    const tabsEl = $('#gender-tabs');
    if (tabsEl) {
      tabsEl.innerHTML = GENDERS.map(([val, label]) =>
        `<button class="shop-tab${val === gender ? ' is-active' : ''}" data-gender="${val}" type="button">${label}</button>`
      ).join('');
      tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('.shop-tab');
        if (!b || b.dataset.gender === gender) return;
        gender = b.dataset.gender;
        tabsEl.querySelectorAll('.shop-tab').forEach((x) => x.classList.toggle('is-active', x === b));
        const url = new URL(location.href);
        url.searchParams.set('gender', gender);
        history.replaceState(null, '', url);
        load(gender);
      });
    }

    load(gender);
  }

  async function initProduct() {
    const root = $('#product');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    const r = await API.product(app, id);
    if (!r.ok) { root.innerHTML = '<p class="empty">Product not found.</p>'; return; }
    const p = r.data.product;
    document.title = `${p.name} — ${document.title.split('—').pop().trim()}`;
    $('#p-img').innerHTML = `<img src="${productImage(p)}" alt="${p.name}">`;
    $('#p-cat').textContent = p.category;
    $('#p-name').textContent = p.name;
    $('#p-price').textContent = money(p.price);
    $('#p-material').textContent = p.material;
    const sizes = ['XS', 'S', 'M', 'L', 'XL'];
    $('#p-sizes').innerHTML = sizes.map((s) => `<button class="size" data-size="${s}">${s}</button>`).join('');
    $('#p-sizes').addEventListener('click', (e) => {
      const b = e.target.closest('.size');
      if (!b) return;
      root.querySelectorAll('.size').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
    });
    renderFit(p);
  }

  // The headline feature: fit % from the shopper's linked FitMe measurements.
  async function renderFit(p) {
    const box = $('#fit-panel');
    if (!box) return;
    const user = await currentUser();
    if (!user) {
      box.innerHTML = fitNotice('See how this fits you',
        'Log in and connect your FitMe profile to get a personalised fit score.',
        'login.html', 'Log in');
      return;
    }
    const r = await API.fit(app, p.id);
    const d = r.data || {};
    if (d.available) {
      box.innerHTML = fitResult(d);
      requestAnimationFrame(() => { const bar = $('.fitbar__fill', box); if (bar) bar.style.width = d.fitPercent + '%'; });
    } else if (d.reason === 'not_linked') {
      box.innerHTML = fitNotice('See how this fits you',
        'Connect your FitMe account on your profile to unlock your personalised fit.',
        'profile.html', 'Connect FitMe');
    } else if (d.reason === 'no_measurements') {
      box.innerHTML = fitNotice('Almost there',
        'Add your measurements in FitMe to see your fit score for this item.',
        'profile.html', 'Open profile');
    } else {
      box.innerHTML = '';
    }
  }

  function fitTone(pct) {
    if (pct >= 80) return 'good';
    if (pct >= 60) return 'ok';
    return 'low';
  }

  function fitResult(d) {
    return `
      <div class="fit fit--${fitTone(d.fitPercent)}">
        <div class="fit__head">
          <span class="fit__badge">FitMe</span>
          <span class="fit__pct">${d.fitPercent}%</span>
        </div>
        <p class="fit__line">Your fit — recommended size <strong>${d.bestSize}</strong></p>
        <div class="fitbar"><div class="fitbar__fill"></div></div>
        <p class="fit__notes">${d.notes}</p>
      </div>`;
  }

  function fitNotice(title, text, href, cta) {
    return `
      <div class="fit fit--notice">
        <span class="fit__badge">FitMe</span>
        <p class="fit__line">${title}</p>
        <p class="fit__notes">${text}</p>
        <a class="fit__cta" href="${href}">${cta}</a>
      </div>`;
  }

  async function initLogin() {
    const form = $('#auth-form');
    if (!form) return;
    const tabs = root => root.querySelectorAll('[data-mode]');
    let mode = 'login';
    document.querySelectorAll('[data-mode]').forEach((t) =>
      t.addEventListener('click', () => {
        mode = t.dataset.mode;
        document.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === t));
        $('#auth-submit').textContent = mode === 'login' ? 'Log in' : 'Create account';
      })
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#auth-email').value.trim();
      const password = $('#auth-password').value;
      const err = $('#auth-error');
      err.textContent = '';
      const r = mode === 'login' ? await API.login(app, email, password) : await API.register(app, email, password);
      if (r.ok) { location.href = 'profile.html'; }
      else { err.textContent = (r.data && r.data.error) || 'Something went wrong.'; }
    });
  }

  async function initProfile() {
    const root = $('#profile');
    if (!root) return;
    const user = await currentUser();
    if (!user) { location.href = 'login.html'; return; }
    $('#acct-email').textContent = user.email;
    $('#logout').addEventListener('click', async () => { await API.logout(app); location.href = 'index.html'; });
    refreshLink();
  }

  async function refreshLink() {
    const panel = $('#link-panel');
    const r = await API.linkStatus(app);
    const s = r.data || {};
    if (s.linked) {
      panel.innerHTML = `
        <div class="linked">
          <div>
            <span class="linked__tag">Connected</span>
            <p class="linked__email">${s.fitmeEmail}</p>
            <p class="linked__hint">${s.hasMeasurements ? 'Measurements found — fit scores are live on every product.' : 'No measurements yet. Add them in FitMe to see fit scores.'}</p>
          </div>
          <button id="unlink" class="btn btn--ghost">Disconnect</button>
        </div>`;
      $('#unlink').addEventListener('click', async () => { await API.unlink(app); refreshLink(); });
    } else {
      panel.innerHTML = `
        <form id="link-form" class="link-form">
          <p class="link-form__lead">Connect your <strong>FitMe</strong> account to see how each item fits your body.</p>
          <label>FitMe email<input type="email" id="link-email" required></label>
          <label>FitMe password<input type="password" id="link-password" required></label>
          <p class="form-error" id="link-error"></p>
          <button class="btn" type="submit">Connect FitMe</button>
          <p class="link-form__foot">No FitMe account? <a href="/fitme/login.html" target="_blank">Create one</a>.</p>
        </form>`;
      $('#link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        $('#link-error').textContent = '';
        const r2 = await API.link(app, $('#link-email').value.trim(), $('#link-password').value);
        if (r2.ok) refreshLink();
        else $('#link-error').textContent = (r2.data && r2.data.error) || 'Could not connect.';
      });
    }
  }

  window.Store = { initHeader, initShop, initProduct, initLogin, initProfile };
  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initShop();
    initProduct();
    initLogin();
    initProfile();
  });
})();
