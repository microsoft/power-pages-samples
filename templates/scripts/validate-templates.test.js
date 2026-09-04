"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const { validateTemplates } = require("./validate-templates");

test("accepts a valid unmanaged template family fixture", () => {
  const root = createTemplateRoot({
    solutionXml: "<ImportExportXml><SolutionManifest><Managed>0</Managed></SolutionManifest></ImportExportXml>",
    previewImages: ["spa/test-template/previews/home.png"],
    seedDataPath: "spa/test-template/seed-data/accounts.json",
    seedData: {
      entitySetName: "accounts",
      records: [
        {
          name: "Contoso"
        }
      ]
    }
  });

  fs.writeFileSync(path.join(root, "spa/test-template/previews/home.png"), "png");

  const result = validateTemplates({ root });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("requires each SPA variant to reference its spa-code project", () => {
  const root = createTemplateRoot({
    spaCodePath: undefined
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("$.templates[0].variants.react.spaCodePath is required")));
});

test("accepts variant-specific overrides when they are needed", () => {
  const root = createTemplateRoot({
    variantOverrides: {
      previewImages: ["spa/test-template/variants/react/previews/home-react.png"],
      seedDataPath: "spa/test-template/variants/react/seed-data/accounts.json",
      requiredDataverseLanguages: [1033, 1036]
    },
    variantSeedData: {
      entitySetName: "accounts",
      records: [
        {
          name: "Contoso React"
        }
      ]
    }
  });

  fs.mkdirSync(path.join(root, "spa/test-template/variants/react/previews"), { recursive: true });
  fs.mkdirSync(path.join(root, "spa/test-template/variants/react/seed-data"), { recursive: true });
  fs.writeFileSync(path.join(root, "spa/test-template/variants/react/previews/home-react.png"), "png");

  const result = validateTemplates({ root });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("rejects flat template package fields at the family level", () => {
  const root = createTemplateRoot({
    familyExtras: {
      framework: "react",
      solutionPath: "spa/test-template/solution/template.zip",
      templateVersion: "1.0.0"
    }
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("$.templates[0].framework is not allowed")));
  assert(result.errors.some((error) => error.includes("$.templates[0].solutionPath is not allowed")));
  assert(result.errors.some((error) => error.includes("$.templates[0].templateVersion is not allowed")));
});

test("rejects managed unpacked solutions", () => {
  const root = createTemplateRoot({
    solutionXml: "<ImportExportXml><SolutionManifest><Managed>1</Managed></SolutionManifest></ImportExportXml>"
  });

  const result = validateTemplates({ root });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /solution is managed/);
  assert.deepEqual(result.warnings, []);
});

test("rejects unpacked solutions without authoritative managed metadata", () => {
  const root = createTemplateRoot({
    solutionXml: "<ImportExportXml><SolutionManifest /></ImportExportXml>"
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) =>
    error.includes("Other/Solution.xml does not contain a readable <Managed> value")
  ));
});

test("rejects supporting solutions that contain Power Pages website components", () => {
  const root = createTemplateRoot({
    solutionHasWebsiteComponent: true
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("supporting solution must not contain Power Pages website components")));
});

test("rejects invalid ids and folder mismatches", () => {
  const root = createTemplateRoot({
    id: "Bad_Id",
    folderId: "different-folder",
    solutionPath: "spa/different-folder/variants/react/solution",
    solutionXml: "<ImportExportXml><SolutionManifest><Managed>0</Managed></SolutionManifest></ImportExportXml>"
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("does not match")));
  assert(result.errors.some((error) => error.includes("must live in spa/Bad_Id")));
});

test("rejects missing or invalid required Dataverse languages", () => {
  const missingRoot = createTemplateRoot({
    requiredDataverseLanguages: undefined
  });

  const missingResult = validateTemplates({ root: missingRoot });
  assert(missingResult.errors.some((error) => error.includes("$.templates[0].requiredDataverseLanguages is required")));

  const invalidRoot = createTemplateRoot({
    requiredDataverseLanguages: [1033, "1036"]
  });

  const invalidResult = validateTemplates({ root: invalidRoot });
  assert(invalidResult.errors.some((error) => error.includes("$.templates[0].requiredDataverseLanguages[1] must be integer")));

  const nonPositiveRoot = createTemplateRoot({
    requiredDataverseLanguages: [0]
  });

  const nonPositiveResult = validateTemplates({ root: nonPositiveRoot });
  assert(nonPositiveResult.errors.some((error) => error.includes("$.templates[0].requiredDataverseLanguages[0] must be greater than or equal to 1")));
});

test("rejects missing unpacked solution roots, non-PNG previews, and malformed seed data", () => {
  const root = createTemplateRoot({
    solutionXml: null,
    customizationsXml: null,
    previewImages: ["spa/test-template/previews/home.jpg"],
    seedDataPath: "spa/test-template/seed-data/accounts.json",
    seedData: {
      entitySetName: "accounts"
    }
  });

  fs.writeFileSync(path.join(root, "spa/test-template/previews/home.jpg"), "jpg");
  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("must contain Other/Solution.xml")));
  assert(result.errors.some((error) => error.includes("must contain Other/Customizations.xml")));
  assert(result.errors.some((error) => error.includes("preview image must be a .png")));
  assert(result.errors.some((error) => error.includes("seed data records must be an array")));
});


