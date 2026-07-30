"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
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

test("reports managed solution zips and can enforce unmanaged-only policy", () => {
  const root = createTemplateRoot({
    solutionXml: "<ImportExportXml><SolutionManifest><Managed>1</Managed></SolutionManifest></ImportExportXml>"
  });

  const warningResult = validateTemplates({ root });
  assert.deepEqual(warningResult.errors, []);
  assert.equal(warningResult.warnings.length, 1);
  assert.match(warningResult.warnings[0], /solution is managed/);

  const enforcedResult = validateTemplates({ root, enforceUnmanaged: true });
  assert.equal(enforcedResult.errors.length, 1);
  assert.match(enforcedResult.errors[0], /solution is managed/);
});

test("rejects invalid ids and folder mismatches", () => {
  const root = createTemplateRoot({
    id: "Bad_Id",
    folderId: "different-folder",
    solutionPath: "spa/different-folder/variants/react/solution/template.zip",
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

test("rejects missing solution.xml, Git LFS pointers, non-PNG previews, and malformed seed data", () => {
  const root = createTemplateRoot({
    solutionXml: null,
    previewImages: ["spa/test-template/previews/home.jpg"],
    seedDataPath: "spa/test-template/seed-data/accounts.json",
    seedData: {
      entitySetName: "accounts"
    }
  });

  fs.writeFileSync(path.join(root, "spa/test-template/previews/home.jpg"), "jpg");
  const result = validateTemplates({ root });
  assert(result.errors.some((error) => error.includes("must contain solution.xml")));
  assert(result.errors.some((error) => error.includes("preview image must be a .png")));
  assert(result.errors.some((error) => error.includes("seed data records must be an array")));

  const lfsRoot = createTemplateRoot({
    solutionXml: "<ImportExportXml><SolutionManifest><Managed>0</Managed></SolutionManifest></ImportExportXml>"
  });
  fs.writeFileSync(
    path.join(lfsRoot, "spa/test-template/variants/react/solution/template.zip"),
    "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 123\n"
  );

  const lfsResult = validateTemplates({ root: lfsRoot });
  assert(lfsResult.errors.some((error) => error.includes("Git LFS pointer")));
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
    solutionPath: "spa/test-template/solution/template.zip",
    variantOverrides: {
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
  assert(result.errors.some((error) => error.includes("variant \"react\" solutionPath must live in spa/test-template/variants/react/solution/")));
  assert(result.errors.some((error) => error.includes("variant \"react\" previewImages[0] must live in spa/test-template/variants/react/previews/")));
  assert(result.errors.some((error) => error.includes("variant \"react\" seedDataPath must live in spa/test-template/variants/react/seed-data/")));
});

function createTemplateRoot(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "template-validation-"));
  const id = options.id ?? "test-template";
  const folderId = options.folderId ?? id;
  const framework = options.framework ?? "react";
  const solutionPath = options.solutionPath ?? `spa/${folderId}/variants/${framework}/solution/template.zip`;
  const templateFolder = path.join(root, "spa", folderId);
  fs.mkdirSync(path.join(root, "schemas"), { recursive: true });
  fs.mkdirSync(path.join(root, "traditional"), { recursive: true });
  fs.mkdirSync(path.join(templateFolder, "variants", framework, "solution"), { recursive: true });
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
        ...(options.variantOverrides ?? {})
      }
    },
    ...(options.familyExtras ?? {})
  };

  if (Object.hasOwn(options, "requiredDataverseLanguages") && options.requiredDataverseLanguages === undefined) {
    delete template.requiredDataverseLanguages;
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
  fs.mkdirSync(path.dirname(path.join(root, solutionPath)), { recursive: true });
  writeZip(path.join(root, solutionPath), options.solutionXml === undefined ? defaultSolutionXml() : options.solutionXml);
  return root;
}

function defaultSolutionXml() {
  return "<ImportExportXml><SolutionManifest><Managed>0</Managed></SolutionManifest></ImportExportXml>";
}

function writeZip(zipPath, solutionXml) {
  const entries = [];
  if (solutionXml !== null) {
    entries.push({
      name: "solution.xml",
      data: Buffer.from(solutionXml, "utf8")
    });
  } else {
    entries.push({
      name: "customizations.xml",
      data: Buffer.from("<customizations />", "utf8")
    });
  }

  fs.writeFileSync(zipPath, createZip(entries));
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = zlib.deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
