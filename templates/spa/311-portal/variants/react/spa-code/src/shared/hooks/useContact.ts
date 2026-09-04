// src/shared/hooks/useContact.ts
// React hooks for consuming contact data from the Power Pages Web API.

import { useState, useCallback } from 'react'
import {
  createContact,
  getContactByEmail,
  getContactById,
  updateContact,
} from '../services/contactService'
import type { Contact, CreateContactInput, UpdateContactInput } from '../../types/contact'

// -- useContactByEmail --------------------------------------------------------
// Looks up a contact by email address. Does not auto-fetch on mount -- call
// `lookup(email)` explicitly (e.g., on form submit in the Track page).

export function useContactByEmail() {
  const [contact, setContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (email: string) => {
    setIsLoading(true)
    setError(null)
    setContact(null)
    try {
      const result = await getContactByEmail(email)
      setContact(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up contact')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { contact, isLoading, error, lookup }
}

// -- useContactById -----------------------------------------------------------
// Fetches a single contact by Dataverse record ID. Call `fetch(id)` explicitly.

export function useContactById() {
  const [contact, setContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    setContact(null)
    try {
      const result = await getContactById(id)
      setContact(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contact')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { contact, isLoading, error, fetch }
}

// -- useCreateContact ---------------------------------------------------------
// Creates a new contact record. Returns the created Contact domain object.

export function useCreateContact() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateContactInput): Promise<Contact | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await createContact(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { create, isLoading, error }
}

// -- useUpdateContact ---------------------------------------------------------
// Updates an existing contact record. Returns the updated Contact domain object.

export function useUpdateContact() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, input: UpdateContactInput): Promise<Contact | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await updateContact(id, input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { update, isLoading, error }
}