test("accepts seed data records with file attachments inside the seed data folder", () => {
  const root = createTemplateRoot({
    seedDataPath: "spa/test-template/seed-data/accounts.json",
    seedData: {
      entitySetName: "accounts",
      records: [
        {
          name: "Contoso",
          fileAttachments: [
            {
              columnName: "sample_contract",
              filePath: "files/contract.pdf",
              fileName: "contract.pdf",
              mimeType: "application/pdf"
            }
          ]
        }
      ]
    }
  });

  fs.mkdirSync(path.join(root, "spa/test-template/seed-data/files"), { recursive: true });
  fs.writeFileSync(path.join(root, "spa/test-template/seed-data/files/contract.pdf"), "pdf");

  const result = validateTemplates({ root });
  assert.deepEqual(result.errors, []);
});

test("rejects malformed seed data file attachments", () => {
  const root = createTemplateRoot({
    seedDataPath: "spa/test-template/seed-data/accounts.json",
    seedData: {
      entitySetName: "accounts",
      records: [
        {
          name: "Contoso",
          fileAttachments: [
            {
              columnName: "sample_contract",
              filePath: "../outside.pdf"
            },
            {
              columnName: "sample_contract",
              filePath: path.resolve("absolute.pdf")
            },
            {
              columnName: "",
              filePath: "files/missing.pdf",
              mimeType: ""
            }
          ]
        }
      ]
    }
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("record[0].fileAttachments[0] filePath must stay inside")));
  assert(result.errors.some((error) => error.includes("record[0].fileAttachments[1] filePath must be relative")));
  assert(result.errors.some((error) => error.includes("record[0].fileAttachments[2] file does not exist")));
  assert(result.errors.some((error) => error.includes("record[0].fileAttachments[2] columnName must be a non-empty string")));
  assert(result.errors.some((error) => error.includes("record[0].fileAttachments[2] mimeType must be a non-empty string")));

  const cliResult = spawnSync(process.execPath, [path.join(__dirname, "validate-templates.js"), "--root", root], {
    encoding: "utf8"
  });
  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /filePath must be relative/);
});

test("accepts Dataverse export seed data with fileExports", () => {
  const root = createTemplateRoot({
    seedDataPath: "spa/test-template/seed-data/data.json",
    seedData: {
      schemaVersion: 1,
      tables: {
        accounts: {
          logicalName: "account",
          entitySet: "accounts",
          idColumn: "accountid",
          records: [
            {
              accountid: "00000000-0000-0000-0000-000000000001",
              name: "Contoso"
            }
          ]
        }
      },
      fileExports: [
        {
          attachmentId: "00000000-0000-0000-0000-000000000002",
          fileColumn: "sample_file",
          fileName: "contract.pdf",
          contentType: "application/pdf",
          size: 3,
          path: "files/contract.pdf"
        }
      ]
    }
  });

  fs.mkdirSync(path.join(root, "spa/test-template/seed-data/files"), { recursive: true });
  fs.writeFileSync(path.join(root, "spa/test-template/seed-data/files/contract.pdf"), "pdf");

  const result = validateTemplates({ root });
  assert.deepEqual(result.errors, []);
});

