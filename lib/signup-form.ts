export function getPasswordMismatchMessage(password: string, confirmPassword: string) {
  if (!password || !confirmPassword) return ''
  return password === confirmPassword ? '' : 'Passwords do not match.'
}

export function getSignupSuccessMessage(hasSession: boolean) {
  if (hasSession) {
    return 'Account created. You can continue now.'
  }

  return 'Account created. A confirmation email was sent. Check your Inbox and Spam/Junk, then confirm your email before signing in.'
}

export function togglePasswordVisibility(isVisible: boolean) {
  return !isVisible
}