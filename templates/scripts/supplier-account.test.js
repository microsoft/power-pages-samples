"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { validateTemplates } = require("./validate-templates");

const family = path.join(__dirname, "../spa/supplier-invoice-portal");
const website = path.join(family, "variants/react/website-code");
const solution = path.join(family, "solutions/SupplierInvoiceSPAPortal");
const read = (file) => fs.readFileSync(file, "utf8");
const json = (file) => JSON.parse(read(file));
const supplierCategory = 132140000;
const supplierRole = "997e7996-e241-4117-9c09-28e90a1fcdbc";
const reviewerRole = "c8031dd9-b8d4-435a-87df-3b90748d2fc4";

test("suppliers customize only Account Category and preserve standard categories", () => {
  const choices = json(path.join(website, "dataverse-choice-values.json"));
  assert.deepEqual(choices.tables.account.accountcategorycode, {
    "Preferred Customer": 1,
    Standard: 2,
    Supplier: supplierCategory,
  });
  const entity = read(path.join(solution, "Entities/Account/Entity.xml"));
  assert.deepEqual([...entity.matchAll(/<attribute PhysicalName="([^"]+)"/g)].map(m => m[1]),
    ["AccountCategoryCode"]);
  assert.match(entity, /<IsCustomField>0<\/IsCustomField>/);
  for (const [label, value] of Object.entries(choices.tables.account.accountcategorycode)) {
    assert.match(entity, new RegExp(`<option value="${value}"[\\s\\S]*?description="${label}"`));
  }
  const manifest = read(path.join(solution, "Other/Solution.xml"));
  assert.match(manifest, /schemaName="account" behavior="2"/);
  assert.match(manifest, /<CustomizationOptionValuePrefix>13214</);
  assert.equal(fs.existsSync(path.join(solution, "Entities/spnvc_Supplier")), false);
});

test("new supplier lookups bind Accounts without retargeting legacy columns", () => {
  const contract = json(path.join(website, "dataverse-solution-contract.json"));
  assert.equal(contract.tables.spnvc_supplier, undefined);
  assert.deepEqual(contract.tables.account, {
    customColumns: [],
    standardColumns: ["accountcategorycode"],
  });
  for (const table of ["invoice", "purchaseorder"]) {
    assert.deepEqual(contract.relationships[`spnvc_account_${table}`], {
      referencingTable: `spnvc_${table}`,
      referencedTable: "account",
      lookupColumn: "spnvc_supplieraccountid",
      navigationProperty: "spnvc_SupplierAccountId",
    });
  }
  assert.deepEqual(validateTemplates().errors, []);
});

test("solution relationship reference manifest declares each schema name once", () => {
  const references = [...read(path.join(solution, "Other/Relationships.xml"))
    .matchAll(/<EntityRelationship\b[^>]*\bName="([^"]+)"[^>]*\/>/g)]
    .map(match => match[1].toLowerCase());
  const duplicates = references.filter((name, index) => references.indexOf(name) !== index);
  assert.deepEqual(duplicates, [], "duplicate references produce duplicate definitions in the installable ZIP");
});

