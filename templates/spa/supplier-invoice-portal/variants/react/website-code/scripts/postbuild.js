#!/usr/bin/env node

/**
 * Post-build script: scans dist/assets/ and updates powerpages.config.json
 * with bundleFilePatterns that match all Vite-generated bundles and assets.
 *
 * This ensures `pac pages upload-code-site` cleans up old hashed bundles
 * on each deploy instead of accumulating stale files.
 *
 * Usage: node scripts/postbuild.js
 * Or via npm: "postbuild": "node scripts/postbuild.js" in package.json
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname, '..')
const DIST_ASSETS = join(ROOT, 'dist', 'assets')
const CONFIG_PATH = join(ROOT, 'powerpages.config.json')

// Vite's default [name]-[hash].[ext] uses eight-character Rollup hashes.
// In SubmitInvoice-C-5NEgfP.js, C-5NEgfP is the whole hash; allowing shorter
// matches treats its hyphen as a name delimiter and misses old bundles.
// https://rollupjs.org/configuration-options/#output-entryfilenames
const HASH_PATTERN = /^(.+)-[A-Za-z0-9_-]{8}\.(js|css|svg)$/

try {
  const files = readdirSync(DIST_ASSETS)
  const patternSet = new Set()

  for (const file of files) {
    const match = file.match(HASH_PATTERN)
    if (match) {
      const [, baseName, ext] = match
      patternSet.add(`${baseName}-*.${ext}`)
    }
  }

  const patterns = [...patternSet].sort()

  if (patterns.length === 0) {
    console.log('No hashed bundles found in dist/assets/ — skipping config update.')
    process.exit(0)
  }

  // Read current config
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  const oldPatterns = config.bundleFilePatterns || []

  // Check if update is needed
  const oldSet = new Set(oldPatterns)
  const newSet = new Set(patterns)
  const changed = oldSet.size !== newSet.size || [...newSet].some(p => !oldSet.has(p))

  if (!changed) {
    console.log(`bundleFilePatterns already up-to-date (${patterns.length} patterns).`)
    process.exit(0)
  }

  // Update config
  config.bundleFilePatterns = patterns
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')

  console.log(`Updated powerpages.config.json with ${patterns.length} bundle patterns:`)
  for (const p of patterns) {
    console.log(`  ${p}`)
  }
} catch (err) {
  console.error('postbuild error:', err.message)
  process.exit(1)
}
