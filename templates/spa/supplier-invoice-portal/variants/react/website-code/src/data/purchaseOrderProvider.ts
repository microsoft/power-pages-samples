/**
 * Data provider for purchase orders.
 * Switches between mock data (localhost) and live Dataverse API.
 */

import { useState, useEffect, useCallback } from 'react'
import type { PurchaseOrder, POStatusLabel } from '../types/purchaseOrder'

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ── Unified type for components ──

export interface POItem {
  id: string
  poNumber: string
  description: string
  totalAmount: number
  invoicedAmount: number
  remainingAmount: number
  deliveryDate: string
  status: string
  supplierName: string
  createdOn: string
}

// ── Mapper ──

function apiPOToItem(po: PurchaseOrder): POItem {
  return {
    id: po.id,
    poNumber: po.poNumber,
    description: po.description,
    totalAmount: po.totalAmount,
    invoicedAmount: po.invoicedAmount,
    remainingAmount: po.remainingAmount,
    deliveryDate: po.deliveryDate,
    status: po.status,
    supplierName: po.supplierName,
    createdOn: po.createdOn,
  }
}

// ── Hooks ──

export function usePurchaseOrderList(params?: {
  status?: string
  search?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
}) {
  const [purchaseOrders, setPurchaseOrders] = useState<POItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const status = params?.status
  const search = params?.search
  const sortKey = params?.sortKey || 'createdOn'
  const sortDir = params?.sortDir || 'desc'

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    if (isDevelopment) {
      const { purchaseOrders: mockPOs } = await import('./mockData')
      let list = [...mockPOs]

      if (status && status !== 'All') {
        list = list.filter(po => po.status === status)
      }
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(po =>
          po.poNumber.toLowerCase().includes(q) ||
          po.description.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q)
        )
      }

      const fieldMap: Record<string, keyof typeof list[0]> = {
        poNumber: 'poNumber',
        totalAmount: 'totalAmount',
        status: 'status',
        deliveryDate: 'deliveryDate',
        createdOn: 'createdOn',
        supplierName: 'supplierName',
      }
      const field = fieldMap[sortKey] || 'createdOn'
      list.sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]
        let cmp = 0
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }
        return sortDir === 'asc' ? cmp : -cmp
      })

      setPurchaseOrders(list.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        description: po.description,
        totalAmount: po.totalAmount,
        invoicedAmount: po.invoicedAmount,
        remainingAmount: po.totalAmount - po.invoicedAmount,
        deliveryDate: po.deliveryDate,
        status: po.status,
        supplierName: po.supplierName,
        createdOn: po.createdOn,
      })))
      setTotalCount(list.length)
      setIsLoading(false)
      return
    }

    try {
      const { listPurchaseOrders } = await import('../services/purchaseOrderService')

      const sortFieldMap: Record<string, string> = {
        poNumber: 'spnvc_name',
        totalAmount: 'spnvc_totalamount',
        status: 'spnvc_postatus',
        deliveryDate: 'spnvc_deliverydate',
        createdOn: 'createdon',
      }

      let filter: string | undefined
      if (status && status !== 'All') {
        const { PO_STATUS } = await import('../types/purchaseOrder')
        const statusVal = PO_STATUS[status as POStatusLabel]
        if (statusVal) filter = `spnvc_postatus eq ${statusVal}`
      }

      const result = await listPurchaseOrders({
        pageSize: 50,
        filter,
        search: search || undefined,
        orderBy: `${sortFieldMap[sortKey] || 'createdon'} ${sortDir}`,
      })

      setPurchaseOrders(result.items.map(apiPOToItem))
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders')
    } finally {
      setIsLoading(false)
    }
  }, [status, search, sortKey, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  return { purchaseOrders, totalCount, isLoading, error, refetch: fetchData }
}

export function usePurchaseOrderDetail(id: string | undefined) {
  const [purchaseOrder, setPurchaseOrder] = useState<POItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) { setPurchaseOrder(null); setIsLoading(false); return }
    setIsLoading(true)
    setError(null)

    if (isDevelopment) {
      const { getPurchaseOrderById } = await import('./mockData')
      const mock = getPurchaseOrderById(id)
      if (mock) {
        setPurchaseOrder({
          id: mock.id,
          poNumber: mock.poNumber,
          description: mock.description,
          totalAmount: mock.totalAmount,
          invoicedAmount: mock.invoicedAmount,
          remainingAmount: mock.totalAmount - mock.invoicedAmount,
          deliveryDate: mock.deliveryDate,
          status: mock.status,
          supplierName: mock.supplierName,
          createdOn: mock.createdOn,
        })
      } else {
        setPurchaseOrder(null)
      }
      setIsLoading(false)
      return
    }

    try {
      const { getPurchaseOrderById: getApi } = await import('../services/purchaseOrderService')
      const result = await getApi(id)
      setPurchaseOrder(result ? apiPOToItem(result) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase order')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  return { purchaseOrder, isLoading, error, refetch: fetchData }
}

export function useSupplierPOs() {
  const [purchaseOrders, setPurchaseOrders] = useState<POItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    if (isDevelopment) {
      const { purchaseOrders: mockPOs } = await import('./mockData')
      // In dev, show Issued POs (available for invoicing)
      const issuedPOs = mockPOs.filter(po =>
        po.status === 'Issued' || po.status === 'Partially Invoiced'
      )
      setPurchaseOrders(issuedPOs.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        description: po.description,
        totalAmount: po.totalAmount,
        invoicedAmount: po.invoicedAmount,
        remainingAmount: po.totalAmount - po.invoicedAmount,
        deliveryDate: po.deliveryDate,
        status: po.status,
        supplierName: po.supplierName,
        createdOn: po.createdOn,
      })))
      setIsLoading(false)
      return
    }

    try {
      const { listPurchaseOrders } = await import('../services/purchaseOrderService')
      const { PO_STATUS } = await import('../types/purchaseOrder')
      const result = await listPurchaseOrders({
        pageSize: 100,
        filter: `spnvc_postatus eq ${PO_STATUS['Issued']} or spnvc_postatus eq ${PO_STATUS['Partially Invoiced']}`,
        orderBy: 'spnvc_name asc',
      })
      setPurchaseOrders(result.items.map(apiPOToItem))
    } catch {
      // Empty on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { purchaseOrders, isLoading }
}

export function useCreatePOAction() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (data: {
    poNumber: string
    description: string
    totalAmount: number
    deliveryDate: string
    supplierId?: string
  }): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)

    if (isDevelopment) {
      await new Promise(r => setTimeout(r, 1000))
      setIsSubmitting(false)
      return true
    }

    try {
      const { createPurchaseOrder } = await import('../services/purchaseOrderService')
      await createPurchaseOrder({
        poNumber: data.poNumber,
        description: data.description,
        totalAmount: data.totalAmount,
        deliveryDate: data.deliveryDate,
        status: 'Draft',
        supplierId: data.supplierId,
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { submit, isSubmitting, error }
}

export function useUpdatePOAction() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, data: {
    status?: POStatusLabel
    description?: string
    totalAmount?: number
    deliveryDate?: string
  }): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)

    if (isDevelopment) {
      await new Promise(r => setTimeout(r, 500))
      setIsSubmitting(false)
      return true
    }

    try {
      const { updatePurchaseOrder } = await import('../services/purchaseOrderService')
      await updatePurchaseOrder(id, data)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update purchase order')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { update, isSubmitting, error }
}
