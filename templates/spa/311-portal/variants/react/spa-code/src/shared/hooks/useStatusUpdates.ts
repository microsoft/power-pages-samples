// src/shared/hooks/useStatusUpdates.ts
// React hooks for consuming status update data from the Power Pages Web API.

import { useState, useEffect, useCallback } from 'react'
import {
  listStatusUpdatesByServiceRequest,
  createStatusUpdate,
} from '../services/statusUpdateService'
import type {
  StatusUpdate,
  CreateStatusUpdateInput,
} from '../../types/statusUpdate'

// -- useStatusUpdates ---------------------------------------------------------
// Fetches status updates for a given service request ID.
// Pass undefined or empty string to skip fetching.

export function useStatusUpdates(serviceRequestId: string | undefined) {
  const [items, setItems] = useState<StatusUpdate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!serviceRequestId) {
      setItems([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await listStatusUpdatesByServiceRequest(serviceRequestId)
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status updates')
    } finally {
      setIsLoading(false)
    }
  }, [serviceRequestId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { items, isLoading, error, refetch: fetchData }
}

// -- useCreateStatusUpdate ----------------------------------------------------
// Creates a new status update record. Returns the created StatusUpdate domain object.

export function useCreateStatusUpdate() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateStatusUpdateInput): Promise<StatusUpdate | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await createStatusUpdate(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create status update')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { create, isLoading, error }
}

// Re-export types for convenience
export type { StatusUpdate, CreateStatusUpdateInput }
