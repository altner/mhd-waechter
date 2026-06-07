import { differenceInDays, startOfDay } from 'date-fns'

export function getDaysUntilExpiry(expiryDate) {
  const today = startOfDay(new Date())
  const expiry = startOfDay(new Date(expiryDate))
  return differenceInDays(expiry, today)
}

export function getExpiryStatus(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate)

  if (days < 0)  return { status: 'expired',  color: 'red',    label: 'Abgelaufen',    days }
  if (days === 0) return { status: 'critical', color: 'orange', label: 'Heute',         days }
  if (days <= 3) return { status: 'critical',  color: 'orange', label: `${days}T`,      days }
  if (days <= 7) return { status: 'warning',   color: 'yellow', label: `${days}T`,      days }
  return               { status: 'ok',         color: 'green',  label: `${days}T`,      days }
}

export function filterByStatus(items, filter) {
  if (filter === 'all') return items
  return items.filter(item => {
    const { status } = getExpiryStatus(item.expiryDate)
    if (filter === 'expiring') return status === 'critical' || status === 'warning'
    if (filter === 'ok')       return status === 'ok'
    if (filter === 'expired')  return status === 'expired'
    return true
  })
}

export function sortItems(items, sortBy) {
  return [...items].sort((a, b) => {
    if (sortBy === 'expiry') return new Date(a.expiryDate) - new Date(b.expiryDate)
    if (sortBy === 'name')   return a.name.localeCompare(b.name, 'de')
    if (sortBy === 'category') return a.category.localeCompare(b.category)
    return 0
  })
}
