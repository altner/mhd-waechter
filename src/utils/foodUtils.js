// Shared utilities for food recognition and barcode lookup

// Open Food Facts category → our app category
export const OFF_CATEGORY_MAP = {
  'dairy':      'dairy',  'milch':    'dairy',  'milk':     'dairy',
  'yogurt':     'dairy',  'joghurt':  'dairy',  'cheese':   'dairy',
  'käse':       'dairy',  'butter':   'dairy',  'cream':    'dairy',
  'meat':       'meat',   'fleisch':  'meat',   'fish':     'meat',
  'fisch':      'meat',   'poultry':  'meat',   'geflügel': 'meat',
  'sausage':    'meat',   'wurst':    'meat',
  'vegetable':  'vegetable', 'gemüse': 'vegetable', 'salad': 'vegetable',
  'fruit':      'fruit',  'obst':     'fruit',
  'bread':      'bread',  'brot':     'bread',  'bakery':   'bread',
  'backwaren':  'bread',
  'beverage':   'beverage', 'getränk': 'beverage', 'drink':  'beverage',
  'juice':      'beverage', 'saft':   'beverage', 'water':   'beverage',
  'wasser':     'beverage', 'beer':   'beverage', 'bier':    'beverage',
  'wine':       'beverage', 'wein':   'beverage',
  'sauce':      'condiment', 'soße':  'condiment', 'condiment': 'condiment',
  'gewürz':     'condiment', 'spice': 'condiment', 'oil':    'condiment',
  'öl':         'condiment', 'vinegar': 'condiment', 'essig': 'condiment',
  'frozen':     'frozen',  'tiefkühl': 'frozen', 'ice cream': 'frozen',
  'eis':        'frozen',
  'egg':        'egg',    'ei':       'egg',    'eier':     'egg',
}

export function mapOffCategory(offCategories = '') {
  const lower = offCategories.toLowerCase()
  for (const [key, val] of Object.entries(OFF_CATEGORY_MAP)) {
    if (lower.includes(key)) return val
  }
  return 'other'
}

export function parseQuantity(rawQty) {
  if (!rawQty) return { quantity: 1, unit: 'Stück' }
  const match = String(rawQty).match(/([\d.,]+)\s*([a-zA-Zäöü]+)?/)
  if (!match) return { quantity: 1, unit: 'Packung' }
  const qty = parseFloat(match[1].replace(',', '.'))
  const raw = (match[2] || '').toLowerCase()
  const unitMap = { g: 'g', kg: 'kg', ml: 'ml', l: 'l', mg: 'g' }
  if (raw === 'cl') return { quantity: qty * 10, unit: 'ml' }
  return { quantity: isNaN(qty) ? 1 : qty, unit: unitMap[raw] || 'Packung' }
}

export function pickBestName(p) {
  // Bevorzuge den generischen Namen (z.B. "Rote Beete, gekocht") über den Markennamen
  // (z.B. "Bio Gemüse (Bio eG)"). Wähle den längeren/spezifischeren Namen.
  const candidates = [
    p.generic_name_de,
    p.product_name_de,
    p.generic_name,
    p.product_name,
  ].filter(Boolean).map(s => s.trim())

  if (!candidates.length) return ''

  // Markennamen-Muster: enthält Klammer mit "eG", "GmbH", "AG", "KG" o.ä.
  const isBrandOnly = s => /\b(eG|GmbH|AG|KG|Ltd|Inc|Co\.)\b/i.test(s)

  // Nimm den ersten Nicht-Marken-Namen; falls alle Marken sind, nimm den längsten
  return candidates.find(s => !isBrandOnly(s)) || candidates.sort((a, b) => b.length - a.length)[0]
}

export async function lookupOpenFoodFacts(ean) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,product_name_de,generic_name,generic_name_de,categories_tags,quantity,labels_tags`
  let res
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  } catch {
    // Retry einmal bei Timeout/Netzwerkfehler
    try { res = await fetch(url, { signal: AbortSignal.timeout(10000) }) }
    catch { return null }
  }
  if (!res.ok) return null
  const data = await res.json()
  if (data.status === 0) return null
  const p = data.product
  const name = pickBestName(p)
  if (!name) return null
  const { quantity, unit } = parseQuantity(p.quantity)
  const category = mapOffCategory((p.categories_tags || []).join(' '))
  const labels   = (p.labels_tags || []).join(' ').toLowerCase()
  const bio      = labels.includes('organic') || labels.includes('bio') || labels.includes('ökologisch')
  return { name, category, quantity, unit, bio }
}
