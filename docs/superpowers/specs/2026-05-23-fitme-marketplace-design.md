# FitMe Marketplace — Design

Date: 2026-05-23

## Goal
A marketplace on **FitMe** that aggregates clothing from several merchants,
filters to what fits the logged-in user's body, supports the usual filters, and
links each product out to the merchant's official product page.

## Catalog — `data/merchants.js`
Unified marketplace feed of products, each: `uid` (`merchant:id`), `merchant`,
`merchantName`, `name`, `category`, `type`, `fit`, `price`, `material`,
`swatch`, `bg`, `url`, `external` (bool).

- **Zara**, **Massimo Dutti** — reuse `data/products.js`; `url` →
  internal storefront page (`/zara/product.html?id=z1`), `external:false`.
- **Arket**, **COS**, **Uniqlo** — new mock catalogs (~8–10 each) with
  `type`+`fit` so they're fit-scored; `url` → merchant official homepage,
  `external:true` (opened in a new tab; honest placeholder, no fabricated deep links).

## Fit — reuse existing engine
Each product scored with `computeFit(measurements, type, fit)` →
`{ bestSize, fitPercent, notes }`. No new fit math.

## Backend — `src/marketplace.js` (pure) + one endpoint
Pure, unit-tested:
- `scoreProducts(products, measurements)` → products + `fitPercent/bestSize/notes`.
- `applyFilters(scored, { minFit, merchant, category, size, maxPrice })`.
- `sortProducts(list, sort)` — `fit` (default, desc), `price_asc`, `price_desc`.
- `facetsOf(scored)` → `{ merchants:[{key,name,count}], categories, sizes, price:{min,max} }`.

Endpoint `GET /api/marketplace?minFit=&merchant=&category=&size=&maxPrice=&sort=`
(FitMe session required):
- measurements missing core dims (chest/waist/hips) → `{ available:false, reason:'no_measurements' }`.
- else → `{ available:true, total, products, facets }`.
- `size` filter = the user's **recommended** size (`bestSize`); a plain size
  filter is meaningless since every item stocks XS–XL.

## Frontend — `public/fitme/marketplace.html`
- Top nav added to FitMe pages: **Profile · Marketplace**.
- Filter bar: **"Fits me ≥ N%"** slider (default 70, debounced) + Merchant /
  Category / Your-size / Max-price selects + Sort. Each change re-queries.
- Grid of cards: image, merchant, name, price, fit chip (`88% · size M`).
  Click → official merchant product page (internal for Zara/Massimo; new tab for others).
- States: no measurements → prompt linking to Profile; no results → loosen filters.

## Testing
- TDD the four pure functions (scoring, fit-threshold + facet filters, sorting, facets).
- Integration: auth required; no-measurements reason; scored+sorted output;
  filters narrow correctly; products expose `merchant` + `url`.

## Out of scope
No cart/checkout (links out, as requested); no new dependencies; reuses the fit
engine and generated SVG imagery.
