# Repository Guide

## Structure
- This is not an npm workspace. Root, `server/`, and `client/` have independent manifests and lockfiles; install each with `npm install`, `npm --prefix server install`, and `npm --prefix client install`.
- Root scripts only orchestrate the packages. The Vue/Vite SPA starts at `client/src/main.js`; routing is in `client/src/router.js`. The Express API and nearly all route handlers live in `server/src/index.js`; reusable generation, LLM, scraping, and product-selection logic is under `server/src/services/` and `server/src/scrape/`.
- The client always calls relative `/api` URLs. Vite proxies these to `http://localhost:5177`; the production server serves `client/dist` after API routes.

## Commands
- Development: `npm run dev` (API on 5177, Vite on 5173).
- Client build: `npm run build`.
- Server tests: `npm --prefix server test`.
- One test file: `npm --prefix server test -- test/articleGenerator.test.js`.
- Tests by name: `npm --prefix server test -- --test-name-pattern="resolveLlmConfig"`.
- `npm run lint` only prints `no lint configured` in both packages. There is no configured client test, formatter, or typecheck command; do not treat lint success as verification.
- The server suite covers article generation plus affiliate URL and HTML-sanitization helpers, but not HTTP route authorization or browser flows.

## Database And Environment
- `server/src/db.js` opens `db/app.db` by default, enables WAL, and executes `db/schema.sql` on every startup. Database files are ignored; avoid depending on local data in changes or tests.
- `db/schema.sql` describes fresh databases; `createDb()` also adds required columns to legacy databases at startup. `node server/migrate.js` uses that same path. Verify persistence changes against both fresh and legacy-shaped temporary databases.
- Under the normal `npm --prefix server ...` scripts, relative environment paths resolve from `server/`. Leave `DB_PATH` unset to use the repository DB; `server/.env.example` uses `../db/app.db`.
- `LLM_PROVIDER` defaults to Ollama and is considered enabled whenever it has a base URL. OpenAI and OpenRouter are enabled only with `LLM_API_KEY`. `requestLlmHtml` returns structured JSON when possible and `{ html: content }` for non-JSON responses; the template generator returns an HTML string.

## Authentication And Affiliate Safety
- Administrative product, taxonomy, affiliate, article, generation, publication, and subscriber routes require a bearer JWT. Anonymous article APIs expose only `published` content; preserve this split when adding routes.
- Amazon imports accept only explicit Amazon marketplace hosts. Generated monetized articles require a tracked `/dp/{ASIN}?tag=...` URL, and stored/generated HTML is sanitized server-side. Do not weaken these checks or trust LLM HTML.