test("packed solution includes unique relationships, the Supplier view and differential Contact form", (t) => {
  const available = spawnSync("pac", ["help"], { encoding: "utf8" });
  if (available.error?.code === "ENOENT") {
    t.skip("PAC CLI is not installed; source manifest uniqueness is tested separately");
    return;
  }
  assert.equal(available.status, 0, available.stderr);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "supplier-relationship-pack-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const zip = path.join(directory, "supplier-unmanaged.zip");
  const packed = spawnSync("pac", [
    "solution", "pack", "--zipfile", zip, "--folder", solution,
    "--packagetype", "Unmanaged", "--errorlevel", "Warning"
  ], { encoding: "utf8" });
  assert.equal(packed.status, 0, `${packed.stdout}\n${packed.stderr}`);
  assert.doesNotMatch(`${packed.stdout}\n${packed.stderr}`, /warning|not defined in customizations/i);
  const extracted = spawnSync("unzip", ["-p", zip, "customizations.xml"], { encoding: "utf8" });
  assert.equal(extracted.status, 0, extracted.stderr);
  const names = [...extracted.stdout.matchAll(/<EntityRelationship\b[^>]*\bName="([^"]+)"/g)]
    .map(match => match[1].toLowerCase());
  assert.ok(names.includes("spnvc_account_contact"));
  assert.ok(names.includes("spnvc_account_invoice"));
  assert.ok(names.includes("spnvc_account_purchaseorder"));
  assert.deepEqual(names.filter((name, index) => names.indexOf(name) !== index), [],
    "a warning-free pack must not repeat relationship definitions");
  const contract = json(path.join(website, "dataverse-solution-contract.json"));
  const businessTables = Object.keys(contract.tables).filter(table => table.startsWith("spnvc_"));
  const platformRelationships = businessTables.flatMap(table => [
    `business_unit_${table}`, `lk_${table}_createdby`, `lk_${table}_modifiedby`,
    `owner_${table}`, `team_${table}`, `user_${table}`,
  ]);
  platformRelationships.push(
    "transactioncurrency_spnvc_invoice", "transactioncurrency_spnvc_purchaseorder",
    "fileattachment_spnvc_invoiceattachment_spnvc_file",
  );
  assert.deepEqual([...names].sort(), [
    ...Object.keys(contract.relationships), ...Object.keys(contract.manyToManyRelationships),
    ...platformRelationships,
  ].sort(), "ship only website relationships and standard ownership/audit/currency/file metadata");
  const account = /<Entity>\s*<Name\b[^>]*>Account<\/Name>([\s\S]*?)<\/Entity>/.exec(extracted.stdout)?.[1];
  assert.ok(account, "segmented Account component must be packed");
  const view = /<savedquery>([\s\S]*?<savedqueryid>\{e590060a-418f-5de4-93d3-98e2bf5e8b57\}<\/savedqueryid>[\s\S]*?)<\/savedquery>/.exec(account)?.[1];
  assert.ok(view, "the Management view must materialize inside packed Account customizations, not only exist as a source file");
  assert.match(view, /LocalizedName description="Active supplier accounts"/);
  assert.match(view, /<entity name="account">/);
  assert.match(view, /attribute="accountcategorycode" operator="eq" value="132140000"/);
  assert.match(view, /attribute="statecode" operator="eq" value="0"/);
  assert.match(view, /<grid\b[^>]*object="1"/);
  assert.match(view, /<row\b[^>]*id="accountid"/);
  assert.match(view, /<cell name="name"/);
  assert.match(view, /<isdefault>0<\/isdefault>/);
  const manifest = spawnSync("unzip", ["-p", zip, "solution.xml"], { encoding: "utf8" });
  assert.equal(manifest.status, 0, manifest.stderr);
  assert.match(manifest.stdout, /RootComponent type="1" schemaName="account" behavior="2"/);
  assert.doesNotMatch(manifest.stdout, /schemaName="account" behavior="0"/,
    "including a view must not transport the complete standard Account table");
  const contact = /<Entity>\s*<Name\b[^>]*>Contact<\/Name>([\s\S]*?)<\/Entity>/.exec(extracted.stdout)?.[1];
  assert.ok(contact, "the Management Contact form component must materialize in the installable ZIP");
  assert.match(contact, /<formid>\{c1c97961-2d42-4103-abf8-2fe2bdf38224\}<\/formid>/);
  assert.match(contact, /name="spnvc_assigned_supplier_accounts_section"[^>]*solutionaction="Added"/);
  assert.match(contact, /<RelationshipName>spnvc_account_contact<\/RelationshipName>/);
  assert.match(contact, /<ViewId>\{E590060A-418F-5DE4-93D3-98E2BF5E8B57\}<\/ViewId>/);
  assert.match(manifest.stdout, /RootComponent type="1" schemaName="contact" behavior="2"/);
  assert.match(manifest.stdout, /Required type="60"[^>]*solution="PowerPages_RuntimeCore[^"]*"[^>]*id="\{c1c97961-2d42-4103-abf8-2fe2bdf38224\}"/);
  assert.doesNotMatch(contact, /<DisplayConditions>|datafieldname="parentcustomerid"|<formLibraries>|<events>/,
    "native differential transport must not copy unrelated controls, role IDs or handlers from the source environment");
  const entities = [...extracted.stdout.matchAll(/<Entity>\s*<Name\b[^>]*>([^<]+)<\/Name>([\s\S]*?)<\/Entity>/g)];
  assert.deepEqual(entities.map(entity => entity[1].toLowerCase()).sort(), Object.keys(contract.tables).sort(),
    "the release ZIP must contain only the four business tables and segmented Account/Contact components");
  for (const [, schemaName, xml] of entities) {
    const logicalName = schemaName.toLowerCase();
    const table = contract.tables[logicalName];
    const attributes = [...xml.matchAll(/<attribute\b[^>]*>([\s\S]*?)<\/attribute>/g)];
    const customColumns = attributes
      .filter(attribute => /<IsCustomField>1<\/IsCustomField>/.test(attribute[1]))
      .map(attribute => /<LogicalName>([^<]+)<\/LogicalName>/.exec(attribute[1])?.[1]);
    assert.deepEqual(customColumns.sort(), [...table.customColumns].sort(),
      `${schemaName} must not ship custom fields outside the website contract`);
    const ui = contract.tableAssets[logicalName];
    if (ui) {
      const columns = new Set(attributes.map(attribute =>
        /<LogicalName>([^<]+)<\/LogicalName>/.exec(attribute[1])?.[1].toLowerCase()));
      const forms = [...xml.matchAll(/<systemform>([\s\S]*?)<\/systemform>/g)].map(match => match[1]);
      const views = [...xml.matchAll(/<savedquery>([\s\S]*?)<\/savedquery>/g)].map(match => match[1]);
      assert.deepEqual(forms.map(form => /<formid>\{([^}]+)\}<\/formid>/i.exec(form)?.[1].toLowerCase()).sort(),
        [...ui.forms].sort(), `${schemaName} retains its exact original form set`);
      assert.deepEqual(views.map(view => /<savedqueryid>\{([^}]+)\}<\/savedqueryid>/i.exec(view)?.[1].toLowerCase()).sort(),
        [...ui.views].sort(), `${schemaName} retains its exact original view set`);
      assert.match(xml, /<RibbonDiffXml>/, `${schemaName} retains its exported ribbon metadata`);
      for (const form of forms) {
        for (const field of form.matchAll(/\bdatafieldname="([^"]+)"/g)) {
          assert.ok(columns.has(field[1].toLowerCase()), `${schemaName} form references missing field ${field[1]}`);
        }
      }
      for (const view of views) {
        for (const field of view.matchAll(/<(?:attribute|condition|order|cell)\b[^>]*\b(?:name|attribute)="([^"]+)"/g)) {
          assert.ok(columns.has(field[1].toLowerCase()), `${schemaName} view references missing field ${field[1]}`);
        }
        for (const row of view.matchAll(/<row\b[^>]*\bid="([^"]+)"/g)) {
          assert.ok(columns.has(row[1].toLowerCase()), `${schemaName} view references missing row key ${row[1]}`);
        }
      }
    }
  }
  const formIds = [...extracted.stdout.matchAll(/<formid>\{([^}]+)\}<\/formid>/gi)]
    .map(match => match[1].toLowerCase());
  const expectedFormIds = [
    ...Object.values(contract.forms).map(form => form.id),
    ...Object.values(contract.tableAssets).flatMap(assets => assets.forms),
  ];
  assert.deepEqual(formIds.sort(), expectedFormIds.sort(),
    "retain the original forms for every used business table and the additive Contact assignment form");
  const viewIds = [...extracted.stdout.matchAll(/<savedqueryid>\{([^}]+)\}<\/savedqueryid>/gi)]
    .map(match => match[1].toLowerCase());
  assert.deepEqual(viewIds.sort(), [
    contract.forms.contact.defaultViewId,
    ...Object.values(contract.tableAssets).flatMap(assets => assets.views),
  ].sort(), "retain all original used-table views plus the active Supplier assignment view");
  assert.doesNotMatch(extracted.stdout.toLowerCase(),
    /\bspnvc_(supplier|supplierid|carrier|dealer|order|orderlineitem|product|shipment|ocr_file_to_text)\b/,
    "retired tables, lookup targets and fields must be absent from the actual release payload");
  assert.doesNotMatch(extracted.stdout, /<(?:AppModule|Workflow|Role|FieldSecurityProfile|CustomAction|CommandDefinition)\b/,
    "the supporting package must not introduce unused app, process, role, security or ribbon components");
  const roots = [...manifest.stdout.matchAll(/<RootComponent type="([^"]+)" schemaName="([^"]+)" behavior="([^"]+)"/g)];
  assert.deepEqual(roots.map(root => root[2]).sort(), Object.keys(contract.tables).sort());
  for (const [, type, table, behavior] of roots) {
    assert.equal(type, "1", "no unrelated process/app/security root components");
    assert.equal(behavior, table.startsWith("spnvc_") ? "0" : "2",
      "create required custom tables but include only selected standard-table components");
  }
});

