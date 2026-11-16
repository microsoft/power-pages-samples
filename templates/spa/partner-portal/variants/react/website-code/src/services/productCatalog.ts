import type { OpportunityProduct } from '../data/types'
import { request, webApi } from './http'

interface OpportunityPricing {
  opportunityid: string
  _pricelevelid_value?: string | null
  _transactioncurrencyid_value?: string | null
  '@odata.etag'?: string
}
export interface PriceList {
  pricelevelid: string
  name?: string
  statecode?: number
  _transactioncurrencyid_value?: string | null
}
export interface CatalogProduct {
  productid: string
  name?: string
  productnumber?: string
  statecode?: number
  productstructure?: number
  _defaultuomid_value?: string | null
  _defaultuomscheduleid_value?: string | null
}
export interface CatalogUnit {
  uomid: string
  name?: string
  _uomscheduleid_value?: string | null
}
export interface PriceItem {
  productpricelevelid: string
  _productid_value?: string | null
  _pricelevelid_value?: string | null
  _uomid_value?: string | null
  pricingmethodcode?: number
  amount?: number | null
}
export interface PricingContext {
  opportunity: OpportunityPricing
  currencyId: string
  currencyCode?: string
  lists: PriceList[]
}
export interface Catalog {
  products: CatalogProduct[]
  units: CatalogUnit[]
  items: PriceItem[]
}
export interface CatalogSelection {
  priceListId: string
  currencyId: string
}

const OPPORTUNITY_SELECT = 'opportunityid,_pricelevelid_value,_transactioncurrencyid_value'
const LIST_SELECT = 'pricelevelid,name,statecode,_transactioncurrencyid_value'
const PRODUCT_SELECT = 'productid,name,productnumber,statecode,productstructure,_defaultuomid_value,_defaultuomscheduleid_value'
const UNIT_SELECT = 'uomid,name,_uomscheduleid_value'
const ITEM_SELECT = 'productpricelevelid,_productid_value,_pricelevelid_value,_uomid_value,pricingmethodcode,amount'

export function guid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Invalid catalog record identifier.')
  return value
}
const sameId = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
const query = (set: string, select: string, filter: string, order: string) =>
  `${set}?$select=${select}&$filter=${encodeURIComponent(filter)}&$orderby=${encodeURIComponent(order)}&$count=true`

export async function loadPricingContext(opportunityId: string, signal?: AbortSignal): Promise<PricingContext> {
  const opportunity = await webApi.get<OpportunityPricing>(`opportunities(${guid(opportunityId)})?$select=${OPPORTUNITY_SELECT}`, signal)
  if (!('_pricelevelid_value' in opportunity) || opportunity._pricelevelid_value === undefined) {
    throw new Error('The opportunity price list field could not be read. Ask your administrator to allow access before adding a catalog product.')
  }
  const currencyId = opportunity._transactioncurrencyid_value
  if (!currencyId) {
    throw new Error('This opportunity has no readable currency. Ask your administrator to set or allow access to its currency before adding a catalog product.')
  }
  const [currency, lists] = await Promise.all([
    webApi.get<{ isocurrencycode?: string }>(`transactioncurrencies(${guid(currencyId)})?$select=transactioncurrencyid,isocurrencycode`, signal),
    webApi.list<PriceList>(
      query('pricelevels', LIST_SELECT, `statecode eq 0 and _transactioncurrencyid_value eq ${guid(currencyId)}`, 'name asc,pricelevelid asc'),
      signal,
    ),
  ])
  const current = opportunity._pricelevelid_value
  if (current !== null) guid(current)
  if (current && !lists.some(l => l.statecode === 0 && sameId(l.pricelevelid, current) && sameId(l._transactioncurrencyid_value, currencyId))) {
    throw new Error('The existing price list is unavailable, inactive, or does not match the opportunity currency. It will not be changed here.')
  }
  return {
    opportunity,
    currencyId,
    currencyCode: currency.isocurrencycode,
    lists: lists.filter(l => l.statecode === 0 && sameId(l._transactioncurrencyid_value, currencyId)),
  }
}

