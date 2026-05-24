# FitMe Platform — Design

Date: 2026-05-23

## Goal
A single demo platform hosting three storefront/app frontends — **Zara mock**, **Massimo Dutti mock**, and **FitMe** — backed by one Express server and a SQLite database, with working authentication and two self-contained "AI" API endpoints (photos→body measurements, body+product→fit %).

## Architecture
- Node.js + Express, single server on `localhost:3000`. No frontend build step.
- SQLite (`better-sqlite3`) file DB (`db.sqlite`), schema created on boot.
- Sessions via `express-session` (httpOnly cookie). Each app namespace tracks which `app` the session belongs to.
- Static frontends in `public/{zara,massimo,fitme}` + `public/shared`.

```
demo/
  server.js          Express app wiring (API + static)
  db.js              SQLite connection + schema
  src/
    auth.js          register/login/logout/me handlers
    measure.js       mock measurements API
    fit.js           mock fit-percentage API
    links.js         FitMe account linking
  data/products.js   Zara + Massimo catalogs + size charts
  uploads/           saved profile photos
  public/
    shared/          shared CSS reset + fetch helpers
    zara/            index, listing, product, login, profile
    massimo/         index, listing, product, login, profile
    fitme/           login, profile
  test/              node:test + supertest API tests
```

## Data model (SQLite)
- `users(id, app, email, password_hash, created_at)` — UNIQUE(app, email). `app` ∈ `zara|massimo|fitme`.
- `measurements(fitme_user_id PK, height_cm, chest, waist, hips, inseam, shoulder, source, updated_at)` — `source` ∈ `photo|manual`. Upserted.
- `photos(id, fitme_user_id, slot, filename)` — slot ∈ `1|2` (front/side). Upsert per slot.
- `fitme_links(id, store_user_id, store_app, fitme_user_id, created_at)` — UNIQUE(store_user_id, store_app).

## Auth endpoints
bcrypt-hashed passwords, server-side sessions.
- `POST /api/:app/register` — create user + start session.
- `POST /api/:app/login` — verify + start session.
- `POST /api/:app/logout` — destroy session.
- `GET  /api/:app/me` — current user or 401.

`:app` validated against `zara|massimo|fitme`.

## Mock APIs (deterministic, self-contained)
- `POST /api/measure` (FitMe session required) — multipart: `height_cm` + 2 photos (`front`, `side`). Derives chest/waist/hips/inseam/shoulder from height using body ratios, perturbed by a hash of photo bytes so output is photo-dependent and stable. Saves measurements (`source='photo'`) + photo files. Returns the measurements.
- `GET /api/fit?app=&product=` (storefront session required + a FitMe link) — loads linked user's measurements, compares to the product's size chart, returns `{ bestSize, fitPercent, notes }`.

## FitMe profile
- Enter height → upload front + side photos → "Calculate measurements" (calls `/api/measure`, fills fields).
- All measurement fields manually editable; Save calls `PUT /api/measurements` (`source='manual'`).
- Clear empty / loading / saved states.

## Linking + fit on storefronts
- Zara/Massimo profile has "Connect FitMe": enter FitMe email+password → verified against FitMe account → `fitme_links` row. Shows connected status + disconnect (`DELETE /api/:app/link`).
- Product detail page: if store user is linked, a Fit panel calls `/api/fit` and shows e.g. `Your fit: 87% — best size M, snug at waist`. Otherwise prompts to log in / connect.

## Visual fidelity
- **Zara**: minimalist, whitespace-heavy, thin uppercase sans type, large imagery, black/white.
- **Massimo Dutti**: warmer premium editorial, serif accents, muted earthy palette.
- **FitMe**: own modern friendly brand, accent color, rounded cards, strong states, accessible.
- Product imagery: generated color tiles / placeholders (no copyrighted assets).

## Testing
- `node:test` + `supertest`: register/login/logout (+ auth failures), measure, fit, linking.
- Seed script creates demo accounts (Zara + FitMe linked) for instant demo.
- README documents manual run-through.

## Out of scope (YAGNI)
Payments/checkout, real CV/ML, email verification, password reset, real third-party APIs. Cart is a non-functional visual element.
```
