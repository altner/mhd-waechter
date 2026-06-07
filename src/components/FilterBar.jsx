const FILTERS = [
  { id: 'all',      label: 'Alle' },
  { id: 'expiring', label: 'Ablaufend' },
  { id: 'ok',       label: 'OK' },
  { id: 'expired',  label: 'Abgelaufen' },
]

const SORTS = [
  { id: 'expiry',   label: 'MHD' },
  { id: 'name',     label: 'Name' },
  { id: 'category', label: 'Kategorie' },
]

export function FilterBar({ filter, onFilter, sortBy, onSort }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {/* Filter pills */}
      <div className="flex gap-1.5 shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onFilter(f.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-gray-200 shrink-0" />

      {/* Sort */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap">Sortierung:</span>
        <select
          value={sortBy}
          onChange={e => onSort(e.target.value)}
          className="text-sm border-0 bg-transparent text-gray-600 focus:outline-none cursor-pointer"
        >
          {SORTS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
