// src/shared/hooks/useServiceRequests.ts
// React hooks for consuming service request data from the Power Pages Web API.

import { useState, useEffect, useCallback } from 'react'
import {
  listServiceRequests,
  getServiceRequestById,
  getServiceRequestByNumber,
  createServiceRequest,
  updateServiceRequest,
  getServiceRequestCount,
  type ListServiceRequestsParams,
} from '../services/serviceRequestService'
import type {
  ServiceRequest,
  CreateServiceRequestInput,
  UpdateServiceRequestInput,
  RequestStatus,
} from '../../types/serviceRequest'
import type { PaginatedResult } from '../powerPagesApi'

// -- useServiceRequests -------------------------------------------------------
// Fetches a paginated list of service requests. Supports filtering and sorting.

export function useServiceRequests(params?: ListServiceRequestsParams) {
  const [data, setData] = useState<PaginatedResult<ServiceRequest>>({
    items: [],
    totalCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Serialize params to a stable string for the useEffect dependency.
  const paramsKey = JSON.stringify(params ?? {})

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listServiceRequests(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service requests')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    items: data.items,
    totalCount: data.totalCount,
    nextLink: data.nextLink,
    isLoading,
    error,
    refetch: fetchData,
  }
}

// -- useServiceRequest --------------------------------------------------------
// Fetches a single service request by its Dataverse record ID.

export function useServiceRequest(id: string | undefined) {
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) {
      setServiceRequest(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getServiceRequestById(id)
      setServiceRequest(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service request')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { serviceRequest, isLoading, error, refetch: fetchData }
}

// -- useServiceRequestByNumber ------------------------------------------------
// Looks up a service request by its human-readable request number (e.g., SR-1042-20260210).
// Does not auto-fetch on mount -- call `lookup(requestNumber)` explicitly.

export function useServiceRequestByNumber() {
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const lookup = useCallback(async (requestNumber: string): Promise<ServiceRequest | null> => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    setServiceRequest(null)
    try {
      const result = await getServiceRequestByNumber(requestNumber)
      if (result) {
        setServiceRequest(result)
      } else {
        setNotFound(true)
      }
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up service request')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { serviceRequest, isLoading, error, notFound, lookup }
}

// -- useCreateServiceRequest --------------------------------------------------
// Creates a new service request. Returns the created ServiceRequest domain object.

export function useCreateServiceRequest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateServiceRequestInput): Promise<ServiceRequest | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await createServiceRequest(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service request')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { create, isLoading, error }
}

// -- useUpdateServiceRequest --------------------------------------------------
// Updates an existing service request. Returns the updated ServiceRequest domain object.

export function useUpdateServiceRequest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (
    id: string,
    input: UpdateServiceRequestInput
  ): Promise<ServiceRequest | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await updateServiceRequest(id, input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service request')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { update, isLoading, error }
}

// -- useServiceRequestStats ---------------------------------------------------
// Fetches counts for dashboard stats. Returns total and resolved counts.

export function useServiceRequestStats() {
  const [totalCount, setTotalCount] = useState(0)
  const [resolvedCount, setResolvedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [total, resolved] = await Promise.all([
        getServiceRequestCount(),
        getServiceRequestCount('(spa311_status eq 100000004 or spa311_status eq 100000005)'),
      ])
      setTotalCount(total)
      setResolvedCount(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { totalCount, resolvedCount, isLoading, error, refetch: fetchData }
}

// Re-export types for convenience
export type { ServiceRequest, CreateServiceRequestInput, UpdateServiceRequestInput, RequestStatus }
