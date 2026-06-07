import { useState, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { lookupOpenFoodFacts } from '../utils/foodUtils.js'

import { getApiKey } from '../utils/apiKey.js'
const API_KEY = () => getApiKey()

// 1. Native BarcodeDetector (Chrome/Android, kostenlos)
async function detectNative(dataUrl) {
  if (!('BarcodeDetector' in window)) return null
  try {
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const results = await detector.detect(await createImageBitmap(img))
    return results.length > 0 ? results[0].rawValue : null
  } catch { return null }
}

// 2. quagga2 (lokal, kostenlos)
async function detectQuagga(dataUrl) {
  return new Promise(resolve => {
    try {
      Quagga.decodeSingle({
        src: dataUrl,
        numOfWorkers: 0,
        decoder: { readers: ['ean_reader', 'ean_8_reader'] },
        locate: true,
      }, result => resolve(result?.codeResult?.code ?? null))
    } catch { resolve(null) }
  })
}

// 3. Sonnet: EAN lesen ODER Lebensmittel erkennen – ein Call, zwei Fälle
const SYSTEM_PROMPT = `Du bist ein Experte für Lebensmittelerkennung.

Schau dir das Foto an und entscheide:

FALL A – Du siehst einen Barcode mit lesbarer EAN-Nummer:
Antworte NUR mit: {"ean": "1234567890123"}
Die EAN muss exakt 8 oder 13 Ziffern haben, keine Leerzeichen.

FALL B – Kein lesbarer Barcode, aber ein Lebensmittel erkennbar:
Lies den Produktnamen direkt vom Etikett. Ignoriere Markennamen (z.B. "Bio eG") und nenne das konkrete Lebensmittel.
Antworte NUR mit:
{"name":"...","category":"dairy|meat|vegetable|fruit|bread|beverage|condiment|frozen|egg|other","quantity":1,"unit":"Stück|g|kg|ml|l|Packung|Bund|Dose|Flasche|Glas","notes":"","shelf_days":7,"location":"fridge"}
shelf_days = typische Lagerdauer in Tagen ab Kaufdatum (Beispiele: Zitrone 14, Erdbeere 3, Brokkoli 5, Karotte 14, Apfel 21, Tomate 7, Joghurt 10, Käse 14, Fleisch 2).
location = empfohlener Lagerort: "fridge" (Kühlschrank), "freezer" (Gefrierfach), "pantry" (Vorratsschrank). Beispiele: Zitrone→pantry, Erdbeere→fridge, Brokkoli→fridge, Kartoffel→pantry, Tiefkühlerbsen→freezer.

FALL C – Weder Barcode noch Lebensmittel erkennbar:
{"error": "Nichts erkannt"}

Antworte ausschließlich mit dem JSON-Objekt, kein Markdown, keine Erklärung.`

async function sonnetRecognize(base64, mimeType) {
  if (!API_KEY()) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 160,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text',  text: 'Bitte analysiere dieses Foto.' },
        ]}],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.content[0].text.trim()
    try { return JSON.parse(text) }
    catch {
      const match = text.match(/\{[\s\S]*\}/)
      return match ? JSON.parse(match[0]) : null
    }
  } catch { return null }
}

export function useFoodRecognition() {
  const [recognizing, setRecognizing] = useState(false)
  const [status, setStatus]           = useState('')
  const [error, setError]             = useState(null)

  const recognize = useCallback(async ({ dataUrl, base64, mimeType }) => {
    setRecognizing(true)
    setError(null)

    try {
      // Schritt 1 – lokale Barcode-Erkennung (kostenlos)
      setStatus('Barcode wird erkannt…')
      const barcode = await detectNative(dataUrl) || await detectQuagga(dataUrl)

      if (barcode) {
        setStatus('Produktdaten laden…')
        const product = await lookupOpenFoodFacts(barcode)
        if (product) { setStatus(''); return { ...product, ean: barcode } }
      }

      // Schritt 2 – Sonnet: EAN lesen oder Lebensmittel erkennen
      if (!API_KEY()) { setError('Kein API-Key konfiguriert.'); return null }
      setStatus(barcode ? 'Produkt wird erkannt…' : 'Foto wird analysiert…')
      const parsed = await sonnetRecognize(base64, mimeType)

      if (!parsed || parsed.error) { setError(parsed?.error || 'Nichts erkannt'); return null }

      // Sonnet hat EAN gelesen → OFF-Lookup
      if (parsed.ean) {
        setStatus('Produktdaten laden…')
        const product = await lookupOpenFoodFacts(parsed.ean)
        if (product) { setStatus(''); return { ...product, ean: parsed.ean } }
        // EAN erkannt aber nicht in OFF → Name manuell eintragen lassen
        setError(`EAN ${parsed.ean} nicht in Open Food Facts – bitte Namen manuell eingeben.`)
        return null
      }

      setStatus('')
      return parsed
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setRecognizing(false)
      setStatus('')
    }
  }, [])

  const resetError = useCallback(() => { setError(null); setStatus('') }, [])

  return { recognize, recognizing, status, error, resetError }
}
