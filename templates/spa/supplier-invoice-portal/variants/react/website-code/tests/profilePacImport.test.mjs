import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

test('installed PAC imports narrow Contact fields and the Authenticated Self grant without a live upload', t => {
  const runtimes = spawnSync('dotnet', ['--list-runtimes'], { encoding: 'utf8' })
  if (runtimes.error?.code === 'ENOENT') {
    t.skip('dotnet is not installed; source layout and effective-permission checks still run')
    return
  }
  assert.equal(runtimes.status, 0, runtimes.stderr)
  const sdks = spawnSync('dotnet', ['--list-sdks'], { encoding: 'utf8' })
  assert.equal(sdks.status, 0, sdks.stderr)
  if (![...sdks.stdout.matchAll(/^(\d+)\./gm)].some(match => Number(match[1]) >= 10)) {
    t.skip('offline PAC parser check requires a .NET 10 or newer SDK')
    return
  }
  const framework = [...runtimes.stdout.matchAll(/^Microsoft\.AspNetCore\.App (10\.[\d.]+) \[([^\]]+)\]/gm)]
    .at(-1)
  const store = join(homedir(), '.dotnet', 'tools', '.store', 'microsoft.powerapps.cli.tool')
  const cli = process.env.POWER_PAGES_PAC_TOOL_DIRECTORY ?? (existsSync(store) &&
    readdirSync(store, { recursive: true }).filter(file => file.endsWith('bolt.module.paportal.dll'))
      .map(file => dirname(join(store, file))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1))
  if (!framework || !cli) {
    t.skip('offline PAC parser check requires the installed .NET 10 PAC tool and ASP.NET runtime; no dependencies are installed by this test')
    return
  }
  const result = spawnSync('dotnet', [
    'run', '--file', fileURLToPath(new URL('profilePacImport.cs', import.meta.url)),
    '--verbosity', 'quiet', '-p:EnableTrimAnalyzer=false', '-p:EnableAotAnalyzer=false', '-p:PublishAot=false', '--',
    cli, join(framework[2], framework[1]), fileURLToPath(new URL('../.powerpages-site/', import.meta.url)),
  ], { encoding: 'utf8', timeout: 60000 })
  assert.equal(result.error, undefined, result.error?.message)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /parsed eight Contact properties and the narrow Authenticated Self role grant/)
})
