'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type ModalFocusOptions = {
  open: boolean
  onClose: () => void
  canClose?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Gives custom dialogs the keyboard behaviour users expect from a modal:
 * focus enters the dialog, Tab stays inside, Escape closes it, and focus
 * returns to the control that opened it.
 */
export function useModalFocus<T extends HTMLElement>({
  open,
  onClose,
  canClose = true,
  initialFocusRef,
}: ModalFocusOptions) {
  const dialogRef = useRef<T>(null)
  const closeRef = useRef(onClose)
  const canCloseRef = useRef(canClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    canCloseRef.current = canClose
  }, [canClose])

  useEffect(() => {
    if (!open) return

    const returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusDialog = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(initialFocusRef?.current ?? firstFocusable ?? dialogRef.current)?.focus()
    })

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && canCloseRef.current) {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')

      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusDialog)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (returnFocus?.isConnected) window.requestAnimationFrame(() => returnFocus.focus())
    }
  }, [initialFocusRef, open])

  return dialogRef
}
