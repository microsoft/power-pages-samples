import { useCallback, useMemo, useRef, useState } from 'react'
import type { Validator } from '../authValidation'

/**
 * Validate-on-blur, clear-on-change form state for the auth pages.
 *
 * Errors surface only after a field has been blurred once, so a user typing into
 * an empty form is not immediately scolded. Once a field is "touched" it
 * re-validates on every keystroke, which means the error clears the moment the
 * value becomes valid rather than waiting for another blur.
 *
 * Every touched field is re-checked on each change, not just the one being
 * edited. That is what keeps "passwords do not match" honest: editing the
 * password field has to be able to clear an error attached to confirm-password.
 */
export function useAuthForm<T extends Record<string, string>>(
  initialValues: T,
  validators: Partial<Record<keyof T, Validator>>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [serverError, setServerError] = useState('')

  // Validators are rebuilt on every render (validateConfirmPassword closes over
  // the current password), so they are read through a ref to keep the callbacks
  // below stable instead of churning identity on each keystroke.
  const validatorsRef = useRef(validators)
  validatorsRef.current = validators

  const validate = useCallback((source: T, fields: (keyof T)[]) => {
    const result: Partial<Record<keyof T, string>> = {}
    for (const field of fields) {
      const error = validatorsRef.current[field]?.(source[field] ?? '', source)
      if (error) result[field] = error
    }
    return result
  }, [])

  const setValue = useCallback(
    (field: keyof T, value: string) => {
      setServerError('')
      const next = { ...values, [field]: value } as T
      setValues(next)

      const touchedFields = (Object.keys(next) as (keyof T)[]).filter(f => touched[f])
      setErrors(validate(next, touchedFields))
    },
    [touched, validate, values]
  )

  const handleBlur = useCallback(
    (field: keyof T) => {
      const nextTouched = { ...touched, [field]: true }
      setTouched(nextTouched)

      const touchedFields = (Object.keys(values) as (keyof T)[]).filter(f => nextTouched[f])
      setErrors(validate(values, touchedFields))
    },
    [touched, validate, values]
  )

  /** Marks every field touched and validates all of them. Returns true when clean. */
  const validateAll = useCallback(() => {
    const fields = Object.keys(values) as (keyof T)[]
    const allTouched = fields.reduce<Partial<Record<keyof T, boolean>>>((acc, field) => {
      acc[field] = true
      return acc
    }, {})

    const nextErrors = validate(values, fields)
    setTouched(allTouched)
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [validate, values])

  /** Returns a field's error only once the user has interacted with it. */
  const showError = useCallback(
    (field: keyof T) => (touched[field] ? errors[field] : undefined),
    [errors, touched]
  )

  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors])

  return {
    values,
    setValue,
    setValues,
    handleBlur,
    validateAll,
    showError,
    hasErrors,
    serverError,
    setServerError,
  }
}
