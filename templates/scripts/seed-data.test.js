"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  applySeedPlan,
  assertApprovedPlan,
  bindReference,
  loadSeed,
  planSeedImport
} = require("./seed-data");

function seedFixture() {
  return {
    schemaVersion: 1,
    tables: {
      categories: {
        logicalName: "shop_category",
        entitySet: "shop_categories",
        idColumn: "shop_categoryid",
        records: [{
          shop_categoryid: "10000000-0000-4000-8000-000000000001",
          shop_name: "Home"
        }]
      },
      products: {
        logicalName: "shop_product",
        entitySet: "shop_products",
        idColumn: "shop_productid",
        records: [{
          shop_productid: "20000000-0000-4000-8000-000000000001",
          "shop_CategoryId@odata.bind": "/shop_categories(10000000-0000-4000-8000-000000000001)",
          shop_name: "Basket",
          shop_price: 25,
          shop_featured: 1
        }]
      }
    }
  };
}

function metadataClient() {
  return {
    whoAmI: async () => ({ UserId: "user" }),
    request: async (method, relativePath, options) => {
      if (relativePath.startsWith("EntityDefinitions(LogicalName='shop_category')?")) {
        return {
          LogicalName: "shop_category",
          EntitySetName: "shop_categories",
          PrimaryIdAttribute: "shop_categoryid",
          Attributes: [
            { LogicalName: "shop_categoryid", AttributeType: "Uniqueidentifier" },
            { LogicalName: "shop_name", AttributeType: "String" }
          ]
        };
      }
      if (relativePath.startsWith("EntityDefinitions(LogicalName='shop_product')?")) {
        return {
          LogicalName: "shop_product",
          EntitySetName: "shop_products",
          PrimaryIdAttribute: "shop_productid",
          Attributes: [
            { LogicalName: "shop_productid", AttributeType: "Uniqueidentifier" },
            { LogicalName: "shop_name", AttributeType: "String" },
            { LogicalName: "shop_price", AttributeType: "Money" },
            { LogicalName: "shop_featured", AttributeType: "Boolean" }
          ]
        };
      }
      if (relativePath.includes("shop_category')/ManyToOneRelationships")) {
        return { value: [] };
      }
      if (relativePath.includes("shop_product')/ManyToOneRelationships")) {
        return {
          value: [
            {
              ReferencedEntity: "shop_category",
              ReferencingAttribute: "shop_categoryid",
              ReferencingEntityNavigationPropertyName: "shop_CategoryId"
            },
            {
              ReferencedEntity: "transactioncurrency",
              ReferencingAttribute: "transactioncurrencyid",
              ReferencingEntityNavigationPropertyName: "transactioncurrencyid"
            }
          ]
        };
      }
      if (relativePath.startsWith("transactioncurrencies?")) {
        return {
          value: [{
            transactioncurrencyid: "30000000-0000-4000-8000-000000000001",
            isocurrencycode: "USD",
            currencyname: "US Dollar",
            statecode: 0
          }]
        };
      }
      if (method === "PATCH") {
        return { entityId: "record" };
      }
      if (relativePath.startsWith("shop_categories(")) {
        return {
          shop_categoryid: "10000000-0000-4000-8000-000000000001",
          shop_name: "Home"
        };
      }
      if (relativePath.startsWith("shop_products(")) {
        assert.equal(options, undefined);
        return {
          shop_productid: "20000000-0000-4000-8000-000000000001",
          shop_name: "Basket",
          shop_price: 25,
          shop_featured: true,
          _shop_categoryid_value: "10000000-0000-4000-8000-000000000001",
          _transactioncurrencyid_value: "30000000-0000-4000-8000-000000000001"
        };
      }
      throw new Error(`Unexpected request ${method} ${relativePath}`);
    }
  };
}

test("requires an explicit active currency for money seed records", async () => {
  const inspection = await planSeedImport({
    seed: seedFixture(),
    environmentUrl: "https://example.crm.dynamics.com",
    client: metadataClient()
  });

  assert.equal(inspection.readyForApproval, false);
  assert.equal(inspection.requiresCurrencySelection, true);
  assert.deepEqual(inspection.currencies.map((currency) => currency.code), ["USD"]);
});

test("builds an environment-bound metadata-verified seed plan", async () => {
  const plan = await planSeedImport({
    seed: seedFixture(),
    environmentUrl: "https://example.crm.dynamics.com",
    currencyCode: "USD",
    client: metadataClient()
  });

  assert.equal(plan.readyForApproval, true);
  assert.match(plan.approvalHash, /^[a-f0-9]{64}$/);
  assert.equal(plan.counts.records, 2);
  assert.equal(plan.tables[1].records[0].payload.shop_featured, true);
  assert.equal(
    plan.tables[1].records[0].payload["transactioncurrencyid@odata.bind"],
    "/transactioncurrencies(30000000-0000-4000-8000-000000000001)"
  );
  assert.doesNotThrow(() => assertApprovedPlan(plan, plan.approvalHash));

  const tampered = structuredClone(plan);
  tampered.tables[0].records[0].payload.shop_name = "Tampered";
  assert.throws(() => assertApprovedPlan(tampered, tampered.approvalHash), /contents/);
});

test("upserts and verifies each planned seed record in order", async () => {
  const client = metadataClient();
  const plan = await planSeedImport({
    seed: seedFixture(),
    environmentUrl: "https://example.crm.dynamics.com",
    currencyCode: "USD",
    client
  });
  const progress = [];
  const summary = await applySeedPlan(plan, client, (state) =>
    progress.push({ upserted: state.upserted, verified: state.verified })
  );

  assert.equal(summary.upserted, 2);
  assert.equal(summary.verified, 2);
  assert.equal(summary.failed, 0);
  assert.deepEqual(progress.at(-1), { upserted: 2, verified: 2 });
});

test("rejects unsupported files, malformed lookups, and invalid booleans", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "seed-import-"));
  const filePath = path.join(root, "data.json");
  fs.writeFileSync(filePath, JSON.stringify({
    schemaVersion: 1,
    tables: { values: { logicalName: "x", entitySet: "xs", idColumn: "xid", records: [] } },
    fileExports: [{ path: "files/a.pdf" }]
  }));
  assert.throws(() => loadSeed(filePath), /fileExports/);
  assert.throws(() => bindReference("categories/not-a-guid"), /Lookup binding/);
});
