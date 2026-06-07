export const CATEGORIES = [
  { id: 'dairy',     label: 'Milchprodukte', emoji: '🥛' },
  { id: 'meat',      label: 'Fleisch & Fisch', emoji: '🥩' },
  { id: 'vegetable', label: 'Gemüse',        emoji: '🥦' },
  { id: 'fruit',     label: 'Obst',          emoji: '🍎' },
  { id: 'bread',     label: 'Brot & Backwaren', emoji: '🍞' },
  { id: 'beverage',  label: 'Getränke',      emoji: '🧃' },
  { id: 'condiment', label: 'Saucen & Gewürze', emoji: '🧴' },
  { id: 'frozen',    label: 'Tiefkühlkost',  emoji: '🧊' },
  { id: 'egg',       label: 'Eier',          emoji: '🥚' },
  { id: 'other',     label: 'Sonstiges',     emoji: '📦' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export function getCategoryEmoji(categoryId) {
  return CATEGORY_MAP[categoryId]?.emoji ?? '📦'
}

export function getCategoryLabel(categoryId) {
  return CATEGORY_MAP[categoryId]?.label ?? 'Sonstiges'
}

export const UNITS = ['Stück', 'g', 'kg', 'ml', 'l', 'Packung', 'Bund', 'Dose', 'Flasche', 'Glas']

export const LOCATIONS = [
  { id: 'fridge',  label: 'Kühlschrank',  emoji: '🧊' },
  { id: 'freezer', label: 'Gefrierfach',  emoji: '❄️' },
  { id: 'pantry',  label: 'Vorratsschrank', emoji: '🗄️' },
]

export const LOCATION_MAP = Object.fromEntries(LOCATIONS.map(l => [l.id, l]))
