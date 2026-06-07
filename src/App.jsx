import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Settings, Download, Upload, BarChart2, Snowflake, Refrigerator, Package, ChefHat, LayoutGrid, X } from 'lucide-react'

import { useFoodItems } from './hooks/useFoodItems.js'
import { exportData, importData } from './utils/storage.js'
import { setApiKey } from './utils/apiKey.js'
import { filterByStatus, sortItems } from './utils/expiryUtils.js'

import { FoodCard } from './components/FoodCard.jsx'
import { AddItemModal } from './components/AddItemModal.jsx'
import { FilterBar } from './components/FilterBar.jsx'
import { EmptyState } from './components/EmptyState.jsx'
import { NotificationBanner } from './components/NotificationBanner.jsx'
import { RecipePanel } from './components/RecipePanel.jsx'
import { StatsScreen } from './components/StatsScreen.jsx'

const TABS = [
  { id: 'all',     label: 'Alle',           emoji: '📋', icon: LayoutGrid },
  { id: 'fridge',  label: 'Kühlschrank',    emoji: '🧊', icon: Refrigerator },
  { id: 'freezer', label: 'Gefrierfach',    emoji: '❄️', icon: Snowflake },
  { id: 'pantry',  label: 'Vorratsschrank', emoji: '🗄️', icon: Package },
  { id: 'recipes', label: 'Rezepte',        emoji: '🍳', icon: ChefHat },
  { id: 'stats',   label: 'Statistiken',   emoji: '📊', icon: BarChart2 },
]

