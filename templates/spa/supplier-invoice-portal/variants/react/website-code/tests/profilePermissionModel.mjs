import { readFileSync, readdirSync } from 'node:fs'

const site = new URL('../.powerpages-site/', import.meta.url)
export const read = path => readFileSync(new URL(path, site), 'utf8')
export const field = (yaml, name) => new RegExp(`^${name}: (.+)$`, 'm').exec(yaml)?.[1]
export const values = (yaml, name) => {
  const section = new RegExp(`^${name}:\\n((?:- [^\\n]+\\n?)+)`, 'm').exec(yaml)?.[1] ?? ''
  return [...section.matchAll(/^- (.+)$/gm)].map(match => match[1])
}

export function records(suffix) {
  // Legacy PAC exports can be lists, while code-site Git exports use maps.
  // Only top-level "- key:" starts a record; nested choice/role lists do not.
  return readdirSync(site, { recursive: true }).filter(file => file.endsWith(suffix)).flatMap(file => {
    const yaml = read(file)
    if (!/^- \w+:/m.test(yaml)) return [yaml]
    return yaml.split(/(?=^- \w+:)/m).filter(value => value.trim())
      .map(record => record.replace(/^- /, '').replace(/^  /gm, ''))
  })
}

export function contactGraph() {
  const tables = records('.tablepermission.yml').filter(yaml => field(yaml, 'entitylogicalname') === 'contact')
    .map(yaml => ({
      roles: values(yaml, 'adx_entitypermission_webrole'),
      scope: field(yaml, 'scope'), read: field(yaml, 'read') === 'true', write: field(yaml, 'write') === 'true',
    }))
  return { tables }
}

export function siteRoleIds(names, authenticated) {
  return records('.webrole.yml').filter(yaml =>
    names.includes(field(yaml, 'name')) ||
    (authenticated && field(yaml, 'authenticatedusersrole') === 'true') ||
    (!authenticated && field(yaml, 'anonymoususersrole') === 'true'))
    .map(yaml => field(yaml, 'id'))
}

export function canAccess(graph, actor, row, operation, name, allowed) {
  const hasRole = grants => actor.roles.some(role => grants.includes(role))
  const tableAccess = graph.tables.some(table => hasRole(table.roles) && table[operation] &&
    (table.scope === '756150000' || (table.scope === '756150004' && row === actor.contactId)))
  // This models the configured field exposure and documented primitive
  // mutability, not the live portal's navigation/$ref authorization pipeline.
  // Lookup properties are computed/read-only; do not normalize a read alias
  // into its writable logical column or assume it enables a navigation write.
  // https://learn.microsoft.com/power-apps/developer/data-platform/webapi/web-api-properties
  const property = name.replace(/@odata\.bind$/, '')
  const platformReadOnly = ['contactid', 'fullname', '_parentcustomerid_value']
  return tableAccess && allowed.includes(property) &&
    (operation !== 'write' || !platformReadOnly.includes(property))
}
