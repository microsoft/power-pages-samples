#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const VALID_KINDS = new Set(["spa", "traditional"]);
const VALID_FRAMEWORKS = new Set(["angular", "astro", "react", "vue"]);
const VALID_AUDIENCES = new Set(["admins", "developers", "makers", "partners"]);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_SPA_CODE_DIRECTORIES = new Set([
  ".git",
  ".playwright-mcp",
  ".vite",
  "build",
  "coverage",
  "dataverse-export",
  "dist",
  "dist-ssr",
  "node_modules",
  "playwright-report",
  "test-results"
]);
const FORBIDDEN_SOLUTION_DIRECTORIES = new Set([
  ...FORBIDDEN_SPA_CODE_DIRECTORIES,
  ".idea",
  ".vs",
  "bin",
  "obj"
]);

function validateTemplates(options = {}) {
  const root = path.resolve(options.root ?? path.join(__dirname, ".."));
  const manifestPath = path.join(root, "manifest.json");
  const schemaPath = path.join(root, "schemas", "templates-manifest.schema.json");
  const result = {
    errors: [],
    warnings: []
  };

  const manifest = readJsonFile(manifestPath, "manifest", result);
  const schema = readJsonFile(schemaPath, "JSON Schema", result);
  if (!manifest || !schema) {
    return result;
  }

  validateAgainstSchema(manifest, schema, "$", result);
  if (!Array.isArray(manifest.templates)) {
    return result;
  }

  const ids = new Set();
  const idsByKind = new Map();
  for (const template of manifest.templates) {
    if (!template || typeof template !== "object" || Array.isArray(template)) {
      continue;
    }

    const label = template.id ?? "<missing id>";
    validateId(template, ids, root, result);
    trackIdByKind(template, idsByKind);
    validateEnums(template, label, result);
    validateReferencedPaths(template, label, root, result);
  }

  validateTemplateFolders(root, idsByKind, result);

  return result;
}

function readJsonFile(filePath, label, result) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    result.errors.push(`Could not read ${label} at ${filePath}: ${error.message}`);
    return null;
  }
}

function validateAgainstSchema(value, schema, location, result, rootSchema = schema) {
  if (schema.$ref) {
    const ref = schema.$ref;
    schema = resolveSchemaRef(rootSchema, ref);
    if (!schema) {
      result.errors.push(`${location} references unsupported schema ${ref}.`);
      return;
    }
  }

  if (schema.type && !matchesType(value, schema.type)) {
    result.errors.push(`${location} must be ${schema.type}.`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    result.errors.push(`${location} must be one of: ${schema.enum.join(", ")}.`);
  }

  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) {
      result.errors.push(`${location} must not be empty.`);
    }

    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      result.errors.push(`${location} does not match ${schema.pattern}.`);
    }
  }

  if (typeof value === "number" && Number.isFinite(schema.minimum) && value < schema.minimum) {
    result.errors.push(`${location} must be greater than or equal to ${schema.minimum}.`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      result.errors.push(`${location} must contain at least ${schema.minItems} item(s).`);
    }

    if (schema.uniqueItems && new Set(value).size !== value.length) {
      result.errors.push(`${location} must not contain duplicate values.`);
    }

    if (schema.items) {
      value.forEach((item, index) => validateAgainstSchema(item, schema.items, `${location}[${index}]`, result, rootSchema));
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (schema.minProperties && Object.keys(value).length < schema.minProperties) {
      result.errors.push(`${location} must contain at least ${schema.minProperties} property/properties.`);
    }

    const properties = schema.properties ?? {};
    for (const requiredProperty of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredProperty)) {
        result.errors.push(`${location}.${requiredProperty} is required.`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const propertyName of Object.keys(value)) {
        if (!Object.hasOwn(properties, propertyName)) {
          result.errors.push(`${location}.${propertyName} is not allowed.`);
        }
      }
    }

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, propertyName)) {
        validateAgainstSchema(value[propertyName], propertySchema, `${location}.${propertyName}`, result, rootSchema);
      }
    }
  }
}

function resolveSchemaRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) {
    return null;
  }

  return ref
    .slice(2)
    .split("/")
    .reduce((current, segment) => {
      if (!current || typeof current !== "object") {
        return null;
      }

      const propertyName = segment.replace(/~1/g, "/").replace(/~0/g, "~");
      return current[propertyName] ?? null;
    }, rootSchema);
}