test("shipping source retains exact used-table UI assets without unrelated table components", () => {
  const contract = json(path.join(website, "dataverse-solution-contract.json"));
  function files(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
  }
  const assets = files(path.join(solution, "Entities"));
  const formIds = assets.filter(file => file.includes(`${path.sep}FormXml${path.sep}`))
    .map(file => path.basename(file, ".xml").replace(/[{}]/g, "").toLowerCase());
  const viewIds = assets.filter(file => file.includes(`${path.sep}SavedQueries${path.sep}`))
    .map(file => path.basename(file, ".xml").replace(/[{}]/g, "").toLowerCase());
  assert.deepEqual(formIds.sort(), [
    contract.forms.contact.id, ...Object.values(contract.tableAssets).flatMap(assets => assets.forms),
  ].sort());
  assert.deepEqual(viewIds.sort(), [
    contract.forms.contact.defaultViewId, ...Object.values(contract.tableAssets).flatMap(assets => assets.views),
  ].sort());
  const ribbons = assets.filter(file => path.basename(file) === "RibbonDiff.xml")
    .map(file => path.basename(path.dirname(file)).toLowerCase());
  assert.deepEqual(ribbons.sort(), Object.keys(contract.tableAssets).sort());
  for (const table of Object.keys(contract.tableAssets)) {
    const directory = fs.readdirSync(path.join(solution, "Entities")).find(folder => folder.toLowerCase() === table);
    const entity = read(path.join(solution, "Entities", directory, "Entity.xml"));
    for (const marker of ["FormXml", "SavedQueries", "RibbonDiffXml"]) {
      assert.match(entity, new RegExp(`<${marker}\\s*/>`), "all used-table UI assets must be included in packing");
    }
    assert.equal(contract.tableAssets[table].ribbonDiff, true);
  }
});

