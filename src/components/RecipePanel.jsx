import { ChefHat, Loader2, AlertCircle } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes.js'
import { getDaysUntilExpiry } from '../utils/expiryUtils.js'

function parseRecipes(text) {
  return text.split('---').map(block => block.trim()).filter(Boolean)
}

export function RecipePanel({ items }) {
  const { recipes, loading, error, fetchRecipes, reset } = useRecipes()

  const expiringItems = items.filter(i => {
    const d = getDaysUntilExpiry(i.expiryDate)
    return d <= 7
  })

  const handleGenerate = () => {
    reset()
    fetchRecipes(expiringItems)
  }

  return (
    <div className="px-4 pt-4 pb-28 md:pb-8 md:px-6 lg:px-8 space-y-5">
      {/* Zutaten */}
      <div>
        <p className="text-sm text-gray-500 mb-2">
          Zutaten verbrauchen ({expiringItems.length}):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {expiringItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Keine ablaufenden oder abgelaufenen Artikel.</p>
          ) : (
            expiringItems.map(item => (
              <span key={item.id} className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs border border-orange-100">
                {item.name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Idle */}
      {!recipes && !loading && !error && (
        <button
          onClick={handleGenerate}
          disabled={expiringItems.length === 0}
          className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🍳 Rezepte generieren
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={28} className="text-primary-400 animate-spin" />
          <p className="text-sm text-gray-500">Claude denkt nach…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={handleGenerate} className="mt-3 text-sm text-red-600 font-medium hover:underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Recipes */}
      {recipes && (
        <div className="space-y-4">
          {parseRecipes(recipes).map((block, i) => (
            <div key={i} className="bg-white rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-sm border border-gray-100">
              {block.replace(/\*\*(.+?)\*\*/g, (_, t) => t)}
            </div>
          ))}
          <button
            onClick={handleGenerate}
            className="w-full py-2.5 rounded-xl border border-primary-300 text-primary-600 font-medium text-sm hover:bg-primary-50 transition-colors"
          >
            Neue Vorschläge
          </button>
        </div>
      )}
    </div>
  )
}