test("rejects malformed Dataverse export seed data fileExports", () => {
  const root = createTemplateRoot({
    seedDataPath: "spa/test-template/seed-data/data.json",
    seedData: {
      schemaVersion: 1,
      tables: {
        accounts: {
          logicalName: "account",
          entitySet: "accounts",
          idColumn: "accountid",
          records: []
        },
        badTable: {
          logicalName: "",
          entitySet: "",
          records: {}
        }
      },
      fileExports: [
        {
          attachmentId: "00000000-0000-0000-0000-000000000002",
          fileColumn: "sample_file",
          fileName: "contract.pdf",
          contentType: "application/pdf",
          size: 3,
          path: "../contract.pdf"
        },
        {
          attachmentId: "",
          fileColumn: "",
          fileName: "",
          path: path.resolve("absolute.pdf")
        },
        {
          attachmentId: "00000000-0000-0000-0000-000000000003",
          fileColumn: "sample_file",
          fileName: "missing.pdf",
          path: "files/missing.pdf"
        }
      ]
    }
  });

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("table badTable logicalName must be a non-empty string")));
  assert(result.errors.some((error) => error.includes("table badTable records must be an array")));
  assert(result.errors.some((error) => error.includes("fileExports[0] path must stay inside")));
  assert(result.errors.some((error) => error.includes("fileExports[1] path must be relative")));
  assert(result.errors.some((error) => error.includes("fileExports[1] attachmentId must be a non-empty string")));
  assert(result.errors.some((error) => error.includes("fileExports[2] file does not exist")));
});

test("rejects variant package paths outside their framework layout", () => {
  const root = createTemplateRoot({
    solutionPath: "spa/test-template/solution",
    variantOverrides: {
      spaCodePath: "spa/test-template/spa-code",
      previewImages: ["spa/test-template/previews/react-home.png"],
      seedDataPath: "spa/test-template/seed-data/react-accounts.json"
    },
    variantSeedData: {
      entitySetName: "accounts",
      records: []
    }
  });

  fs.writeFileSync(path.join(root, "spa/test-template/previews/react-home.png"), "png");

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("variant \"react\" solutionPath must be spa/test-template/variants/react/solution")));
  assert(result.errors.some((error) => error.includes("variant \"react\" spaCodePath must be spa/test-template/variants/react/spa-code")));
  assert(result.errors.some((error) => error.includes("variant \"react\" previewImages[0] must live in spa/test-template/variants/react/previews/")));
  assert(result.errors.some((error) => error.includes("variant \"react\" seedDataPath must live in spa/test-template/variants/react/seed-data/")));
});

test("requires solutionPath to reference the exact unpacked solution directory", () => {
  const zipRoot = createTemplateRoot({
    solutionPath: "spa/test-template/variants/react/solution/template.zip"
  });
  const zipResult = validateTemplates({ root: zipRoot });
  assert(zipResult.errors.some((error) => error.includes("$.templates[0].variants.react.solutionPath does not match")));
  assert(zipResult.errors.some((error) =>
    error.includes("variant \"react\" solutionPath must be spa/test-template/variants/react/solution")
  ));

  const redundantRoot = createTemplateRoot({
    solutionPath: "spa/test-template/variants/react/../react/solution"
  });
  const redundantResult = validateTemplates({ root: redundantRoot });
  assert(redundantResult.errors.some((error) =>
    error.includes("variant \"react\" solutionPath must be spa/test-template/variants/react/solution")
  ));

  const fileRoot = createTemplateRoot();
  const fileSolutionPath = path.join(fileRoot, "spa/test-template/variants/react/solution");
  fs.rmSync(fileSolutionPath, { recursive: true });
  fs.writeFileSync(fileSolutionPath, "not a directory");
  const fileResult = validateTemplates({ root: fileRoot });
  assert(fileResult.errors.some((error) => error.includes("solutionPath does not exist or is not a directory")));

  const nestedRoot = createTemplateRoot();
  const solutionRoot = path.join(nestedRoot, "spa/test-template/variants/react/solution");
  fs.mkdirSync(path.join(solutionRoot, "unpacked"), { recursive: true });
  fs.renameSync(path.join(solutionRoot, "Other"), path.join(solutionRoot, "unpacked/Other"));

  const nestedResult = validateTemplates({ root: nestedRoot });
  assert(nestedResult.errors.some((error) => error.includes("must contain Other/Solution.xml")));
  assert(nestedResult.errors.some((error) => error.includes("must contain Other/Customizations.xml")));
});

test("rejects committed solution zips anywhere in a variant", () => {
  const root = createTemplateRoot();
  fs.writeFileSync(
    path.join(root, "spa/test-template/variants/react/template-unmanaged.zip"),
    "not committed"
  );

  const result = validateTemplates({ root });
  assert(result.errors.some((error) =>
    error.includes("variant must not contain committed solution zips: template-unmanaged.zip")
  ));
});

test("rejects symbolic links and generated or local-only solution files", () => {
  const root = createTemplateRoot();
  const solutionRoot = path.join(root, "spa/test-template/variants/react/solution");
  fs.symlinkSync("Other/Solution.xml", path.join(solutionRoot, "solution-link.xml"));
  fs.mkdirSync(path.join(solutionRoot, "obj"), { recursive: true });
  fs.writeFileSync(path.join(solutionRoot, "obj/generated.xml"), "<generated />");
  fs.writeFileSync(path.join(solutionRoot, ".DS_Store"), "local");

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("solution must not contain symbolic links: solution-link.xml")));
  assert(result.errors.some((error) => error.includes("solution contains excluded directory: obj/")));
  assert(result.errors.some((error) => error.includes("solution contains excluded file: .DS_Store")));
});

