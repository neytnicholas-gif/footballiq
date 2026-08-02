import assert from 'node:assert/strict'
import test from 'node:test'
import { getPasswordMismatchMessage, getSignupSuccessMessage, togglePasswordVisibility } from '../lib/signup-form'
import { isEditableShortcutTarget, shouldIgnoreGlobalShortcut } from '../lib/keyboard-shortcuts'

test('editable fields are excluded from global shortcuts', () => {
  assert.equal(isEditableShortcutTarget({ tagName: 'INPUT' } as never), true)
  assert.equal(isEditableShortcutTarget({ tagName: 'TEXTAREA' } as never), true)
  assert.equal(isEditableShortcutTarget({ tagName: 'SELECT' } as never), true)
  assert.equal(isEditableShortcutTarget({ tagName: 'BUTTON' } as never), true)
  assert.equal(isEditableShortcutTarget({ isContentEditable: true } as never), true)
  assert.equal(isEditableShortcutTarget({ tagName: 'DIV' } as never), false)
})

test('AltGr/@ input is not intercepted by global shortcuts', () => {
  assert.equal(
    shouldIgnoreGlobalShortcut({
      target: { tagName: 'INPUT' } as never,
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      getModifierState: (key) => key === 'AltGraph',
    }),
    true,
  )
  assert.equal(
    shouldIgnoreGlobalShortcut({
      target: { tagName: 'DIV' } as never,
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      getModifierState: (key) => key === 'AltGraph',
    }),
    true,
  )
})

test('mismatched passwords cannot submit and matching passwords can proceed', () => {
  assert.equal(getPasswordMismatchMessage('secret-123', 'secret-321'), 'Passwords do not match.')
  assert.equal(getPasswordMismatchMessage('secret-123', 'secret-123'), '')
})

test('show/hide controls toggle password visibility state', () => {
  assert.equal(togglePasswordVisibility(false), true)
  assert.equal(togglePasswordVisibility(true), false)
})

test('signup success message clearly requires email confirmation only when no session is returned', () => {
  const confirmationRequiredMessage = getSignupSuccessMessage(false)
  assert.match(confirmationRequiredMessage, /Account created\./)
  assert.match(confirmationRequiredMessage, /confirmation email was sent/i)
  assert.match(confirmationRequiredMessage, /Inbox and Spam\/Junk/i)
  assert.match(confirmationRequiredMessage, /confirm your email before signing in/i)

  const immediateSessionMessage = getSignupSuccessMessage(true)
  assert.equal(immediateSessionMessage, 'Account created. You can continue now.')
  assert.doesNotMatch(immediateSessionMessage, /confirmation email was sent/i)
})