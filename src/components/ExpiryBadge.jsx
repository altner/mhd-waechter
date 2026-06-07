import { getExpiryStatus } from '../utils/expiryUtils.js'

const COLOR_CLASSES = {
  red:    'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  green:  'bg-green-100 text-green-700 border-green-200',
}

export function ExpiryBadge({ expiryDate, size = 'sm' }) {
  const { color, label } = getExpiryStatus(expiryDate)
  const cls = COLOR_CLASSES[color]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${padding} ${cls}`}>
      {label}
    </span>
  )
}
