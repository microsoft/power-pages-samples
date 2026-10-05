"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

test("Management association navigation and filtered view ship without replacing first-party forms or app", () => {
  const xml = read(path.join(solution, "Other/Relationships/Account.xml"));
  assert.match(xml, /CustomLabel description="Assigned supplier accounts"/);
  assert.match(xml, /NavPaneDisplayOption>UseLabel</);
  const view = read(path.join(solution, "Entities/Account/SavedQueries/{e590060a-418f-5de4-93d3-98e2bf5e8b57}.xml"));
  assert.match(view, /LocalizedName description="Active supplier accounts"/);
  assert.match(view, /attribute="accountcategorycode" operator="eq" value="132140000"/);
  assert.match(view, /attribute="statecode" operator="eq" value="0"/);
  assert.match(view, /<isdefault>0<\/isdefault>/);
  assert.equal(fs.existsSync(path.join(solution, "AppModules")), false);
  assert.equal(fs.existsSync(path.join(solution, "Entities/Contact/FormXml")), false);
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
