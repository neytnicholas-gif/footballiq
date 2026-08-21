'use client'

import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { syncPendingQuizProgress } from '@/lib/quiz-progress'

export const OPEN_INSTALL_EXPERIENCE_EVENT = 'early-shout:open-install-experience'
export const APP_PAUSING_EVENT = 'early-shout:app-pausing'
export const APP_RESUMED_EVENT = 'early-shout:app-resumed'
export const INSTALL_VISIBILITY_EVENT = 'early-shout:install-visibility'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean; connection?: { saveData?: boolean } }

const INSTALL_DISMISSED_KEY = 'early-shout:install-dismissed-at:v1'
const INSTALL_VISITS_KEY = 'early-shout:install-visits:v1'
const INSTALL_SESSION_KEY = 'early-shout:install-visit-counted:v1'
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

function isStandalone() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as NavigatorWithStandalone
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function recentlyDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(INSTALL_DISMISSED_KEY))
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < SEVEN_DAYS
  } catch {
    return false
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()))
  } catch {
    // Storage can be blocked in private modes; dismissal still works for this render.
  }
}

export function MobileExperience() {
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [installOpen, setInstallOpen] = useState(false)
  const [installReady, setInstallReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [online, setOnline] = useState(true)
  const [showBackOnline, setShowBackOnline] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadForUpdateRef = useRef(false)

  useEffect(() => {
    const initialStateTimer = window.setTimeout(() => {
      setInstalled(isStandalone())
      setIos(isIos())
      setOnline(navigator.onLine)
    }, 0)

    const navigatorWithConnection = navigator as NavigatorWithStandalone
    document.documentElement.dataset.saveData = navigatorWithConnection.connection?.saveData ? 'true' : 'false'

    function pauseForInterruption() {
      document.documentElement.classList.add('app-is-backgrounded')
      document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => {
        if (!media.paused) {
          media.dataset.earlyShoutWasPlaying = 'true'
          media.pause()
        }
      })
      window.dispatchEvent(new Event(APP_PAUSING_EVENT))
    }

    function resumeFromInterruption() {
      document.documentElement.classList.remove('app-is-backgrounded')
      window.dispatchEvent(new Event(APP_RESUMED_EVENT))
      if (navigator.onLine) void syncPendingQuizProgress()
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') pauseForInterruption()
      else resumeFromInterruption()
    }

    function onPageShow() {
      resumeFromInterruption()
    }

    function onOffline() {
      setOnline(false)
      setShowBackOnline(false)
    }

    function onOnline() {
      setOnline(true)
      setShowBackOnline(true)
      void syncPendingQuizProgress()
      window.setTimeout(() => setShowBackOnline(false), 3000)
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      installEventRef.current = event as BeforeInstallPromptEvent
      setInstallReady(true)
    }

    function onInstalled() {
      setInstalled(true)
      setInstallOpen(false)
      installEventRef.current = null
      setInstallReady(false)
    }

    function openInstall() {
      if (!isStandalone()) setInstallOpen(true)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', pauseForInterruption)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener(OPEN_INSTALL_EXPERIENCE_EVENT, openInstall)

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((registration) => {
        registrationRef.current = registration
        if (registration.waiting) setUpdateReady(true)
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true)
          })
        })
      }).catch((error: unknown) => {
        console.warn('Early Shout could not enable offline startup:', error)
      })

      const onControllerChange = () => {
        if (!reloadForUpdateRef.current) return
        reloadForUpdateRef.current = false
        window.location.reload()
      }
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      return () => {
        window.clearTimeout(initialStateTimer)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pagehide', pauseForInterruption)
        window.removeEventListener('pageshow', onPageShow)
        window.removeEventListener('offline', onOffline)
        window.removeEventListener('online', onOnline)
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        window.removeEventListener('appinstalled', onInstalled)
        window.removeEventListener(OPEN_INSTALL_EXPERIENCE_EVENT, openInstall)
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      }
    }

    return () => {
      window.clearTimeout(initialStateTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', pauseForInterruption)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener(OPEN_INSTALL_EXPERIENCE_EVENT, openInstall)
    }
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(INSTALL_VISIBILITY_EVENT, { detail: { open: installOpen } }))
    return () => {
      if (installOpen) window.dispatchEvent(new CustomEvent(INSTALL_VISIBILITY_EVENT, { detail: { open: false } }))
    }
  }, [installOpen])

  useEffect(() => {
    if (installed || recentlyDismissed()) return
    let visits = 1
    try {
      visits = Math.max(0, Number(window.localStorage.getItem(INSTALL_VISITS_KEY)) || 0)
      if (window.sessionStorage.getItem(INSTALL_SESSION_KEY) !== '1') {
        visits += 1
        window.localStorage.setItem(INSTALL_VISITS_KEY, String(visits))
        window.sessionStorage.setItem(INSTALL_SESSION_KEY, '1')
      }
    } catch {
      visits = 1
    }
    // The install prompt is useful, but the first job is helping a newcomer
    // understand and play. Wait until a later visit and never stack it over a
    // guide or another modal.
    if (visits < 3) return
    const timer = window.setTimeout(() => {
      const anotherDialogIsOpen = Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'))
      if (window.matchMedia('(max-width: 900px)').matches && !isStandalone() && !anotherDialogIsOpen) setInstallOpen(true)
    }, 45000)
    return () => window.clearTimeout(timer)
  }, [installed])

  async function install() {
    const installEvent = installEventRef.current
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setInstallOpen(false)
    } else {
      dismissInstall()
    }
    installEventRef.current = null
    setInstallReady(false)
  }

  function dismissInstall() {
    rememberDismissal()
    setInstallOpen(false)
  }

  function applyUpdate() {
    const worker = registrationRef.current?.waiting
    if (!worker) {
      window.location.reload()
      return
    }
    reloadForUpdateRef.current = true
    worker.postMessage({ type: 'SKIP_WAITING' })
  }

  return (
    <>
      {!online ? (
        <div role="status" className="fixed inset-x-3 top-[calc(.75rem+env(safe-area-inset-top))] z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-200/25 bg-[#172033]/98 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          <WifiOff className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
          <span><strong>You are offline.</strong> Your current round stays on this device and will sync when you reconnect.</span>
        </div>
      ) : showBackOnline ? (
        <div role="status" className="fixed inset-x-3 top-[calc(.75rem+env(safe-area-inset-top))] z-[90] mx-auto max-w-sm rounded-2xl border border-emerald-200/25 bg-emerald-950/98 px-4 py-3 text-center text-sm font-bold text-emerald-100 shadow-2xl">Back online. Saved progress is syncing.</div>
      ) : null}

      {updateReady ? (
        <div role="status" className="fixed inset-x-3 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-sky-200/20 bg-[#0b1727]/98 p-3 text-white shadow-2xl backdrop-blur-xl md:bottom-5">
          <RefreshCw className="size-5 shrink-0 text-sky-300" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm"><strong>A fresh Early Shout update is ready.</strong> Refresh when you have finished your current question.</p>
          <button onClick={applyUpdate} className="min-h-11 shrink-0 rounded-xl bg-sky-300 px-3 text-sm font-black text-slate-950">Refresh</button>
        </div>
      ) : null}

      {installOpen && !installed ? (
        <section role="dialog" aria-modal="true" aria-labelledby="install-early-shout-title" className="fixed inset-x-3 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md overflow-hidden rounded-[1.75rem] border border-emerald-200/25 bg-[linear-gradient(145deg,#0a2730,#08221d)] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.55)] md:bottom-5">
          <button onClick={dismissInstall} className="absolute right-3 top-3 grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5" aria-label="Close install instructions"><X className="size-5" /></button>
          <div className="grid size-12 place-items-center rounded-2xl bg-[linear-gradient(145deg,#6ee7b7,#38bdf8)] text-slate-950 shadow-lg"><Download className="size-6" /></div>
          <h2 id="install-early-shout-title" className="mt-4 pr-10 text-xl font-black">Put Early Shout on your home screen</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Open it full-screen like an app, reach it in one tap and keep a safe offline starting screen.</p>
          {installReady ? (
            <button onClick={() => void install()} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-300 px-4 font-black text-slate-950">Install Early Shout</button>
          ) : ios ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm leading-6 text-slate-200">
              <p className="flex items-center gap-2 font-black text-white"><Share className="size-4 text-sky-300" /> In Safari:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5"><li>Tap the Share button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm leading-6 text-slate-200">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</div>
          )}
          <button onClick={dismissInstall} className="mt-3 min-h-11 w-full rounded-xl border border-white/10 text-sm font-bold text-slate-200">Not now</button>
        </section>
      ) : null}
    </>
  )
}