test("rejects generated and local-only files in spa-code projects", () => {
  const root = createTemplateRoot();
  const spaCodePath = path.join(root, "spa/test-template/variants/react/spa-code");
  fs.mkdirSync(path.join(spaCodePath, "node_modules"), { recursive: true });
  fs.writeFileSync(path.join(spaCodePath, "node_modules/package.json"), "{}");
  fs.writeFileSync(path.join(spaCodePath, "tsconfig.tsbuildinfo"), "state");
  fs.writeFileSync(path.join(spaCodePath, ".env.local"), "SECRET=value");
  fs.writeFileSync(path.join(spaCodePath, ".datamodel-manifest.json"), "{\"environmentUrl\":\"https://source.example\"}");
  fs.writeFileSync(path.join(spaCodePath, "AGENTS.md"), "local instructions");
  fs.mkdirSync(path.join(spaCodePath, ".powerpages-site/.portalconfig"), { recursive: true });
  fs.writeFileSync(
    path.join(spaCodePath, ".powerpages-site/.portalconfig/source.crm.dynamics.com-manifest.yml"),
    "environment: source"
  );

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("excluded directory: node_modules/")));
  assert(result.errors.some((error) => error.includes("excluded file: tsconfig.tsbuildinfo")));
  assert(result.errors.some((error) => error.includes("excluded file: .env.local")));
  assert(result.errors.some((error) => error.includes("excluded file: .datamodel-manifest.json")));
  assert(result.errors.some((error) => error.includes("excluded file: AGENTS.md")));
  assert(result.errors.some((error) => error.includes("excluded file: .powerpages-site/.portalconfig/source.crm.dynamics.com-manifest.yml")));
});

test("rejects wildcard Web API field settings in modular layout", () => {
  const root = createTemplateRoot();
  const sitePath = path.join(root, "spa/test-template/variants/react/spa-code/.powerpages-site");
  const modularSettingsPath = path.join(sitePath, "site-settings");
  fs.mkdirSync(modularSettingsPath, { recursive: true });
  fs.writeFileSync(
    path.join(modularSettingsPath, "Webapi-account-fields.sitesetting.yaml"),
    "name: Webapi/account/fields\nvalue: '*'\n"
  );

  const result = validateTemplates({ root });
  assert(result.errors.some((error) =>
    error.includes("Webapi/account/fields") &&
    error.includes("Webapi-account-fields.sitesetting.yaml")
  ));
});

test("rejects wildcard Web API field settings in aggregate layout", () => {
  const root = createTemplateRoot();
  const profilePath = path.join(
    root,
    "spa/test-template/variants/react/spa-code/.powerpages-site/deployment-profiles/dev"
  );
  fs.mkdirSync(profilePath, { recursive: true });
  fs.writeFileSync(
    path.join(profilePath, "sitesettings.yml"),
    "- adx_name: Webapi/contact/fields\n  adx_value: *\n"
  );

  const result = validateTemplates({ root });
  assert(result.errors.some((error) =>
    error.includes("Webapi/contact/fields") &&
    error.includes("deployment-profiles/dev/sitesettings.yml")
  ));
});

test("allows explicit Web API field settings and unrelated site settings", () => {
  const root = createTemplateRoot();
  const settingsPath = path.join(
    root,
    "spa/test-template/variants/react/spa-code/.powerpages-site/site-settings"
  );
  fs.mkdirSync(settingsPath, { recursive: true });
  fs.writeFileSync(
    path.join(settingsPath, "Webapi-account-fields.sitesetting.yml"),
    "name: Webapi/account/fields\nvalue: accountid,name\n"
  );
  fs.writeFileSync(
    path.join(settingsPath, "Webapi-error-innererror.sitesetting.yml"),
    "name: Webapi/error/innererror\nvalue: true\n"
  );

  const result = validateTemplates({ root });
  assert.deepEqual(result.errors, []);
});

test("rejects SPA source metadata that references excluded or missing files", () => {
  const root = createTemplateRoot();
  const spaCodePath = path.join(root, "spa/test-template/variants/react/spa-code");
  const metadataDirectory = path.join(spaCodePath, ".powerpages-site/source-files");
  fs.mkdirSync(metadataDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(metadataDirectory, "AGENTS.md.sourcefile.yml"),
    "filename: AGENTS.md\npartialurl: AGENTS.md\n"
  );

  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("SPA source metadata references a missing file: AGENTS.md")));
});

