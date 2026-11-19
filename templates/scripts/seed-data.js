#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const {
  DataverseWebApiClient,
  getDataverseToken,
  normalizeEnvironmentUrl,
  stableStringify
} = require("./dataverse-solution");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function hashPlan(core) {
  return crypto.createHash("sha256").update(stableStringify(core)).digest("hex");
}

function loadSeed(seedFile) {
  const seed = JSON.parse(fs.readFileSync(path.resolve(seedFile), "utf8"));
  if (
    !seed ||
    seed.schemaVersion !== 1 ||
    !seed.tables ||
    typeof seed.tables !== "object" ||
    Array.isArray(seed.tables) ||
    Object.keys(seed.tables).length === 0
  ) {
    throw new Error("Seed file must use schemaVersion 1 with a non-empty tables object.");
  }
  if (seed.fileExports?.length) {
    throw new Error("This bounded importer does not support fileExports yet.");
  }
  return seed;
}

function validateTableContract(tableKey, table) {
  if (
    !table ||
    !IDENTIFIER.test(table.logicalName ?? "") ||
    !IDENTIFIER.test(table.entitySet ?? "") ||
    !IDENTIFIER.test(table.idColumn ?? "") ||
    !Array.isArray(table.records) ||
    table.records.length === 0
  ) {
    throw new Error(`Seed table "${tableKey}" must declare logicalName, entitySet, idColumn, and records.`);
  }
}

function bindReference(value) {
  const match = /^\/([A-Za-z_][A-Za-z0-9_]*)\(([0-9a-f-]{36})\)$/i.exec(value ?? "");
  if (!match || !GUID.test(match[2])) {
    throw new Error(`Lookup binding must use /<entitySet>(<guid>): ${value}`);
  }
  return { entitySet: match[1], id: match[2].toLowerCase() };
}

async function readMetadata(client, table) {
  const metadata = await client.request(
    "GET",
    `EntityDefinitions(LogicalName='${table.logicalName}')?` +
      "$select=LogicalName,EntitySetName,PrimaryIdAttribute&" +
      "$expand=Attributes($select=LogicalName,AttributeType)"
  );
  if (
    metadata.EntitySetName !== table.entitySet ||
    metadata.PrimaryIdAttribute !== table.idColumn
  ) {
    throw new Error(
      `Live metadata for ${table.logicalName} does not match entitySet/idColumn from seed data.`
    );
  }
  const relationships = await client.request(
    "GET",
    `EntityDefinitions(LogicalName='${table.logicalName}')/ManyToOneRelationships?` +
      "$select=ReferencedEntity,ReferencingAttribute,ReferencingEntityNavigationPropertyName"
  );
  return {
    attributes: new Map((metadata.Attributes ?? []).map((attribute) => [
      attribute.LogicalName,
      attribute.AttributeType
    ])),
    relationships: relationships.value ?? []
  };
}