test("native Account Contact membership is a shipped N:N relationship, not a recreated business table", () => {
  const contract = json(path.join(website, "dataverse-solution-contract.json"));
  assert.deepEqual(contract.manyToManyRelationships.spnvc_account_contact, {
    firstTable: "account",
    secondTable: "contact",
    intersectTable: "spnvc_account_contact",
    firstNavigationProperty: "spnvc_account_contact",
    secondNavigationProperty: "spnvc_account_contact",
  });
  const relationshipXml = read(path.join(solution, "Other/Relationships/Account.xml"));
  const membership = /<EntityRelationship Name="spnvc_account_contact">([\s\S]*?)<\/EntityRelationship>/.exec(relationshipXml)?.[1];
  assert.ok(membership, "Account-Contact membership must ship in the solution");
  assert.match(membership, /<EntityRelationshipType>ManyToMany<\/EntityRelationshipType>/);
  assert.match(membership, /<FirstEntityName>Account<\/FirstEntityName>/);
  assert.match(membership, /<SecondEntityName>Contact<\/SecondEntityName>/);
  assert.match(membership, /<IntersectEntityName>spnvc_account_contact<\/IntersectEntityName>/);
  assert.match(membership, /<AssociationRoleOrdinal>1<\/AssociationRoleOrdinal>/);
  assert.match(membership, /<AssociationRoleOrdinal>2<\/AssociationRoleOrdinal>/);
  assert.match(read(path.join(solution, "Other/Relationships.xml")), /Name="spnvc_account_contact"/);
  // The relationship is packaged as an Account subcomponent, just like the
  // shipped 311Portal N:N relationship; it isn't a standalone business table.
  assert.match(read(path.join(solution, "Other/Solution.xml")), /type="1" schemaName="account" behavior="2"/);
  assert.equal(fs.existsSync(path.join(solution, "Entities/spnvc_account_contact")), false);
});

