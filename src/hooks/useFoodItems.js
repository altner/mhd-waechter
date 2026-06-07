import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getDaysUntilExpiry } from '../utils/expiryUtils.js'

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${options.method ?? 'GET'} ${path} → ${res.status}`)
  return res.json()
}

export function useFoodItems() {
  const [items,   setItems]   = useState([])
  const [stats,   setStats]   = useState({ totalConsumed: 0, totalWasted: 0 })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Initial load
  useEffect(() => {
    Promise.all([
      api('/api/items'),
      api('/api/stats'),
    ])
      .then(([items, stats]) => { setItems(items); setStats(stats) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const addItem = useCallback(async (itemData) => {
    const newItem = {
      ...itemData,
      id:        uuidv4(),
      addedDate: new Date().toISOString().split('T')[0],
      consumed:  false,
      consumedDate: null,
    }
    const saved = await api('/api/items', { method: 'POST', body: JSON.stringify(newItem) })
    setItems(prev => [...prev, saved])
    return saved
  }, [])

  const updateItem = useCallback(async (id, changes) => {
    const updated = await api(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(changes) })
    setItems(prev => prev.map(i => i.id === id ? updated : i))
  }, [])

  const deleteItem = useCallback(async (id) => {
    const item   = items.find(i => i.id === id)
    const wasted = item && getDaysUntilExpiry(item.expiryDate) < 0
    await api(`/api/items/${id}?wasted=${wasted}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
    if (wasted) setStats(s => ({ ...s, totalWasted: s.totalWasted + 1 }))
  }, [items])

  const markConsumed = useCallback(async (id) => {
    const consumedDate = new Date().toISOString().split('T')[0]
    const updated = await api(`/api/items/${id}`, {
      method: 'PUT',
      body:   JSON.stringify({ consumed: true, consumedDate }),
    })
    setItems(prev => prev.map(i => i.id === id ? updated : i))
    setStats(s => ({ ...s, totalConsumed: s.totalConsumed + 1 }))
  }, [])

  const activeItems = items.filter(i => !i.consumed)

  return { items, activeItems, stats, loading, error, addItem, updateItem, deleteItem, markConsumed }
}