function matchesType(value, expectedType) {
  if (expectedType === "array") {
    return Array.isArray(value);
  }

  if (expectedType === "integer") {
    return Number.isInteger(value);
  }

  if (expectedType === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  return typeof value === expectedType;
}

function validateId(template, ids, root, result) {
  const id = template.id;
  if (typeof id !== "string") {
    return;
  }

  if (!KEBAB_CASE.test(id)) {
    result.errors.push(`Template id "${id}" must be kebab-case.`);
  }

  if (ids.has(id)) {
    result.errors.push(`Template id "${id}" is duplicated.`);
  }
  ids.add(id);

  if (typeof template.kind === "string" && VALID_KINDS.has(template.kind)) {
    const expectedFolder = path.join(root, template.kind, id);
    if (!directoryExists(expectedFolder)) {
      result.errors.push(`Template "${id}" must live in ${template.kind}/${id}.`);
    }
  }
}

function validateEnums(template, label, result) {
  if (typeof template.kind === "string" && !VALID_KINDS.has(template.kind)) {
    result.errors.push(`Template "${label}" has unsupported kind "${template.kind}".`);
  }

  if (Array.isArray(template.audience)) {
    for (const audience of template.audience) {
      if (typeof audience === "string" && !VALID_AUDIENCES.has(audience)) {
        result.errors.push(`Template "${label}" has unsupported audience "${audience}".`);
      }
    }
  }
}

function trackIdByKind(template, idsByKind) {
  if (typeof template.id !== "string" || typeof template.kind !== "string" || !VALID_KINDS.has(template.kind)) {
    return;
  }

  if (!idsByKind.has(template.kind)) {
    idsByKind.set(template.kind, new Set());
  }

  idsByKind.get(template.kind).add(template.id);
}

function validateTemplateFolders(root, idsByKind, result) {
  for (const kind of idsByKind.keys()) {
    const kindRoot = path.join(root, kind);
    if (!directoryExists(kindRoot)) {
      result.errors.push(`templates/${kind}/ must exist.`);
      continue;
    }

    const manifestIds = idsByKind.get(kind) ?? new Set();
    for (const entry of fs.readdirSync(kindRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (!manifestIds.has(entry.name)) {
        result.errors.push(`templates/${kind}/${entry.name}/ is not listed in templates/manifest.json.`);
      }
    }
  }
}

function validateReferencedPaths(template, label, root, result) {
  const familyBase = getFamilyBasePath(template);
  validatePreviewImages(template.previewImages, label, root, `${familyBase}/previews`, "previewImages", result);

  if (typeof template.seedDataPath === "string") {
    validateSeedDataPath(template.seedDataPath, label, root, `${familyBase}/seed-data`, "seedDataPath", result);
  }

  if (!template.variants || typeof template.variants !== "object" || Array.isArray(template.variants)) {
    return;
  }

  for (const [framework, variant] of Object.entries(template.variants)) {
    if (!VALID_FRAMEWORKS.has(framework)) {
      result.errors.push(`Template "${label}" has unsupported framework variant "${framework}".`);
      continue;
    }

    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      continue;
    }

    validateVariantPaths(template, framework, variant, label, root, result);
  }
}

function getFamilyBasePath(template) {
  if (typeof template.kind !== "string" || typeof template.id !== "string") {
    return "";
  }

  return `${template.kind}/${template.id}`;
}

function validateVariantPaths(template, framework, variant, label, root, result) {
  const variantBase = `${getFamilyBasePath(template)}/variants/${framework}`;
  validateSolutionPath(
    variant.solutionPath,
    label,
    root,
    `${variantBase}/solution`,
    variantBase,
    `variant "${framework}" solutionPath`,
    result
  );
  validateSpaCodePath(variant.spaCodePath, label, root, `${variantBase}/spa-code`, `variant "${framework}" spaCodePath`, result);
  validatePreviewImages(variant.previewImages, label, root, `${variantBase}/previews`, `variant "${framework}" previewImages`, result);

  if (typeof variant.seedDataPath === "string") {
    validateSeedDataPath(variant.seedDataPath, label, root, `${variantBase}/seed-data`, `variant "${framework}" seedDataPath`, result);
  }
}

function validatePreviewImages(previewImages, label, root, expectedDirectory, location, result) {
  if (!Array.isArray(previewImages)) {
    return;
  }

  previewImages.forEach((previewImagePath, index) => {
    if (typeof previewImagePath !== "string") {
      return;
    }

    if (path.extname(previewImagePath) !== ".png") {
      const previewLocation = location === "previewImages" ? "preview image" : `${location} image`;
      result.errors.push(`Template "${label}" ${previewLocation} must be a .png: ${previewImagePath}`);
    }

    const fullPreviewPath = resolveTemplatePath(root, previewImagePath, label, result);
    if (!fullPreviewPath) {
      return;
    }

    validatePathUnder(root, fullPreviewPath, expectedDirectory, label, `${location}[${index}]`, result);

    if (!fileExists(fullPreviewPath)) {
      result.errors.push(`Template "${label}" preview image does not exist: ${previewImagePath}`);
    }
  });
}

function validateSolutionPath(solutionPathValue, label, root, expectedDirectory, variantBase, location, result) {
  if (typeof solutionPathValue !== "string") {
    return;
  }

  const solutionPath = resolveTemplatePath(root, solutionPathValue, label, result);
  if (!solutionPath) {
    return;
  }

  const expectedFullDirectory = path.resolve(root, expectedDirectory);
  if (solutionPathValue !== expectedDirectory || solutionPath !== expectedFullDirectory) {
    result.errors.push(`Template "${label}" ${location} must be ${expectedDirectory}.`);
  }

  if (!directoryExists(solutionPath)) {
    result.errors.push(`Template "${label}" solutionPath does not exist or is not a directory: ${solutionPathValue}`);
    return;
  }

  if (fs.lstatSync(solutionPath).isSymbolicLink()) {
    result.errors.push(`Template "${label}" solutionPath must not be a symbolic link: ${solutionPathValue}`);
  }

  const requiredFiles = [
    ["Other", "Solution.xml"],
    ["Other", "Customizations.xml"]
  ];
  for (const pathSegments of requiredFiles) {
    const requiredPath = path.join(solutionPath, ...pathSegments);
    if (!fileExists(requiredPath)) {
      result.errors.push(`Template "${label}" solutionPath must contain ${pathSegments.join("/")}.`);
    }
  }

  validateSolutionContents(solutionPath, solutionPath, label, result);
  validateVariantHasNoSolutionZip(path.resolve(root, variantBase), label, result);

  const solutionXmlPath = path.join(solutionPath, "Other", "Solution.xml");
  if (!fileExists(solutionXmlPath)) {
    return;
  }
  const solutionXml = fs.readFileSync(solutionXmlPath, "utf8");
  const managedState = detectManagedState(solutionXml);
  if (managedState === "unknown") {
    result.errors.push(`Template "${label}" Other/Solution.xml does not contain a readable <Managed> value.`);
    return;
  }

  if (managedState === "managed") {
    result.errors.push(`Template "${label}" solution is managed. Replace it with an unmanaged export.`);
  }
}

function validateSolutionContents(solutionRoot, currentDirectory, label, result) {
  for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, entry.name);
    const relativePath = path.relative(solutionRoot, fullPath).split(path.sep).join("/");

    if (entry.isSymbolicLink()) {
      result.errors.push(`Template "${label}" solution must not contain symbolic links: ${relativePath}`);
      continue;
    }

    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === "powerpagecomponents") {
        result.errors.push(
          `Template "${label}" supporting solution must not contain Power Pages website components: ${relativePath}/`
        );
        continue;
      }

      if (FORBIDDEN_SOLUTION_DIRECTORIES.has(entry.name)) {
        result.errors.push(`Template "${label}" solution contains excluded directory: ${relativePath}/`);
        continue;
      }

      validateSolutionContents(solutionRoot, fullPath, label, result);
      continue;
    }

    if (isForbiddenLocalFile(entry.name)) {
      result.errors.push(`Template "${label}" solution contains excluded file: ${relativePath}`);
    }
  }
}

