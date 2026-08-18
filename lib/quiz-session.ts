export function createQuizSessionSeed() {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] || 1
  }

  return Math.max(1, Math.floor(Math.random() * 0xffff_ffff))
}

export function sampleQuizSession<T>(items: readonly T[], count: number, seed: number) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Quiz session size must be a positive whole number.')
  if (!items.length || count === 0) return []

  const pool = [...items]
  let state = seed >>> 0 || 1
  for (let index = pool.length - 1; index > 0; index -= 1) {
    // Mulberry32 gives a compact, repeatable shuffle without making the order
    // guessable from a fixed stride such as 1, 8, 15, 22…
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    const random = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    const swapIndex = Math.floor(random * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!]
  }

  return pool.slice(0, Math.min(count, pool.length))
}

export function sampleUniqueQuizFamilies<T>(
  items: readonly T[],
  count: number,
  seed: number,
  familyId: (item: T) => string,
) {
  const families = new Map<string, T[]>()
  for (const item of items) {
    const key = familyId(item)
    const family = families.get(key) ?? []
    family.push(item)
    families.set(key, family)
  }

  const selectedFamilies = sampleQuizSession([...families.values()], count, seed)
  return selectedFamilies.map((family, index) => (
    sampleQuizSession(family, 1, seed ^ Math.imul(index + 1, 0x9e37_79b9))[0]!
  ))
}

export function sampleBalancedQuizSession<T>(
  items: readonly T[],
  count: number,
  seed: number,
  isContextual: (item: T) => boolean,
  contextualCount = Math.min(3, count),
) {
  if (!Number.isSafeInteger(contextualCount) || contextualCount < 0 || contextualCount > count) {
    throw new Error('Contextual quiz count must fit inside the session size.')
  }

  const core = items.filter((item) => !isContextual(item))
  const contextual = items.filter(isContextual)
  const chosenCore = sampleQuizSession(core, count - contextualCount, seed)
  const chosenContextual = sampleQuizSession(contextual, contextualCount, seed ^ 0x9e37_79b9)
  const chosen = [...chosenCore, ...chosenContextual]

  // If either pool is smaller than expected, fill from everything not already
  // selected. This keeps the helper safe for future, smaller question banks.
  if (chosen.length < count) {
    const selected = new Set(chosen)
    chosen.push(...sampleQuizSession(items.filter((item) => !selected.has(item)), count - chosen.length, seed ^ 0x85eb_ca6b))
  }

  return sampleQuizSession(chosen, chosen.length, seed ^ 0xc2b2_ae35)
}