function createTemplateRoot(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "template-validation-"));
  const id = options.id ?? "test-template";
  const folderId = options.folderId ?? id;
  const framework = options.framework ?? "react";
  const solutionPath = options.solutionPath ?? `spa/${folderId}/variants/${framework}/solution`;
  const spaCodePath = options.spaCodePath ?? `spa/${folderId}/variants/${framework}/spa-code`;
  const templateFolder = path.join(root, "spa", folderId);
  fs.mkdirSync(path.join(root, "schemas"), { recursive: true });
  fs.mkdirSync(path.join(root, "traditional"), { recursive: true });
  fs.mkdirSync(path.join(templateFolder, "variants", framework, "solution"), { recursive: true });
  fs.mkdirSync(path.join(root, spaCodePath, ".powerpages-site"), { recursive: true });
  fs.mkdirSync(path.join(templateFolder, "previews"), { recursive: true });
  fs.mkdirSync(path.join(templateFolder, "seed-data"), { recursive: true });

  fs.copyFileSync(
    path.join(__dirname, "..", "schemas", "templates-manifest.schema.json"),
    path.join(root, "schemas", "templates-manifest.schema.json")
  );

  const template = {
    id,
    displayName: "Test Template",
    description: "Fixture template for validator tests.",
    kind: "spa",
    keywords: ["test"],
    audience: ["developers"],
    previewImages: options.previewImages ?? [],
    requiredDataverseLanguages: options.requiredDataverseLanguages ?? [1033],
    author: "Test",
    variants: {
      [framework]: {
        templateVersion: "1.0.0",
        solutionPath,
        spaCodePath,
        ...(options.variantOverrides ?? {})
      }
    },
    ...(options.familyExtras ?? {})
  };

  if (Object.hasOwn(options, "requiredDataverseLanguages") && options.requiredDataverseLanguages === undefined) {
    delete template.requiredDataverseLanguages;
  }

  if (Object.hasOwn(options, "spaCodePath") && options.spaCodePath === undefined) {
    delete template.variants[framework].spaCodePath;
  }

  if (options.seedDataPath) {
    template.seedDataPath = options.seedDataPath;
    fs.mkdirSync(path.dirname(path.join(root, options.seedDataPath)), { recursive: true });
    fs.writeFileSync(path.join(root, options.seedDataPath), JSON.stringify(options.seedData ?? {}, null, 2));
  }

  if (options.variantOverrides?.seedDataPath) {
    fs.mkdirSync(path.dirname(path.join(root, options.variantOverrides.seedDataPath)), { recursive: true });
    fs.writeFileSync(
      path.join(root, options.variantOverrides.seedDataPath),
      JSON.stringify(options.variantSeedData ?? {}, null, 2)
    );
  }

  fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify({ templates: [template] }, null, 2));
  if (typeof template.variants[framework].spaCodePath === "string") {
    const fixtureSpaCodePath = path.join(root, template.variants[framework].spaCodePath);
    fs.mkdirSync(path.join(fixtureSpaCodePath, ".powerpages-site"), { recursive: true });
    fs.writeFileSync(path.join(fixtureSpaCodePath, "package.json"), "{}");
    fs.writeFileSync(path.join(fixtureSpaCodePath, "powerpages.config.json"), "{}");
  }
  writeUnpackedSolution(
    path.join(root, solutionPath),
    options.solutionXml === undefined ? defaultSolutionXml() : options.solutionXml,
    options.customizationsXml === undefined ? "<ImportExportXml />" : options.customizationsXml,
    options.solutionHasWebsiteComponent
  );
  return root;
}

function defaultSolutionXml() {
  return "<ImportExportXml><SolutionManifest><Managed>0</Managed></SolutionManifest></ImportExportXml>";
}

function writeUnpackedSolution(solutionPath, solutionXml, customizationsXml, solutionHasWebsiteComponent = false) {
  const otherPath = path.join(solutionPath, "Other");
  fs.mkdirSync(otherPath, { recursive: true });
  if (solutionXml !== null) {
    fs.writeFileSync(path.join(otherPath, "Solution.xml"), solutionXml);
  }

  if (customizationsXml !== null) {
    fs.writeFileSync(path.join(otherPath, "Customizations.xml"), customizationsXml);
  }

  if (solutionHasWebsiteComponent) {
    const websitePath = path.join(solutionPath, "powerpagecomponents", "website");
    fs.mkdirSync(websitePath, { recursive: true });
    fs.writeFileSync(path.join(websitePath, "index.html"), "<html></html>");
  }
}