function validateVariantHasNoSolutionZip(variantPath, label, result) {
  if (!directoryExists(variantPath)) {
    return;
  }

  for (const entryPath of findFilesByExtension(variantPath, ".zip")) {
    const relativePath = path.relative(variantPath, entryPath).split(path.sep).join("/");
    result.errors.push(`Template "${label}" variant must not contain committed solution zips: ${relativePath}`);
  }
}

function findFilesByExtension(currentDirectory, extension) {
  const matches = [];
  for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = path.join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...findFilesByExtension(fullPath, extension));
    } else if (entry.name.toLowerCase().endsWith(extension)) {
      matches.push(fullPath);
    }
  }

  return matches;
}

function validateSpaCodePath(spaCodePathValue, label, root, expectedDirectory, location, result) {
  if (typeof spaCodePathValue !== "string") {
    return;
  }

  const spaCodePath = resolveTemplatePath(root, spaCodePathValue, label, result);
  if (!spaCodePath) {
    return;
  }

  const expectedFullDirectory = path.resolve(root, expectedDirectory);
  if (spaCodePath !== expectedFullDirectory) {
    result.errors.push(`Template "${label}" ${location} must be ${expectedDirectory}.`);
  }

  if (!directoryExists(spaCodePath)) {
    result.errors.push(`Template "${label}" spaCodePath does not exist or is not a directory: ${spaCodePathValue}`);
    return;
  }

  const requiredFiles = ["package.json", "powerpages.config.json"];
  for (const requiredFile of requiredFiles) {
    const requiredPath = path.join(spaCodePath, requiredFile);
    if (!fileExists(requiredPath)) {
      result.errors.push(`Template "${label}" spaCodePath must contain ${requiredFile}.`);
    }
  }

  if (!directoryExists(path.join(spaCodePath, ".powerpages-site"))) {
    result.errors.push(`Template "${label}" spaCodePath must contain .powerpages-site/.`);
  }

  validateSpaCodeContents(spaCodePath, spaCodePath, label, result);
  validateSpaCodeSourceMetadata(spaCodePath, label, result);
}

