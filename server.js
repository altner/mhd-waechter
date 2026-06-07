/**
 * MHD-Wächter – Server
 * Storage: SQLite  |  Push: ntfy.sh  |  Static: dist/
 *
 * .env:
 *   NTFY_TOPIC        geheimer Kanalname
 *   NTFY_URL          Standard: https://ntfy.sh
 *   NOTIFY_HOUR       Uhrzeit tägliche Prüfung (Standard: 8)
 *   WARNING_DAYS      Tage Vorwarnung (Standard: 3)
 *   PORT              Standard: 3000
 */

import 'dotenv/config'
import express              from 'express'
import { DatabaseSync }     from 'node:sqlite'
import cron                 from 'node-cron'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname }    from 'path'
import { fileURLToPath }    from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = join(__dirname, 'data')
const DB_FILE   = join(DATA_DIR, 'mhd-waechter.db')
const DIST_DIR  = join(__dirname, 'dist')

const PORT         = parseInt(process.env.PORT         || '3000', 10)
const NTFY_TOPIC   = process.env.NTFY_TOPIC   || ''
const NTFY_URL     = process.env.NTFY_URL     || 'https://ntfy.sh'
const NOTIFY_HOUR  = parseInt(process.env.NOTIFY_HOUR  || '8',    10)
const WARNING_DAYS = parseInt(process.env.WARNING_DAYS || '3',     10)

// ── SQLite setup ─────────────────────────────────────────────────────────────

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(DB_FILE)
try { db.exec('PRAGMA journal_mode = WAL') } catch { /* some FS don't support WAL */ }
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id           TEXT PRIMARY KEY,
    name         TEXT    NOT NULL,
    category     TEXT    NOT NULL DEFAULT 'other',
    quantity     REAL    NOT NULL DEFAULT 1,
    unit         TEXT    NOT NULL DEFAULT 'Stück',
    expiry_date  TEXT    NOT NULL,
    location     TEXT    NOT NULL DEFAULT 'fridge',
    added_date   TEXT    NOT NULL,
    notes        TEXT    NOT NULL DEFAULT '',
    consumed     INTEGER NOT NULL DEFAULT 0,
    consumed_date TEXT,
    wasted       INTEGER NOT NULL DEFAULT 0,
    bio          INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// ── Migrations ───────────────────────────────────────────────────────────────
try { db.exec('ALTER TABLE items ADD COLUMN bio INTEGER NOT NULL DEFAULT 0') } catch { /* already exists */ }

// ── Row ↔ JS object mapping ──────────────────────────────────────────────────

function rowToItem(row) {
  return {
    id:           row.id,
    name:         row.name,
    category:     row.category,
    quantity:     row.quantity,
    unit:         row.unit,
    expiryDate:   row.expiry_date,
    location:     row.location,
    addedDate:    row.added_date,
    notes:        row.notes,
    consumed:     row.consumed === 1,
    consumedDate: row.consumed_date ?? null,
    bio:          row.bio === 1,
  }
}

function itemToRow(item) {
  return {
    id:            item.id,
    name:          item.name,
    category:      item.category     ?? 'other',
    quantity:      item.quantity      ?? 1,
    unit:          item.unit          ?? 'Stück',
    expiry_date:   item.expiryDate,
    location:      item.location      ?? 'fridge',
    added_date:    item.addedDate     ?? new Date().toISOString().split('T')[0],
    notes:         item.notes         ?? '',
    consumed:      item.consumed ? 1 : 0,
    consumed_date: item.consumedDate  ?? null,
    wasted:        0,
    bio:           item.bio ? 1 : 0,
  }
}

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  allActive:  db.prepare('SELECT * FROM items WHERE wasted = 0 ORDER BY expiry_date ASC'),
  byId:       db.prepare('SELECT * FROM items WHERE id = ?'),
  insert:     db.prepare(`
    INSERT INTO items (id, name, category, quantity, unit, expiry_date, location, added_date, notes, consumed, consumed_date, wasted, bio)
    VALUES (@id, @name, @category, @quantity, @unit, @expiry_date, @location, @added_date, @notes, @consumed, @consumed_date, @wasted, @bio)
  `),
  update:     db.prepare(`
    UPDATE items SET name=@name, category=@category, quantity=@quantity, unit=@unit,
      expiry_date=@expiry_date, location=@location, notes=@notes,
      consumed=@consumed, consumed_date=@consumed_date, bio=@bio
    WHERE id=@id
  `),
  softDelete: db.prepare('UPDATE items SET wasted = @wasted WHERE id = @id'),
  countConsumed: db.prepare("SELECT COUNT(*) as n FROM items WHERE consumed = 1"),
  countWasted:   db.prepare("SELECT COUNT(*) as n FROM items WHERE wasted  = 1"),
  expiringSoon:  db.prepare(`
    SELECT * FROM items
    WHERE wasted = 0 AND consumed = 0
      AND expiry_date <= date('now', '+' || ? || ' days')
  `),
  expired: db.prepare(`
    SELECT * FROM items
    WHERE wasted = 0 AND consumed = 0 AND expiry_date < date('now')
  `),
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
}

