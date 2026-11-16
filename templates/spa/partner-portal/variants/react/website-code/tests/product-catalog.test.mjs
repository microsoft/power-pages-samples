import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const ids = { opportunity: id(1), currency: id(2), list: id(3), product: id(4), unit: id(5), schedule: id(6) }

// Exercise the actual TypeScript modules with injected HTTP, not assertions against source strings.
function evaluate(source, imports = {}, globals = {}) {
  const output = ts.transpileModule(source, {
    fileName: 'fixture.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  new Function('require', 'exports', ...Object.keys(globals), output)(name => imports[name] ?? require(name), exports, ...Object.values(globals))
  return exports
}
function harness(options = {}) {
  const calls = []
  const opportunity = {
    opportunityid: ids.opportunity,
    _transactioncurrencyid_value: ids.currency,
    _pricelevelid_value: ids.list,
    '@odata.etag': 'W/"12"',
    ...options.opportunity,
  }
  const lists = options.lists ?? [{ pricelevelid: ids.list, name: 'CAD list', statecode: 0, _transactioncurrencyid_value: ids.currency }]
  const products = options.products ?? [
    {
      productid: ids.product,
      name: 'Duplicate name',
      statecode: 0,
      productstructure: 1,
      _defaultuomid_value: ids.unit,
      _defaultuomscheduleid_value: ids.schedule,
    },
    { productid: id(7), name: 'Duplicate name', statecode: 0, productstructure: 3, _defaultuomid_value: ids.unit, _defaultuomscheduleid_value: ids.schedule },
  ]
  const units = [
    { uomid: ids.unit, name: 'Each', _uomscheduleid_value: ids.schedule },
    { uomid: id(8), name: 'Each', _uomscheduleid_value: id(9) },
  ]
  const items =
    options.items ??
    products.map((p, i) => ({
      productpricelevelid: id(20 + i),
      _productid_value: p.productid,
      _pricelevelid_value: ids.list,
      _uomid_value: ids.unit,
      pricingmethodcode: 1,
      amount: 10 + i,
    }))
  const http = {
    webApi: {
      async get(path, signal) {
        calls.push({ method: 'GET', path, signal })
        if (options.denied) throw new Error("You don't have the appropriate permissions.")
        return path.startsWith('opportunities') ? opportunity : { isocurrencycode: 'CAD' }
      },
      async list(path, signal) {
        calls.push({ method: 'LIST', path, signal })
        if (options.denied) throw new Error("You don't have the appropriate permissions.")
        return path.startsWith('pricelevels') ? lists : path.startsWith('products?') ? products : path.startsWith('uoms?') ? units : items
      },
      async create(set, payload) {
        calls.push({ method: 'POST', set, payload })
        if (options.createFails) throw new Error('Create denied.')
        return id(99)
      },
    },
    async request(method, path, options) {
      calls.push({ method, path, ...options })
    },
  }
  const catalog = evaluate(read('src/services/productCatalog.ts'), { './http': http })
  const actions = evaluate(read('src/services/actions.ts'), {
    './http': http,
    './productCatalog': catalog,
    './config': {},
    './mappers': {},
    './loaders': {},
  })
  return { calls, catalog, actions, products, units, items }
}
const line = { product: 'Duplicate name', unit: 'Each', productId: ids.product, unitId: ids.unit, writeIn: false, quantity: 2, pricePerUnit: 10 }
const selection = { priceListId: ids.list, currencyId: ids.currency }

test('live catalog queries are permission-scoped, explicit, paged and keyed by real GUIDs', async () => {
  const h = harness()
  const controller = new AbortController()
  const context = await h.catalog.loadPricingContext(ids.opportunity, controller.signal)
  assert.equal(context.currencyCode, 'CAD')
  const catalog = await h.catalog.loadCatalog(ids.list, controller.signal)
  assert.equal(catalog.products.length, 2)
  assert.equal(catalog.products[0].name, catalog.products[1].name)
  assert.notEqual(catalog.products[0].productid, catalog.products[1].productid)
  assert.equal(h.catalog.catalogPrice(catalog, id(7), ids.unit), '11')
  assert.deepEqual(
    h.catalog.eligibleUnits(catalog, ids.product).map(u => u.uomid),
    [ids.unit],
  )
  for (const call of h.calls) {
    assert.equal(call.signal, controller.signal)
    const url = new URL(`https://portal.test/_api/${call.path}`)
    assert.ok(url.searchParams.get('$select'))
    if (call.method === 'LIST') {
      assert.equal(url.searchParams.get('$count'), 'true')
      assert.ok(url.searchParams.get('$orderby'))
      assert.equal(url.searchParams.has('$skip'), false)
    }
    if (call.path.startsWith('pricelevels')) assert.equal(url.searchParams.get('$filter'), `statecode eq 0 and _transactioncurrencyid_value eq ${ids.currency}`)
    if (call.path.startsWith('productpricelevels')) assert.equal(url.searchParams.get('$filter'), `_pricelevelid_value eq ${ids.list}`)
  }
})

test('Amount prices only; calculated, missing and ambiguous prices stay explicitly manual', async () => {
  for (const items of [
    [{ productpricelevelid: id(20), _productid_value: ids.product, _pricelevelid_value: ids.list, _uomid_value: ids.unit, pricingmethodcode: 2, amount: 500 }],
    [{ productpricelevelid: id(20), _productid_value: ids.product, _pricelevelid_value: ids.list, _uomid_value: ids.unit, pricingmethodcode: 1, amount: null }],
  ]) {
    const h = harness({ items })
    const catalog = await h.catalog.loadCatalog(ids.list)
    assert.equal(h.catalog.catalogPrice(catalog, ids.product, ids.unit), '')
  }
  const h = harness()
  const catalog = await h.catalog.loadCatalog(ids.list)
  catalog.items.push({ ...catalog.items[0], productpricelevelid: id(30) })
  assert.equal(h.catalog.catalogPrice(catalog, ids.product, ids.unit), '')
})

test('catalog save binds real product/unit, keeps existing price list and currency untouched; write-in does not bind either', async () => {
  const h = harness()
  await h.actions.addProduct(ids.opportunity, line, selection)
  assert.equal(
    h.calls.some(c => c.method === 'PATCH'),
    false,
  )
  const post = h.calls.find(c => c.method === 'POST')
  assert.deepEqual(post.payload, {
    'opportunityid@odata.bind': `/opportunities(${ids.opportunity})`,
    'productid@odata.bind': `/products(${ids.product})`,
    'uomid@odata.bind': `/uoms(${ids.unit})`,
    isproductoverridden: false,
    quantity: 2,
    ispriceoverridden: true,
    priceperunit: 10,
  })
  const writeIn = harness({ denied: true })
  await writeIn.actions.addProduct(ids.opportunity, { ...line, writeIn: true, product: 'Custom service' })
  assert.equal(writeIn.calls.length, 1)
  assert.deepEqual(writeIn.calls[0].payload, {
    'opportunityid@odata.bind': `/opportunities(${ids.opportunity})`,
    isproductoverridden: true,
    productdescription: 'Custom service',
    quantity: 2,
    ispriceoverridden: true,
    priceperunit: 10,
  })
})

test('a missing list is assigned only at add, conditionally on the opportunity version', async () => {
  const h = harness({ opportunity: { _pricelevelid_value: null } })
  await h.catalog.loadPricingContext(ids.opportunity)
  assert.equal(
    h.calls.some(c => c.method === 'PATCH'),
    false,
  )
  await h.actions.addProduct(ids.opportunity, line, selection)
  const patch = h.calls.find(c => c.method === 'PATCH')
  assert.deepEqual(patch.body, { 'pricelevelid@odata.bind': `/pricelevels(${ids.list})` })
  assert.deepEqual(patch.headers, { 'If-Match': 'W/"12"' })
  assert.ok(h.calls.indexOf(patch) < h.calls.findIndex(c => c.method === 'POST'))
  const failing = harness({ opportunity: { _pricelevelid_value: null }, createFails: true })
  await assert.rejects(failing.actions.addProduct(ids.opportunity, line, selection), /price list was assigned.*Create denied/)
})

test('the reused HTTP client includes CSRF on reads, follows pages and passes cancellation through', async () => {
  const calls = []
  let tokenRequests = 0
  const { webApi } = evaluate(
    read('src/services/http.ts'),
    {},
    {
      location: { origin: 'https://portal.test' },
      async fetch(path, options) {
        if (path === '/_layout/tokenhtml') {
          tokenRequests++
          return new Response('<input type="hidden" value="catalog-read-token" />')
        }
        calls.push({ path, options })
        return new Response(
          JSON.stringify(
            calls.length === 1
              ? { value: [{ productid: ids.product }], '@odata.nextLink': `https://portal.test/_api/products?$skiptoken=next` }
              : { value: [{ productid: id(7) }] },
          ),
          { status: 200 },
        )
      },
    },
  )
  const signal = new AbortController().signal
  const rows = await webApi.list('products?$select=productid&$count=true', signal)
  assert.equal(rows.length, 2)
  assert.equal(calls.length, 2)
  await webApi.get(`products(${ids.product})?$select=productid`, signal)
  assert.equal(calls.length, 3)
  assert.equal(tokenRequests, 1)
  for (const call of calls) {
    assert.equal(call.options.signal, signal)
    assert.equal(call.options.headers.__RequestVerificationToken, 'catalog-read-token')
    assert.equal(call.options.credentials, 'same-origin')
    assert.ok(call.path.startsWith('/_api/'))
  }
  assert.match(calls[0].options.headers.Prefer, /odata\.maxpagesize=200/)
  assert.match(calls[1].path, /\$skiptoken=next/)
})

test('denied reads, missing currency/etag, changed/mismatched lists and invalid units never create or use fake fallback', async () => {
  const scenarios = [
    { denied: true },
    { opportunity: { _transactioncurrencyid_value: null } },
    { opportunity: { _pricelevelid_value: id(40) } },
    { lists: [{ pricelevelid: ids.list, statecode: 0, _transactioncurrencyid_value: id(41) }] },
    { opportunity: { _transactioncurrencyid_value: id(41) }, lists: [{ pricelevelid: ids.list, statecode: 0, _transactioncurrencyid_value: id(41) }] },
    { opportunity: { _pricelevelid_value: null, '@odata.etag': undefined } },
    { items: [] },
  ]
  for (const options of scenarios) {
    const h = harness(options)
    await assert.rejects(h.actions.addProduct(ids.opportunity, line, selection))
    assert.equal(
      h.calls.some(c => c.method === 'PATCH' || c.method === 'POST'),
      false,
    )
  }
  const h = harness()
  await assert.rejects(h.actions.addProduct(ids.opportunity, { ...line, unitId: id(8) }, selection))
  assert.equal(
    h.calls.some(c => c.method === 'POST'),
    false,
  )
})

test('modal preserves mock selection and uses duplicate-safe GUIDs in live; stale catalog never enables save', async () => {
  const source = read('src/pages/opportunities/OpportunityDetails.tsx')
  const constants = source.slice(source.indexOf('const PRODUCT_CATALOG ='), source.indexOf('const productsTotal ='))
  const modal = source.slice(source.indexOf('function AddProductModal('), source.indexOf('function CustomerContactsPanel('))
  const state = []
  let cursor = 0
  let changed
  let mode = 'mock'
  let liveState
  let liveSaved
  const h = harness()
  const globals = {
    useState: initial => {
      const index = cursor++
      if (!(index in state)) state[index] = initial
      return [
        state[index],
        value => {
          state[index] = typeof value === 'function' ? value(state[index]) : value
        },
      ]
    },
    useStyles: () => ({}),
    useApp: () => ({ mode }),
    useProductCatalog: (_id, enabled) => {
      assert.equal(enabled, mode === 'live')
      return mode === 'live' ? liveState : { ready: false, priceListId: '', loading: false }
    },
    fieldErrors: fields =>
      Object.entries(fields)
        .filter(([, value]) => value)
        .map(([id, message]) => ({ id, message })),
    fieldErrorFor: () => undefined,
    newId: () => 'mock-line',
    CURRENCY: { hint: 'Mock currency' },
    formatCurrency: value => String(value),
    eligibleUnits: h.catalog.eligibleUnits,
    catalogPrice: h.catalog.catalogPrice,
    addProduct: async (opportunityId, product, selection) => {
      assert.equal(mode, 'live', 'Mock must not write to Web API')
      liveSaved = { opportunityId, product, selection }
    },
  }
  for (const name of [
    'FormPanel',
    'ValidationSummary',
    'Field',
    'RadioGroup',
    'Radio',
    'Alert',
    'Button',
    'Text',
    'FormField',
    'Select',
    'TextInput',
    'Body1Strong',
    'Add20Regular',
  ])
    globals[name] = name
  const jsx = (type, props) => ({ type, props })
  const { AddProductModal } = evaluate(
    `${constants}\n${modal}\nexport { AddProductModal }`,
    {
      'react/jsx-runtime': { jsx, jsxs: jsx },
    },
    globals,
  )
  const render = () => {
    cursor = 0
    return AddProductModal({
      opportunityId: ids.opportunity,
      open: true,
      onClose() {},
      onAdded() {},
      async onChange(fn, live) {
        if (mode === 'live') await live()
        else {
          const opp = { products: [] }
          fn(opp)
          changed = opp.products[0]
        }
        return true
      },
    })
  }
  const find = (node, id) => {
    if (!node || typeof node !== 'object') return undefined
    if (node.props?.id === id && node.type === 'Select') return node
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, id)
      if (result) return result
    }
  }
  let tree = render()
  const picker = find(tree, 'prod-existing')
  assert.equal(picker.props.options.length, 6)
  picker.props.onChange({ target: { value: 'Cloud Migration Services' } })
  tree = render()
  assert.equal(find(tree, 'prod-unit').props.value, 'Hour')
  await tree.props.onSubmit()
  assert.deepEqual(changed, { id: 'mock-line', product: 'Cloud Migration Services', unit: 'Hour', writeIn: false, quantity: 1, pricePerUnit: 150 })
  mode = 'live'
  state.length = 0
  liveState = {
    ready: true,
    loading: false,
    priceListId: ids.list,
    context: await h.catalog.loadPricingContext(ids.opportunity),
    catalog: await h.catalog.loadCatalog(ids.list),
  }
  tree = render()
  assert.deepEqual(
    find(tree, 'prod-existing').props.options.map(p => p.value),
    [ids.product, id(7)],
  )
  find(tree, 'prod-existing').props.onChange({ target: { value: id(7) } })
  tree = render()
  assert.equal(find(tree, 'prod-unit').props.value, ids.unit)
  await tree.props.onSubmit()
  assert.equal(liveSaved.product.productId, id(7))
  assert.equal(liveSaved.product.unitId, ids.unit)
  assert.equal(liveSaved.product.pricePerUnit, 11)
  assert.deepEqual(liveSaved.selection, selection)
  liveSaved = undefined
  tree = render()
  find(tree, 'prod-existing').props.onChange({ target: { value: ids.product } })
  tree = render()
  assert.equal(find(tree, 'prod-existing').props.value, ids.product)
  liveState = { ready: false, loading: true, priceListId: id(40) }
  tree = render()
  tree = render() // apply the render-phase scope reset just as React does
  assert.equal(find(tree, 'prod-existing').props.value, '')
  assert.deepEqual(find(tree, 'prod-existing').props.options, [])
  assert.equal(tree.props.submitDisabled, true)
  await tree.props.onSubmit()
  assert.equal(liveSaved, undefined)
})