function validateSpaCodeContents(spaCodeRoot, currentDirectory, label, result) {
  for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, entry.name);
    const relativePath = path.relative(spaCodeRoot, fullPath).split(path.sep).join("/");

    if (entry.isSymbolicLink()) {
      result.errors.push(`Template "${label}" spa-code must not contain symbolic links: ${relativePath}`);
      continue;
    }

    if (entry.isDirectory()) {
      if (FORBIDDEN_SPA_CODE_DIRECTORIES.has(entry.name)) {
        result.errors.push(`Template "${label}" spa-code contains excluded directory: ${relativePath}/`);
        continue;
      }

      validateSpaCodeContents(spaCodeRoot, fullPath, label, result);
      continue;
    }

    if (isForbiddenSpaCodeFile(entry.name) || isEnvironmentSpecificPortalManifest(relativePath)) {
      result.errors.push(`Template "${label}" spa-code contains excluded file: ${relativePath}`);
    }

    if (isPowerPagesSiteSettingFile(relativePath)) {
      validateWebApiFieldSettings(fullPath, relativePath, label, result);
    }
  }
}

function isForbiddenLocalFile(fileName) {
  return fileName === ".DS_Store" ||
    fileName === ".datamodel-manifest.json" ||
    fileName === "AGENTS.md" ||
    fileName === "CLAUDE.md" ||
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    fileName.endsWith(".tsbuildinfo") ||
    fileName.endsWith(".log") ||
    fileName.endsWith(".err") ||
    fileName.endsWith(".sarif");
}

function isForbiddenSpaCodeFile(fileName) {
  return isForbiddenLocalFile(fileName);
}

function isEnvironmentSpecificPortalManifest(relativePath) {
  return /^\.powerpages-site\/\.portalconfig\/.+-manifest\.yml$/i.test(relativePath);
}

function isPowerPagesSiteSettingFile(relativePath) {
  if (!relativePath.startsWith(".powerpages-site/")) {
    return false;
  }

  const fileName = path.posix.basename(relativePath);
  const isModularSetting = /\.sitesetting\.ya?ml$/i.test(fileName);
  const isAggregateSettings = /^sitesettings?\.ya?ml$/i.test(fileName);
  return isModularSetting || isAggregateSettings;
}

