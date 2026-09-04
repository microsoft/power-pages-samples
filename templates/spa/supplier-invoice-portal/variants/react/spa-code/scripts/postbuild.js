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

// Vite output format: [name]-[hash].[ext]
// We want to extract "name" and "ext" to produce "name-*.ext" patterns
const HASH_PATTERN = /^(.+)-[A-Za-z0-9_-]{6,12}\.(js|css|svg)$/

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
