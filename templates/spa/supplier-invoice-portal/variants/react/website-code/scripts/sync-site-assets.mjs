import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const compiled = join(root, 'dist')
const webFiles = join(root, '.powerpages-site/web-files')
// Match the same complete eight-character Vite hash as postbuild.js, including
// hashes containing '-' and '_', rather than treating either as a delimiter.
const bundleName = /^(.+)-[A-Za-z0-9_-]{8}\.(js|css|svg)$/
const key = name => {
  const match = bundleName.exec(name)
  return match ? `${match[1]}.${match[2]}`.toLowerCase() : null
}
const existing = new Map()
for (const entry of readdirSync(webFiles, { withFileTypes: true })) {
  if (!entry.isDirectory() || !key(entry.name)) continue
  // PAC can lowercase export directory names while preserving the filename's
  // case. Read the record filename so this also works on case-sensitive hosts.
  const metadataFiles = readdirSync(join(webFiles, entry.name)).filter(name => name.endsWith('.webfile.yml'))
  if (metadataFiles.length !== 1) throw new Error(`Expected one web-file record in ${entry.name}`)
  const metadata = readFileSync(join(webFiles, entry.name, metadataFiles[0]), 'utf8')
  const filename = /^filename: (.+)$/m.exec(metadata)?.[1]
  if (!filename || /[/\\]/.test(filename)) throw new Error(`Invalid exported asset filename in ${entry.name}`)
  const assetKey = filename && key(filename)
  if (!assetKey) throw new Error(`Unexpected exported bundle filename: ${filename}`)
  if (existing.has(assetKey)) throw new Error(`Duplicate exported bundle stem: ${assetKey}`)
  existing.set(assetKey, { folder: entry.name, filename, metadataFile: metadataFiles[0], metadata })
}
const templateRecord = existing.get('supplierservice.js')
if (!templateRecord) throw new Error('Missing Supplier service web-file metadata template')
const templateName = templateRecord.filename
const template = templateRecord.metadata

function stableId(name) {
  const bytes = createHash('sha1').update(`supplier-invoice-portal:${name}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const compiledAssets = readdirSync(join(compiled, 'assets'), { withFileTypes: true })
const builtKeys = new Set(compiledAssets.map(entry => key(entry.name)))
for (const entry of compiledAssets) {
  if (!entry.isFile() || !key(entry.name)) throw new Error(`Unexpected compiled asset: ${entry.name}`)
}
const staleRecords = [...existing].filter(([assetKey]) => !builtKeys.has(assetKey))
if (staleRecords.length && !process.argv.includes('--remove-stale')) {
  throw new Error(`Exported bundle is no longer generated; review its removal explicitly: ${staleRecords.map(([name]) => name).join(', ')}`)
}
for (const entry of compiledAssets) {
  const assetKey = key(entry.name)
  if (!entry.isFile() || !assetKey) throw new Error(`Unexpected compiled asset: ${entry.name}`)
  builtKeys.add(assetKey)
  const previous = existing.get(assetKey)
  let metadata
  const destination = join(webFiles, previous && previous.folder.toLowerCase() === entry.name.toLowerCase()
    ? previous.folder : entry.name)
  if (previous) {
    metadata = previous.metadata.replaceAll(previous.filename, entry.name)
    if (join(webFiles, previous.folder) !== destination) {
      if (existsSync(destination)) throw new Error(`Exported asset destination already exists: ${entry.name}`)
      renameSync(join(webFiles, previous.folder), destination)
    }
    if (previous.filename !== entry.name) {
      unlinkSync(join(destination, previous.filename))
      unlinkSync(join(destination, previous.metadataFile))
    }
  } else {
    const id = stableId(`web-file:${assetKey}`)
    metadata = template.replaceAll(templateName, entry.name)
      .replace(/^id: .+$/m, `id: ${id}`)
      .replace(/^objectid: .+$/m, `objectid: ${id}`)
      .replace(/^annotationid: .+$/m, `annotationid: ${stableId(`annotation:${assetKey}`)}`)
      .replace(/^mimetype: .+$/m, `mimetype: ${entry.name.endsWith('.css') ? 'text/css' : entry.name.endsWith('.svg') ? 'image/svg+xml' : 'application/javascript'}`)
    mkdirSync(destination)
  }
  copyFileSync(join(compiled, 'assets', entry.name), join(destination, entry.name))
  writeFileSync(join(destination, `${entry.name}.webfile.yml`), metadata)
}
for (const [, record] of staleRecords) {
  unlinkSync(join(webFiles, record.folder, record.filename))
  unlinkSync(join(webFiles, record.folder, record.metadataFile))
  rmdirSync(join(webFiles, record.folder))
}
copyFileSync(join(compiled, 'index.html'), join(webFiles, 'index.html/index.html'))
console.log(`Synchronized ${builtKeys.size} compiled site assets, preserving existing web-file IDs.`)
