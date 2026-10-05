import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const defaultSeed = fileURLToPath(new URL('../../../../seed-data/data.json', import.meta.url))
const choices = JSON.parse(readFileSync(new URL('../dataverse-choice-values.json', import.meta.url), 'utf8'))
const category = choices.tables.account.accountcategorycode.Supplier
const bindId = value => typeof value === 'string'
  ? /^\/accounts\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i.exec(value)?.[1].toLowerCase()
  : undefined

// Validate the approved administrator-managed invariants. This reads a supplied
// snapshot only; it neither changes Dataverse nor promises to block all admin API
// edits. Roles must be supplied from the site being reviewed, not inferred from
// Account Category or from a portal's currently selected UI role mode.
export function validateAssignments(seed, { suppliers = [], reviewers = [] } = {}) {
  const errors = []
  const warnings = []
  const tables = Object.values(seed.tables ?? {})
  const accounts = tables.find(table => table.logicalName === 'account')?.records
  const contacts = tables.find(table => table.logicalName === 'contact')?.records
  if (!Array.isArray(accounts) || !Array.isArray(contacts)) {
    return { errors: ['Configuration must include Account and Contact seed/export tables.'], warnings }
  }
  const byId = new Map(accounts.map(account => [account.accountid?.toLowerCase(), account]))
  const contactById = new Map(contacts.map(contact => [contact.contactid?.toLowerCase(), contact]))
  const validAccount = (id, label) => {
    const account = byId.get(id)
    if (!account) errors.push(`${label} references an Account absent from the configuration.`)
    else if (account.accountcategorycode !== category || account.statecode !== 0) {
      errors.push(`${label} must reference an active Supplier-category Account.`)
    }
  }
  for (const id of new Set([...suppliers, ...reviewers].map(id => id.toLowerCase()))) {
    const contact = contactById.get(id)
    if (!contact) {
      errors.push(`Role-assigned Contact ${id} is absent from the configuration.`)
      continue
    }
    const membership = contact['spnvc_account_contact@odata.bind'] ?? []
    if (!Array.isArray(membership)) {
      errors.push(`Contact ${id} N:N assignments must be an array of Account bindings.`)
      continue
    }
    const assignedIds = []
    for (const reference of membership) {
      const accountId = bindId(reference)
      if (!accountId) errors.push(`Contact ${id} has an invalid Account membership binding.`)
      else {
        assignedIds.push(accountId)
        validAccount(accountId, `Contact ${id} membership`)
      }
    }
    if (new Set(assignedIds).size !== assignedIds.length) errors.push(`Contact ${id} has duplicate memberships.`)
    const isReviewer = reviewers.some(reviewer => reviewer.toLowerCase() === id)
    if (isReviewer && assignedIds.length === 0) {
      warnings.push(`Reviewer ${id} has no assignments and will have no reviewer business access.`)
    }
    if (suppliers.some(supplier => supplier.toLowerCase() === id)) {
      const companyId = bindId(contact['parentcustomerid_account@odata.bind'])
      if (!companyId) {
        errors.push(`Supplier ${id} requires one Company Name Account binding, not a Contact or a missing affiliation.`)
        continue
      }
      validAccount(companyId, `Supplier ${id} Company Name`)
      if (!assignedIds.includes(companyId)) errors.push(`Supplier ${id} Company Name must also be in N:N membership for Account AppendTo.`)
      if (!isReviewer && assignedIds.some(accountId => accountId !== companyId)) {
        errors.push(`Supplier-only ${id} must not have memberships outside its Company Name Account.`)
      }
    }
  }
  return { errors, warnings }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = defaultSeed
  const roles = { suppliers: [], reviewers: [] }
  for (const argument of process.argv.slice(2)) {
    if (argument.startsWith('--input=')) input = argument.slice('--input='.length)
    else if (argument.startsWith('--supplier-contact=')) roles.suppliers.push(argument.slice('--supplier-contact='.length))
    else if (argument.startsWith('--reviewer-contact=')) roles.reviewers.push(argument.slice('--reviewer-contact='.length))
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (roles.suppliers.length + roles.reviewers.length === 0) {
    throw new Error('Supply --supplier-contact=<guid> and/or --reviewer-contact=<guid> from the site role assignments.')
  }
  const result = validateAssignments(JSON.parse(readFileSync(input, 'utf8')), roles)
  for (const warning of result.warnings) console.warn(`warning: ${warning}`)
  for (const error of result.errors) console.error(`error: ${error}`)
  if (result.errors.length) process.exitCode = 1
  else console.log(`Validated assignments with ${result.warnings.length} warning(s). No live environment was changed.`)
}