function validateWebApiFieldSettings(settingsPath, relativePath, label, result) {
  const lines = fs.readFileSync(settingsPath, "utf8").split(/\r?\n/);
  const namePattern = /^\s*(?:-\s*)?(?:adx_name|name):\s*(.+?)\s*$/i;
  const valuePattern = /^\s*(?:adx_value|value):\s*(.+?)\s*$/i;

  for (let index = 0; index < lines.length; index += 1) {
    const nameMatch = lines[index].match(namePattern);
    if (!nameMatch) {
      continue;
    }

    const settingName = unquoteYamlScalar(nameMatch[1]);
    if (!/^Webapi\/[^/]+\/fields$/i.test(settingName)) {
      continue;
    }

    for (let valueIndex = index + 1; valueIndex < lines.length; valueIndex += 1) {
      if (namePattern.test(lines[valueIndex])) {
        break;
      }

      const valueMatch = lines[valueIndex].match(valuePattern);
      if (!valueMatch) {
        continue;
      }

      if (isWildcardYamlScalar(valueMatch[1])) {
        result.errors.push(
          `Template "${label}" SPA site setting ${settingName} must use an explicit column allowlist, not '*': ${relativePath}`
        );
      }
      break;
    }
  }
}

function isWildcardYamlScalar(value) {
  const scalar = value.trim();
  return scalar === "*" || scalar === "'*'" || scalar === '"*"';
}

function validateSpaCodeSourceMetadata(spaCodePath, label, result) {
  const metadataDirectory = path.join(spaCodePath, ".powerpages-site", "source-files");
  if (!directoryExists(metadataDirectory)) {
    return;
  }

  for (const entry of fs.readdirSync(metadataDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".sourcefile.yml")) {
      continue;
    }

    const metadataPath = path.join(metadataDirectory, entry.name);
    const metadata = fs.readFileSync(metadataPath, "utf8");
    const partialUrlMatch = /^partialurl:\s*(.*?)\s*$/m.exec(metadata);
    if (!partialUrlMatch || partialUrlMatch[1].length === 0) {
      result.errors.push(`Template "${label}" SPA source metadata must contain partialurl: ${entry.name}`);
      continue;
    }

    const partialUrl = unquoteYamlScalar(partialUrlMatch[1]);
    const sourcePath = resolveSpaCodeSourcePath(spaCodePath, partialUrl, label, entry.name, result);
    if (sourcePath && !fileExists(sourcePath)) {
      result.errors.push(`Template "${label}" SPA source metadata references a missing file: ${partialUrl}`);
    }
  }
}

function unquoteYamlScalar(value) {
  if (value.length >= 2 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }

  return value;
}

function resolveSpaCodeSourcePath(spaCodePath, partialUrl, label, metadataName, result) {
  if (path.isAbsolute(partialUrl)) {
    result.errors.push(`Template "${label}" SPA source metadata partialurl must be relative: ${metadataName}`);
    return null;
  }

  const sourcePath = path.resolve(spaCodePath, partialUrl);
  if (!isPathInsideOrEqual(spaCodePath, sourcePath) || sourcePath === spaCodePath) {
    result.errors.push(`Template "${label}" SPA source metadata partialurl must stay inside spa-code: ${metadataName}`);
    return null;
  }

  return sourcePath;
}

function validateSeedDataPath(seedDataPathValue, label, root, expectedDirectory, location, result) {
  const seedDataPath = resolveTemplatePath(root, seedDataPathValue, label, result);
  if (!seedDataPath) {
    return;
  }

  validatePathUnder(root, seedDataPath, expectedDirectory, label, location, result);

  if (!fileExists(seedDataPath)) {
    result.errors.push(`Template "${label}" seedDataPath does not exist: ${seedDataPathValue}`);
    return;
  }

  const seedData = readJsonFile(seedDataPath, `seed data for template "${label}"`, result);
  if (!seedData) {
    return;
  }

  if (!seedData || typeof seedData !== "object" || Array.isArray(seedData)) {
    result.errors.push(`Template "${label}" seed data must be an object.`);
    return;
  }

  if (isDataverseExportSeedData(seedData)) {
    validateDataverseExportSeedData(seedData, path.dirname(seedDataPath), label, result);
    return;
  }

  if (typeof seedData.entitySetName !== "string" || seedData.entitySetName.length === 0) {
    result.errors.push(`Template "${label}" seed data must include a non-empty entitySetName.`);
  }

  if (!Array.isArray(seedData.records)) {
    result.errors.push(`Template "${label}" seed data records must be an array.`);
    return;
  }

  validateSeedDataFileAttachments(seedData.records, path.dirname(seedDataPath), label, result);
}

