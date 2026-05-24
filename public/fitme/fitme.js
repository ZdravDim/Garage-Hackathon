// FitMe client: auth screen + the measurement profile dashboard.
(function () {
  const $ = (id) => document.getElementById(id);
  const APP = 'fitme';
  const METRICS = [
    ['height_cm', 'Height'],
    ['chest', 'Chest'],
    ['waist', 'Waist'],
    ['hips', 'Hips'],
    ['inseam', 'Inseam'],
    ['shoulder', 'Shoulder'],
  ];

  // ---------- Auth ----------
  function initAuth() {
    let mode = 'login';
    const form = $('auth-form');
    const toggle = $('auth-toggle');
    const setMode = (m) => {
      mode = m;
      const login = m === 'login';
      $('auth-title').textContent = login ? 'Welcome back' : 'Create your FitMe';
      $('auth-sub').textContent = login ? 'Sign in to your body profile' : 'One profile, measured once, used everywhere';
      $('auth-submit').textContent = login ? 'Sign in' : 'Create account';
      $('auth-password').autocomplete = login ? 'current-password' : 'new-password';
      $('auth-toggle-line').innerHTML = login
        ? 'New to FitMe? <a id="auth-toggle">Create an account</a>'
        : 'Already have an account? <a id="auth-toggle">Sign in</a>';
      $('auth-toggle').addEventListener('click', () => setMode(login ? 'register' : 'login'));
    };
    toggle.addEventListener('click', () => setMode('register'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $('auth-error').textContent = '';
      const email = $('auth-email').value.trim();
      const password = $('auth-password').value;
      const r = mode === 'login' ? await API.login(APP, email, password) : await API.register(APP, email, password);
      if (r.ok) location.href = 'profile.html';
      else $('auth-error').textContent = (r.data && r.data.error) || 'Something went wrong.';
    });
  }

  // ---------- Profile ----------
  async function initProfile() {
    const me = await API.me(APP);
    if (!me.ok) { location.href = 'login.html'; return; }
    $('hdr-email').textContent = me.data.user.email;
    $('logout').addEventListener('click', async () => { await API.logout(APP); location.href = 'login.html'; });

    setupTabs();
    setupDropzones();
    setupScan();
    setupManual();

    const r = await API.measurements();
    renderSummary(r.data && r.data.measurements);
  }

  function setupTabs() {
    const tScan = $('tab-scan'), tManual = $('tab-manual');
    const pScan = $('panel-scan'), pManual = $('panel-manual');
    const show = (which) => {
      const scan = which === 'scan';
      tScan.classList.toggle('is-active', scan);
      tManual.classList.toggle('is-active', !scan);
      pScan.classList.toggle('is-active', scan);
      pManual.classList.toggle('is-active', !scan);
    };
    tScan.addEventListener('click', () => show('scan'));
    tManual.addEventListener('click', () => show('manual'));
  }

  const files = { front: null, side: null };

  function setupDropzones() {
    [['front', 'drop-front', 'file-front'], ['side', 'drop-side', 'file-side']].forEach(([slot, dropId, inputId]) => {
      const drop = $(dropId), input = $(inputId);
      const preview = (file) => {
        files[slot] = file;
        const url = URL.createObjectURL(file);
        drop.classList.add('has-img');
        let img = drop.querySelector('img');
        if (!img) { img = document.createElement('img'); drop.insertBefore(img, drop.querySelector('.check')); }
        img.src = url;
      };
      input.addEventListener('change', () => { if (input.files[0]) preview(input.files[0]); });
      ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-drag'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-drag')));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) { input.files = e.dataTransfer.files; preview(f); }
      });
    });
  }

  function setupScan() {
    const btn = $('scan-btn');
    btn.addEventListener('click', async () => {
      const toast = $('scan-toast');
      toast.className = 'toast';
      const height = Number($('scan-height').value);
      if (!(height >= 100 && height <= 230)) return showToast(toast, 'err', 'Enter a valid height between 100 and 230 cm.');
      if (!files.front || !files.side) return showToast(toast, 'err', 'Please upload both a front and a side photo.');

      btn.disabled = true;
      const label = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Analysing photos…';
      const r = await API.measure(height, files.front, files.side);
      btn.disabled = false; btn.textContent = label;

      if (r.ok) {
        renderSummary(r.data.measurements);
        showToast(toast, 'ok', 'Measurements calculated from your photos. Review them in “Enter manually”.');
      } else {
        showToast(toast, 'err', (r.data && r.data.error) || 'Could not analyse the photos.');
      }
    });
  }

  function setupManual() {
    $('manual-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const toast = $('manual-toast');
      const map = { height_cm: 'm-height', chest: 'm-chest', waist: 'm-waist', hips: 'm-hips', inseam: 'm-inseam', shoulder: 'm-shoulder' };
      const fields = {};
      let any = false;
      for (const [key, id] of Object.entries(map)) {
        const v = $(id).value;
        if (v !== '') { fields[key] = Number(v); any = true; }
      }
      if (!any) return showToast(toast, 'err', 'Enter at least one measurement to save.');
      const r = await API.saveMeasurements(fields);
      if (r.ok) { renderSummary(r.data.measurements); showToast(toast, 'ok', 'Saved. Your fit scores will use these values.'); }
      else showToast(toast, 'err', (r.data && r.data.error) || 'Could not save.');
    });
  }

  function showToast(el, kind, msg) {
    el.textContent = msg;
    el.className = `toast toast--${kind} show`;
  }

  function renderSummary(m) {
    const badge = $('summary-badge');
    const list = $('metrics');
    if (!m) {
      badge.className = 'badge badge--empty';
      badge.textContent = 'Not set';
      $('summary-updated').textContent = 'No measurements yet — scan or enter them on the right.';
    } else {
      const isPhoto = m.source === 'photo';
      badge.className = `badge ${isPhoto ? 'badge--photo' : 'badge--manual'}`;
      badge.textContent = isPhoto ? 'From photos' : 'Manual';
      $('summary-updated').textContent = isPhoto
        ? 'Estimated from your photos'
        : 'Entered manually';
    }
    list.innerHTML = METRICS.map(([key, label]) => {
      const val = m && m[key] != null ? m[key] : null;
      return `<li class="metric ${val == null ? 'is-empty' : ''}">
        <span class="metric__k">${label}</span>
        <span class="metric__v">${val == null ? '—' : Number(val).toFixed(val % 1 ? 1 : 0)}<span class="unit">cm</span></span>
      </li>`;
    }).join('');

    // Prefill the manual form with whatever we have.
    if (m) {
      const map = { height_cm: 'm-height', chest: 'm-chest', waist: 'm-waist', hips: 'm-hips', inseam: 'm-inseam', shoulder: 'm-shoulder' };
      for (const [key, id] of Object.entries(map)) {
        const el = $(id);
        if (el && m[key] != null) el.value = m[key];
      }
    }
  }

  // ---------- Marketplace ----------
  async function initMarketplace() {
    const me = await API.me(APP);
    if (!me.ok) { location.href = 'login.html'; return; }
    $('hdr-email').textContent = me.data.user.email;
    $('logout').addEventListener('click', async () => { await API.logout(APP); location.href = 'login.html'; });

    // First load: discover whether measurements exist and build the facets.
    const first = await API.marketplace({ minFit: 70 });
    if (!first.ok || (first.data && first.data.available === false)) {
      $('needs-measure').hidden = false;
      return;
    }
    $('market').hidden = false;
    buildFacets(first.data.facets);
    renderProducts(first.data);
    wireFilters();
    wireGenderTabs();
  }

  // Active gender tab: '' (all), 'women' or 'men'. Folded into every request.
  let marketGender = '';

  function wireGenderTabs() {
    const bar = $('gender-tabs');
    if (!bar) return;
    bar.addEventListener('click', async (e) => {
      const b = e.target.closest('.mtab');
      if (!b || b.dataset.gender === marketGender) return;
      marketGender = b.dataset.gender;
      bar.querySelectorAll('.mtab').forEach((x) => x.classList.toggle('is-active', x === b));
      // Switching gender changes which categories/sizes exist, so clear the
      // narrowing filters and rebuild the facets from the scoped response.
      ['f-merchant', 'f-category', 'f-size', 'f-price'].forEach((id) => { $(id).value = ''; });
      const token = ++reqToken;
      const r = await API.marketplace(currentFilters());
      if (token !== reqToken) return;
      if (r.ok && r.data.available) { buildFacets(r.data.facets); renderProducts(r.data); }
    });
  }

  function buildFacets(facets) {
    fillSelect('f-merchant', [['', 'All merchants']].concat(facets.merchants.map((m) => [m.key, `${m.name} (${m.count})`])));
    fillSelect('f-category', [['', 'All categories']].concat(facets.categories.map((c) => [c, c])));
    fillSelect('f-size', [['', 'Any size']].concat(facets.sizes.map((s) => [s, `Size ${s}`])));
    const caps = priceCaps(facets.price.max);
    fillSelect('f-price', [['', 'Any price']].concat(caps.map((c) => [c, `Under $${c}`])));
  }

  function priceCaps(max) {
    return [50, 100, 150, 200, 300].filter((c) => c <= Math.ceil(max) + 50);
  }

  function fillSelect(id, pairs) {
    $(id).innerHTML = pairs.map(([v, label]) => `<option value="${v}">${label}</option>`).join('');
  }

  function currentFilters() {
    return {
      minFit: $('f-fit').value,
      merchant: $('f-merchant').value,
      category: $('f-category').value,
      size: $('f-size').value,
      maxPrice: $('f-price').value,
      sort: $('f-sort').value,
      gender: marketGender,
    };
  }

  let reqToken = 0;
  async function reload() {
    const token = ++reqToken;
    const r = await API.marketplace(currentFilters());
    if (token !== reqToken) return; // a newer request superseded this one
    if (r.ok && r.data.available) renderProducts(r.data);
  }

  function wireFilters() {
    const fit = $('f-fit');
    fit.addEventListener('input', () => { $('fit-val').textContent = fit.value; });
    fit.addEventListener('change', reload);
    ['f-merchant', 'f-category', 'f-size', 'f-price', 'f-sort'].forEach((id) => $(id).addEventListener('change', reload));
    $('f-reset').addEventListener('click', async () => {
      fit.value = 70; $('fit-val').textContent = '70';
      ['f-merchant', 'f-category', 'f-size', 'f-price'].forEach((id) => { $(id).value = ''; });
      $('f-sort').value = 'fit';
      const wasGendered = marketGender !== '';
      marketGender = '';
      const bar = $('gender-tabs');
      if (bar) bar.querySelectorAll('.mtab').forEach((x) => x.classList.toggle('is-active', x.dataset.gender === ''));
      const token = ++reqToken;
      const r = await API.marketplace(currentFilters());
      if (token !== reqToken) return;
      // Rebuild facets only if the gender scope actually changed.
      if (r.ok && r.data.available) { if (wasGendered) buildFacets(r.data.facets); renderProducts(r.data); }
    });
  }

  function fitTone(pct) { return pct >= 80 ? 'good' : pct >= 60 ? 'ok' : 'low'; }

  function renderProducts(data) {
    const grid = $('market-grid');
    $('result-count').textContent = `${data.total} item${data.total === 1 ? '' : 's'} that fit you`;
    $('no-results').hidden = data.total !== 0;
    grid.innerHTML = data.products.map(productCard).join('');
    grid.querySelectorAll('.mcard__fill').forEach((el) => {
      requestAnimationFrame(() => { el.style.width = el.dataset.pct + '%'; });
    });
  }

  function productCard(p) {
    const price = '$' + Number(p.price).toFixed(2).replace(/\.00$/, '');
    const target = p.external ? ' target="_blank" rel="noopener"' : '';
    const out = p.external ? '<span class="mcard__ext">↗</span>' : '';
    return `
      <a class="mcard" href="${p.url}"${target}>
        <div class="mcard__img"><img src="${productImage(p)}" alt="${p.name}" loading="lazy"></div>
        <div class="mcard__body">
          <div class="mcard__top">
            <span class="mcard__merchant">${p.merchantName}${out}</span>
            <span class="chip chip--${fitTone(p.fitPercent)}">${p.fitPercent}% · ${p.bestSize}</span>
          </div>
          <h3 class="mcard__name">${p.name}</h3>
          <div class="mcard__bar"><span class="mcard__fill chip--${fitTone(p.fitPercent)}" data-pct="${p.fitPercent}"></span></div>
          <div class="mcard__foot"><span class="mcard__price">${price}</span><span class="mcard__cat">${p.category}</span></div>
        </div>
      </a>`;
  }

  window.FitMe = { initAuth, initProfile, initMarketplace };
})();
