import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const family = resolve(root, '..', '..', '..')
const read = path => readFileSync(resolve(root, path), 'utf8')
const config = JSON.parse(read('powerpages.config.json'))

test('new-site configuration uses the catalog display name and includes source', () => {
  const manifest = JSON.parse(readFileSync(resolve(family, '..', '..', 'manifest.json'), 'utf8'))
  const entry = manifest.templates.find(template => template.id === 'partner-portal')
  assert.equal(config.siteName, entry.displayName)
  assert.equal(config.includeSource, true)
  assert.ok(read('.powerpages-site/website.yml').split(/\r?\n/).includes(`name: ${entry.displayName}`))
  assert.equal(config.compiledPath, 'dist')
  assert.equal(config.defaultLandingPage, 'index.html')
  assert.equal(Object.hasOwn(config, 'websiteRecordId'), false)
  for (const preview of entry.previewImages) {
    const bytes = readFileSync(resolve(family, '..', '..', preview))
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(bytes.readUInt32BE(16), 1440)
    assert.equal(bytes.readUInt32BE(20), 900)
  }
  assert.equal(entry.previewImages.length, 5)
})

test('every compiled hashed bundle has an upload cleanup pattern', () => {
  const assets = readdirSync(resolve(root, config.compiledPath, 'assets'))
  const hashed = assets.filter(name => /^.+-[a-z0-9]{8}\.[A-Za-z0-9]+$/.test(name))
  assert.ok(hashed.length > 0, 'Run npm run build before the template contract tests')
  for (const name of hashed) {
    const pattern = name.replace(/-[a-z0-9]{8}\./, '-*.')
    assert.ok(config.bundleFilePatterns.includes(pattern), `Missing deletion pattern: ${name}`)
  }
  assert.equal(hashed.some(name => /TechnicianHome|WorkOrders|WorkOrderDetails|workOrderUtils/.test(name)), false)
})