function isDataverseExportSeedData(seedData) {
  return seedData && typeof seedData === "object" && !Array.isArray(seedData) && Object.hasOwn(seedData, "tables");
}

function validateDataverseExportSeedData(seedData, seedDataDirectory, label, result) {
  if (!seedData.tables || typeof seedData.tables !== "object" || Array.isArray(seedData.tables)) {
    result.errors.push(`Template "${label}" Dataverse seed data tables must be an object.`);
    return;
  }

  for (const [tableName, table] of Object.entries(seedData.tables)) {
    validateDataverseSeedTable(tableName, table, label, result);
  }

  if (Object.hasOwn(seedData, "fileExports")) {
    validateDataverseFileExports(seedData.fileExports, seedDataDirectory, label, result);
  }
}

function validateDataverseSeedTable(tableName, table, label, result) {
  const location = `table ${tableName}`;
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} must be an object.`);
    return;
  }

  validateNonEmptyString(table.logicalName, `${location} logicalName`, label, result);
  validateNonEmptyString(table.entitySet, `${location} entitySet`, label, result);

  if (!Array.isArray(table.records)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} records must be an array.`);
  }
}

function validateDataverseFileExports(fileExports, seedDataDirectory, label, result) {
  if (!Array.isArray(fileExports)) {
    result.errors.push(`Template "${label}" Dataverse seed data fileExports must be an array.`);
    return;
  }

  fileExports.forEach((fileExport, index) => {
    validateDataverseFileExport(fileExport, `fileExports[${index}]`, seedDataDirectory, label, result);
  });
}