test("seed Accounts precede contacts and preserve supplier relationships by exact IDs", () => {
  const seed = json(path.join(family, "seed-data/data.json"));
  assert.equal(Object.keys(seed.tables)[0], "suppliers");
  const accounts = seed.tables.suppliers;
  assert.equal(accounts.logicalName, "account");
  assert.equal(accounts.entitySet, "accounts");
  assert.equal(accounts.idColumn, "accountid");
  assert.equal(accounts.records.length, 10);
  const ids = new Set(accounts.records.map(record => record.accountid));
  const contactIds = new Set(seed.tables.contacts.records.map(record => record.contactid));
  for (const record of accounts.records) {
    assert.equal(record.accountcategorycode, supplierCategory);
    assert.equal(record.statecode, 0);
    assert.equal(typeof record.name, "string");
  }
  for (const table of ["purchaseOrders", "invoices"]) {
    for (const record of seed.tables[table].records) {
      const match = /^\/accounts\(([^)]+)\)$/.exec(record["spnvc_SupplierAccountId@odata.bind"]);
      assert.ok(match, `${table} must bind the new Account navigation property`);
      assert.ok(ids.has(match[1]), `${table} must reference a seeded Account`);
      assert.equal(record._spnvc_supplierid_value, undefined);
    }
  }
  for (const contact of seed.tables.contacts.records) {
    const members = contact["spnvc_account_contact@odata.bind"];
    assert.ok(Array.isArray(members) && members.length > 0);
    for (const bind of members) assert.ok(ids.has(/^\/accounts\(([^)]+)\)$/.exec(bind)?.[1]));
    if (!seed.tables.invoices.records.some(record => record._spnvc_contactid_value === contact.contactid)) continue;
    const match = /^\/accounts\(([^)]+)\)$/.exec(contact["parentcustomerid_account@odata.bind"]);
    assert.ok(match && ids.has(match[1]));
    assert.ok(members.includes(contact["parentcustomerid_account@odata.bind"]));
  }
  for (const table of Object.values(seed.tables)) {
    for (const record of table.records) {
      assert.equal(record._transactioncurrencyid_value, undefined,
        "seeds must not bind an environment-specific currency GUID");
      for (const [field, value] of Object.entries(record)) {
        if (/^_spnvc_.*contactid_value$/.test(field)) assert.ok(contactIds.has(value), field);
      }
    }
  }
});

test("Management ships an additive subgrid on the existing enhanced Contact form", () => {
  const xml = read(path.join(solution, "Other/Relationships/Account.xml"));
  assert.match(xml, /CustomLabel description="Assigned supplier accounts"/);
  assert.match(xml, /NavPaneDisplayOption>UseLabel</);
  const view = read(path.join(solution, "Entities/Account/SavedQueries/{e590060a-418f-5de4-93d3-98e2bf5e8b57}.xml"));
  assert.match(view, /LocalizedName description="Active supplier accounts"/);
  assert.match(view, /attribute="accountcategorycode" operator="eq" value="132140000"/);
  assert.match(view, /attribute="statecode" operator="eq" value="0"/);
  assert.match(view, /<isdefault>0<\/isdefault>/);
  assert.equal(fs.existsSync(path.join(solution, "AppModules")), false);
  const formPath = path.join(solution, "Entities/Contact/FormXml/main/{c1c97961-2d42-4103-abf8-2fe2bdf38224}.xml");
  assert.ok(fs.existsSync(formPath), "ship the actual enhanced Management form, not only related navigation");
  const form = read(formPath);
  assert.match(form, /description="Portal Contact \(Enhanced\)"/);
  assert.match(form, /tab name="general"/);
  assert.match(form, /description="Assigned Supplier Accounts"/);
  assert.match(form, /solutionaction="Added"/);
  assert.match(form, /classid="\{E7A81278-8635-4D9E-8D4D-59480B391C5B\}"/);
  assert.match(form, /<TargetEntityType>account<\/TargetEntityType>/);
  assert.match(form, /<RelationshipName>spnvc_account_contact<\/RelationshipName>/);
  assert.match(form, /<ViewId>\{E590060A-418F-5DE4-93D3-98E2BF5E8B57\}<\/ViewId>/);
  assert.doesNotMatch(form.replace('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"', ""),
    /<DisplayConditions>|<formLibraries>|<events>|https?:\/\/|ShowNew|ShowRemove/);
  assert.equal([...form.matchAll(/<control\b/g)].length, 1, "transport only the new control");
  assert.equal([...form.matchAll(/<section\b/g)].length, 1, "transport only the new section");
  const contract = json(path.join(website, "dataverse-solution-contract.json"));
  assert.deepEqual(contract.tables.contact, { customColumns: [] });
  assert.deepEqual(contract.forms.contact, {
    id: "c1c97961-2d42-4103-abf8-2fe2bdf38224",
    name: "Portal Contact (Enhanced)",
    relationship: "spnvc_account_contact",
    defaultViewId: "e590060a-418f-5de4-93d3-98e2bf5e8b57",
    transport: "differential",
  });
});

