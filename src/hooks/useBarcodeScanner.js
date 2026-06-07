import { useState, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { processImage } from '../utils/processImage.js'
import { lookupOpenFoodFacts } from '../utils/foodUtils.js'

import { getApiKey } from '../utils/apiKey.js'
const API_KEY = () => getApiKey()

// 1. Native BarcodeDetector (schnell, Chrome/Android)
async function detectNative(dataUrl) {
  if (!('BarcodeDetector' in window)) return null
  try {
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const bitmap = await createImageBitmap(img)
    const results = await detector.detect(bitmap)
    return results.length > 0 ? results[0].rawValue : null
  } catch {
    return null
  }
}

// 2. quagga2 (lokal, universell, kein API-Call)
async function detectQuagga(dataUrl) {
  return new Promise(resolve => {
    try {
      Quagga.decodeSingle({
        src: dataUrl,
        numOfWorkers: 0,
        decoder: { readers: ['ean_reader', 'ean_8_reader'] },
        locate: true,
      }, result => {
        resolve(result?.codeResult?.code ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}

// 3. Claude Haiku – liest die gedruckte EAN-Zahl als Text (gebogene/glänzende Verpackungen)
async function detectVisionEan(base64, mimeType) {
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
        max_tokens: 32,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text',  text: 'Find the EAN/barcode number printed below or near the barcode in this image. Reply with ONLY the digits, no spaces, no other text. If no barcode number is visible, reply with "none".' },
          ],
        }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.content[0].text.trim().replace(/\s/g, '')
    if (/^\d{8}$|^\d{13}$/.test(text)) return text
    return null
  } catch {
    return null
  }
}

export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const scanAndLookup = useCallback(async (file) => {
    setScanning(true)
    setError(null)
    let barcode = null

    try {
      // Hochauflösend für Barcode-Erkennung
      const { dataUrl, base64, mimeType } = await processImage(file, 4000)

      barcode = await detectNative(dataUrl)
      if (!barcode) barcode = await detectQuagga(dataUrl)
      if (!barcode) barcode = await detectVisionEan(base64, mimeType)
    } catch {
      // fall through
    }

    setScanning(false)

    if (!barcode) {
      setError('EAN nicht erkannt – Nummer bitte manuell eingeben.')
      return null
    }

    return await _lookup(barcode)
  }, [])

  const lookupManual = useCallback(async (barcode) => {
    setError(null)
    return await _lookup(barcode.trim())
  }, [])

  async function _lookup(barcode) {
    setLoading(true)
    try {
      const product = await lookupOpenFoodFacts(barcode)
      if (!product) throw new Error('Produkt nicht in Open Food Facts gefunden')
      return { ...product, barcode }
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const resetError = useCallback(() => setError(null), [])

  return { scanAndLookup, lookupManual, scanning, loading, error, resetError }
}
