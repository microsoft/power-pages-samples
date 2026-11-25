"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  applyPlan,
  assertApproved,
  assertExecutionApproved,
  buildPlan,
  columnPayload,
  executionApprovalHash,
  exportAndUnpack,
  isTransientMetadataError,
  parseAccessToken,
  relationshipPayload,
  tablePayload,
  validateSpec
} = require("./dataverse-solution");

function validSpec() {
  return {
    schemaVersion: 1,
    languageCode: 1033,
    publisher: {
      uniqueName: "ShoppingPublisher",
      friendlyName: "Shopping Publisher",
      prefix: "shop",
      optionValuePrefix: 10000
    },
    solution: {
      uniqueName: "ShoppingTemplate",
      friendlyName: "Shopping Template",
      version: "1.0.0.0"
    },
    tables: [
      {
        name: "category",
        displayName: "Category",
        displayCollectionName: "Categories",
        description: "Product categories.",
        ownership: "OrganizationOwned",
        primaryName: {
          name: "name",
          displayName: "Name",
          maxLength: 120
        },
        columns: [
          {
            name: "slug",
            displayName: "Slug",
            description: "Stable category slug.",
            type: "string",
            maxLength: 100,
            required: "ApplicationRequired"
          }
        ]
      },
      {
        name: "product",
        displayName: "Product",
        displayCollectionName: "Products",
        description: "Products available to shoppers.",
        ownership: "OrganizationOwned",
        primaryName: {
          name: "name",
          displayName: "Name",
          maxLength: 160
        },
        columns: [
          {
            name: "price",
            displayName: "Price",
            description: "Current unit price.",
            type: "money",
            required: "ApplicationRequired"
          },
          {
            name: "status",
            displayName: "Status",
            description: "Catalog publication status.",
            type: "choice",
            required: "ApplicationRequired",
            options: [
              { label: "Draft" },
              { label: "Published" }
            ]
          }
        ]
      }
    ],
    relationships: [
      {
        name: "categoryProducts",
        oneTable: "category",
        manyTable: "product",
        lookup: {
          name: "category",
          displayName: "Category",
          description: "Category assigned to the product.",
          required: "ApplicationRequired"
        }
      }
    ]
  };
}

test("builds a deterministic immutable Dataverse plan", () => {
  const first = buildPlan(validSpec());
  const second = buildPlan(validSpec());

  assert.deepEqual(first, second);
  assert.match(first.approvalHash, /^[a-f0-9]{64}$/);
  assert.equal(first.tables[0].logicalName, "shop_category");
  assert.equal(first.tables[1].columns[1].options[0].value, 100000000);
  assert.equal(first.relationships[0].lookup.schemaName, "shop_CategoryId");
  assert.doesNotThrow(() => assertApproved(first, first.approvalHash));
  const executionHash = executionApprovalHash(first, "https://example.crm.dynamics.com/");
  assert.doesNotThrow(() =>
    assertExecutionApproved(first, "https://example.crm.dynamics.com", executionHash)
  );
  assert.throws(
    () => assertExecutionApproved(first, "https://other.crm.dynamics.com", executionHash),
    /target environment/
  );

  const tampered = structuredClone(first);
  tampered.tables[0].displayName = "Tampered";
  assert.throws(() => assertApproved(tampered, tampered.approvalHash), /contents/);
});

test("creates supported Microsoft metadata payloads", () => {
  const plan = buildPlan(validSpec());
  const table = tablePayload(plan.tables[0]);
  assert.equal(table["@odata.type"], "Microsoft.Dynamics.CRM.EntityMetadata");
  assert.equal(table.Attributes[0].IsPrimaryName, true);

  const money = columnPayload(plan.tables[1].columns[0]);
  assert.equal(money["@odata.type"], "Microsoft.Dynamics.CRM.MoneyAttributeMetadata");
  assert.equal(money.PrecisionSource, 2);

  const choice = columnPayload(plan.tables[1].columns[1]);
  assert.equal(choice.OptionSet.Options[1].Value, 100000001);

  const relationship = relationshipPayload(plan.relationships[0]);
  assert.equal(
    relationship["@odata.type"],
    "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata"
  );
  assert.equal(relationship.ReferencedEntity, "shop_category");
  assert.equal(relationship.ReferencingEntity, "shop_product");
  assert.equal(relationship.Lookup.SchemaName, "shop_CategoryId");
});

test("rejects unsupported and unsafe schema input", () => {
  const spec = validSpec();
  spec.publisher.prefix = "TOO-LONG";
  spec.solution.version = "1.0";
  spec.tables[0].columns[0].type = "file";
  spec.relationships[0].manyTable = "missing";

  const errors = validateSpec(spec);
  assert(errors.some((error) => error.includes("publisher.prefix")));
  assert(errors.some((error) => error.includes("four numeric")));
  assert(errors.some((error) => error.includes("unsupported type")));
  assert(errors.some((error) => error.includes("unknown manyTable")));
});

test("parses labeled and bare access-token output without retaining labels", () => {
  const token = "eyJheader.payload.signature";
  assert.equal(
    parseAccessToken([
      "Connected as maker@example.com",
      "Resource: https://api.powerplatform.com/",
      `Token: ${token}`
    ].join("\n")),
    token
  );
  assert.equal(parseAccessToken(`Bearer ${token}`), token);
  assert.equal(parseAccessToken(token), token);
  assert.throws(() => parseAccessToken("Token unavailable"), /recognizable access token/);
});

