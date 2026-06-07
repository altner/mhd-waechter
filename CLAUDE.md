# CLAUDE.md – MHD-Wächter

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (run both in parallel)
npm run dev          # Vite dev server on :5173 (hot reload, proxies /api/* to :3000)
npm run server       # Express + SQLite backend on :3000

# Production
npm run build        # Build frontend → dist/
npm run start        # build + serve via Express on :3000

# Docker (production self-hosting)
docker compose up -d
```

No test suite exists.

## Environment

`.env` is already configured. Key variables:

```
VITE_ANTHROPIC_API_KEY=...   # recipe suggestions & food photo recognition
NTFY_TOPIC=...               # push notifications via ntfy.sh (optional)
NTFY_URL=https://ntfy.sh
NOTIFY_HOUR=8                # daily check time (0–23)
WARNING_DAYS=3               # warn X days before expiry
PORT=3000
```

## Architecture

**Two-layer app:** Vite/React PWA frontend + Express/SQLite backend.

### Backend (`server.js`)
Single-file Express server. Uses Node.js built-in `node:sqlite` (requires Node 22+). Persists data to `data/mhd-waechter.db`. REST API:
- `GET/POST /api/items` — list all non-wasted items / create item
- `PUT /api/items/:id` — update (also used for mark-consumed)
- `DELETE /api/items/:id?wasted=true|false` — soft-delete (sets `wasted` flag)
- `GET /api/stats` — consumed/wasted counts
- `GET/POST /api/settings` — JSON blob in `settings` table
- `GET /api/notify` — trigger manual expiry check
- `GET /api/status` — health/config info

Serves `dist/` as static files in production. Daily cron sends ntfy.sh push notifications for expired/expiring items.

**Item lifecycle:** items are never hard-deleted. `wasted=0` = active; `consumed=1` = consumed; `wasted=1` = thrown away (removed from active list).

### Frontend (`src/`)
- **`App.jsx`** — root component, owns tab state (fridge/freezer/pantry/recipes/stats), renders responsive layout (sidebar on md+, bottom nav on mobile)
- **`hooks/useFoodItems.js`** — all CRUD via `/api/*`; holds `items` (all) and `activeItems` (unconsumed) in state
- **`hooks/useRecipes.js`** — calls Anthropic API **directly from the browser** using `VITE_ANTHROPIC_API_KEY`; uses `claude-sonnet-4-20250514`
- **`hooks/useFoodRecognition.js`** — photo-based food recognition also via direct Anthropic API call
- **`hooks/useBarcodeScanner.js`** — barcode scanning via device camera
- **`utils/storage.js`** — only UI settings (`notificationsEnabled`, `warningDaysBefore`) remain in localStorage; all item data is server-side
- **`utils/expiryUtils.js`** — expiry color logic (red/orange/yellow/green), filter and sort helpers
- **`utils/categories.js`** — food category definitions

### Data model (JS side)
```js
{
  id, name, category, quantity, unit,
  expiryDate,    // "YYYY-MM-DD"
  location,      // "fridge" | "freezer" | "pantry"
  addedDate, notes,
  consumed,      // boolean
  consumedDate,  // "YYYY-MM-DD" | null
}
```
Snake_case ↔ camelCase mapping happens in `rowToItem` / `itemToRow` in `server.js`.

### Tailwind
Custom colors: `primary-*` (green), `cream` background. Config in `tailwind.config.js`.
