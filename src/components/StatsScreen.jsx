import { getDaysUntilExpiry } from '../utils/expiryUtils.js'
import { getCategoryEmoji, getCategoryLabel } from '../utils/categories.js'

function StatCard({ label, value, sub, color = 'gray' }) {
  const ring = {
    green: 'ring-green-200 bg-green-50',
    red:   'ring-red-200 bg-red-50',
    blue:  'ring-blue-200 bg-blue-50',
    gray:  'ring-gray-200 bg-gray-50',
  }[color]

  return (
    <div className={`rounded-xl p-4 ring-1 ${ring}`}>
      <p className="text-2xl font-display font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export function StatsScreen({ items, stats }) {
  const active    = items.filter(i => !i.consumed && !i.wasted)
  const consumed  = items.filter(i => i.consumed)
    .sort((a, b) => (b.consumedDate || '').localeCompare(a.consumedDate || ''))
  const expiringSoon = active.filter(i => {
    const d = getDaysUntilExpiry(i.expiryDate)
    return d >= 0 && d <= 7
  })
  const expired = active.filter(i => getDaysUntilExpiry(i.expiryDate) < 0)

  // Category distribution
  const byCat = {}
  active.forEach(i => {
    byCat[i.category] = (byCat[i.category] || 0) + 1
  })
  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Waste score
  const total = stats.totalConsumed + stats.totalWasted
  const wasteRate = total > 0 ? Math.round((stats.totalWasted / total) * 100) : 0
  const saveRate = total > 0 ? 100 - wasteRate : 0

  return (
    <div className="px-4 pt-2 pb-28 space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">Überblick</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Aktive Artikel" value={active.length} color="blue" />
          <StatCard label="Ablaufend (7T)" value={expiringSoon.length} color="gray" />
          <StatCard label="Verbraucht" value={stats.totalConsumed} sub="gesamt" color="green" />
          <StatCard label="Weggeworfen" value={stats.totalWasted} sub="abgelaufen" color="red" />
        </div>
      </div>

      {/* Waste score */}
      <div>
        <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">Waste-Score</h2>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              Noch keine Artikel verbraucht oder weggeworfen.
            </p>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-600 font-medium">Verbraucht {saveRate}%</span>
                <span className="text-red-500 font-medium">Weggeworfen {wasteRate}%</span>
              </div>
              <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${saveRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">{total} Artikel insgesamt bewertet</p>
            </>
          )}
        </div>
      </div>

      {/* Category distribution */}
      {topCats.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">Häufigste Kategorien</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {topCats.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{getCategoryEmoji(cat)}</span>
                <span className="flex-1 text-sm text-gray-700">{getCategoryLabel(cat)}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired warning */}
      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">
            🔴 {expired.length} abgelaufene Artikel
          </p>
          <ul className="text-sm text-red-600 space-y-0.5">
            {expired.map(i => (
              <li key={i.id}>· {i.name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      {consumed.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">Verlauf</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {consumed.map(i => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{getCategoryEmoji(i.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{i.name}</p>
                  <p className="text-xs text-gray-400">
                    {i.quantity} {i.unit}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    ✓ Verbraucht
                  </span>
                  {i.consumedDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      am {new Date(i.consumedDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