test("Supplier PO and Account access is relationship-scoped, never global", () => {
  const permissions = fs.readdirSync(path.join(website, ".powerpages-site/table-permissions"))
    .map(file => read(path.join(website, ".powerpages-site/table-permissions", file)));
  const po = permissions.find(p => /entitylogicalname: spnvc_purchaseorder\n/.test(p) && p.includes(supplierRole));
  assert.match(po, /scope: 756150002/);
  assert.match(po, /accountrelationship: spnvc_account_purchaseorder/);
  assert.doesNotMatch(po, /create: true|write: true|delete: true/);
  const supplierAccounts = permissions.filter(p => /entitylogicalname: account\n/.test(p) && p.includes(supplierRole));
  for (const account of supplierAccounts) {
    assert.match(account, /read: true/);
    assert.match(account, /contactrelationship: spnvc_account_contact/);
    assert.doesNotMatch(account, /contactrelationship: account_primary_contact/);
  }
  const reviewerAccounts = permissions.find(p => /entitylogicalname: account\n/.test(p) && p.includes(reviewerRole));
  assert.match(reviewerAccounts, /scope: 756150001/);
  assert.match(reviewerAccounts, /contactrelationship: spnvc_account_contact/);
  for (const permission of permissions) {
    assert.doesNotMatch(permission, /scope: 756150000|scope: 756150005/);
    assert.ok(!permission.includes("2ab5e3ba-0309-f111-8406-6045bd04a357"),
      "default authenticated role must not defeat membership revocation");
    if (!/entitylogicalname: account\n/.test(permission)) continue;
    assert.match(permission, /append: false/);
    assert.doesNotMatch(permission, /create: true|write: true|delete: true/);
  }
  const reviewerId = /^id: (.+)$/m.exec(reviewerAccounts)[1];
  for (const table of ["spnvc_purchaseorder", "spnvc_invoice"]) {
    const child = permissions.find(p => p.includes(`entitylogicalname: ${table}\n`) && p.includes(reviewerRole));
    assert.match(child, /scope: 756150003/);
    assert.ok(child.includes(`parententitypermission: ${reviewerId}`));
    assert.ok(child.includes(`parentrelationship: spnvc_account_${table.slice("spnvc_".length)}`));
  }
  const contact = permissions.find(p => /entitylogicalname: contact\n/.test(p));
  assert.match(contact, /scope: 756150004/);
  assert.match(contact, /append: false/);
  const fields = read(path.join(website, ".powerpages-site/site-settings/Webapi-account-fields.sitesetting.yml"));
  assert.match(fields, /value: accountid,name,accountcategorycode,statecode/);
  assert.equal(fs.existsSync(path.join(website, ".powerpages-site/site-settings/Webapi-spnvc_supplier-enabled.sitesetting.yml")), false);
});

