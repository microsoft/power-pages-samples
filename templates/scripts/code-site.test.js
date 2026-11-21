"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  assertApprovedPlan,
  assertApprovedUpdatePlan,
  createInactiveSite,
  inspectInactiveSite,
  parseSiteList,
  planInactiveSite,
  planInactiveSiteUpdate,
  updateInactiveSite
} = require("./code-site");

function sourceFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "code-site-"));
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.writeFileSync(path.join(root, "dist", "index.html"), "<html></html>");
  fs.writeFileSync(path.join(root, "package.json"), "{}");
  fs.writeFileSync(path.join(root, ".npmrc"), "omit-lockfile-registry-resolved=true\n");
  fs.writeFileSync(path.join(root, "powerpages.config.json"), JSON.stringify({
    siteName: "Fixture",
    compiledPath: "dist",
    defaultLandingPage: "index.html"
  }));
  return root;
}

function addSiteIdentity(root, websiteId = "2288262c-1753-4f25-b699-d135184b42bd") {
  const siteDirectory = path.join(root, ".powerpages-site");
  fs.mkdirSync(siteDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(siteDirectory, "website.yml"),
    `id: ${websiteId}\nname: Template Source\n`
  );
  return websiteId;
}

test("builds a source-bound inactive code-site plan", () => {
  const root = sourceFixture();
  const first = planInactiveSite({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com/",
    siteName: "Template Source"
  });
  const second = planInactiveSite({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com",
    siteName: "Template Source"
  });

  assert.deepEqual(first, second);
  assert.match(first.approvalHash, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => assertApprovedPlan(first, first.approvalHash));
  fs.writeFileSync(path.join(root, "src.ts"), "changed");
  assert.notEqual(
    planInactiveSite({
      rootPath: root,
      environmentUrl: "https://example.crm.dynamics.com",
      siteName: "Template Source"
    }).sourceDigest,
    first.sourceDigest
  );
});

test("creates and verifies an inactive site with PAC-owned metadata", () => {
  const root = sourceFixture();
  const plan = planInactiveSite({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com",
    siteName: "Template Source"
  });
  const websiteId = "2288262c-1753-4f25-b699-d135184b42bd";
  const calls = [];
  const pacRunner = (args) => {
    calls.push(args);
    if (args[0] === "pages" && args[1] === "upload-code-site") {
      const siteDirectory = path.join(root, ".powerpages-site");
      fs.mkdirSync(siteDirectory, { recursive: true });
      fs.writeFileSync(
        path.join(siteDirectory, "website.yml"),
        `id: ${websiteId}\nname: Template Source\n`
      );
      return "Upload complete";
    }
    if (args[0] === "pages" && args[1] === "list") {
      return `[1] ${websiteId} N/A Template Source N/A N/A Yes No`;
    }
    return "ok";
  };

  const result = createInactiveSite({
    plan,
    approvedHash: plan.approvalHash,
    pacRunner
  });

  assert.equal(result.websiteRecordId, websiteId);
  assert.equal(result.isActive, false);
  assert.equal(calls[0][0], "env");
  assert.equal(calls[1][1], "upload-code-site");
});

test("rejects active sites, stale source, and duplicate initialization", () => {
  const root = sourceFixture();
  const plan = planInactiveSite({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com",
    siteName: "Template Source"
  });
  fs.writeFileSync(path.join(root, "changed.txt"), "changed");
  assert.throws(
    () => createInactiveSite({ plan, approvedHash: plan.approvalHash, pacRunner: () => "" }),
    /changed after approval/
  );

  const siteDirectory = path.join(root, ".powerpages-site");
  fs.mkdirSync(siteDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(siteDirectory, "website.yml"),
    "id: 2288262c-1753-4f25-b699-d135184b42bd\nname: Template Source\n"
  );
  assert.throws(
    () => inspectInactiveSite({
      rootPath: root,
      environmentUrl: "https://example.crm.dynamics.com",
      pacRunner: () =>
        "[1] 2288262c-1753-4f25-b699-d135184b42bd portal Template https://site.example Enhanced Yes Yes"
    }),
    /active/
  );
  assert.throws(
    () => planInactiveSite({
      rootPath: root,
      environmentUrl: "https://example.crm.dynamics.com",
      siteName: "Another"
    }),
    /second create/
  );
});

test("parses PAC inactive site state", () => {
  const id = "2288262c-1753-4f25-b699-d135184b42bd";
  assert.equal(parseSiteList(`[1] ${id} N/A Source N/A N/A Yes No`, id).isActive, false);
  assert.equal(
    parseSiteList(`[1] ${id} portal Source https://site.example Enhanced Yes Yes`, id).isActive,
    true
  );
});

test("builds a source-and-identity-bound inactive code-site update plan", () => {
  const root = sourceFixture();
  const websiteId = addSiteIdentity(root);
  const first = planInactiveSiteUpdate({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com/"
  });
  const second = planInactiveSiteUpdate({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com"
  });

  assert.deepEqual(first, second);
  assert.equal(first.websiteRecordId, websiteId);
  assert.equal(first.siteName, "Template Source");
  assert.match(first.approvalHash, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => assertApprovedUpdatePlan(first, first.approvalHash));
});

test("updates only the approved inactive code-site identity", () => {
  const root = sourceFixture();
  const websiteId = addSiteIdentity(root);
  const plan = planInactiveSiteUpdate({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com"
  });
  const calls = [];
  const pacRunner = (args) => {
    calls.push(args);
    if (args[0] === "pages" && args[1] === "list") {
      return `[1] ${websiteId} N/A Template Source N/A N/A Yes No`;
    }
    return "ok";
  };

  const result = updateInactiveSite({
    plan,
    approvedHash: plan.approvalHash,
    pacRunner
  });

  assert.equal(result.websiteRecordId, websiteId);
  assert.equal(result.sourceDigest, plan.sourceDigest);
  assert.deepEqual(calls[0], ["env", "select", "--environment", plan.environmentUrl]);
  assert.deepEqual(calls[2], ["pages", "upload-code-site", "--rootPath", root]);
  assert.equal(calls.filter((args) => args[1] === "list").length, 2);
});

test("rejects stale, active, public, and identity-drifted code-site updates", () => {
  const root = sourceFixture();
  const websiteId = addSiteIdentity(root);
  const plan = planInactiveSiteUpdate({
    rootPath: root,
    environmentUrl: "https://example.crm.dynamics.com"
  });
  fs.writeFileSync(path.join(root, "changed.txt"), "changed");
  assert.throws(
    () => updateInactiveSite({ plan, approvedHash: plan.approvalHash, pacRunner: () => "" }),
    /changed after update approval/
  );

  fs.rmSync(path.join(root, "changed.txt"));
  fs.writeFileSync(
    path.join(root, ".powerpages-site", "website.yml"),
    "id: 0f4b7df1-8e2f-4d98-8cbf-c4253873b71d\nname: Template Source\n"
  );
  assert.throws(
    () => updateInactiveSite({ plan, approvedHash: plan.approvalHash, pacRunner: () => "" }),
    /identity changed/
  );

  fs.writeFileSync(
    path.join(root, ".powerpages-site", "website.yml"),
    `id: ${websiteId}\nname: Template Source\n`
  );
  const activeRunner = (args) =>
    args[0] === "pages" && args[1] === "list"
      ? `[1] ${websiteId} portal Template Source https://site.example Enhanced Yes Yes`
      : "ok";
  assert.throws(
    () => updateInactiveSite({ plan, approvedHash: plan.approvalHash, pacRunner: activeRunner }),
    /must remain inactive/
  );
});
