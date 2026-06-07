// Zentraler API-Key-Speicher.
// Wird beim App-Start aus /api/settings befüllt.
// Fallback: VITE_ANTHROPIC_API_KEY aus .env (rückwärtskompatibel).

let _key = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

export const getApiKey = () => _key
export const setApiKey = (key) => { if (key) _key = key }
