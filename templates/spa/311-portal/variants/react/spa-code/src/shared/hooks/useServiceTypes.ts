// src/shared/hooks/useServiceTypes.ts
// React hooks for consuming service type data from the Power Pages Web API.

import { useState, useEffect, useCallback } from 'react'
import {
  getAllServiceTypes,
  getServiceTypeBySlug,
  getServiceTypeById,
  getServiceTypesByCategory,
} from '../services/serviceTypeService'
import type { ServiceType } from '../../types/serviceType'

// -- useServiceTypes ----------------------------------------------------------
// Fetches the full list of service types. Service types are a reference-data
// table so we fetch all records at once (suitable for search, catalog views).

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAllServiceTypes()
      setServiceTypes(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service types')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { serviceTypes, isLoading, error, refetch: fetchData }
}

// -- useServiceType -----------------------------------------------------------
// Fetches a single service type by its Dataverse record ID.

export function useServiceType(id: string | undefined) {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) {
      setServiceType(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getServiceTypeById(id)
      setServiceType(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service type')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { serviceType, isLoading, error, refetch: fetchData }
}

// -- useServiceTypeBySlug -----------------------------------------------------
// Fetches a single service type by its URL slug.

export function useServiceTypeBySlug(slug: string | undefined) {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!slug) {
      setServiceType(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getServiceTypeBySlug(slug)
      setServiceType(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service type')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { serviceType, isLoading, error, refetch: fetchData }
}

// -- useServiceTypesByCategory ------------------------------------------------
// Fetches all service types for a given category ID (Dataverse GUID).

export function useServiceTypesByCategory(categoryId: string | undefined) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!categoryId) {
      setServiceTypes([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getServiceTypesByCategory(categoryId)
      setServiceTypes(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service types')
    } finally {
      setIsLoading(false)
    }
  }, [categoryId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { serviceTypes, isLoading, error, refetch: fetchData }
}