test("exported permission graph ties reviewer mutations to N:N membership and Supplier access to one company", () => {
  const directory = path.join(website, ".powerpages-site/table-permissions");
  const permissions = fs.readdirSync(directory).map(file => {
    const yaml = read(path.join(directory, file));
    const field = name => new RegExp(`^${name}: (.+)$`, "m").exec(yaml)?.[1];
    return {
      id: field("id"), table: field("entitylogicalname"), scope: field("scope"),
      parent: field("parententitypermission"), relationship: field("parentrelationship"),
      roles: [...yaml.matchAll(/^- ([0-9a-f-]+)$/gm)].map(match => match[1]),
      read: field("read") === "true", write: field("write") === "true",
      append: field("append") === "true", appendto: field("appendto") === "true"
    };
  });
  const contract = json(path.join(website, "dataverse-solution-contract.json"));
  const records = {
    account: ["A", "B", "C"].map(id => ({ id })),
    contact: [{ id: "reviewer" }, { id: "supplier1" }, { id: "supplier2" }],
    spnvc_invoice: ["A", "B", "C"].map(account => ({ id: `INV-${account}`, spnvc_supplieraccountid: account })),
    spnvc_purchaseorder: ["A", "B", "C"].map(account => ({ id: `PO-${account}`, spnvc_supplieraccountid: account })),
  };
  // This checks the exported graph against the documented scope semantics.
  // It isn't a live Power Pages authorization engine or a $ref integration test.
  function matches(permission, row, actor) {
    if (!permission.roles.some(role => actor.roles.includes(role))) return false;
    if (permission.scope === "756150004") return permission.table === "contact" && row.id === actor.id;
    if (permission.scope === "756150001") return permission.table === "account" && actor.members.includes(row.id);
    if (permission.scope === "756150002") return row.spnvc_supplieraccountid === actor.company;
    if (permission.scope !== "756150003") throw new Error(`Unexpected scope ${permission.scope}`);
    const relation = contract.relationships[permission.relationship];
    const parent = permissions.find(candidate => candidate.id === permission.parent);
    assert.ok(parent && relation, "parent permission and relationship must exist");
    const parentRow = records[parent.table].find(candidate => candidate.id === row[relation.lookupColumn]);
    return !!parentRow && matches(parent, parentRow, actor);
  }
  const allowed = (table, row, actor, privilege) => permissions.some(permission =>
    permission.table === table && permission[privilege] && matches(permission, row, actor));
  const reviewer = { id: "reviewer", roles: [reviewerRole], members: ["A", "B"], company: "C" };
  for (const table of ["spnvc_invoice", "spnvc_purchaseorder"]) {
    for (const row of records[table]) {
      assert.equal(allowed(table, row, reviewer, "read"), row.spnvc_supplieraccountid !== "C");
      assert.equal(allowed(table, row, reviewer, "write"), row.spnvc_supplieraccountid !== "C");
    }
    reviewer.members = ["A"];
    assert.equal(allowed(table, records[table][1], reviewer, "write"), false);
    reviewer.members = [];
    assert.equal(allowed(table, records[table][2], reviewer, "read"), false, "Company Name must not grant reviewer access");
    reviewer.members = ["A", "B"];
  }
  for (const id of ["supplier1", "supplier2"]) {
    const supplier = { id, roles: [supplierRole], members: ["A"], company: "A" };
    assert.equal(allowed("spnvc_invoice", records.spnvc_invoice[0], supplier, "write"), true);
    assert.equal(allowed("spnvc_invoice", records.spnvc_invoice[1], supplier, "write"), false);
    assert.equal(allowed("account", records.account[0], supplier, "read"), true);
    assert.equal(allowed("account", records.account[1], supplier, "read"), false);
    assert.equal(allowed("account", records.account[0], supplier, "appendto"), true);
    assert.equal(allowed("account", records.account[1], supplier, "appendto"), false);
    assert.equal(allowed("account", records.account[0], supplier, "append"), false);
    assert.equal(allowed("contact", records.contact.find(contact => contact.id === id), supplier, "append"), false);
  }
  const dual = { id: "reviewer", roles: [supplierRole, reviewerRole], members: ["A", "B"], company: "A" };
  assert.equal(allowed("spnvc_invoice", records.spnvc_invoice[1], dual, "write"), true,
    "dual-role privileges are additive; UI mode isn't a security boundary");
  dual.members = ["A"];
  assert.equal(allowed("spnvc_invoice", records.spnvc_invoice[1], dual, "write"), false);
  assert.equal(allowed("spnvc_invoice", records.spnvc_invoice[0], dual, "write"), true);
});

test("shipped solution and runtime contain no custom Supplier table references", () => {
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.(xml|ts|tsx|js|yml|json)$/.test(entry.name)) {
        // The new lookup is deliberately named supplieraccountid, not supplierid.
        assert.doesNotMatch(read(file), /spnvc_supplier(?!accountid)|spnvc_Supplier(?!AccountId)/,
          path.relative(family, file));
      }
    }
  }
  inspect(solution);
  inspect(path.join(website, "src"));
  inspect(path.join(website, ".powerpages-site/site-settings"));
  inspect(path.join(website, ".powerpages-site/table-permissions"));
});
