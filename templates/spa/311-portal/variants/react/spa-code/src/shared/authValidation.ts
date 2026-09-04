/**
 * Field validation shared across the auth pages.
 *
 * The rules mirror what the Power Pages server enforces, so users see the same
 * verdict client-side that they would get from a round-trip. If the site's
 * password policy is ever customised via the
 * Authentication/UserManager/PasswordValidator/* site settings, update
 * validatePassword to match, or the two will disagree.
 */

export type Validator = (value: string, allValues: Record<string, string>) => string | undefined

// Deliberately permissive: matching the RFC exactly is not worth it, and the
// server has the final say. This only catches obvious typos before a round-trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateEmail: Validator = value => {
  if (!value.trim()) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(value.trim())) return 'Enter a valid email address.'
  return undefined
}

export const validateRequiredPassword: Validator = value => {
  if (!value) return 'Enter your password.'
  return undefined
}

/**
 * Power Pages' default password policy: at least 8 characters, drawing on at
 * least three of the four character categories.
 */
export const validatePassword: Validator = value => {
  if (!value) return 'Choose a password.'
  if (value.length < 8) return 'Use at least 8 characters.'

  const categories = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(value)).length

  if (categories < 3) {
    return 'Mix at least three of: lowercase, uppercase, numbers, symbols.'
  }
  return undefined
}

export const validateConfirmPassword =
  (passwordField = 'password'): Validator =>
  (value, allValues) => {
    if (!value) return 'Re-enter your password.'
    if (value !== allValues[passwordField]) return 'The passwords do not match.'
    return undefined
  }

export const validateInvitationCode: Validator = value => {
  if (!value.trim()) return 'Enter your invitation code.'
  return undefined
}

/** Scores a password 0-4 so the strength meter can render without duplicating rules. */
export function passwordStrength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: '' }

  const categories = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(value)).length

  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (categories >= 3) score++
  if (categories === 4 && value.length >= 10) score++

  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  return { score, label: labels[score] }
}