export async function loadCatalog(priceListId: string, signal?: AbortSignal): Promise<Catalog> {
  const [products, units, items] = await Promise.all([
    webApi.list<CatalogProduct>(
      query('products', PRODUCT_SELECT, 'statecode eq 0 and (productstructure eq 1 or productstructure eq 3)', 'name asc,productid asc'),
      signal,
    ),
    webApi.list<CatalogUnit>(`uoms?$select=${UNIT_SELECT}&$orderby=name asc,uomid asc&$count=true`, signal),
    webApi.list<PriceItem>(query('productpricelevels', ITEM_SELECT, `_pricelevelid_value eq ${guid(priceListId)}`, 'productpricelevelid asc'), signal),
  ])
  const catalog = { products, units, items: items.filter(i => sameId(i._pricelevelid_value, priceListId)) }
  return {
    ...catalog,
    products: products.filter(
      p => p.statecode === 0 && (p.productstructure === 1 || p.productstructure === 3) && eligibleUnits(catalog, p.productid).length > 0,
    ),
  }
}

export function eligibleUnits(catalog: Catalog, productId: string): CatalogUnit[] {
  const product = catalog.products.find(p => sameId(p.productid, productId))
  if (!product?._defaultuomscheduleid_value) return []
  return catalog.units.filter(
    u =>
      sameId(u._uomscheduleid_value, product._defaultuomscheduleid_value) &&
      catalog.items.some(i => sameId(i._productid_value, productId) && sameId(i._uomid_value, u.uomid)),
  )
}

/** Only Amount pricing is a literal unit price. All calculated methods require an explicit manual override. */
export function catalogPrice(catalog: Catalog, productId: string, unitId: string): string {
  const items = catalog.items.filter(i => sameId(i._productid_value, productId) && sameId(i._uomid_value, unitId))
  const item = items.length === 1 ? items[0] : undefined
  return item?.pricingmethodcode === 1 && typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount >= 0 ? String(item.amount) : ''
}

export function productPayload(opportunityId: string, p: Omit<OpportunityProduct, 'id'>): Record<string, unknown> {
  return {
    'opportunityid@odata.bind': `/opportunities(${guid(opportunityId)})`,
    isproductoverridden: p.writeIn,
    ...(p.writeIn
      ? { productdescription: p.product }
      : {
          'productid@odata.bind': `/products(${guid(p.productId ?? '')})`,
          'uomid@odata.bind': `/uoms(${guid(p.unitId ?? '')})`,
        }),
    quantity: p.quantity,
    ispriceoverridden: true,
    priceperunit: p.pricePerUnit,
  }
}

/** Re-read permission-scoped dependencies at save; never replace currency or an existing price list. */
export async function prepareCatalogAdd(opportunityId: string, p: Omit<OpportunityProduct, 'id'>, selection: CatalogSelection): Promise<boolean> {
  const context = await loadPricingContext(opportunityId)
  if (!sameId(context.currencyId, selection.currencyId)) throw new Error('The opportunity currency changed. Reopen Add product.')
  const current = context.opportunity._pricelevelid_value
  if (current && !sameId(current, selection.priceListId)) throw new Error('The opportunity price list changed. Reopen Add product.')
  if (!context.lists.some(l => sameId(l.pricelevelid, selection.priceListId) && sameId(l._transactioncurrencyid_value, context.currencyId))) {
    throw new Error('Select an active price list matching the opportunity currency.')
  }
  const catalog = await loadCatalog(selection.priceListId)
  if (!catalog.products.some(x => sameId(x.productid, p.productId)) || !eligibleUnits(catalog, p.productId ?? '').some(u => sameId(u.uomid, p.unitId))) {
    throw new Error('This product and unit are no longer eligible for the selected price list. Reload the catalog.')
  }
  if (!current) {
    const etag = context.opportunity['@odata.etag']
    if (!etag) throw new Error('The opportunity version could not be read. A price list cannot safely be assigned. Ask your administrator.')
    await request('PATCH', `/_api/opportunities(${guid(opportunityId)})`, {
      headers: { 'If-Match': etag },
      body: { 'pricelevelid@odata.bind': `/pricelevels(${guid(selection.priceListId)})` },
    })
    return true
  }
  return false
}
