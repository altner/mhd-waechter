import { X, AlertTriangle } from 'lucide-react'
import { getDaysUntilExpiry } from '../utils/expiryUtils.js'

export function NotificationBanner({ items, onDismiss }) {
  const critical = items.filter(i => {
    const d = getDaysUntilExpiry(i.expiryDate)
    return d >= 0 && d <= 3
  })
  const expired = items.filter(i => getDaysUntilExpiry(i.expiryDate) < 0)

  if (critical.length === 0 && expired.length === 0) return null

  const parts = []
  if (expired.length)  parts.push(`${expired.length} abgelaufen`)
  if (critical.length) parts.push(`${critical.length} laufen bald ab`)

  return (
    <div className="mx-4 mb-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
      <p className="flex-1 text-sm text-orange-800 font-medium">
        {parts.join(' · ')}
      </p>
      <button onClick={onDismiss} className="text-orange-400 hover:text-orange-600 transition-colors">
        <X size={16} />
      </button>
    </div>
  )
}
