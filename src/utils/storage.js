// Export: fetch all items from server and download as JSON
export async function exportData() {
  const [items, stats] = await Promise.all([
    fetch('/api/items').then(r => r.json()),
    fetch('/api/stats').then(r => r.json()),
  ])
  const blob = new Blob(
    [JSON.stringify({ items, stats, exportedAt: new Date().toISOString() }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `mhd-waechter-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Import: POST each item to server
export async function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!Array.isArray(data.items)) throw new Error('Ungültiges Format')
        for (const item of data.items) {
          await fetch('/api/items', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(item),
          })
        }
        resolve(data.items.length)
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsText(file)
  })
}
