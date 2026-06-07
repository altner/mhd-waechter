/**
 * Reads a File/Blob, draws it through a canvas and returns a normalized JPEG.
 * Fixes: HEIC format, EXIF rotation, black-screen on iOS over HTTP, oversized files.
 *
 * @param {File} file
 * @param {number} maxSize  – longest edge in pixels (default 1920, good for barcodes + vision)
 * @returns {Promise<{ dataUrl: string, base64: string, mimeType: 'image/jpeg' }>}
 */
export function processImage(file, maxSize = 1920) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error('Bild konnte nicht dekodiert werden (Format nicht unterstützt?)'))
      img.onload = () => {
        try {
          let { naturalWidth: w, naturalHeight: h } = img

          // Scale down if needed
          if (w > maxSize || h > maxSize) {
            if (w >= h) { h = Math.round((h / w) * maxSize); w = maxSize }
            else        { w = Math.round((w / h) * maxSize); h = maxSize }
          }

          const canvas = document.createElement('canvas')
          canvas.width  = w
          canvas.height = h

          const ctx = canvas.getContext('2d')
          // White background so transparent PNGs don't go black
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
          // Strip "data:image/jpeg;base64," prefix
          const base64  = dataUrl.split(',')[1]

          resolve({ dataUrl, base64, mimeType: 'image/jpeg' })
        } catch (err) {
          reject(err)
        }
      }

      // Setting src triggers decode; works for JPEG, PNG, WEBP, HEIC (Safari)
      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}
