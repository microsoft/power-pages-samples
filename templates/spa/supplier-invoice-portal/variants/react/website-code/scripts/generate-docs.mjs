import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const modelOnly = process.argv.includes('--model-only')
const solution = join(root, '../../../solutions/SupplierInvoiceSPAPortal')
const contract = JSON.parse(readFileSync(join(root, 'dataverse-solution-contract.json'), 'utf8'))
const choices = JSON.parse(readFileSync(join(root, 'dataverse-choice-values.json'), 'utf8'))
const permissions = readdirSync(join(root, '.powerpages-site/table-permissions')).sort()
  .map(file => readFileSync(join(root, '.powerpages-site/table-permissions', file), 'utf8'))
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const entities = readdirSync(join(solution, 'Entities'))
const tables = Object.entries(contract.tables).map(([logicalName, table]) => {
  const folder = entities.find(name => name.toLowerCase() === logicalName)
  if (!folder) throw new Error(`Missing solution entity ${logicalName}`)
  const xml = readFileSync(join(solution, 'Entities', folder, 'Entity.xml'), 'utf8')
  const columns = [...xml.matchAll(/<attribute PhysicalName="[^"]+">([\s\S]*?)<\/attribute>/g)]
    .map(match => ({
      logicalName: /<LogicalName>([^<]+)<\/LogicalName>/.exec(match[1])?.[1],
      type: /<Type>([^<]+)<\/Type>/.exec(match[1])?.[1],
    })).filter(column => [...table.customColumns, ...(table.standardColumns ?? [])].includes(column.logicalName))
  return { logicalName, kind: ['account', 'contact'].includes(logicalName) ? 'Segmented standard table' : 'Custom table', columns }
})
const relationships = [
  ...Object.entries(contract.relationships).map(([name, relationship]) => ({ name, ...relationship })),
  {
    name: 'contact_customer_accounts (standard dependency)',
    referencingTable: 'contact', referencedTable: 'account',
    lookupColumn: 'parentcustomerid', navigationProperty: 'parentcustomerid_account',
  },
]
const model = { tables, relationships, manyToManyRelationships: contract.manyToManyRelationships, forms: contract.forms, tableAssets: contract.tableAssets, choices: choices.tables }
const permissionRows = (modelOnly ? [] : permissions).map(permission => {
  const field = key => new RegExp(`^${key}: (.+)$`, 'm').exec(permission)?.[1] ?? ''
  if (!contract.tables[field('entitylogicalname')] && field('entitylogicalname') !== 'contact') {
    throw new Error(`Permission references a table outside the shipped model: ${field('entitylogicalname')}`)
  }
  return {
    name: field('entityname'), table: field('entitylogicalname'), scope: field('scope'),
    relationship: field('contactrelationship') || field('accountrelationship') || field('parentrelationship'),
    privileges: ['read', 'create', 'write', 'delete', 'append', 'appendto'].filter(key => field(key) === 'true'),
    roles: [...permission.matchAll(/^- ([0-9a-f-]{36})$/gm)].map(match => match[1]),
  }
})

const theme = `
:root {
  color-scheme: light;
  --cp-bg: #f7f4ef;
  --cp-bg-elevated: #fcfbf8;
  --cp-surface: #ffffff;
  --cp-surface-soft: #f5f5f5;
  --cp-border: #dedede;
  --cp-border-strong: #919191;
  --cp-text: #242424;
  --cp-text-muted: #5c5c5c;
  --cp-text-soft: #6f6f6f;
  --cp-accent: #b11f4b;
  --cp-accent-hover: #9a1a41;
  --cp-accent-soft: rgba(177, 31, 75, 0.08);
  --cp-accent-fg: #ffffff;
  --cp-success: #16a34a;
  --cp-danger: #dc2626;
  --cp-warning: #f59e0b;
  --cp-link: #0078d4;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
  --cp-overlay: rgba(255, 255, 255, 0.8);
  --cp-panel: rgba(255, 255, 255, 0.86);
  --cp-panel-strong: rgba(255, 255, 255, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.55);
  --cp-highlight: rgba(177, 31, 75, 0.12);
}
html[data-theme="dark"] {
  color-scheme: dark;
  --cp-bg: #3d3b3a;
  --cp-bg-elevated: #343231;
  --cp-surface: #292929;
  --cp-surface-soft: #2e2e2e;
  --cp-border: #474747;
  --cp-border-strong: #5f5f5f;
  --cp-text: #dedede;
  --cp-text-muted: #919191;
  --cp-text-soft: #b0b0b0;
  --cp-accent: #fd8ea1;
  --cp-accent-hover: #fb7b91;
  --cp-accent-soft: rgba(253, 142, 161, 0.14);
  --cp-accent-fg: #1a1a1a;
  --cp-success: #4ade80;
  --cp-danger: #f87171;
  --cp-warning: #fbbf24;
  --cp-link: #4da6ff;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  --cp-overlay: rgba(41, 41, 41, 0.88);
  --cp-panel: rgba(41, 41, 41, 0.72);
  --cp-panel-strong: rgba(41, 41, 41, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.04);
  --cp-highlight: rgba(253, 142, 161, 0.12);
}
body{margin:0;background:var(--cp-bg);color:var(--cp-text);font:16px/1.6 "Segoe UI",Aptos,Calibri,-apple-system,BlinkMacSystemFont,sans-serif}
main{max-width:1120px;margin:auto;padding:32px}h1,h2{line-height:1.2}
section{background:var(--cp-surface);border:1px solid var(--cp-border);border-radius:16px;padding:24px;margin:24px 0}
code,pre{font-family:Consolas,"Courier New",Courier,monospace}code{overflow-wrap:anywhere}
a{color:var(--cp-link)}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;border-bottom:1px solid var(--cp-border);padding:12px;vertical-align:top}
.scroll{overflow:auto}.scroll table{min-width:900px}.scroll td code{white-space:nowrap}svg{width:100%;min-width:640px}svg rect{fill:var(--cp-surface-soft);stroke:var(--cp-border-strong)}
svg text{fill:var(--cp-text);font-size:15px}svg path{stroke:var(--cp-accent);fill:none;stroke-width:2}
details{padding:12px 0}summary{cursor:pointer;font-weight:600}.muted{color:var(--cp-text-muted)}
input{box-sizing:border-box;width:100%;padding:12px;border:1px solid var(--cp-border);border-radius:10px;background:var(--cp-surface);color:var(--cp-text);font:inherit}
@media(max-width:600px){main{padding:16px}section{padding:16px}}
`

const diagram = `<svg viewBox="0 0 960 280" role="img" aria-label="Account and Contact relationships to purchase orders, invoices, comments and attachments">
<path d="M130 89 V175 M250 55 H340 M250 70 L340 190 M460 89 V175 M580 190 L680 70 M580 205 H680 M250 205 H340 M250 220 L680 240 M800 175 V89"/>
${[
  [10, 25, 'Account (Supplier)', 'accountid / Category'],
  [10, 175, 'Contact (portal identity)', 'parentcustomerid -> Account'],
  [340, 25, 'Purchase Order', 'supplieraccountid -> Account'],
  [340, 175, 'Invoice', 'Contact + Account + PO'],
  [680, 25, 'Invoice Attachment', 'Invoice + Comment + Contact'],
  [680, 175, 'Invoice Comment', 'Invoice + Author + Contact'],
].map(([x, y, label, detail]) => `<g><rect x="${x}" y="${y}" width="240" height="64" rx="10"/><text x="${x + 12}" y="${y + 25}">${label}</text><text x="${x + 12}" y="${y + 48}" style="font-size:11px">${escape(detail)}</text></g>`).join('')}
</svg>`

const modelHtml = `<section><h2>Business model</h2>
<p>A Supplier is a business Account whose existing <code>accountcategorycode</code> is <code>132140000</code>.
The standard categories Preferred Customer (1) and Standard (2) remain available.
New purchase orders may be assigned only to Supplier Accounts with <code>statecode=0</code>.</p>
<p>A Contact is a portal login, not a supplier business.
Multiple Supplier Contacts can share one Company Name Account through <code>parentcustomerid_account</code>.
Reviewer assignments use the separate native <code>spnvc_account_contact</code> many-to-many relationship.
A dual-role Contact keeps its single supplier company while reviewing several assigned businesses.
The Supplier and Reviewer web roles authorize portal actions; they do not classify Accounts.</p>
<div class="scroll">${diagram}</div>
<p class="muted">The diagram summarizes the business links.
The relationship table below lists every shipped lookup and the standard Contact company association.</p>
${tables.map(table => `<details open><summary>${escape(table.logicalName)} - ${table.kind}</summary>
<table><thead><tr><th>Shipped column</th><th>Type</th></tr></thead><tbody>${table.columns.map(column =>
  `<tr><td><code>${escape(column.logicalName)}</code></td><td>${escape(column.type)}</td></tr>`).join('')}</tbody></table></details>`).join('')}
<p>The segmented Account solution component contains the customized Category column, native Account-Contact relationship, and Active supplier accounts Management view.
The segmented Contact component adds only the Management form section.
Unchanged Account keys, name, state and standard Contact columns remain platform dependencies.</p></section>
<section><h2>Shipping solution surface</h2>
<p>The React website implements invoice, purchase-order, comment and attachment screens.
The supporting package retains each used business table's existing Information card/main/quick forms, seven saved views and ribbon exports.
The Active supplier accounts view and additive Portal Contact (Enhanced) assignment form are included alongside them.
The package contains 13 forms and 29 views.
Cleanup excludes unused tables and unrelated feature components, preserving the existing table-owned UI assets of used tables.
Table/column definitions, primary keys/names, state/status, ownership/audit metadata, currency/base amounts and the file relationship remain.
The existing contract and actual ZIP checks require the exact retained UI sets and valid field references while rejecting unrelated custom components.</p>
<p>Package minimization does not delete installed schema, UI assets, records or permissions.
Validate the unreleased candidate with an authorized fresh-environment import before releasing; successful packing alone does not verify import.</p></section>
<section><h2>Relationships</h2><div class="scroll"><table><thead><tr><th>Relationship</th><th>Source -> target</th><th>Lookup / navigation property</th></tr></thead><tbody>${relationships.map(relation =>
  `<tr><td><code>${escape(relation.name)}</code></td><td>${escape(relation.referencingTable)} -> ${escape(relation.referencedTable)}</td><td><code>${escape(relation.lookupColumn)}<br>${escape(relation.navigationProperty)}</code></td></tr>`).join('')}</tbody></table></div>
<p>Deleting an Account removes its invoice and PO links, rather than cascading deletion of financial records.
Account reassignment, sharing and ownership changes do not cascade to those records.</p></section>
<section><h2>Reviewer assignments and administrator workflow</h2>
<p><code>spnvc_account_contact</code> is a native Account-Contact N:N relationship with collection navigation on both sides and a platform-managed intersect.
The solution adds an <strong>Assigned Supplier Accounts</strong> subgrid on the General tab of the existing <strong>Portal Contact (Enhanced)</strong> form.
The native unmanaged differential form component contains only the added section and control, preserving Company Name, existing controls, libraries, handlers, localizations and security conditions.
The first-party form from Power Pages Runtime Core must already be installed.
The <strong>Assigned supplier accounts</strong> Related menu remains available.
Administrators use native Add Existing Account/Remove commands and the shipped <strong>Active supplier accounts</strong> view.
Remove unlinks the assignment without deleting the Account.
The solution does not replace the first-party app, sitemap or standard Account views.</p>
<p>Verify each intended business has Account Category Supplier (<code>132140000</code>) and Active state (<code>0</code>) before assignment.
The native lookup's Recent list can offer Accounts outside the filtered view.
Selecting a Standard or uncategorized Account may create a membership that the grid does not display.
Check Category, state and existing membership before repeating Add Existing.
After an approved Category correction, refresh the grid without recreating the association.
The assignment validator reports Category and state separately, including Company Name errors.
Recent selections and view selection do not enforce every administrator lookup path.</p>
<p>Supplier Company Name must reference an active Supplier Account, and that Account must also be an N:N member for target-binding AppendTo.
Supplier-only Contacts must not have extra memberships; dual-role Contacts may have additional reviewer assignments.
These are administrator-maintained configuration rules, checked by <code>scripts/validate-assignments.mjs</code>, not a new Dataverse plug-in.</p></section>
<section><h2>Choice values</h2>${Object.entries(choices.tables).map(([table, columns]) =>
  Object.entries(columns).map(([column, options]) => `<p><code>${table}.${column}</code>: ${Object.entries(options)
    .map(([label, value]) => `${escape(label)} (${value})`).join(', ')}.</p>`).join('')).join('')}</section>`

const permissionHtml = `<section><h2>Shipped permissions</h2>
<p>This is a source-derived configuration report, not a live-environment security audit.
Permissions from every assigned web role are additive; the UI role switch does not revoke server privileges.</p>
<input id="search" aria-label="Filter permissions" placeholder="Filter by table, scope or relationship">
<div class="scroll"><table id="permissions"><thead><tr><th>Permission</th><th>Table / scope</th><th>Relationship</th><th>Privileges</th></tr></thead><tbody>${permissionRows.map(permission =>
  `<tr><td>${escape(permission.name)}</td><td><code>${escape(permission.table)}</code><br>${escape(permission.scope)}</td><td><code>${escape(permission.relationship)}</code></td><td>${escape(permission.privileges.join(', '))}</td></tr>`).join('')}</tbody></table></div>
<p>Supplier PO access follows the signed-in Contact's company through <code>spnvc_account_purchaseorder</code>.
Supplier Invoice access is company-wide through <code>spnvc_account_invoice</code>.
Reviewer Account Read/AppendTo follows Contact scope through <code>spnvc_account_contact</code>; reviewer POs and invoices are Parent-scoped children.
Comments and attachments follow their authorized parent Invoice, not a copied submitter Contact.</p>
<p>Account and Contact Append are denied, preventing either-direction portal membership association/disassociation while preserving business-record Append and target AppendTo.
Contact Read/AppendTo is Self-scoped.
No default authenticated, Global Account/business, or preview Custom Access permission is shipped.</p>
<p>Supplier N:N permission grants minimal Account Read and AppendTo for exact Company Name validation and target binding.
It exposes associated Accounts; administrator-managed supplier-only membership must therefore contain only the designated Company.
The runtime rejects a missing/inaccessible, inactive, or non-Supplier Company and never falls back to another reviewer assignment.
Membership/category/state consistency is administrator-managed.
The existing status-based UI locks remain UI rules; table permissions do not enforce invoice-status transitions.
Live authorization, cache propagation after revocation, and $ref denial require separate target-environment validation.</p></section>`

const migrationHtml = `<section><h2>Provisioning and existing installations</h2>
<p>The fresh-install solution contains four custom tables, segmented Account metadata and an additive enhanced Contact form component.
Invoices and POs use the new <code>spnvc_supplieraccountid</code> lookup and case-sensitive <code>spnvc_SupplierAccountId</code> navigation property.</p>
<p>After unmanaged import, publish the affected tables and verify the Active supplier accounts view and General tab's Assigned Supplier Accounts subgrid.
Table-level publication includes other pending customizations on those tables and requires the environment owner's consent.
The standard Company Name lookup remains unchanged.</p>
<p>Existing lookup columns cannot be treated as retargeted by editing solution XML.
An existing installation needs an explicit, reviewed supplier-to-Account mapping and backfill of the new lookups before the new site is deployed.
An unmanaged solution update does not delete retired schema or migrate data.</p>
<p>Import sample Accounts before Contacts and financial records.
Contact collection <code>spnvc_account_contact@odata.bind</code> arrays create N:N associations during fresh Contact POSTs.
Replaying existing Contacts does not reconcile their memberships; migrate them explicitly through Management or absolute-URL Dataverse <code>$ref</code> requests.
Keep deterministic Account IDs; never match or overwrite a customer Account by name.
Use the target environment's currency and map non-sample Contacts deliberately.</p>
<p>See <a href="dataverse-data-migration.md">migration guidance</a> for the cutover checklist.
No live import, deployment or migration is performed by this generator.</p></section>`

for (const [file, title, body] of [
  ['data-model-plan.html', 'Data model plan', modelHtml + migrationHtml],
  ['permissions-plan.html', 'Permissions plan', permissionHtml + migrationHtml],
  ['permissions-audit.html', 'Permissions configuration report', permissionHtml],
  ['alm-plan.html', 'Template provisioning plan', migrationHtml + modelHtml],
]) {
  if (modelOnly && file.startsWith('permissions-')) continue
  writeFileSync(join(root, 'docs', file), `<!DOCTYPE html>
<!-- Generated by scripts/generate-docs.mjs from the shipped model and permissions. -->
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - Supplier Invoice Portal</title>
<script>(()=>{const param=new URLSearchParams(window.location.search).get("scoutTheme");const theme=param||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",theme)})();</script>
<style>${theme}</style></head><body><main><h1>${title}</h1><p class="muted">Supplier Invoice Portal</p>${body}</main>
<script>const input=document.getElementById('search');if(input)input.addEventListener('input',()=>{for(const row of document.querySelectorAll('#permissions tbody tr'))row.hidden=!row.textContent.toLowerCase().includes(input.value.toLowerCase())});</script>
</body></html>
`)
}
for (const [file, value] of [
  ['.alm-plan-data.json', { siteName: 'Supplier Invoice Portal', strategy: 'Fresh install or reviewed data migration', model }],
  ['alm/alm-plan-context.json', { siteName: 'Supplier Invoice Portal', source: 'Repository metadata', model, ...(modelOnly ? {} : { permissions: permissionRows }) }],
  ['alm/alm-size-estimate.json', { siteName: 'Supplier Invoice Portal', source: 'Repository metadata', customTableCount: 4, segmentedStandardTableCount: 2, tables }],
  ['alm/alm-split-plan.json', { solution: 'SupplierInvoiceSPAPortal', sharedSupportingSolution: true, websiteIncluded: false, tableNames: tables.map(table => table.logicalName) }],
]) writeFileSync(join(root, 'docs', file), JSON.stringify(value, null, 2) + '\n')
console.log(`Regenerated ${modelOnly ? 'model and provisioning' : 'model, permission and provisioning'} documentation from source metadata.`)