async function activeCurrencies(client) {
  const result = await client.request(
    "GET",
    "transactioncurrencies?$select=transactioncurrencyid,isocurrencycode,currencyname,statecode&$filter=statecode eq 0"
  );
  return (result.value ?? [])
    .map((currency) => ({
      id: String(currency.transactioncurrencyid).toLowerCase(),
      code: String(currency.isocurrencycode).toUpperCase(),
      name: currency.currencyname
    }))
    .filter((currency) => GUID.test(currency.id) && /^[A-Z]{3}$/.test(currency.code))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function normalizeScalar(value, attributeType, field) {
  if (attributeType === "Boolean") {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    throw new Error(`Boolean field ${field} must use true/false or 1/0.`);
  }
  return value;
}

async function planSeedImport({ seed, environmentUrl, currencyCode, client }) {
  environmentUrl = normalizeEnvironmentUrl(environmentUrl);
  await client.whoAmI();

  const tableMetadata = new Map();
  let requiresCurrency = false;
  for (const [tableKey, table] of Object.entries(seed.tables)) {
    validateTableContract(tableKey, table);
    const metadata = await readMetadata(client, table);
    tableMetadata.set(table.logicalName, metadata);
    const usedFields = new Set(table.records.flatMap((record) =>
      Object.keys(record).filter((key) => !key.endsWith("@odata.bind"))
    ));
    if ([...usedFields].some((field) => metadata.attributes.get(field) === "Money")) {
      requiresCurrency = true;
    }
  }

  const currencies = requiresCurrency ? await activeCurrencies(client) : [];
  if (requiresCurrency && !currencyCode) {
    return {
      readyForApproval: false,
      requiresCurrencySelection: true,
      currencies,
      counts: {
        tables: Object.keys(seed.tables).length,
        records: Object.values(seed.tables).reduce((sum, table) => sum + table.records.length, 0)
      }
    };
  }
  let currency = null;
  if (requiresCurrency) {
    currencyCode = String(currencyCode).toUpperCase();
    currency = currencies.find((candidate) => candidate.code === currencyCode);
    if (!currency) {
      throw new Error(`Currency ${currencyCode} is not active in the target environment.`);
    }
  }

  const tables = [];
  for (const [tableKey, table] of Object.entries(seed.tables)) {
    const metadata = tableMetadata.get(table.logicalName);
    const currencyRelationship = metadata.relationships.find((relationship) =>
      relationship.ReferencedEntity === "transactioncurrency" &&
      relationship.ReferencingAttribute === "transactioncurrencyid"
    );
    if (requiresCurrency && table.records.some((record) =>
      Object.keys(record).some((field) => metadata.attributes.get(field) === "Money")
    ) && !currencyRelationship) {
      throw new Error(`Money table ${table.logicalName} has no unambiguous currency relationship.`);
    }

    const records = table.records.map((record, index) => {
      const id = String(record[table.idColumn] ?? "").toLowerCase();
      if (!GUID.test(id)) {
        throw new Error(`Seed table "${tableKey}" record[${index}] lacks GUID ${table.idColumn}.`);
      }
      const payload = {};
      const scalarVerification = {};
      const lookupVerification = {};
      for (const [field, value] of Object.entries(record)) {
        if (field === table.idColumn) continue;
        if (field.endsWith("@odata.bind")) {
          const navigationProperty = field.slice(0, -11);
          const relationship = metadata.relationships.find((candidate) =>
            candidate.ReferencingEntityNavigationPropertyName === navigationProperty
          );
          if (!relationship) {
            throw new Error(
              `Seed table "${tableKey}" uses unknown lookup navigation property ${navigationProperty}.`
            );
          }
          const reference = bindReference(value);
          payload[field] = value;
          lookupVerification[`_${relationship.ReferencingAttribute}_value`] = reference.id;
          continue;
        }
        const attributeType = metadata.attributes.get(field);
        if (!attributeType) {
          throw new Error(`Seed table "${tableKey}" uses unknown field ${field}.`);
        }
        const normalized = normalizeScalar(value, attributeType, `${table.logicalName}.${field}`);
        payload[field] = normalized;
        scalarVerification[field] = normalized;
      }
      const usesMoney = Object.keys(payload).some((field) =>
        metadata.attributes.get(field) === "Money"
      );
      if (usesMoney) {
        const navigation = currencyRelationship.ReferencingEntityNavigationPropertyName;
        payload[`${navigation}@odata.bind`] = `/transactioncurrencies(${currency.id})`;
        lookupVerification._transactioncurrencyid_value = currency.id;
      }
      return {
        id,
        payload,
        scalarVerification,
        lookupVerification
      };
    });
    tables.push({
      key: tableKey,
      logicalName: table.logicalName,
      entitySet: table.entitySet,
      idColumn: table.idColumn,
      records
    });
  }

  const core = {
    planVersion: 1,
    environmentUrl,
    currency: currency ? { code: currency.code, id: currency.id, name: currency.name } : null,
    tables,
    counts: {
      tables: tables.length,
      records: tables.reduce((sum, table) => sum + table.records.length, 0)
    }
  };
  return {
    ...core,
    approvalHash: hashPlan(core),
    readyForApproval: true,
    requiresCurrencySelection: false
  };
}

function assertApprovedPlan(plan, approvedHash) {
  if (!plan?.readyForApproval || plan.approvalHash !== approvedHash) {
    throw new Error("Approval hash does not match a ready seed-import plan.");
  }
  const {
    approvalHash: ignoredHash,
    readyForApproval: ignoredReady,
    requiresCurrencySelection: ignoredCurrency,
    ...core
  } = plan;
  if (hashPlan(core) !== plan.approvalHash) {
    throw new Error("Seed-import plan contents do not match the approval hash.");
  }
}

async function applySeedPlan(plan, client, onProgress = () => {}) {
  await client.whoAmI();
  const summary = {
    upserted: 0,
    verified: 0,
    failed: 0,
    completed: []
  };
  try {
    for (const table of plan.tables) {
      for (const record of table.records) {
        await client.request("PATCH", `${table.entitySet}(${record.id})`, {
          body: record.payload
        });
        summary.upserted += 1;
        summary.completed.push(`upsert:${table.entitySet}:${record.id}`);
        onProgress(summary);

        const select = [
          table.idColumn,
          ...Object.keys(record.scalarVerification),
          ...Object.keys(record.lookupVerification)
        ];
        const actual = await client.request(
          "GET",
          `${table.entitySet}(${record.id})?$select=${select.join(",")}`
        );
        for (const [field, expected] of Object.entries(record.scalarVerification)) {
          if (actual[field] !== expected) {
            throw new Error(
              `Verification failed for ${table.entitySet}(${record.id}).${field}: ` +
              `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual[field])}.`
            );
          }
        }
        for (const [field, expected] of Object.entries(record.lookupVerification)) {
          if (String(actual[field] ?? "").toLowerCase() !== expected) {
            throw new Error(
              `Verification failed for ${table.entitySet}(${record.id}).${field}.`
            );
          }
        }
        summary.verified += 1;
        summary.completed.push(`verify:${table.entitySet}:${record.id}`);
        onProgress(summary);
      }
    }
    return summary;
  } catch (error) {
    summary.failed += 1;
    error.summary = summary;
    throw error;
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name value arguments, received ${key ?? "<end>"}.`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

async function runCli() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.command === "plan") {
      if (!args["seed-file"] || !args.environment || !args.out) {
        throw new Error("plan requires --seed-file, --environment, and --out.");
      }
      const environmentUrl = normalizeEnvironmentUrl(args.environment);
      const client = new DataverseWebApiClient({
        environmentUrl,
        token: getDataverseToken(environmentUrl)
      });
      const plan = await planSeedImport({
        seed: loadSeed(args["seed-file"]),
        environmentUrl,
        currencyCode: args["currency-code"],
        client
      });
      fs.writeFileSync(path.resolve(args.out), JSON.stringify(plan, null, 2) + "\n");
      console.log(JSON.stringify({
        readyForApproval: plan.readyForApproval,
        requiresCurrencySelection: plan.requiresCurrencySelection,
        counts: plan.counts,
        currencies: plan.currencies,
        currency: plan.currency,
        approvalHash: plan.approvalHash
      }, null, 2));
      return;
    }
    if (args.command === "apply") {
      if (!args.plan || !args.approve || !args.journal) {
        throw new Error("apply requires --plan, --approve, and --journal.");
      }
      const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), "utf8"));
      assertApprovedPlan(plan, args.approve);
      const client = new DataverseWebApiClient({
        environmentUrl: plan.environmentUrl,
        token: getDataverseToken(plan.environmentUrl)
      });
      const journalPath = path.resolve(args.journal);
      const writeProgress = (summary) => fs.writeFileSync(
        journalPath,
        JSON.stringify({ ...summary, incomplete: true }, null, 2) + "\n"
      );
      try {
        const summary = await applySeedPlan(plan, client, writeProgress);
        fs.writeFileSync(
          journalPath,
          JSON.stringify({ ...summary, incomplete: false }, null, 2) + "\n"
        );
        console.log(`Upserted and verified ${summary.verified} seed record(s).`);
      } catch (error) {
        fs.writeFileSync(
          journalPath,
          JSON.stringify({
            ...(error.summary ?? {}),
            error: error.message,
            incomplete: true
          }, null, 2) + "\n"
        );
        throw error;
      }
      return;
    }
    throw new Error("Command must be plan or apply.");
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  applySeedPlan,
  assertApprovedPlan,
  bindReference,
  hashPlan,
  loadSeed,
  normalizeScalar,
  planSeedImport
};