test("applies a clean plan in dependency order and journals every write", async () => {
  const plan = buildPlan(validSpec());
  const calls = [];
  const client = {
    findPublisher: async () => null,
    createPublisher: async () => {
      calls.push("createPublisher");
      return "11111111-1111-4111-8111-111111111111";
    },
    findSolution: async () => null,
    createSolution: async () => calls.push("createSolution"),
    findTable: async (name) => {
      calls.push(`findTable:${name}`);
      return null;
    },
    createTable: async (table) => {
      calls.push(`createTable:${table.logicalName}`);
      return `id-${table.logicalName}`;
    },
    createColumn: async (table, column) => calls.push(`createColumn:${table}.${column.logicalName}`),
    findRelationship: async () => null,
    createRelationship: async (relationship) => calls.push(`createRelationship:${relationship.schemaName}`),
    publish: async () => calls.push("publish")
  };

  const journal = await applyPlan(plan, client);

  assert.deepEqual(calls, [
    "createPublisher",
    "createSolution",
    "findTable:shop_Category",
    "createTable:shop_category",
    "createColumn:shop_category.shop_slug",
    "findTable:shop_Product",
    "createTable:shop_product",
    "createColumn:shop_product.shop_price",
    "createColumn:shop_product.shop_status",
    "createRelationship:shop_CategoryProducts",
    "publish"
  ]);
  assert.equal(journal.completed.at(-1), "publish");
  assert.deepEqual(journal.retries, []);
});

test("retries transient metadata propagation failures and journals attempts", async () => {
  const plan = buildPlan(validSpec());
  const attempts = new Map();
  const delays = [];
  const client = {
    findPublisher: async () => null,
    createPublisher: async () => "11111111-1111-4111-8111-111111111111",
    findSolution: async () => null,
    createSolution: async () => {},
    findTable: async () => null,
    createTable: async (table) => `id-${table.logicalName}`,
    findColumn: async () => null,
    createColumn: async (table, column) => {
      const key = `${table}.${column.logicalName}`;
      const attempt = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, attempt);
      if (attempt === 1) {
        const error = new Error("Unexpected metadata error");
        error.status = 400;
        error.details = '{"error":{"code":"0x80040216"}}';
        throw error;
      }
    },
    findRelationship: async () => null,
    createRelationship: async () => {},
    publish: async () => {}
  };

  const journal = await applyPlan(plan, client, {
    sleep: async (delayMs) => delays.push(delayMs)
  });

  assert.equal(journal.retries.length, 3);
  assert.deepEqual(delays, [5000, 5000, 5000]);
  assert(journal.retries.every((retry) => retry.attempt === 1));
  assert.equal(attempts.get("shop_category.shop_slug"), 2);
  assert.equal(attempts.get("shop_product.shop_price"), 2);
  assert.equal(attempts.get("shop_product.shop_status"), 2);
});

test("recognizes only bounded transient metadata failures", () => {
  const permanent = new Error("Bad request");
  permanent.status = 400;
  permanent.details = '{"error":{"code":"0x80048d19"}}';
  assert.equal(isTransientMetadataError(permanent), false);

  const propagation = new Error("Unexpected metadata error");
  propagation.status = 400;
  propagation.details = '{"error":{"code":"0x80040216"}}';
  assert.equal(isTransientMetadataError(propagation), true);

  const throttled = new Error("Too many requests");
  throttled.status = 429;
  assert.equal(isTransientMetadataError(throttled), true);
});

test("fails closed when a target table already exists", async () => {
  const plan = buildPlan(validSpec());
  const client = {
    findPublisher: async () => ({
      publisherid: "publisher",
      customizationprefix: "shop",
      customizationoptionvalueprefix: 10000
    }),
    findSolution: async () => ({
      version: "1.0.0.0",
      _publisherid_value: "publisher"
    }),
    findTable: async () => ({ MetadataId: "existing" })
  };

  await assert.rejects(
    async () => {
      try {
        await applyPlan(plan, client);
      } catch (error) {
        assert.deepEqual(error.journal.completed, [
          "publisher:ShoppingPublisher:existing",
          "solution:ShoppingTemplate:existing"
        ]);
        throw error;
      }
    },
    /clean-environment apply/
  );
});

test("rejects an existing solution owned by another publisher", async () => {
  const plan = buildPlan(validSpec());
  const client = {
    findPublisher: async () => ({
      publisherid: "11111111-1111-4111-8111-111111111111",
      customizationprefix: "shop",
      customizationoptionvalueprefix: 10000
    }),
    findSolution: async () => ({
      version: "1.0.0.0",
      _publisherid_value: "22222222-2222-4222-8222-222222222222"
    })
  };

  await assert.rejects(() => applyPlan(plan, client), /different publisher/);
});

test("exports and unpacks authoritative unmanaged solution metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dataverse-export-"));
  const familyRoot = path.join(root, "family");
  const plan = buildPlan(validSpec());
  const calls = [];
  const pacRunner = (args) => {
    calls.push(args);
    if (args[1] === "export") {
      fs.writeFileSync(args[args.indexOf("--path") + 1], "zip");
    }
    if (args[1] === "unpack") {
      const folder = args[args.indexOf("--folder") + 1];
      fs.mkdirSync(path.join(folder, "Other"), { recursive: true });
      fs.writeFileSync(
        path.join(folder, "Other", "Solution.xml"),
        "<ImportExportXml><SolutionManifest><UniqueName>ShoppingTemplate</UniqueName><Managed>0</Managed></SolutionManifest></ImportExportXml>"
      );
    }
  };

  const folder = exportAndUnpack({
    plan,
    environmentUrl: "https://example.crm.dynamics.com",
    familyRoot,
    pacRunner
  });

  assert.equal(folder, path.join(familyRoot, "solutions", "ShoppingTemplate"));
  assert.equal(calls[0][1], "export");
  assert.equal(calls[1][1], "unpack");
  assert(fs.existsSync(path.join(folder, "Other", "Solution.xml")));
});