export default function App() {
  const { items, activeItems, stats, loading, error: apiError, addItem, updateItem, deleteItem, markConsumed } = useFoodItems()
  const [serverSettings, setServerSettings] = useState({
    notifyHour: 8, notifyHour2: null, warningDays: 3, ntfyTopic: '', ntfyUrl: 'https://ntfy.sh', anthropicKey: '',
  })

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => { setServerSettings(s); setApiKey(s.anthropicKey) })
      .catch(() => {})
  }, [])

  const saveServerSettings = () => {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverSettings),
    })
  }

  const [serverTime, setServerTime] = useState(null)

  useEffect(() => {
    fetch('/api/time')
      .then(r => r.json())
      .then(({ iso }) => setServerTime(new Date(iso)))
      .catch(() => setServerTime(new Date()))
    const tick = setInterval(() => setServerTime(t => t ? new Date(t.getTime() + 1000) : null), 1000)
    return () => clearInterval(tick)
  }, [])

  const [activeTab, setActiveTab]       = useState('all')
  const [filter, setFilter]             = useState('all')
  const [sortBy, setSortBy]             = useState('expiry')
  const [showModal, setShowModal]       = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [showBanner, setShowBanner]     = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const fileRef = useRef(null)

  const handleSaveItem = (formData) => {
    if (editItem) updateItem(editItem.id, formData)
    else          addItem(formData)
    setShowModal(false)
    setEditItem(null)
  }

  const handleEdit = (item) => { setEditItem(item); setShowModal(true) }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const count = await importData(file)
      window.location.reload()
      alert(`${count} Artikel importiert.`)
    } catch (err) { alert('Import fehlgeschlagen: ' + err.message) }
    e.target.value = ''
  }

  const tabItems     = activeTab === 'all'
    ? activeItems
    : activeItems.filter(i => i.location === activeTab)
  const displayItems = sortItems(filterByStatus(tabItems, filter), sortBy)
  const isStorageTab = activeTab !== 'stats' && activeTab !== 'recipes'

  const expiringCount = activeItems.filter(i => {
    const d = Math.ceil((new Date(i.expiryDate) - new Date()) / 86400000)
    return d >= 0 && d <= 3
  }).length

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-dvh bg-cream flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">🥦</p>
        <p className="text-gray-500 text-sm">Lade Daten…</p>
      </div>
    </div>
  )

  if (apiError) return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-semibold text-gray-800 mb-1">Server nicht erreichbar</p>
        <p className="text-sm text-gray-500 mb-4">
          Bitte sicherstellen dass der Server läuft:<br/>
          <code className="bg-gray-100 px-2 py-0.5 rounded">npm run server</code>
        </p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium">
          Neu laden
        </button>
      </div>
    </div>
  )

  // ── Settings modal ────────────────────────────────────────────────────────

  const SettingsModal = () => !showSettings ? null : (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92dvh] overflow-y-auto">
        <div className="sm:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-lg font-semibold text-gray-900">Einstellungen</h2>
          <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Notify hour 1 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Benachrichtigung um</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setServerSettings(s => ({ ...s, notifyHour: Math.max(0, s.notifyHour - 1) }))}
                className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg leading-none">−</button>
              <span className="w-14 text-center text-sm font-medium tabular-nums">{serverSettings.notifyHour}:00</span>
              <button onClick={() => setServerSettings(s => ({ ...s, notifyHour: Math.min(23, s.notifyHour + 1) }))}
                className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg leading-none">+</button>
            </div>
          </div>

          {/* Notify hour 2 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">2. Erinnerung</span>
            {serverSettings.notifyHour2 === null ? (
              <button
                onClick={() => setServerSettings(s => ({ ...s, notifyHour2: 18 }))}
                className="text-xs text-primary-600 font-medium hover:underline">
                Aktivieren
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setServerSettings(s => ({ ...s, notifyHour2: Math.max(0, s.notifyHour2 - 1) }))}
                  className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg leading-none">−</button>
                <span className="w-14 text-center text-sm font-medium tabular-nums">{serverSettings.notifyHour2}:00</span>
                <button onClick={() => setServerSettings(s => ({ ...s, notifyHour2: Math.min(23, s.notifyHour2 + 1) }))}
                  className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg leading-none">+</button>
                <button onClick={() => setServerSettings(s => ({ ...s, notifyHour2: null }))}
                  className="w-8 h-8 rounded-xl border border-gray-200 text-red-400 hover:bg-red-50 text-sm leading-none">✕</button>
              </div>
            )}
          </div>

          {/* Warning days */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Vorwarnung</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setServerSettings(s => ({ ...s, warningDays: Math.max(1, s.warningDays - 1) }))}
                className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg leading-none">−</button>
              <span className="w-14 text-center text-sm font-medium tabular-nums">{serverSettings.warningDays} Tage</span>
              <button onClick={() => setServerSettings(s => ({ ...s, warningDays: Math.min(30, s.warningDays + 1) }))}
                className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg leading-none">+</button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">KI & Push</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Anthropic API-Key</label>
              <input type="password" value={serverSettings.anthropicKey}
                onChange={e => setServerSettings(s => ({ ...s, anthropicKey: e.target.value }))}
                placeholder="sk-ant-…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ntfy Topic</label>
              <input type="text" value={serverSettings.ntfyTopic}
                onChange={e => setServerSettings(s => ({ ...s, ntfyTopic: e.target.value }))}
                placeholder="mein-geheimer-kanal"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ntfy URL</label>
              <input type="text" value={serverSettings.ntfyUrl}
                onChange={e => setServerSettings(s => ({ ...s, ntfyUrl: e.target.value }))}
                placeholder="https://ntfy.sh"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
            </div>
          </div>

          <div className="flex gap-3 pt-1 pb-2">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={() => exportData()}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                <Download size={15} /> Export
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                <Upload size={15} /> Import
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
            <button
              onClick={() => { saveServerSettings(); setApiKey(serverSettings.anthropicKey); setShowSettings(false) }}
              className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Card grid ─────────────────────────────────────────────────────────────

  const CardGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {displayItems.length === 0 ? (
        <div className="col-span-full">
          <EmptyState location={activeTab} />
        </div>
      ) : (
        displayItems.map(item => (
          <FoodCard
            key={item.id}
            item={item}
            showLocation={activeTab === 'all'}
            onEdit={handleEdit}
            onDelete={deleteItem}
            onConsume={markConsumed}
          />
        ))
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-cream flex flex-col md:flex-row">

      {/* ── SIDEBAR (md+) ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-gray-100 sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <h1 className="font-display text-2xl font-bold text-primary-500">🥦 MHD-Wächter</h1>
          <p className="text-xs text-gray-400 mt-1">
            {activeItems.length} Artikel
            {expiringCount > 0 && (
              <span className="ml-1 text-orange-500 font-medium">· {expiringCount} ablaufend</span>
            )}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <span className="text-base leading-none">{tab.emoji}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Add button */}
        {isStorageTab && (
          <div className="px-3 pb-2">
            <button
              onClick={() => { setEditItem(null); setShowModal(true) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 active:scale-95 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} /> Artikel hinzufügen
            </button>
          </div>
        )}

        {/* Bottom: clock + settings */}
        <div className="px-3 pb-6 border-t border-gray-100 pt-3 space-y-1">
          {serverTime && (
            <div className="px-3 py-2 text-center">
              <p className="text-sm font-medium text-gray-700">
                {serverTime.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                {serverTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              showSettings ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Settings size={17} /> Einstellungen
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER (< md) ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden bg-white border-b border-gray-100 px-4 header-safe pb-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-500 leading-none">🥦 MHD-Wächter</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeItems.length} Artikel
              {expiringCount > 0 && (
                <span className="ml-1 text-orange-500 font-medium">· {expiringCount} ablaufend</span>
              )}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100 text-gray-500'}`}>
              <Settings size={20} />
            </button>
          </div>
        </header>


        {/* Warning banner */}
        {showBanner && (
          <NotificationBanner items={activeItems} onDismiss={() => setShowBanner(false)} />
        )}

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'stats'   && <StatsScreen items={items} stats={stats} />}
          {activeTab === 'recipes' && <RecipePanel items={activeItems} />}
          {isStorageTab && (
            <div className="px-4 pt-4 pb-28 md:pb-8 md:px-6 lg:px-8">
              <FilterBar filter={filter} onFilter={setFilter} sortBy={sortBy} onSort={setSortBy} />
              <div className="mt-4">
                <CardGrid />
              </div>
            </div>
          )}
        </main>

        {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-safe pt-1 z-30 flex justify-around">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeTab === tab.id ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg leading-none">{tab.emoji}</span>
              <span className="text-[10px] font-medium leading-none">{tab.label.split('s')[0]}</span>
            </button>
          ))}
        </nav>

        {/* ── MOBILE FAB ───────────────────────────────────────────────────── */}
        {isStorageTab && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true) }}
            className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:scale-95 transition-all flex items-center justify-center"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      <AddItemModal
        isOpen={showModal}
        editItem={editItem}
        defaultLocation={['fridge', 'freezer', 'pantry'].includes(activeTab) ? activeTab : 'fridge'}
        onSave={handleSaveItem}
        onClose={() => { setShowModal(false); setEditItem(null) }}
      />
      <SettingsModal />
    </div>
  )
}