// ── ntfy ─────────────────────────────────────────────────────────────────────

async function sendNtfy(title, body, tags = ['broccoli'], priority = 'default', ntfyTopic = null, ntfyUrl = null) {
  const topic = ntfyTopic ?? NTFY_TOPIC
  const url   = ntfyUrl   ?? NTFY_URL
  if (!topic) { console.warn('[ntfy] NTFY_TOPIC nicht gesetzt'); return }
  try {
    const res = await fetch(`${url}/${topic}`, {
      method: 'POST',
      headers: {
        'Title':    title,
        'Priority': priority,
        'Tags':     tags.join(','),
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body,
    })
    if (!res.ok) console.error('[ntfy] Fehler:', res.status)
    else         console.log('[ntfy] Gesendet:', title)
  } catch (e) { console.error('[ntfy] Netzwerkfehler:', e.message) }
}

function getNotifySettings() {
  const row = stmts.getSetting.get('settings')
  const saved = row ? JSON.parse(row.value) : {}
  return {
    notifyHour:  saved.notifyHour  ?? NOTIFY_HOUR,
    notifyHour2: saved.notifyHour2 ?? null,   // null = deaktiviert
    warningDays: saved.warningDays ?? WARNING_DAYS,
    ntfyTopic:   saved.ntfyTopic   ?? NTFY_TOPIC,
    ntfyUrl:     saved.ntfyUrl     ?? NTFY_URL,
  }
}

async function checkAndNotify() {
  const { warningDays, ntfyTopic, ntfyUrl } = getNotifySettings()
  const expired = stmts.expired.all().map(rowToItem)
  const soon    = stmts.expiringSoon.all(warningDays).map(rowToItem)
    .filter(i => new Date(i.expiryDate) >= new Date(new Date().toDateString()))

  console.log(`[cron] ${expired.length} abgelaufen | ${soon.length} bald ablaufend`)

  if (expired.length > 0)
    await sendNtfy(
      `${expired.length} Artikel abgelaufen`,
      expired.map(i => i.name).join(', '),
      ['broccoli', 'red_circle'], 'high', ntfyTopic, ntfyUrl
    )

  if (soon.length > 0)
    await sendNtfy(
      `${soon.length} Artikel laufen bald ab`,
      soon.map(i => {
        const d = Math.round((new Date(i.expiryDate) - new Date()) / 86400000)
        return d === 0 ? `${i.name} (heute!)` : `${i.name} (${d}T)`
      }).join(', '),
      ['broccoli', 'warning'], 'default', ntfyTopic, ntfyUrl
    )
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express()
app.use(express.json({ limit: '2mb' }))

// Items – list
app.get('/api/items', (_req, res) => {
  res.json(stmts.allActive.all().map(rowToItem))
})

// Items – create
app.post('/api/items', (req, res) => {
  const item = req.body
  if (!item?.id || !item?.expiryDate) return res.status(400).json({ error: 'id + expiryDate required' })
  stmts.insert.run(itemToRow(item))
  res.status(201).json(rowToItem(stmts.byId.get(item.id)))
})

// Items – update
app.put('/api/items/:id', (req, res) => {
  const existing = stmts.byId.get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not found' })
  const merged = { ...rowToItem(existing), ...req.body }
  const row = itemToRow(merged)
  stmts.update.run({
    name:          row.name,
    category:      row.category,
    quantity:      row.quantity,
    unit:          row.unit,
    expiry_date:   row.expiry_date,
    location:      row.location,
    notes:         row.notes,
    consumed:      row.consumed,
    consumed_date: row.consumed_date,
    bio:           row.bio,
    id:            req.params.id,
  })
  res.json(rowToItem(stmts.byId.get(req.params.id)))
})

// Items – delete (immer wasted=1 damit Item aus der aktiven Liste verschwindet)
app.delete('/api/items/:id', (req, res) => {
  stmts.softDelete.run({ wasted: 1, id: req.params.id })
  res.json({ ok: true })
})

// Stats
app.get('/api/stats', (_req, res) => {
  res.json({
    totalConsumed: stmts.countConsumed.get().n,
    totalWasted:   stmts.countWasted.get().n,
  })
})

// Settings
app.get('/api/settings', (_req, res) => {
  const row = stmts.getSetting.get('settings')
  const saved = row ? JSON.parse(row.value) : {}
  res.json({
    notifyHour:   NOTIFY_HOUR,
    notifyHour2:  null,
    warningDays:  WARNING_DAYS,
    ntfyTopic:    NTFY_TOPIC,
    ntfyUrl:      NTFY_URL,
    anthropicKey: '',
    ...saved,
  })
})
app.post('/api/settings', (req, res) => {
  const current = (() => {
    const row = stmts.getSetting.get('settings')
    return row ? JSON.parse(row.value) : {}
  })()
  const next = { ...current, ...req.body }
  stmts.setSetting.run('settings', JSON.stringify(next))

  if (req.body.notifyHour !== undefined || req.body.notifyHour2 !== undefined) {
    const { notifyHour, notifyHour2 } = getNotifySettings()
    rescheduleCron(notifyHour, notifyHour2)
  }
  if (req.body.warningDays !== undefined) {
    console.log(`[settings] Vorwarnung: ${req.body.warningDays} Tage`)
  }

  res.json({ ok: true })
})

// Manual notify test
app.get('/api/notify', async (_req, res) => {
  await checkAndNotify()
  res.json({ ok: true })
})

// Server time
app.get('/api/time', (_req, res) => {
  res.json({ iso: new Date().toISOString() })
})

// Status
app.get('/api/status', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) as n FROM items WHERE wasted = 0').get().n
  res.json({ items: total, ntfy_topic: NTFY_TOPIC || '(nicht konfiguriert)',
             notify_hour: NOTIFY_HOUR, warning_days: WARNING_DAYS })
})

