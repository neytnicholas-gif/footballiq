import { describe, expect, it } from 'vitest'
import {
  getCallbackErrorMessage,
  getForgotPasswordSuccessMessage,
  getLoginErrorState,
  getPasswordMismatchMessage,
  getRecoverySessionErrorMessage,
  getResetPasswordValidationMessage,
  getSafeRedirectPath,
  getSignupErrorMessage,
  getSignupSuccessMessage,
  hasRecoverySession,
  requestPasswordReset,
  resendSignupConfirmation,
  shouldBlockDoubleSubmission,
  togglePasswordVisibility,
  updateAccountPassword,
} from '@/lib/signup-form'
import { isEditableShortcutTarget, shouldIgnoreGlobalShortcut } from '@/lib/keyboard-shortcuts'

describe('signup security helpers', () => {
  it('editable fields are excluded from global shortcuts', () => {
    expect(isEditableShortcutTarget({ tagName: 'INPUT' } as never)).toBe(true)
    expect(isEditableShortcutTarget({ tagName: 'TEXTAREA' } as never)).toBe(true)
    expect(isEditableShortcutTarget({ tagName: 'SELECT' } as never)).toBe(true)
    expect(isEditableShortcutTarget({ tagName: 'BUTTON' } as never)).toBe(true)
    expect(isEditableShortcutTarget({ isContentEditable: true } as never)).toBe(true)
    expect(isEditableShortcutTarget({ tagName: 'DIV' } as never)).toBe(false)
  })

  it('AltGr text entry is ignored by global shortcuts', () => {
    expect(shouldIgnoreGlobalShortcut({
      target: { tagName: 'INPUT' } as never,
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      getModifierState: (key) => key === 'AltGraph',
    })).toBe(true)

    expect(shouldIgnoreGlobalShortcut({
      target: { tagName: 'DIV' } as never,
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      getModifierState: (key) => key === 'AltGraph',
    })).toBe(true)
  })

  it('flags mismatched passwords and accepts matching ones', () => {
    expect(getPasswordMismatchMessage('secret-123', 'secret-321')).toBe('Passwords do not match.')
    expect(getPasswordMismatchMessage('secret-123', 'secret-123')).toBe('')
  })

  it('toggles password visibility state', () => {
    expect(togglePasswordVisibility(false)).toBe(true)
    expect(togglePasswordVisibility(true)).toBe(false)
  })

  it('shows confirmation-email guidance only when signup requires confirmation', () => {
    const confirmationRequiredMessage = getSignupSuccessMessage(false)
    expect(confirmationRequiredMessage).toMatch(/Check your email if confirmation is required\./i)
    expect(confirmationRequiredMessage).toMatch(/Already confirmed or already registered\? Try signing in\./i)
    expect(confirmationRequiredMessage).not.toMatch(/was sent/i)

    const immediateSessionMessage = getSignupSuccessMessage(true)
    expect(immediateSessionMessage).toBe('Account created. You can continue now.')
    expect(immediateSessionMessage).not.toMatch(/was sent/i)
  })

  it('maps repeated-signup style errors to privacy-safe non-delivery claim copy', () => {
    expect(
      getSignupErrorMessage({ message: 'User already registered', code: 'user_already_exists' }),
    ).toBe(
      'Check your email if confirmation is required. Already confirmed or already registered? Try signing in.',
    )
  })

  it('resend calls supabase with signup type, email and callback URL', async () => {
    const calls: Array<unknown> = []
    const authClient = {
      resend: async (payload: unknown) => {
        calls.push(payload)
        return { error: null }
      },
    }

    const result = await resendSignupConfirmation(
      authClient,
      'player@example.com',
      'http://localhost:3001',
    )

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({
      type: 'signup',
      email: 'player@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3001/auth/callback',
      },
    })
    expect(result.ok).toBe(true)
  })

  it('forgot-password request sends privacy-safe success copy and callback destination', async () => {
    const calls: Array<unknown> = []
    const authClient = {
      resetPasswordForEmail: async (email: string, options: { redirectTo: string }) => {
        calls.push({ email, options })
        return { error: null }
      },
    }

    const result = await requestPasswordReset(authClient, 'player@example.com', 'http://localhost:3002')

    expect(result).toEqual({
      ok: true,
      tone: 'neutral',
      message: getForgotPasswordSuccessMessage(),
    })
    expect(calls).toEqual([
      {
        email: 'player@example.com',
        options: {
          redirectTo: 'http://localhost:3002/auth/callback?next=/reset-password',
        },
      },
    ])
  })

  it('forgot-password request maps rate-limit and provider failures', async () => {
    const limitedClient = {
      resetPasswordForEmail: async () => ({
        error: { status: 429, code: 'over_rate_limit', message: 'Too many requests' },
      }),
    }

    const failedClient = {
      resetPasswordForEmail: async () => ({
        error: { status: 503, code: 'provider_down', message: 'Email provider down' },
      }),
    }

    const limited = await requestPasswordReset(limitedClient, 'player@example.com', 'http://localhost:3002')
    const failed = await requestPasswordReset(failedClient, 'player@example.com', 'http://localhost:3002')

    expect(limited).toEqual({
      ok: false,
      tone: 'error',
      message: 'Too many requests. Please wait a moment before requesting another reset email.',
    })
    expect(failed).toEqual({
      ok: false,
      tone: 'error',
      message: 'We could not request a reset link right now. Please try again shortly.',
    })
  })

  it('returns resend success copy without promising definite delivery', async () => {
    const authClient = {
      resend: async () => ({ error: null }),
    }

    const result = await resendSignupConfirmation(authClient, 'player@example.com', 'http://localhost:3001')

    expect(result).toEqual({
      ok: true,
      tone: 'success',
      message:
        'If confirmation is required, check your email for a new link. Already confirmed or already registered? Try signing in.',
    })
    expect(result.message).not.toMatch(/was sent/i)
  })

  it('surfaces resend rate-limit and provider error states', async () => {
    const limitedClient = {
      resend: async () => ({
        error: { status: 429, code: 'over_rate_limit', message: 'Too many requests' },
      }),
    }

    const providerErrorClient = {
      resend: async () => ({
        error: { status: 500, code: 'smtp_error', message: 'SMTP unavailable' },
      }),
    }

    const limited = await resendSignupConfirmation(limitedClient, 'player@example.com', 'http://localhost:3001')
    const provider = await resendSignupConfirmation(providerErrorClient, 'player@example.com', 'http://localhost:3001')

    expect(limited).toEqual({
      ok: false,
      tone: 'error',
      message: 'Too many requests. Please wait a moment before trying resend again.',
    })

    expect(provider).toEqual({
      ok: false,
      tone: 'error',
      message: 'SMTP unavailable',
    })
  })

  it('guards against double submission while requests are in flight', () => {
    expect(shouldBlockDoubleSubmission(true)).toBe(true)
    expect(shouldBlockDoubleSubmission(false)).toBe(false)
  })

  it('validates reset passwords and mismatch requirements', () => {
    expect(getResetPasswordValidationMessage('', '')).toBe('Enter and confirm your new password.')
    expect(getResetPasswordValidationMessage('abc', 'abc')).toBe('Password must be at least 8 characters.')
    expect(getResetPasswordValidationMessage('abcdefgh', 'abcdefgh')).toBe('Password must include at least one letter and one number.')
    expect(getResetPasswordValidationMessage('abc12345', 'abc54321')).toBe('Passwords do not match.')
    expect(getResetPasswordValidationMessage('abc12345', 'abc12345')).toBe('')
  })

  it('handles missing or expired recovery session states safely', () => {
    expect(hasRecoverySession(null)).toBe(false)
    expect(hasRecoverySession({ user: null })).toBe(false)
    expect(hasRecoverySession({ user: { email: 'player@example.com' } })).toBe(true)

    expect(getRecoverySessionErrorMessage({ code: 'token_expired', message: 'Token expired' })).toBe(
      'This reset link has expired. Request a new one to continue.',
    )
    expect(getRecoverySessionErrorMessage({ code: 'invalid_grant', message: 'invalid code verifier' })).toBe(
      'This reset link is invalid. Request a new one to continue.',
    )
  })

  it('calls updateUser on successful reset password submit', async () => {
    const calls: Array<unknown> = []
    const authClient = {
      updateUser: async (payload: unknown) => {
        calls.push(payload)
        return { error: null }
      },
    }

    const result = await updateAccountPassword(authClient, 'abc12345')
    expect(calls).toEqual([{ password: 'abc12345' }])
    expect(result).toEqual({
      ok: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    })
  })

  it('maps email_not_confirmed to a resend-oriented sign-in message', () => {
    const mapped = getLoginErrorState({ code: 'email_not_confirmed', message: 'Email not confirmed' })
    expect(mapped).toEqual({
      message: 'Your email is not confirmed yet. Use resend confirmation, then try signing in again.',
      tone: 'neutral',
      canResend: true,
    })
  })

  it('keeps invalid credential messaging privacy-safe', () => {
    const mapped = getLoginErrorState({ code: 'invalid_credentials', message: 'Invalid login credentials' })
    expect(mapped).toEqual({
      message: 'Invalid email or password.',
      tone: 'error',
      canResend: false,
    })
  })

  it('surfaces callback errors and blocks open redirects', () => {
    expect(getCallbackErrorMessage('access_denied', 'Email+link+expired')).toBe('Email link expired')
    expect(getSafeRedirectPath('/leaderboard', '/')).toBe('/leaderboard')
    expect(getSafeRedirectPath('/reset-password', '/')).toBe('/reset-password')
    expect(getSafeRedirectPath('/username', '/')).toBe('/username')
    expect(getSafeRedirectPath('//evil.example/attack', '/')).toBe('/')
    expect(getSafeRedirectPath('https://evil.example/attack', '/')).toBe('/')
    expect(getSafeRedirectPath('/auth/callback?next=%2F', '/')).toBe('/')
  })
})