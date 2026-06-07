import { useCallback } from 'react'
import { getDaysUntilExpiry } from '../utils/expiryUtils.js'

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  const checkExpiringItems = useCallback((items, warningDays = 3) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const expiring = items.filter(i => {
      const days = getDaysUntilExpiry(i.expiryDate)
      return days >= 0 && days <= warningDays
    })

    const expired = items.filter(i => getDaysUntilExpiry(i.expiryDate) < 0)

    if (expiring.length > 0) {
      new Notification('🥦 MHD-Wächter – Bald ablaufend', {
        body: `${expiring.length} Artikel laufen in den nächsten ${warningDays} Tagen ab!`,
        icon: '/favicon.svg',
      })
    }

    if (expired.length > 0) {
      new Notification('🔴 MHD-Wächter – Abgelaufen', {
        body: `${expired.length} Artikel sind bereits abgelaufen.`,
        icon: '/favicon.svg',
      })
    }
  }, [])

  return { requestPermission, checkExpiringItems }
}
