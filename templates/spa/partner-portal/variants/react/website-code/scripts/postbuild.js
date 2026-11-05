#!/usr/bin/env node

/**
 * Post-build: scans the compiled output and updates `bundleFilePatterns` in
 * powerpages.config.json so `pac pages upload-code-site` deletes stale
 * content-hashed bundles from web-files before uploading the new build.
 *
 * Vite emits `[name]-[hash].[ext]` (8-char hash), e.g. `fluent-core-Ci6DFaA7.js`
 * -> `fluent-core-*.js`. Existing patterns are kept so chunks that no longer
 * exist (removed routes/components) are still cleaned up on the next upload.
 *
 * Usage: node scripts/postbuild.js
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const CONFIG_PATH = join(ROOT, 'powerpages.config.json')
// vite.config.ts sets hashCharacters: 'base36', so hashes are [a-z0-9] only.
const HASHED_FILE = /^(.+)-[a-z0-9]{8}\.([A-Za-z0-9]+)$/
const UNSAFE_HASH = /-[A-Za-z0-9_-]{7}[_-]\.[A-Za-z0-9]+$/

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [entry.name],
  )
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
const compiledDir = join(ROOT, config.compiledPath ?? 'dist')

if (!existsSync(compiledDir)) {
  console.error(`postbuild: compiled output not found at ${compiledDir}`)
  process.exit(1)
}

const files = walk(compiledDir)
const unsafe = files.filter((file) => UNSAFE_HASH.test(file))
if (unsafe.length) {
  console.error(
    `postbuild: bundle names must not end with "-" or "_" before the extension:\n  ${unsafe.join('\n  ')}` +
      `\nEnsure build.rollupOptions.output.hashCharacters is 'base36' in vite.config.ts.`,
  )
  process.exit(1)
}

const current = new Set()
for (const file of files) {
  const match = file.match(HASHED_FILE)
  if (match) current.add(`${match[1]}-*.${match[2]}`)
}

if (current.size === 0) {
  console.log('postbuild: no hashed bundles found; powerpages.config.json unchanged.')
  process.exit(0)
}

const previous = new Set(config.bundleFilePatterns ?? [])
const patterns = [...new Set([...previous, ...current])].sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' }),
)
const added = patterns.filter((p) => !previous.has(p))

if (added.length === 0) {
  console.log(`postbuild: bundleFilePatterns up to date (${patterns.length} patterns).`)
  process.exit(0)
}

config.bundleFilePatterns = patterns
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')
console.log(
  `postbuild: updated bundleFilePatterns (${patterns.length} total, ${added.length} new):\n  ` +
    added.join('\n  '),
)
