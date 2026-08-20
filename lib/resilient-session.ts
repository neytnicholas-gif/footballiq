const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000

type StoredSessionNumber = { value: number; savedAt: number }

/** Keeps a shuffled deck stable if a phone kills and later restores the tab. */
export function readResilientSessionNumber(key: string, maxAge = DEFAULT_MAX_AGE) {
  if (typeof window === 'undefined') return null
  try {
    const sessionValue = Number(window.sessionStorage.getItem(key))
    if (Number.isSafeInteger(sessionValue) && sessionValue > 0) return sessionValue

    const backupKey = `${key}:device-backup`
    const raw = window.localStorage.getItem(backupKey)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<StoredSessionNumber>
    if (!Number.isSafeInteger(stored.value) || !Number.isFinite(stored.savedAt) || Date.now() - stored.savedAt! > maxAge) {
      window.localStorage.removeItem(backupKey)
      return null
    }
    window.sessionStorage.setItem(key, String(stored.value))
    return stored.value!
  } catch {
    return null
  }
}

export function writeResilientSessionNumber(key: string, value: number) {
  if (typeof window === 'undefined' || !Number.isSafeInteger(value) || value <= 0) return
  try {
    window.sessionStorage.setItem(key, String(value))
    window.localStorage.setItem(`${key}:device-backup`, JSON.stringify({ value, savedAt: Date.now() } satisfies StoredSessionNumber))
  } catch {
    // Private browsers may block storage. The live in-memory round still works.
  }
}
