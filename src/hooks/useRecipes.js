import { useState, useCallback } from 'react'

import { getApiKey } from '../utils/apiKey.js'
const API_KEY = () => getApiKey()

export function useRecipes() {
  const [recipes, setRecipes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRecipes = useCallback(async (expiringItems) => {
    if (!API_KEY()) {
      setError('Kein API-Key konfiguriert. Bitte VITE_ANTHROPIC_API_KEY in .env setzen.')
      return
    }

    if (expiringItems.length === 0) {
      setError('Keine ablaufenden Artikel gefunden.')
      return
    }

    setLoading(true)
    setError(null)
    setRecipes(null)

    const itemList = expiringItems
      .map(i => `${i.name} (${i.quantity} ${i.unit})`)
      .join(', ')

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          messages: [{
            role: 'user',
            content: `Ich habe folgende Lebensmittel, die bald ablaufen: ${itemList}.

Schlage mir 3 einfache Rezepte vor, die ich damit kochen kann.
Antworte auf Deutsch, strukturiert und praktisch.

Format pro Rezept:
**[Rezeptname]**
Zutaten aus meiner Liste: ...
Zusätzlich: ...
Zubereitung (3–5 Schritte): ...
---`,
          }],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error?.message || `API-Fehler ${response.status}`)
      }

      const data = await response.json()
      setRecipes(data.content[0].text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setRecipes(null)
    setError(null)
  }, [])

  return { recipes, loading, error, fetchRecipes, reset }
}
