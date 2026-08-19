'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { emptyPlayInterestProfile, playInterestForPath, type PlayInterestProfile } from '@/lib/play-path'

export const PLAY_PATH_EVENT = 'early-shout:play-path-updated'
export const PLAY_PATH_STORAGE_KEY = 'early-shout:play-interests:v1'
const SESSION_PATH_KEY = 'early-shout:last-counted-play-path'

export function readPlayInterests(): PlayInterestProfile {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PLAY_PATH_STORAGE_KEY) ?? '{}') as Partial<PlayInterestProfile>
    return { ...emptyPlayInterestProfile(), ...stored }
  } catch {
    return emptyPlayInterestProfile()
  }
}

export function PlayPathTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const interest = playInterestForPath(pathname)
    if (!interest || window.sessionStorage.getItem(SESSION_PATH_KEY) === pathname) return

    const next = readPlayInterests()
    next[interest] += 1
    window.localStorage.setItem(PLAY_PATH_STORAGE_KEY, JSON.stringify(next))
    window.sessionStorage.setItem(SESSION_PATH_KEY, pathname)
    window.dispatchEvent(new CustomEvent(PLAY_PATH_EVENT, { detail: next }))
  }, [pathname])

  return null
}
