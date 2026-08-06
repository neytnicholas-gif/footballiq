export function getPasswordMismatchMessage(password: string, confirmPassword: string) {
  if (!password || !confirmPassword) return ''
  return password === confirmPassword ? '' : 'Passwords do not match.'
}

type AuthErrorLike = {
  message?: string
  code?: string
  status?: number
} | null

type SessionLike = {
  user?: { email?: string | null } | null
} | null

const CONFIRMATION_PENDING_MESSAGE =
  'Check your email if confirmation is required. Already confirmed or already registered? Try signing in.'

export function getSignupSuccessMessage(hasSession: boolean) {
  if (hasSession) {
    return 'Account created. You can continue now.'
  }

  return CONFIRMATION_PENDING_MESSAGE
}

export function getForgotPasswordSuccessMessage() {
  return 'If an account exists for that email, a reset link will be sent. Check your inbox and spam folder.'
}

export function getSignupErrorMessage(error: AuthErrorLike) {
  const code = error?.code?.toLowerCase() ?? ''
  const message = error?.message?.toLowerCase() ?? ''

  if (code === 'user_already_exists' || message.includes('already registered')) {
    return CONFIRMATION_PENDING_MESSAGE
  }

  return error?.message ?? 'We could not complete signup right now. Please try again.'
}

export function getLoginErrorState(error: AuthErrorLike) {
  const code = error?.code?.toLowerCase() ?? ''
  const message = error?.message?.toLowerCase() ?? ''

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return {
      message: 'Your email is not confirmed yet. Use resend confirmation, then try signing in again.',
      tone: 'neutral' as const,
      canResend: true,
    }
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return {
      message: 'Invalid email or password.',
      tone: 'error' as const,
      canResend: false,
    }
  }

  return {
    message: error?.message ?? 'We could not sign you in right now. Please try again.',
    tone: 'error' as const,
    canResend: false,
  }
}

type ResendAuthClient = {
  resend: (payload: {
    type: 'signup'
    email: string
    options: { emailRedirectTo: string }
  }) => Promise<{ error: AuthErrorLike }>
}

export async function resendSignupConfirmation(
  authClient: ResendAuthClient,
  email: string,
  origin: string,
) {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return {
      ok: false,
      tone: 'error' as const,
      message: 'Enter your email first to resend confirmation.',
    }
  }

  const { error } = await authClient.resend({
    type: 'signup',
    email: trimmedEmail,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    const status = error.status ?? 0
    const code = error.code?.toLowerCase() ?? ''
    const message = error.message?.toLowerCase() ?? ''
    const isRateLimited =
      status === 429 || code.includes('rate') || message.includes('rate limit') || message.includes('too many requests')

    if (isRateLimited) {
      return {
        ok: false,
        tone: 'error' as const,
        message: 'Too many requests. Please wait a moment before trying resend again.',
      }
    }

    return {
      ok: false,
      tone: 'error' as const,
      message: error.message || 'We could not resend confirmation right now. Please try again.',
    }
  }

  return {
    ok: true,
    tone: 'success' as const,
    message: 'If confirmation is required, check your email for a new link. Already confirmed or already registered? Try signing in.',
  }
}

export function shouldBlockDoubleSubmission(inFlight: boolean) {
  return inFlight
}

export function getCallbackErrorMessage(error: string | null, description: string | null) {
  if (!error && !description) {
    return ''
  }

  const decodedDescription = description ? decodeURIComponent(description.replace(/\+/g, ' ')) : ''
  return decodedDescription || error || 'Authentication callback failed.'
}

export function getSafeRedirectPath(candidate: string | null, fallback = '/') {
  if (!candidate) {
    return fallback
  }

  let decoded = candidate
  try {
    decoded = decodeURIComponent(candidate)
  } catch {
    decoded = candidate
  }

  if (!decoded.startsWith('/')) {
    return fallback
  }

  if (decoded.startsWith('//') || decoded.includes('://') || decoded.startsWith('/\\')) {
    return fallback
  }

  if (decoded.startsWith('/auth/callback')) {
    return fallback
  }

  return decoded
}

export function togglePasswordVisibility(isVisible: boolean) {
  return !isVisible
}

type ResetPasswordAuthClient = {
  resetPasswordForEmail: (email: string, options: { redirectTo: string }) => Promise<{ error: AuthErrorLike }>
}

type UpdatePasswordAuthClient = {
  updateUser: (attributes: { password: string }) => Promise<{ error: AuthErrorLike }>
}

export async function requestPasswordReset(
  authClient: ResetPasswordAuthClient,
  email: string,
  origin: string,
) {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return {
      ok: false,
      tone: 'error' as const,
      message: 'Enter your email first to request a reset link.',
    }
  }

  const { error } = await authClient.resetPasswordForEmail(trimmedEmail, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (!error) {
    return {
      ok: true,
      tone: 'neutral' as const,
      message: getForgotPasswordSuccessMessage(),
    }
  }

  const status = error.status ?? 0
  const code = error.code?.toLowerCase() ?? ''
  const message = error.message?.toLowerCase() ?? ''
  const isRateLimited =
    status === 429 || code.includes('rate') || message.includes('rate limit') || message.includes('too many requests')

  if (isRateLimited) {
    return {
      ok: false,
      tone: 'error' as const,
      message: 'Too many requests. Please wait a moment before requesting another reset email.',
    }
  }

  return {
    ok: false,
    tone: 'error' as const,
    message: 'We could not request a reset link right now. Please try again shortly.',
  }
}

export function getResetPasswordValidationMessage(password: string, confirmPassword: string) {
  if (!password || !confirmPassword) {
    return 'Enter and confirm your new password.'
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.'
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.'
  }

  return ''
}

export function hasRecoverySession(session: SessionLike) {
  return Boolean(session?.user)
}

export function getRecoverySessionErrorMessage(error: AuthErrorLike) {
  const code = error?.code?.toLowerCase() ?? ''
  const message = error?.message?.toLowerCase() ?? ''

  if (code.includes('expired') || message.includes('expired')) {
    return 'This reset link has expired. Request a new one to continue.'
  }

  if (code.includes('invalid') || message.includes('invalid') || message.includes('code verifier')) {
    return 'This reset link is invalid. Request a new one to continue.'
  }

  return 'We could not verify your reset session. Request a new reset link.'
}

export function getUpdatePasswordErrorMessage(error: AuthErrorLike) {
  const code = error?.code?.toLowerCase() ?? ''
  const message = error?.message?.toLowerCase() ?? ''

  if (code.includes('expired') || message.includes('expired')) {
    return 'Your reset link expired. Request another reset email.'
  }

  if (code.includes('invalid') || message.includes('invalid') || message.includes('code verifier')) {
    return 'Your reset session is invalid. Request another reset email.'
  }

  if (code.includes('weak') || message.includes('password')) {
    return 'Choose a stronger password and try again.'
  }

  return 'We could not update your password right now. Please request another reset link.'
}

export async function updateAccountPassword(authClient: UpdatePasswordAuthClient, password: string) {
  const { error } = await authClient.updateUser({ password })
  if (error) {
    return {
      ok: false,
      message: getUpdatePasswordErrorMessage(error),
    }
  }

  return {
    ok: true,
    message: 'Password updated successfully. You can now sign in with your new password.',
  }
}