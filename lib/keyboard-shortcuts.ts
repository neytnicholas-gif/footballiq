type ShortcutEventLike = {
  target: EventTarget | null
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  isComposing?: boolean
  getModifierState?: (key: string) => boolean
}

type ElementLike = {
  tagName?: string
  isContentEditable?: boolean
  closest?: (selectors: string) => unknown
}

export function isEditableShortcutTarget(target: EventTarget | null) {
  if (!target || typeof target !== 'object') return false

  const element = target as ElementLike
  const tagName = typeof element.tagName === 'string' ? element.tagName.toLowerCase() : ''
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button') {
    return true
  }

  if (element.isContentEditable) return true
  if (typeof element.closest === 'function' && element.closest('[contenteditable="true"]')) return true
  return false
}

export function shouldIgnoreGlobalShortcut(event: ShortcutEventLike) {
  if (isEditableShortcutTarget(event.target)) return true
  if (event.isComposing) return true
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return true
  if (event.getModifierState?.('AltGraph')) return true
  return false
}