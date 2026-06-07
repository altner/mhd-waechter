# 🥦 MHD-Wächter – Lebensmittel-Tracker

Self-hosted Web-App zur Verwaltung von Kühlschrank, Gefrierfach und Vorratsschrank mit MHD-Tracking und KI-Rezeptvorschlägen.

## Setup

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Entwicklung (beide parallel starten)
npm run dev     # Vite auf :5173
npm run server  # Express + SQLite auf :3000

# 4. Oder Produktion
npm run start   # baut + startet auf :3000
```

## Features

- Lebensmittel mit Name, Menge, MHD, Kategorie und Lagerort verwalten
- MHD-Ampel: 🔴 Abgelaufen · 🟠 1–3 Tage · 🟡 4–7 Tage · 🟢 OK
- Filter & Sortierung pro Lagerort (Kühlschrank, Gefrierfach, Vorrat)
- Artikel als verbraucht markieren
- Statistiken: Verbraucht vs. Weggeworfen, Kategorie-Verteilung
- KI-Rezeptvorschläge für ablaufende Zutaten (Claude API)
- Lebensmittelerkennung per Foto (Claude API)
- Barcode-Scanner
- Push-Benachrichtigungen via ntfy.sh (optional)
- JSON Export/Import
- PWA – installierbar auf Mobilgeräten

## Self-Hosting mit Docker

```bash
docker compose up -d
```

Daten werden in `data/mhd-waechter.db` (SQLite) gespeichert. Erfordert Node 22+.

## Tech Stack

React 18 · Vite · Tailwind CSS · Express · SQLite (node:sqlite) · date-fns · Lucide Icons · Anthropic API