// Static (Vite build)
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (_req, res) => res.sendFile(join(DIST_DIR, 'index.html')))
}

// ── Cron ─────────────────────────────────────────────────────────────────────

let cronTask  = null
let cronTask2 = null

function rescheduleCron(hour, hour2) {
  if (cronTask)  cronTask.stop()
  if (cronTask2) cronTask2.stop()

  cronTask = cron.schedule(`0 ${hour} * * *`, () => {
    console.log('[cron] Prüfung 1')
    checkAndNotify()
  })
  console.log(`[cron] Prüfung 1: täglich ${hour}:00 Uhr`)

  if (hour2 !== null && hour2 !== undefined) {
    cronTask2 = cron.schedule(`0 ${hour2} * * *`, () => {
      console.log('[cron] Prüfung 2')
      checkAndNotify()
    })
    console.log(`[cron] Prüfung 2: täglich ${hour2}:00 Uhr`)
  }
}

const { notifyHour, notifyHour2 } = getNotifySettings()
rescheduleCron(notifyHour, notifyHour2)

app.listen(PORT, () => {
  const { notifyHour, notifyHour2, warningDays } = getNotifySettings()
  const cronInfo = notifyHour2 !== null && notifyHour2 !== undefined
    ? `${notifyHour}:00 + ${notifyHour2}:00 Uhr`
    : `${notifyHour}:00 Uhr`
  console.log(`\n🥦 MHD-Wächter Server  →  http://localhost:${PORT}`)
  console.log(`   DB         : ${DB_FILE}`)
  console.log(`   ntfy-Topic : ${NTFY_TOPIC || '(nicht gesetzt)'}`)
  console.log(`   Cron       : täglich ${cronInfo}, ${warningDays}T Vorwarnung\n`)
})
