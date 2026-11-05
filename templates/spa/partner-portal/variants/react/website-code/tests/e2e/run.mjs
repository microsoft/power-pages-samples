#!/usr/bin/env node
// Tiny dependency-free e2e runner: node tests/e2e/run.mjs [--only smoke|flows|a11y|skeleton|ux|panels|journeys|widths|confirmations|search|preload] [--base-url URL] [--headed] [--workers N]
import { chromium } from 'playwright'
import { collectErrors, makeGoto, prepareContext, VIEWPORTS } from './lib.mjs'

const SUITES = {
  smoke: ['./smoke.mjs', './flows.mjs'],
  flows: ['./flows.mjs'],
  a11y: ['./a11y.mjs'],
  skeleton: ['./skeleton.mjs'],
  ux: ['./ux.mjs'],
  panels: ['./panels.mjs'],
  journeys: ['./journeys.mjs'],
  widths: ['./widths.mjs'],
  confirmations: ['./confirmations.mjs'],
  search: ['./search.mjs'],
  preload: ['./preload.mjs'],
  lifecycle: ['./lifecycle.mjs'],
}
const ALL = [
  './smoke.mjs',
  './flows.mjs',
  './a11y.mjs',
  './skeleton.mjs',
  './ux.mjs',
  './panels.mjs',
  './journeys.mjs',
  './widths.mjs',
  './confirmations.mjs',
  './search.mjs',
  './preload.mjs',
  './lifecycle.mjs',
]

function parseArgs(argv) {
  const opts = { only: null, baseUrl: process.env.BASE_URL || 'http://localhost:5173', headed: false, workers: 4 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const value = () => {
      const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i]
      if (v === undefined) usage(`Missing value for ${a}`)
      return v
    }
    if (a === '--only' || a.startsWith('--only=')) opts.only = value()
    else if (a === '--base-url' || a.startsWith('--base-url=')) opts.baseUrl = value()
    else if (a === '--headed') opts.headed = true
    else if (a === '--workers' || a.startsWith('--workers=')) opts.workers = Math.max(1, Number(value()) || 1)
    else if (a === '--help' || a === '-h') usage()
    else usage(`Unknown option ${a}`)
  }
  if (opts.only && !SUITES[opts.only]) usage(`Unknown suite "${opts.only}" (expected ${Object.keys(SUITES).join(', ')})`)
  opts.baseUrl = opts.baseUrl.replace(/\/+$/, '')
  return opts
}

function usage(error) {
  if (error) console.error(error)
  console.log(
    'Usage: node tests/e2e/run.mjs [--only smoke|flows|a11y|skeleton|ux|panels|journeys|widths|confirmations|search|preload|lifecycle] [--base-url http://localhost:5173] [--headed] [--workers 4]',
  )
  process.exit(error ? 2 : 0)
}

async function launch(headed) {
  try {
    return { browser: await chromium.launch({ channel: 'msedge', headless: !headed }), name: 'Microsoft Edge' }
  } catch (e) {
    console.warn(`Microsoft Edge not available (${e.message.split('\n')[0]}); falling back to bundled Chromium.`)
    return { browser: await chromium.launch({ headless: !headed }), name: 'Chromium' }
  }
}

async function runTest(browser, test, baseUrl) {
  const context = await browser.newContext({ baseURL: baseUrl, viewport: test.viewport ?? VIEWPORTS.desktop, ...test.contextOptions })
  context.setDefaultTimeout(15_000)
  const notes = []
  const started = Date.now()
  try {
    await prepareContext(context, test.role)
    const page = await context.newPage()
    const errors = collectErrors(page, baseUrl)
    const goto = makeGoto(page, errors, notes)
    await test.run({ page, context, goto, baseUrl, errors, notes })
    await page.waitForTimeout(100)
    if (errors.length) throw new Error(`unexpected console/page errors:\n      ${errors.join('\n      ')}`)
    return { ok: true, notes, ms: Date.now() - started }
  } catch (e) {
    return { ok: false, notes, ms: Date.now() - started, error: e?.message ?? String(e) }
  } finally {
    await context.close().catch(() => {})
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const files = opts.only ? SUITES[opts.only] : ALL
  const tests = []
  for (const file of files) {
    const mod = await import(file)
    const suite = file.replace(/^\.\/|\.mjs$/g, '')
    for (const t of mod.tests) tests.push({ ...t, suite })
  }

  try {
    const res = await fetch(opts.baseUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    console.error(`Cannot reach ${opts.baseUrl} (${e.message}). Start the dev server (npm run dev) or a preview build and pass --base-url / BASE_URL.`)
    process.exit(2)
  }

  const { browser, name } = await launch(opts.headed)
  console.log(`Running ${tests.length} checks against ${opts.baseUrl} in ${name} (${opts.workers} workers)\n`)
  const started = Date.now()
  const results = new Array(tests.length)
  let next = 0
  const worker = async () => {
    while (next < tests.length) {
      const i = next++
      const t = tests[i]
      const r = await runTest(browser, t, opts.baseUrl)
      results[i] = r
      const label = `[${t.suite}] ${t.name}`
      console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${label}  (${(r.ms / 1000).toFixed(1)}s)`)
      for (const n of r.notes) console.log(`      note: ${n}`)
      if (!r.ok) console.log(`      ${r.error.split('\n').join('\n      ')}`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.workers, tests.length) }, worker))
  await browser.close()

  const failed = tests.map((t, i) => ({ t, r: results[i] })).filter(x => !x.r.ok)
  const retried = results.filter(r => r.notes.length).length
  console.log(`\n${'-'.repeat(72)}`)
  console.log(
    `Summary: ${tests.length - failed.length} passed, ${failed.length} failed, ${tests.length} total in ${((Date.now() - started) / 1000).toFixed(1)}s${retried ? ` (${retried} with navigation retries)` : ''}`,
  )
  if (failed.length) {
    console.log('\nFailures:')
    for (const { t, r } of failed) console.log(`  FAIL [${t.suite}] ${t.name}\n       ${r.error.split('\n')[0]}`)
  }
  process.exit(failed.length ? 1 : 0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
