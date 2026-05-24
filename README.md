# FitMe Platform

Three frontends on one Node + SQLite backend:

- **FitMe** — a body-measurement profile. Estimate measurements from two photos + height via the **SnapMeasureAI** vision API (`api.snapmeasureai.com`), or enter/adjust them by hand.
- **Zara** (mock) — storefront with working accounts; connect FitMe to see your fit % on each product.
- **Massimo Dutti** (mock) — same, in its own brand styling.

Authentication is real (per-site accounts, bcrypt-hashed passwords, server-side sessions). Photos→measurements calls the live **SnapMeasureAI** API (no key required); it returns dimensions as ratios of height, which FitMe scales to centimetres. The body→fit% call is a self-contained deterministic endpoint. Override the vision endpoint/timeout with `SNAPMEASURE_URL` / `SNAPMEASURE_TIMEOUT_MS`.

## Demo

<video src="./demo.mp4" controls width="100%"></video>

▶️ [Watch the demo](./demo.mp4) — end-to-end walkthrough of the three frontends.

## Run

```bash
npm install
npm run seed     # optional: creates a ready-to-use demo account
npm start        # http://localhost:3000
```

Open **http://localhost:3000/portal/** to choose a site.

Seeded login (works on all three sites): `demo@fitme.test` / `demo1234`
(the Zara and Massimo accounts are already connected to the FitMe profile).

## Try it from scratch

1. **FitMe** → register → enter a height and upload two photos → **Calculate measurements** (or use *Enter manually*).
2. **Zara** or **Massimo Dutti** → register → **Account** → **Connect FitMe** with your FitMe email/password.
3. Open any product → see your personalised **fit %**, recommended size, and fit notes.
4. **FitMe → Marketplace** → browse clothes from every merchant, fit-scored against your body. Use the "Fits me ≥ %" slider and the merchant/category/size/price filters; each item links to the merchant's product page.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/:app/register` · `/login` · `/logout` | Auth (`app` = `zara`/`massimo`/`fitme`) |
| GET | `/api/:app/me` | Current user |
| GET | `/api/:app/products` · `/products/:id` | Catalog |
| GET/PUT | `/api/measurements` | Read / manually upsert FitMe measurements |
| POST | `/api/measure` | Photos + height → measurements (multipart) |
| POST/GET/DELETE | `/api/:app/link` | Connect / status / disconnect FitMe |
| GET | `/api/:app/fit?product=ID` | Fit % for the linked shopper |
| GET | `/api/marketplace?minFit=&merchant=&category=&size=&maxPrice=&sort=` | Fit-scored, filtered cross-merchant feed (FitMe) |

## Tests

```bash
npm test
```

Covers auth (incl. cross-app isolation), the fit engine, photo-derived measurements, manual updates, account linking, and the fit endpoint.

## Layout

```
server.js            entry point
db.js                SQLite schema
src/                 app wiring + auth, measure, fit, links, measurements, storefront
data/products.js     Zara + Massimo catalogs (type + fit drive size charts)
public/{portal,zara,massimo,fitme,shared}/   frontends
test/                node:test + supertest
docs/superpowers/specs/                       design spec
```

Mock data only; no real brand assets — product imagery is generated SVG.
