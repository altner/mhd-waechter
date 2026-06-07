import { Pencil, Trash2, CheckCircle } from 'lucide-react'
import { ExpiryBadge } from './ExpiryBadge.jsx'
import { getCategoryEmoji } from '../utils/categories.js'
import { getExpiryStatus, getDaysUntilExpiry } from '../utils/expiryUtils.js'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const LEFT_BORDER_COLORS = {
  red:    'border-l-red-400',
  orange: 'border-l-orange-400',
  yellow: 'border-l-yellow-400',
  green:  'border-l-green-400',
}

const LOCATION_LABELS = {
  fridge:  { emoji: '🧊', label: 'Kühlschrank' },
  freezer: { emoji: '❄️', label: 'Gefrierfach' },
  pantry:  { emoji: '🗄️', label: 'Vorratsschrank' },
}

const BAR_COLORS = {
  red:    'bg-red-400',
  orange: 'bg-orange-400',
  yellow: 'bg-yellow-400',
  green:  'bg-green-400',
}

const PROGRESS_WINDOW = 90 // Tage bis Ablauf = voller Balken

function getExpiryProgress(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate)
  if (days <= 0) return 0
  return Math.min(100, Math.round((days / PROGRESS_WINDOW) * 100))
}

export function FoodCard({ item, showLocation = false, onEdit, onDelete, onConsume }) {
  const { color } = getExpiryStatus(item.expiryDate)
  const borderColor = LEFT_BORDER_COLORS[color]
  const progress    = getExpiryProgress(item.expiryDate)
  const barColor    = BAR_COLORS[color]

  const formattedDate = (() => {
    try { return format(new Date(item.expiryDate), 'd. MMM yyyy', { locale: de }) }
    catch { return item.expiryDate }
  })()

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColor} p-4 flex items-start gap-3`}>
      {/* Category emoji */}
      <div className="text-2xl leading-none mt-0.5 select-none">
        {getCategoryEmoji(item.category)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
          <ExpiryBadge expiryDate={item.expiryDate} />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {item.quantity} {item.unit}
          {item.bio   && <span className="ml-2 text-green-600 font-medium">🌿 Bio</span>}
          {item.notes && <span className="ml-2 italic">· {item.notes}</span>}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          MHD: {formattedDate}
          {showLocation && LOCATION_LABELS[item.location] && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-gray-400">
              · {LOCATION_LABELS[item.location].emoji} {LOCATION_LABELS[item.location].label}
            </span>
          )}
        </p>
        <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => onConsume(item.id)}
          title="Als verbraucht markieren"
          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
        >
          <CheckCircle size={17} />
        </button>
        <button
          onClick={() => onEdit(item)}
          title="Bearbeiten"
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Pencil size={17} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          title="Löschen"
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  )
}