function validateDataverseFileExport(fileExport, location, seedDataDirectory, label, result) {
  if (!fileExport || typeof fileExport !== "object" || Array.isArray(fileExport)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} must be an object.`);
    return;
  }

  validateNonEmptyString(fileExport.attachmentId, `${location} attachmentId`, label, result);
  validateNonEmptyString(fileExport.fileColumn, `${location} fileColumn`, label, result);
  validateNonEmptyString(fileExport.fileName, `${location} fileName`, label, result);

  if (Object.hasOwn(fileExport, "contentType")) {
    validateNonEmptyString(fileExport.contentType, `${location} contentType`, label, result);
  }

  if (Object.hasOwn(fileExport, "size") && (!Number.isFinite(fileExport.size) || fileExport.size < 0)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} size must be a non-negative number.`);
  }

  if (!validateNonEmptyString(fileExport.path, `${location} path`, label, result)) {
    return;
  }

  const filePath = resolveSeedDataFilePath(seedDataDirectory, fileExport.path, `${location} path`, label, result);
  if (!filePath) {
    return;
  }

  if (!fileExists(filePath)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} file does not exist: ${fileExport.path}`);
    return;
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} file is empty: ${fileExport.path}`);
  }

  if (Number.isFinite(fileExport.size) && fileExport.size !== stats.size) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} size ${fileExport.size} does not match file size ${stats.size}: ${fileExport.path}`);
  }
}

function validateSeedDataFileAttachments(records, seedDataDirectory, label, result) {
  records.forEach((record, recordIndex) => {
    if (!record || typeof record !== "object" || Array.isArray(record) || !Object.hasOwn(record, "fileAttachments")) {
      return;
    }

    const attachments = record.fileAttachments;
    const recordLocation = `record[${recordIndex}].fileAttachments`;
    if (!Array.isArray(attachments)) {
      result.errors.push(`Template "${label}" seed data ${recordLocation} must be an array.`);
      return;
    }

    attachments.forEach((attachment, attachmentIndex) => {
      validateSeedDataFileAttachment(attachment, `${recordLocation}[${attachmentIndex}]`, seedDataDirectory, label, result);
    });
  });
}

function validateSeedDataFileAttachment(attachment, location, seedDataDirectory, label, result) {
  if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) {
    result.errors.push(`Template "${label}" seed data ${location} must be an object.`);
    return;
  }

  validateRequiredAttachmentString(attachment, "columnName", location, label, result);
  validateOptionalAttachmentString(attachment, "fileName", location, label, result);
  validateOptionalAttachmentString(attachment, "mimeType", location, label, result);

  if (!validateRequiredAttachmentString(attachment, "filePath", location, label, result)) {
    return;
  }

  const attachmentPath = resolveSeedDataAttachmentPath(seedDataDirectory, attachment.filePath, location, label, result);
  if (!attachmentPath) {
    return;
  }

  if (!fileExists(attachmentPath)) {
    result.errors.push(`Template "${label}" seed data ${location} file does not exist: ${attachment.filePath}`);
    return;
  }

  const stats = fs.statSync(attachmentPath);
  if (stats.size === 0) {
    result.errors.push(`Template "${label}" seed data ${location} file is empty: ${attachment.filePath}`);
  }
}

function validateRequiredAttachmentString(attachment, propertyName, location, label, result) {
  if (typeof attachment[propertyName] !== "string" || attachment[propertyName].length === 0) {
    result.errors.push(`Template "${label}" seed data ${location} ${propertyName} must be a non-empty string.`);
    return false;
  }

  return true;
}

function validateOptionalAttachmentString(attachment, propertyName, location, label, result) {
  if (Object.hasOwn(attachment, propertyName) && (typeof attachment[propertyName] !== "string" || attachment[propertyName].length === 0)) {
    result.errors.push(`Template "${label}" seed data ${location} ${propertyName} must be a non-empty string.`);
  }
}

function resolveSeedDataAttachmentPath(seedDataDirectory, relativePath, location, label, result) {
  return resolveSeedDataFilePath(seedDataDirectory, relativePath, `${location} filePath`, label, result);
}

function resolveSeedDataFilePath(seedDataDirectory, relativePath, location, label, result) {
  if (path.isAbsolute(relativePath)) {
    result.errors.push(`Template "${label}" seed data ${location} must be relative to the seed data file: ${relativePath}`);
    return null;
  }

  const resolvedPath = path.resolve(seedDataDirectory, relativePath);
  if (!isPathInsideOrEqual(seedDataDirectory, resolvedPath) || resolvedPath === seedDataDirectory) {
    result.errors.push(`Template "${label}" seed data ${location} must stay inside the seed data folder: ${relativePath}`);
    return null;
  }

  return resolvedPath;
}

function validateNonEmptyString(value, location, label, result) {
  if (typeof value !== "string" || value.length === 0) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} must be a non-empty string.`);
    return false;
  }

  return true;
}

function resolveTemplatePath(root, relativePath, label, result) {
  const resolvedPath = path.resolve(root, relativePath);
  if (!isPathInsideOrEqual(root, resolvedPath)) {
    result.errors.push(`Template "${label}" referenced path escapes templates/: ${relativePath}`);
    return null;
  }

  return resolvedPath;
}

function validatePathUnder(root, fullPath, expectedDirectory, label, location, result) {
  if (!expectedDirectory) {
    return;
  }

  const expectedFullDirectory = path.resolve(root, expectedDirectory);
  if (!isPathInsideOrEqual(expectedFullDirectory, fullPath) || fullPath === expectedFullDirectory) {
    result.errors.push(`Template "${label}" ${location} must live in ${expectedDirectory}/.`);
  }
}

function isPathInsideOrEqual(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function directoryExists(directoryPath) {
  try {
    return fs.statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function detectManagedState(solutionXml) {
  const match = /<Managed>\s*([01])\s*<\/Managed>/i.exec(solutionXml);
  if (!match) {
    return "unknown";
  }

  return match[1] === "1" ? "managed" : "unmanaged";
}

function runCli() {
  const args = process.argv.slice(2);
  const rootArgIndex = args.indexOf("--root");
  const root = rootArgIndex === -1 ? undefined : args[rootArgIndex + 1];
  const result = validateTemplates({ root });

  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`error: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Validated templates manifest with ${result.warnings.length} warning(s).`);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  detectManagedState,
  validateTemplates
};
