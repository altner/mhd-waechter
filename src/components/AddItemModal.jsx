import { useState, useEffect, useRef } from 'react'
import { X, Camera, Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react'
import { CATEGORIES, LOCATIONS, UNITS } from '../utils/categories.js'
import { useFoodRecognition } from '../hooks/useFoodRecognition.js'
import { processImage } from '../utils/processImage.js'

const DEFAULT_FORM = {
  name: '',
  category: 'dairy',
  quantity: 1,
  unit: 'Stück',
  expiryDate: '',
  location: 'fridge',
  notes: '',
  bio: false,
}

export function AddItemModal({ isOpen, editItem, defaultLocation, onSave, onClose }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [recognized, setRecognized] = useState(false)
  const [detectedEan, setDetectedEan] = useState(null)
  const cameraRef = useRef(null)
  const { recognize, recognizing, status, error, resetError } = useFoodRecognition()

  useEffect(() => {
    if (editItem) {
      setForm({ notes: '', ...editItem })
    } else {
      setForm({ ...DEFAULT_FORM, location: defaultLocation || 'fridge' })
    }
    setPhotoPreview(null)
    setRecognized(false)
    setDetectedEan(null)
    resetError()
  }, [editItem, defaultLocation, isOpen, resetError])

  if (!isOpen) return null

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|heic|webp|avif)$/i)) {
      alert('Bitte ein Bild auswählen.')
      e.target.value = ''
      return
    }
    setRecognized(false)
    resetError()
    let image
    try { image = await processImage(file) }
    catch (err) { console.error(err); e.target.value = ''; return }
    setPhotoPreview(image.dataUrl)
    const result = await recognize(image)
    if (result) {
      setForm(prev => ({
        ...prev,
        ...(result.name     && { name: result.name }),
        ...(result.category && { category: result.category }),
        ...(result.quantity && { quantity: result.quantity }),
        ...(result.unit     && { unit: result.unit }),
        ...(result.notes    && { notes: result.notes }),
        bio: result.bio ?? false,
        ...(!result.ean && result.location && { location: result.location }),
        ...(!result.ean && result.shelf_days > 0 && (() => {
          const d = new Date()
          d.setDate(d.getDate() + result.shelf_days)
          return { expiryDate: d.toISOString().split('T')[0] }
        })()),
      }))
      setDetectedEan(result.ean ?? null)
      setRecognized(true)
    }
    e.target.value = ''
  }

  const retake = () => {
    setPhotoPreview(null)
    setRecognized(false)
    setDetectedEan(null)
    resetError()
    cameraRef.current?.click()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.expiryDate) return
    onSave({ ...form, quantity: Number(form.quantity) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92dvh] overflow-y-auto">
        <div className="sm:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-lg font-semibold text-gray-900">
            {editItem ? 'Artikel bearbeiten' : 'Artikel hinzufügen'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Camera section – only for new items */}
          {!editItem && (
            <div className="space-y-2">
              <input ref={cameraRef} type="file" accept="*/*"
                className="hidden" onChange={handlePhoto} />

              {!photoPreview ? (
                <button type="button" onClick={() => cameraRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 border-dashed border-primary-300 text-primary-600 font-medium text-sm hover:bg-primary-50 active:bg-primary-100 transition-colors">
                  <Camera size={19} /> Foto aufnehmen – Barcode &amp; Lebensmittel erkennen
                </button>
              ) : (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="relative">
                    <img src={photoPreview} alt="Foto" className="w-full h-36 object-cover" />
                    {recognizing && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                        <Loader2 size={26} className="text-white animate-spin" />
                        <p className="text-white text-sm font-medium">{status || 'Claude analysiert…'}</p>
                      </div>
                    )}
                    {recognized && !recognizing && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shadow">
                        <CheckCircle2 size={13} /> Erkannt
                      </div>
                    )}
                  </div>
                  {!recognizing && (
                    <button type="button" onClick={retake}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-primary-600 transition-colors bg-gray-50">
                      <RotateCcw size={13} /> Neues Foto
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{error} – Formular bitte manuell ausfüllen.</p>
                </div>
              )}
              {recognized && (
                <p className="text-xs text-gray-400 text-center">
                  {detectedEan
                    ? <>EAN <span className="font-mono">{detectedEan}</span> · bitte MHD ergänzen.</>
                    : 'Daten eingetragen – bitte MHD ergänzen.'
                  }
                </p>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="z.B. Joghurt" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorie</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => set('category', cat.id)} title={cat.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-colors ${
                    form.category === cat.id
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="leading-tight text-center line-clamp-1">{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity + Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Menge</label>
              <input type="number" min="0.1" step="0.1" value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Einheit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mindesthaltbarkeitsdatum *
            </label>
            <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lagerort</label>
            <div className="flex gap-2">
              {LOCATIONS.map(loc => (
                <button key={loc.id} type="button" onClick={() => set('location', loc.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                    form.location === loc.id
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <span className="text-lg">{loc.emoji}</span>
                  <span>{loc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notizen (optional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="z.B. bereits geöffnet"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
          </div>

          {/* Bio */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={form.bio} onChange={e => set('bio', e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500" />
            <span className="text-sm font-medium text-gray-700">🌿 Bio / Organic</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={recognizing}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 active:bg-primary-700 transition-colors disabled:opacity-50">
              {editItem ? 'Speichern' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
