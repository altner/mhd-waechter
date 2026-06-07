export function EmptyState({ location }) {
  const ICONS = { fridge: '🧊', freezer: '❄️', pantry: '🗄️' }
  const LABELS = { fridge: 'Kühlschrank', freezer: 'Gefrierfach', pantry: 'Vorratsschrank' }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <span className="text-5xl mb-4">{ICONS[location] ?? '📦'}</span>
      <p className="font-display text-xl font-semibold text-gray-700">
        {LABELS[location] ?? 'Hier'} ist leer
      </p>
      <p className="text-gray-400 mt-1 text-sm">
        Tippe auf + um Lebensmittel hinzuzufügen
      </p>
    </div>
  )
}
