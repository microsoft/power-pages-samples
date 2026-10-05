#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const VALID_KINDS = new Set(["spa", "traditional"]);
const VALID_FRAMEWORKS = new Set(["angular", "astro", "none", "react", "vue"]);
const VALID_AUDIENCES = new Set(["admins", "developers", "makers", "partners"]);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATAVERSE_CHOICE_VALUES_FILE = "dataverse-choice-values.json";
const DATAVERSE_SOLUTION_CONTRACT_FILE = "dataverse-solution-contract.json";
// Segmented standard tables omit unchanged columns, including the primary key.
// Only known platform columns can fill these gaps; custom columns still require
// solution metadata. https://learn.microsoft.com/power-platform/alm/segmented-solutions-alm
const STANDARD_TABLE_DEPENDENCIES = {
  account: {
    entitySetName: "accounts",
    primaryKey: "accountid",
    attributes: [
      ["AccountId", "accountid", "primarykey"],
      ["Name", "name", "nvarchar"],
      ["StateCode", "statecode", "state"],
      ["StatusCode", "statuscode", "status"],
    ]
  }
};
const CODEQL_REPORTS_DIRECTORY = "docs/codeql-reports/";
const FORBIDDEN_WEBSITE_CODE_DIRECTORIES = new Set([
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
  ...FORBIDDEN_WEBSITE_CODE_DIRECTORIES,
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
  const solutionMetadata = validateSolutionsDirectory(
    label,
    root,
    `${familyBase}/solutions`,
    familyBase,
    template.kind === "traditional",
    result
  );

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

    validateVariantPath(template, framework, label, root, solutionMetadata, result);
  }

  if (typeof template.seedDataPath === "string") {
    validateSeedDataPath(
      template.seedDataPath,
      label,
      root,
      `${familyBase}/seed-data`,
      "seedDataPath",
      [{ scope: "template family", metadata: solutionMetadata }],
      result
    );
  }
}

function getFamilyBasePath(template) {
  if (typeof template.kind !== "string" || typeof template.id !== "string") {
    return "";
  }

  return `${template.kind}/${template.id}`;
}

function validateVariantPath(template, framework, label, root, solutionMetadata, result) {
  const variantBase = `${getFamilyBasePath(template)}/variants/${framework}`;
  validateVariantDirectoryContents(label, root, variantBase, result);
  validateWebsiteCodePath(
    template.kind,
    label,
    root,
    `${variantBase}/website-code`,
    solutionMetadata,
    result
  );
}

function validateVariantDirectoryContents(label, root, variantBase, result) {
  const variantPath = path.resolve(root, variantBase);
  if (!directoryExists(variantPath)) {
    return;
  }

  if (fs.lstatSync(variantPath).isSymbolicLink()) {
    result.errors.push(`Template "${label}" variant directory must not be a symbolic link: ${variantBase}`);
    return;
  }

  for (const entry of fs.readdirSync(variantPath, { withFileTypes: true })) {
    if (entry.name !== "website-code" || entry.isSymbolicLink() || !entry.isDirectory()) {
      result.errors.push(
        `Template "${label}" variant may contain only the website-code directory: ${entry.name}`
      );
    }
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

function validateSolutionsDirectory(
  label,
  root,
  solutionsDirectory,
  familyBase,
  allowPowerPagesComponents,
  result
) {
  const metadata = createDataverseMetadata();
  validateTemplateHasNoSolutionZip(path.resolve(root, familyBase), label, result);
  const solutionsPath = path.resolve(root, solutionsDirectory);
  if (!directoryExists(solutionsPath)) {
    result.errors.push(`Template "${label}" solutions directory does not exist: ${solutionsDirectory}`);
    return metadata;
  }

  if (fs.lstatSync(solutionsPath).isSymbolicLink()) {
    result.errors.push(`Template "${label}" solutions directory must not be a symbolic link: ${solutionsDirectory}`);
    return metadata;
  }

  const solutionDirectories = [];
  for (const entry of fs.readdirSync(solutionsPath, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      result.errors.push(
        `Template "${label}" solutions directory may contain only direct solution folders: ${entry.name}`
      );
      continue;
    }

    solutionDirectories.push(entry);
  }

  if (solutionDirectories.length === 0) {
    result.errors.push(`Template "${label}" solutions directory must contain at least one solution folder.`);
  }

  solutionDirectories.sort((left, right) => compareCaseInsensitive(left.name, right.name));
  const solutions = [];
  const uniqueNames = new Map();
  for (const entry of solutionDirectories) {
    const solution = validateSolutionDirectory(
      path.join(solutionsPath, entry.name),
      entry.name,
      label,
      allowPowerPagesComponents,
      result
    );
    if (!solution) {
      continue;
    }

    const normalizedUniqueName = solution.uniqueName.toLowerCase();
    const previousFolder = uniqueNames.get(normalizedUniqueName);
    if (previousFolder) {
      result.errors.push(
        `Template "${label}" solutions have duplicate case-insensitive unique name "${solution.uniqueName}": ` +
        `${previousFolder}, ${entry.name}`
      );
    } else {
      uniqueNames.set(normalizedUniqueName, entry.name);
    }
    solutions.push(solution);
    mergeDataverseMetadata(metadata, solution.metadata, label, result);
  }
  validateIndependentSiblingSolutions(solutions, uniqueNames, label, result);
  return metadata;
}

function compareCaseInsensitive(left, right) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft < normalizedRight) {
    return -1;
  }
  if (normalizedLeft > normalizedRight) {
    return 1;
  }
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateSolutionDirectory(solutionPath, folderName, label, allowPowerPagesComponents, result) {
  const requiredFiles = [
    ["Other", "Solution.xml"],
    ["Other", "Customizations.xml"]
  ];
  for (const pathSegments of requiredFiles) {
    const requiredPath = path.join(solutionPath, ...pathSegments);
    if (!fileExists(requiredPath)) {
      result.errors.push(`Template "${label}" solution "${folderName}" must contain ${pathSegments.join("/")}.`);
    }
  }

  validateSolutionContents(solutionPath, solutionPath, label, allowPowerPagesComponents, result);

  const solutionXmlPath = path.join(solutionPath, "Other", "Solution.xml");
  if (!fileExists(solutionXmlPath)) {
    return null;
  }
  const solutionXml = fs.readFileSync(solutionXmlPath, "utf8");
  const uniqueName = detectSolutionUniqueName(solutionXml);
  if (!uniqueName) {
    result.errors.push(`Template "${label}" solution "${folderName}" does not contain a readable solution UniqueName.`);
    return null;
  }

  if (folderName !== uniqueName) {
    result.errors.push(
      `Template "${label}" solution folder "${folderName}" must exactly match XML unique name "${uniqueName}".`
    );
  }

  const managedState = detectManagedState(solutionXml);
  if (managedState === "unknown") {
    result.errors.push(
      `Template "${label}" solution "${folderName}" Other/Solution.xml does not contain a readable <Managed> value.`
    );
  } else if (managedState === "managed") {
    result.errors.push(`Template "${label}" solution "${folderName}" is managed. Replace it with an unmanaged export.`);
  }

  return {
    folderName,
    metadata: readSolutionDataverseMetadata(solutionPath, label, result),
    solutionXml,
    uniqueName
  };
}

function detectSolutionUniqueName(solutionXml) {
  const match = /<SolutionManifest\b[^>]*>[\s\S]*?<UniqueName>\s*([^<]+?)\s*<\/UniqueName>/i.exec(solutionXml);
  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function validateIndependentSiblingSolutions(solutions, uniqueNames, label, result) {
  for (const solution of solutions) {
    for (const requiredUniqueName of extractRequiredSolutionNames(solution.solutionXml)) {
      const siblingFolder = uniqueNames.get(requiredUniqueName.toLowerCase());
      if (siblingFolder && siblingFolder !== solution.folderName) {
        result.errors.push(
          `Template "${label}" solution "${solution.folderName}" depends on sibling solution "${siblingFolder}". ` +
          "Sibling solutions must be independently importable."
        );
      }
    }
  }
}

function extractRequiredSolutionNames(solutionXml) {
  const names = [];
  const requiredPattern = /<Required\b[^>]*\bsolution\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = requiredPattern.exec(solutionXml)) !== null) {
    // PAC writes solution dependencies as "UniqueName (version)", for example
    // solution="msdynce_KnowledgeManagementFeatures (9.0.26064.3010)".
    // Split only the trailing version suffix because unique names cannot contain spaces.
    const dependency = decodeXmlEntities(match[2]).trim().replace(/\s+\([^)]*\)\s*$/, "");
    if (dependency) {
      names.push(dependency);
    }
  }

  return names;
}

function decodeXmlEntities(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function createDataverseMetadata() {
  return {
    manyToManyRelationshipsByName: new Map(),
    relationshipsByName: new Map(),
    tablesByEntitySet: new Map(),
    tablesByLogicalName: new Map(),
    tablesBySchemaName: new Map()
  };
}

function readSolutionDataverseMetadata(solutionPath, label, result) {
  const metadata = createDataverseMetadata();
  const entitiesPath = path.join(solutionPath, "Entities");
  if (directoryExists(entitiesPath)) {
    for (const entry of fs.readdirSync(entitiesPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entityPath = path.join(entitiesPath, entry.name, "Entity.xml");
      if (!fileExists(entityPath)) {
        continue;
      }

      const table = parseDataverseTableMetadata(fs.readFileSync(entityPath, "utf8"));
      if (!table) {
        continue;
      }
      addDataverseTable(metadata, table, label, result);
    }
  }

  const relationshipsPath = path.join(solutionPath, "Other", "Relationships");
  if (directoryExists(relationshipsPath)) {
    for (const entry of fs.readdirSync(relationshipsPath, { withFileTypes: true })) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".xml") {
        continue;
      }
      addDataverseRelationships(
        metadata,
        fs.readFileSync(path.join(relationshipsPath, entry.name), "utf8"),
        label,
        result
      );
    }
  }

  return metadata;
}

function parseDataverseTableMetadata(entityXml) {
  const schemaName = matchXmlText(entityXml, /<Entity\b[\s\S]*?<Name\b[^>]*>\s*([^<]+?)\s*<\/Name>/i);
  const standardTable = STANDARD_TABLE_DEPENDENCIES[schemaName?.toLowerCase()];
  const entitySetName = matchXmlText(entityXml, /<EntitySetName>\s*([^<]+?)\s*<\/EntitySetName>/i)
    ?? standardTable?.entitySetName;
  const attributes = [];
  const attributePattern = /<attribute\b[^>]*\bPhysicalName=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/attribute>/gi;
  let attributeMatch;
  while ((attributeMatch = attributePattern.exec(entityXml)) !== null) {
    const logicalName = matchXmlText(
      attributeMatch[3],
      /<LogicalName>\s*([^<]+?)\s*<\/LogicalName>/i
    );
    const type = matchXmlText(attributeMatch[3], /<Type>\s*([^<]+?)\s*<\/Type>/i);
    if (!logicalName || !type) {
      continue;
    }
    attributes.push({
      choiceOptionsByLabel: parseDataverseChoiceOptions(attributeMatch[3], type),
      isCustomField: matchXmlText(attributeMatch[3], /<IsCustomField>\s*([^<]+?)\s*<\/IsCustomField>/i) === "1",
      logicalName,
      physicalName: decodeXmlEntities(attributeMatch[2].trim()),
      type: type.toLowerCase()
    });
  }

  const shippedAttributes = new Set(attributes.map(attribute => attribute.logicalName));
  if (standardTable) {
    for (const [physicalName, logicalName, type] of standardTable.attributes) {
      if (!shippedAttributes.has(logicalName)) {
        attributes.push({ physicalName, logicalName, type, isCustomField: false, choiceOptionsByLabel: null });
      }
    }
  }
  const primaryKeyAttribute = attributes.find((attribute) => attribute.type === "primarykey");
  if (!schemaName || !entitySetName || !primaryKeyAttribute || !primaryKeyAttribute.logicalName.endsWith("id")) {
    return null;
  }

  const logicalName = primaryKeyAttribute.logicalName.slice(0, -2);
  if (schemaName.toLowerCase() !== logicalName) {
    return null;
  }

  return {
    attributesByLogicalName: new Map(
      attributes.map((attribute) => [attribute.logicalName.toLowerCase(), attribute])
    ),
    attributesByPhysicalName: new Map(
      attributes.map((attribute) => [attribute.physicalName.toLowerCase(), attribute])
    ),
    entitySetName,
    logicalName,
    lookupsByAttributeLogicalName: new Map(),
    lookupsByNavigationProperty: new Map(),
    primaryKey: primaryKeyAttribute.logicalName,
    shippedAttributes,
    schemaName
  };
}

function parseDataverseChoiceOptions(attributeXml, type) {
  if (!["bit", "picklist"].includes(type.toLowerCase())) {
    return null;
  }

  const options = new Map();
  const optionPattern = /<option\b[^>]*\bvalue=(["'])(-?\d+)\1[^>]*>([\s\S]*?)<\/option>/gi;
  let optionMatch;
  while ((optionMatch = optionPattern.exec(attributeXml)) !== null) {
    const englishLabelMatch =
      /<label\b[^>]*\bdescription=(["'])(.*?)\1[^>]*\blanguagecode=(["'])1033\3/i.exec(optionMatch[3]);
    const anyLabelMatch = /<label\b[^>]*\bdescription=(["'])(.*?)\1/i.exec(optionMatch[3]);
    const label = englishLabelMatch?.[2] ?? anyLabelMatch?.[2];
    if (label !== undefined) {
      options.set(decodeXmlEntities(label.trim()), Number(optionMatch[2]));
    }
  }
  return options;
}

function matchXmlText(xml, pattern) {
  const match = pattern.exec(xml);
  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function addDataverseTable(metadata, table, label, result) {
  for (const [mapName, value] of [
    ["tablesByLogicalName", table.logicalName],
    ["tablesByEntitySet", table.entitySetName],
    ["tablesBySchemaName", table.schemaName]
  ]) {
    const map = metadata[mapName];
    const normalized = value.toLowerCase();
    const existing = map.get(normalized);
    if (existing && existing.schemaName !== table.schemaName) {
      result.errors.push(
        `Template "${label}" solutions contain conflicting Dataverse table metadata for "${value}".`
      );
      continue;
    }
    map.set(normalized, table);
  }
}

function addDataverseRelationships(metadata, relationshipsXml, label, result) {
  const relationshipPattern = /<EntityRelationship\b([^>]*)>([\s\S]*?)<\/EntityRelationship>/gi;
  let relationshipMatch;
  while ((relationshipMatch = relationshipPattern.exec(relationshipsXml)) !== null) {
    const relationshipNameMatch = /\bName=(["'])(.*?)\1/i.exec(relationshipMatch[1]);
    const relationshipName = relationshipNameMatch
      ? decodeXmlEntities(relationshipNameMatch[2].trim())
      : null;
    const relationshipXml = relationshipMatch[2];
    if (matchXmlText(relationshipXml, /<EntityRelationshipType>\s*([^<]+?)\s*<\/EntityRelationshipType>/i) === "ManyToMany") {
      addDataverseManyToManyRelationship(metadata, relationshipName, relationshipXml, label, result);
      continue;
    }
    const sourceSchemaName = matchXmlText(
      relationshipXml,
      /<ReferencingEntityName>\s*([^<]+?)\s*<\/ReferencingEntityName>/i
    );
    const targetSchemaName = matchXmlText(
      relationshipXml,
      /<ReferencedEntityName>\s*([^<]+?)\s*<\/ReferencedEntityName>/i
    );
    const attributeName = matchXmlText(
      relationshipXml,
      /<ReferencingAttributeName>\s*([^<]+?)\s*<\/ReferencingAttributeName>/i
    );
    const navigationProperty = findReferencingNavigationProperty(relationshipXml);
    if (!sourceSchemaName || !targetSchemaName || !attributeName) {
      continue;
    }

    const sourceTable = metadata.tablesBySchemaName.get(sourceSchemaName.toLowerCase());
    if (!sourceTable) {
      continue;
    }

    const attribute = sourceTable.attributesByPhysicalName.get(attributeName.toLowerCase());
    if (!attribute || attribute.type !== "lookup") {
      if (!navigationProperty) {
        continue;
      }
      result.errors.push(
        `Template "${label}" relationship navigation property "${navigationProperty}" references unknown lookup attribute "${attributeName}".`
      );
      continue;
    }

    const lookup = {
      attributeLogicalName: attribute.logicalName,
      attributePhysicalName: attribute.physicalName,
      navigationProperty,
      targetSchemaName
    };
    sourceTable.lookupsByAttributeLogicalName.set(attribute.logicalName.toLowerCase(), lookup);
    if (navigationProperty) {
      sourceTable.lookupsByNavigationProperty.set(navigationProperty.toLowerCase(), lookup);
    }

    if (relationshipName) {
      const targetTable = metadata.tablesBySchemaName.get(targetSchemaName.toLowerCase());
      const relationship = {
        attributeLogicalName: attribute.logicalName,
        name: relationshipName,
        navigationProperty,
        sourceLogicalName: sourceTable.logicalName,
        targetLogicalName: targetTable?.logicalName ?? targetSchemaName.toLowerCase()
      };
      const normalizedName = relationshipName.toLowerCase();
      const existing = metadata.relationshipsByName.get(normalizedName);
      if (existing && JSON.stringify(existing) !== JSON.stringify(relationship)) {
        result.errors.push(
          `Template "${label}" solutions contain conflicting Dataverse relationship metadata for "${relationshipName}".`
        );
      } else {
        metadata.relationshipsByName.set(normalizedName, relationship);
      }
    }
  }
}

function addDataverseManyToManyRelationship(metadata, name, xml, label, result) {
  const firstSchemaName = matchXmlText(xml, /<FirstEntityName>\s*([^<]+?)\s*<\/FirstEntityName>/i);
  const secondSchemaName = matchXmlText(xml, /<SecondEntityName>\s*([^<]+?)\s*<\/SecondEntityName>/i);
  const intersectTable = matchXmlText(xml, /<IntersectEntityName>\s*([^<]+?)\s*<\/IntersectEntityName>/i);
  const navigationProperties = new Map();
  // Native N:N exports use AssociationRoleOrdinal (1/2), not the 1:N
  // RelationshipRoleType. The intersect is platform-managed, not a seed table.
  // https://learn.microsoft.com/power-apps/maker/data-platform/create-edit-nn-relationships
  for (const role of xml.matchAll(/<EntityRelationshipRole\b[^>]*>([\s\S]*?)<\/EntityRelationshipRole>/gi)) {
    const ordinal = matchXmlText(role[1], /<AssociationRoleOrdinal>\s*([^<]+?)\s*<\/AssociationRoleOrdinal>/i);
    const property = matchXmlText(role[1], /<NavigationPropertyName>\s*([^<]+?)\s*<\/NavigationPropertyName>/i);
    if (navigationProperties.has(ordinal)) {
      result.errors.push(`Template "${label}" many-to-many relationship "${name}" has duplicate role ordinal "${ordinal}".`);
    }
    navigationProperties.set(ordinal, property);
  }
  if (!name || !firstSchemaName || !secondSchemaName || !intersectTable ||
      !navigationProperties.get("1") || !navigationProperties.get("2")) {
    result.errors.push(`Template "${label}" many-to-many relationship "${name ?? "<missing name>"}" has incomplete metadata.`);
    return;
  }
  for (const schemaName of [firstSchemaName, secondSchemaName]) {
    if (schemaName.includes("_") && !metadata.tablesBySchemaName.has(schemaName.toLowerCase())) {
      result.errors.push(`Template "${label}" many-to-many relationship "${name}" references missing custom table "${schemaName}".`);
    }
  }
  const relationship = {
    name,
    firstTable: metadata.tablesBySchemaName.get(firstSchemaName.toLowerCase())?.logicalName ?? firstSchemaName.toLowerCase(),
    secondTable: metadata.tablesBySchemaName.get(secondSchemaName.toLowerCase())?.logicalName ?? secondSchemaName.toLowerCase(),
    intersectTable,
    firstNavigationProperty: navigationProperties.get("1"),
    secondNavigationProperty: navigationProperties.get("2")
  };
  const key = name.toLowerCase();
  const existing = metadata.manyToManyRelationshipsByName.get(key);
  if (existing && JSON.stringify(existing) !== JSON.stringify(relationship)) {
    result.errors.push(`Template "${label}" solutions contain conflicting many-to-many relationship metadata for "${name}".`);
  } else {
    metadata.manyToManyRelationshipsByName.set(key, relationship);
  }
}

function findReferencingNavigationProperty(relationshipXml) {
  const rolePattern = /<EntityRelationshipRole\b[^>]*>([\s\S]*?)<\/EntityRelationshipRole>/gi;
  let roleMatch;
  while ((roleMatch = rolePattern.exec(relationshipXml)) !== null) {
    if (!/<RelationshipRoleType>\s*1\s*<\/RelationshipRoleType>/i.test(roleMatch[1])) {
      continue;
    }
    return matchXmlText(
      roleMatch[1],
      /<NavigationPropertyName>\s*([^<]+?)\s*<\/NavigationPropertyName>/i
    );
  }
  return null;
}

function mergeDataverseMetadata(target, source, label, result) {
  for (const table of source.tablesByLogicalName.values()) {
    const existing = target.tablesByLogicalName.get(table.logicalName.toLowerCase());
    if (existing) {
      if (
        existing.entitySetName !== table.entitySetName ||
        existing.primaryKey !== table.primaryKey ||
        existing.schemaName !== table.schemaName
      ) {
        result.errors.push(
          `Template "${label}" solutions contain conflicting Dataverse metadata for table "${table.logicalName}".`
        );
      }
      for (const [name, attribute] of table.attributesByLogicalName) {
        existing.attributesByLogicalName.set(name, attribute);
      }
      for (const name of table.shippedAttributes) existing.shippedAttributes.add(name);
      for (const [name, attribute] of table.attributesByPhysicalName) {
        existing.attributesByPhysicalName.set(name, attribute);
      }
      for (const [name, lookup] of table.lookupsByNavigationProperty) {
        existing.lookupsByNavigationProperty.set(name, lookup);
      }
      for (const [name, lookup] of table.lookupsByAttributeLogicalName) {
        existing.lookupsByAttributeLogicalName.set(name, lookup);
      }
      continue;
    }
    addDataverseTable(target, table, label, result);
  }

  for (const [name, relationship] of source.relationshipsByName) {
    const existing = target.relationshipsByName.get(name);
    if (existing && JSON.stringify(existing) !== JSON.stringify(relationship)) {
      result.errors.push(
        `Template "${label}" solutions contain conflicting Dataverse relationship metadata for "${relationship.name}".`
      );
    } else {
      target.relationshipsByName.set(name, relationship);
    }
  }
  for (const [name, relationship] of source.manyToManyRelationshipsByName) {
    const existing = target.manyToManyRelationshipsByName.get(name);
    if (existing && JSON.stringify(existing) !== JSON.stringify(relationship)) {
      result.errors.push(`Template "${label}" solutions contain conflicting many-to-many relationship metadata for "${relationship.name}".`);
    } else {
      target.manyToManyRelationshipsByName.set(name, relationship);
    }
  }
}

function validateSolutionContents(solutionRoot, currentDirectory, label, allowPowerPagesComponents, result) {
  for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, entry.name);
    const relativePath = path.relative(solutionRoot, fullPath).split(path.sep).join("/");

    if (entry.isSymbolicLink()) {
      result.errors.push(`Template "${label}" solution must not contain symbolic links: ${relativePath}`);
      continue;
    }

    if (entry.isDirectory()) {
      if (!allowPowerPagesComponents && entry.name.toLowerCase() === "powerpagecomponents") {
        result.errors.push(
          `Template "${label}" supporting solution must not contain Power Pages website components: ${relativePath}/`
        );
        continue;
      }

      if (FORBIDDEN_SOLUTION_DIRECTORIES.has(entry.name)) {
        result.errors.push(`Template "${label}" solution contains excluded directory: ${relativePath}/`);
        continue;
      }

      validateSolutionContents(solutionRoot, fullPath, label, allowPowerPagesComponents, result);
      continue;
    }

    if (isForbiddenLocalFile(entry.name)) {
      result.errors.push(`Template "${label}" solution contains excluded file: ${relativePath}`);
    }
  }
}

function validateTemplateHasNoSolutionZip(templatePath, label, result) {
  if (!directoryExists(templatePath)) {
    return;
  }

  for (const entryPath of findFilesByExtension(templatePath, ".zip")) {
    const relativePath = path.relative(templatePath, entryPath).split(path.sep).join("/");
    result.errors.push(`Template "${label}" must not contain committed solution zips: ${relativePath}`);
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

function validateWebsiteCodePath(kind, label, root, expectedDirectory, solutionMetadata, result) {
  const websiteCodePath = path.resolve(root, expectedDirectory);
  if (!directoryExists(websiteCodePath)) {
    result.errors.push(`Template "${label}" website-code directory does not exist: ${expectedDirectory}`);
    return;
  }

  if (fs.lstatSync(websiteCodePath).isSymbolicLink()) {
    result.errors.push(`Template "${label}" website-code directory must not be a symbolic link: ${expectedDirectory}`);
    return;
  }

  const siteDirectory = path.join(websiteCodePath, ".powerpages-site");
  if (!directoryExists(siteDirectory)) {
    result.errors.push(`Template "${label}" website-code must contain .powerpages-site/.`);
  } else if (!fileExists(path.join(siteDirectory, "website.yml"))) {
    result.errors.push(`Template "${label}" website-code must contain .powerpages-site/website.yml.`);
  }

  if (kind === "spa") {
    for (const requiredFile of ["package.json", "powerpages.config.json"]) {
      if (!fileExists(path.join(websiteCodePath, requiredFile))) {
        result.errors.push(`Template "${label}" SPA website-code must contain ${requiredFile}.`);
      }
    }
  }

  validateWebsiteCodeContents(websiteCodePath, websiteCodePath, label, result);
  validateWebsiteCodeSourceMetadata(websiteCodePath, label, result);
  validateWebsiteSolutionContract(websiteCodePath, solutionMetadata, label, result);
  validateWebsiteChoiceValues(websiteCodePath, solutionMetadata, label, result);
}

function validateWebsiteSolutionContract(websiteCodePath, solutionMetadata, label, result) {
  const contractPath = path.join(websiteCodePath, DATAVERSE_SOLUTION_CONTRACT_FILE);
  if (!fileExists(contractPath)) {
    return;
  }

  const contract = readJsonFile(
    contractPath,
    `Dataverse solution contract for template "${label}"`,
    result
  );
  if (!contract) {
    return;
  }
  if (!contract.tables || typeof contract.tables !== "object" || Array.isArray(contract.tables)) {
    result.errors.push(
      `Template "${label}" ${DATAVERSE_SOLUTION_CONTRACT_FILE} must contain a tables object.`
    );
    return;
  }
  if (
    !contract.relationships ||
    typeof contract.relationships !== "object" ||
    Array.isArray(contract.relationships)
  ) {
    result.errors.push(
      `Template "${label}" ${DATAVERSE_SOLUTION_CONTRACT_FILE} must contain a relationships object.`
    );
    return;
  }

  const contractTableNames = new Set(Object.keys(contract.tables).map((name) => name.toLowerCase()));
  for (const table of solutionMetadata.tablesByLogicalName.values()) {
    if (!contractTableNames.has(table.logicalName.toLowerCase())) {
      result.errors.push(
        `Template "${label}" solution table "${table.logicalName}" is not declared in ` +
        `${DATAVERSE_SOLUTION_CONTRACT_FILE}.`
      );
    }
  }

  for (const [tableName, tableContract] of Object.entries(contract.tables)) {
    const location = `${DATAVERSE_SOLUTION_CONTRACT_FILE} table "${tableName}"`;
    const table = solutionMetadata.tablesByLogicalName.get(tableName.toLowerCase());
    if (!table) {
      result.errors.push(`Template "${label}" ${location} was not found in solution metadata.`);
      continue;
    }
    if (tableName !== table.logicalName) {
      result.errors.push(
        `Template "${label}" ${location} must exactly match "${table.logicalName}".`
      );
    }
    if (
      !tableContract ||
      typeof tableContract !== "object" ||
      Array.isArray(tableContract) ||
      !Array.isArray(tableContract.customColumns)
    ) {
      result.errors.push(`Template "${label}" ${location} must contain a customColumns array.`);
      continue;
    }

    const expectedColumns = new Set();
    for (const columnName of tableContract.customColumns) {
      if (typeof columnName !== "string" || columnName.length === 0) {
        result.errors.push(
          `Template "${label}" ${location} customColumns must contain non-empty strings.`
        );
        continue;
      }
      const normalizedName = columnName.toLowerCase();
      if (expectedColumns.has(normalizedName)) {
        result.errors.push(
          `Template "${label}" ${location} customColumns contains duplicate "${columnName}".`
        );
        continue;
      }
      expectedColumns.add(normalizedName);
      const attribute = table.attributesByLogicalName.get(normalizedName);
      if (!attribute || !attribute.isCustomField) {
        result.errors.push(
          `Template "${label}" ${location} custom column "${columnName}" was not found in solution metadata.`
        );
      } else if (columnName !== attribute.logicalName) {
        result.errors.push(
          `Template "${label}" ${location} custom column "${columnName}" must exactly match ` +
          `"${attribute.logicalName}".`
        );
      }
    }

    for (const attribute of table.attributesByLogicalName.values()) {
      if (attribute.isCustomField && !expectedColumns.has(attribute.logicalName.toLowerCase())) {
        result.errors.push(
          `Template "${label}" solution custom column "${table.logicalName}.${attribute.logicalName}" ` +
          `is not declared in ${DATAVERSE_SOLUTION_CONTRACT_FILE}.`
        );
      }
    }

    const standardColumns = tableContract.standardColumns ?? [];
    if (!Array.isArray(standardColumns) || standardColumns.some(column => typeof column !== "string")) {
      result.errors.push(`Template "${label}" ${location} standardColumns must be an array of strings.`);
      continue;
    }
    if (new Set(standardColumns).size !== standardColumns.length) {
      result.errors.push(`Template "${label}" ${location} standardColumns must not contain duplicates.`);
    }
    for (const column of standardColumns) {
      const attribute = table.attributesByLogicalName.get(column);
      if (!table.shippedAttributes.has(column) || !attribute || attribute.isCustomField) {
        result.errors.push(`Template "${label}" ${location} standard column "${column}" was not found in shipped solution metadata.`);
      }
    }
    if (STANDARD_TABLE_DEPENDENCIES[tableName]) {
      for (const column of table.shippedAttributes) {
        const attribute = table.attributesByLogicalName.get(column);
        if (!attribute.isCustomField && !standardColumns.includes(column)) {
          result.errors.push(`Template "${label}" solution standard column "${tableName}.${column}" is not declared in ${DATAVERSE_SOLUTION_CONTRACT_FILE}.`);
        }
      }
    }
  }

  const publisherPrefixes = new Set(
    [...solutionMetadata.tablesByLogicalName.values()]
      .map((table) => table.logicalName.split("_", 1)[0].toLowerCase())
      .filter(Boolean)
  );
  const solutionRelationships = [...solutionMetadata.relationshipsByName.values()].filter(
    (relationship) => [...publisherPrefixes].some(
      (prefix) => relationship.name.toLowerCase().startsWith(`${prefix}_`)
    )
  );
  const contractRelationshipNames = new Set(
    Object.keys(contract.relationships).map((name) => name.toLowerCase())
  );
  for (const relationship of solutionRelationships) {
    if (!contractRelationshipNames.has(relationship.name.toLowerCase())) {
      result.errors.push(
        `Template "${label}" solution relationship "${relationship.name}" is not declared in ` +
        `${DATAVERSE_SOLUTION_CONTRACT_FILE}.`
      );
    }
  }

  for (const [relationshipName, relationshipContract] of Object.entries(contract.relationships)) {
    const location = `${DATAVERSE_SOLUTION_CONTRACT_FILE} relationship "${relationshipName}"`;
    const relationship = solutionMetadata.relationshipsByName.get(relationshipName.toLowerCase());
    if (!relationship) {
      result.errors.push(`Template "${label}" ${location} was not found in solution metadata.`);
      continue;
    }
    if (relationshipName !== relationship.name) {
      result.errors.push(
        `Template "${label}" ${location} must exactly match "${relationship.name}".`
      );
    }
    if (!relationshipContract || typeof relationshipContract !== "object" || Array.isArray(relationshipContract)) {
      result.errors.push(`Template "${label}" ${location} must be an object.`);
      continue;
    }

    for (const [field, actualValue] of [
      ["referencingTable", relationship.sourceLogicalName],
      ["referencedTable", relationship.targetLogicalName],
      ["lookupColumn", relationship.attributeLogicalName],
      ["navigationProperty", relationship.navigationProperty]
    ]) {
      if (relationshipContract[field] !== actualValue) {
        result.errors.push(
          `Template "${label}" ${location} ${field} must exactly match ${JSON.stringify(actualValue)}.`
        );
      }
    }
  }
  const manyToManyContracts = contract.manyToManyRelationships ?? {};
  if (!manyToManyContracts || typeof manyToManyContracts !== "object" || Array.isArray(manyToManyContracts)) {
    result.errors.push(`Template "${label}" ${DATAVERSE_SOLUTION_CONTRACT_FILE} manyToManyRelationships must be an object.`);
    return;
  }
  for (const relationship of solutionMetadata.manyToManyRelationshipsByName.values()) {
    const expected = manyToManyContracts[relationship.name];
    if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
      result.errors.push(`Template "${label}" solution many-to-many relationship "${relationship.name}" is not declared in ${DATAVERSE_SOLUTION_CONTRACT_FILE}.`);
      continue;
    }
    for (const field of ["firstTable", "secondTable", "intersectTable", "firstNavigationProperty", "secondNavigationProperty"]) {
      if (expected[field] !== relationship[field]) {
        result.errors.push(`Template "${label}" many-to-many relationship "${relationship.name}" ${field} must exactly match ${JSON.stringify(relationship[field])}.`);
      }
    }
  }
  for (const name of Object.keys(manyToManyContracts)) {
    if (solutionMetadata.manyToManyRelationshipsByName.get(name.toLowerCase())?.name !== name) {
      result.errors.push(`Template "${label}" many-to-many relationship "${name}" was not found with that exact name in solution metadata.`);
    }
  }
}

function validateWebsiteChoiceValues(websiteCodePath, solutionMetadata, label, result) {
  const contractPath = path.join(websiteCodePath, DATAVERSE_CHOICE_VALUES_FILE);
  if (!fileExists(contractPath)) {
    return;
  }

  const contract = readJsonFile(contractPath, `Dataverse choice values for template "${label}"`, result);
  if (!contract) {
    return;
  }
  if (!contract.tables || typeof contract.tables !== "object" || Array.isArray(contract.tables)) {
    result.errors.push(
      `Template "${label}" ${DATAVERSE_CHOICE_VALUES_FILE} must contain a tables object.`
    );
    return;
  }

  for (const [tableName, attributes] of Object.entries(contract.tables)) {
    const table = solutionMetadata.tablesByLogicalName.get(tableName.toLowerCase());
    const tableLocation = `${DATAVERSE_CHOICE_VALUES_FILE} table "${tableName}"`;
    if (!table) {
      result.errors.push(
        `Template "${label}" ${tableLocation} was not found in solution metadata.`
      );
      continue;
    }
    if (tableName !== table.logicalName) {
      result.errors.push(
        `Template "${label}" ${tableLocation} must exactly match "${table.logicalName}".`
      );
    }
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
      result.errors.push(`Template "${label}" ${tableLocation} must be an object.`);
      continue;
    }

    for (const [attributeName, contractOptions] of Object.entries(attributes)) {
      validateWebsiteChoiceAttribute(
        table,
        attributeName,
        contractOptions,
        tableLocation,
        label,
        result
      );
    }
  }
}

function validateWebsiteChoiceAttribute(
  table,
  attributeName,
  contractOptions,
  tableLocation,
  label,
  result
) {
  const attribute = table.attributesByLogicalName.get(attributeName.toLowerCase());
  const attributeLocation = `${tableLocation} attribute "${attributeName}"`;
  if (!attribute) {
    result.errors.push(
      `Template "${label}" ${attributeLocation} was not found in solution metadata.`
    );
    return;
  }
  if (attributeName !== attribute.logicalName) {
    result.errors.push(
      `Template "${label}" ${attributeLocation} must exactly match "${attribute.logicalName}".`
    );
  }
  if (!attribute.choiceOptionsByLabel) {
    result.errors.push(
      `Template "${label}" ${attributeLocation} does not reference a local choice column.`
    );
    return;
  }
  if (!contractOptions || typeof contractOptions !== "object" || Array.isArray(contractOptions)) {
    result.errors.push(`Template "${label}" ${attributeLocation} must be an object.`);
    return;
  }

  const contractLabels = new Set(Object.keys(contractOptions));
  for (const [optionLabel, optionValue] of Object.entries(contractOptions)) {
    if (!Number.isInteger(optionValue)) {
      result.errors.push(
        `Template "${label}" ${attributeLocation} option "${optionLabel}" must be an integer.`
      );
      continue;
    }

    const solutionValue = attribute.choiceOptionsByLabel.get(optionLabel);
    if (solutionValue === undefined) {
      result.errors.push(
        `Template "${label}" ${attributeLocation} option "${optionLabel}" was not found in solution metadata.`
      );
    } else if (optionValue !== solutionValue) {
      result.errors.push(
        `Template "${label}" ${attributeLocation} option "${optionLabel}" value ${optionValue} ` +
        `must exactly match solution value ${solutionValue}.`
      );
    }
  }

  for (const optionLabel of attribute.choiceOptionsByLabel.keys()) {
    if (!contractLabels.has(optionLabel)) {
      result.errors.push(
        `Template "${label}" ${attributeLocation} is missing solution option "${optionLabel}".`
      );
    }
  }
}

function validateWebsiteCodeContents(websiteCodeRoot, currentDirectory, label, result) {
  for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, entry.name);
    const relativePath = path.relative(websiteCodeRoot, fullPath).split(path.sep).join("/");

    if (entry.isSymbolicLink()) {
      result.errors.push(`Template "${label}" website-code must not contain symbolic links: ${relativePath}`);
      continue;
    }

    if (entry.isDirectory()) {
      if (FORBIDDEN_WEBSITE_CODE_DIRECTORIES.has(entry.name)) {
        result.errors.push(`Template "${label}" website-code contains excluded directory: ${relativePath}/`);
        continue;
      }

      validateWebsiteCodeContents(websiteCodeRoot, fullPath, label, result);
      continue;
    }

    if (isForbiddenWebsiteCodeFile(entry, relativePath) || isEnvironmentSpecificPortalManifest(relativePath)) {
      result.errors.push(`Template "${label}" website-code contains excluded file: ${relativePath}`);
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
    fileName.toLowerCase().endsWith(".sarif");
}

function isForbiddenWebsiteCodeFile(entry, relativePath) {
  if (isAllowedCodeQlReport(entry, relativePath)) {
    return false;
  }

  return isForbiddenLocalFile(entry.name);
}

function isAllowedCodeQlReport(entry, relativePath) {
  return entry.isFile() &&
    entry.name.toLowerCase().endsWith(".sarif") &&
    relativePath.startsWith(CODEQL_REPORTS_DIRECTORY);
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
          `Template "${label}" site setting ${settingName} must use an explicit column allowlist, not '*': ${relativePath}`
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

function validateWebsiteCodeSourceMetadata(websiteCodePath, label, result) {
  const metadataDirectory = path.join(websiteCodePath, ".powerpages-site", "source-files");
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
      result.errors.push(`Template "${label}" website source metadata must contain partialurl: ${entry.name}`);
      continue;
    }

    const partialUrl = unquoteYamlScalar(partialUrlMatch[1]);
    const sourcePath = resolveWebsiteCodeSourcePath(websiteCodePath, partialUrl, label, entry.name, result);
    if (sourcePath && !fileExists(sourcePath)) {
      result.errors.push(`Template "${label}" website source metadata references a missing file: ${partialUrl}`);
    }
  }
}

function unquoteYamlScalar(value) {
  if (value.length >= 2 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }

  return value;
}

function resolveWebsiteCodeSourcePath(websiteCodePath, partialUrl, label, metadataName, result) {
  if (path.isAbsolute(partialUrl)) {
    result.errors.push(`Template "${label}" website source metadata partialurl must be relative: ${metadataName}`);
    return null;
  }

  const sourcePath = path.resolve(websiteCodePath, partialUrl);
  if (!isPathInsideOrEqual(websiteCodePath, sourcePath) || sourcePath === websiteCodePath) {
    result.errors.push(
      `Template "${label}" website source metadata partialurl must stay inside website-code: ${metadataName}`
    );
    return null;
  }

  return sourcePath;
}

function validateSeedDataPath(
  seedDataPathValue,
  label,
  root,
  expectedDirectory,
  location,
  solutionMetadata,
  result
) {
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
    validateDataverseExportSeedData(
      seedData,
      path.dirname(seedDataPath),
      label,
      solutionMetadata,
      result
    );
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

function validateDataverseExportSeedData(seedData, seedDataDirectory, label, solutionMetadata, result) {
  if (!seedData.tables || typeof seedData.tables !== "object" || Array.isArray(seedData.tables)) {
    result.errors.push(`Template "${label}" Dataverse seed data tables must be an object.`);
    return;
  }

  const tables = [];
  for (const [tableName, table] of Object.entries(seedData.tables)) {
    if (validateDataverseSeedTable(tableName, table, label, result)) {
      tables.push({ name: tableName, table });
    }
  }

  for (const { scope, metadata } of solutionMetadata ?? []) {
    validateDataverseSeedAgainstSolutionMetadata(tables, metadata, scope, label, result);
  }

  if (Object.hasOwn(seedData, "fileExports")) {
    validateDataverseFileExports(seedData.fileExports, seedDataDirectory, label, result);
  }
}

function validateDataverseSeedTable(tableName, table, label, result) {
  const location = `table ${tableName}`;
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} must be an object.`);
    return false;
  }

  const hasLogicalName = validateNonEmptyString(table.logicalName, `${location} logicalName`, label, result);
  const hasEntitySet = validateNonEmptyString(table.entitySet, `${location} entitySet`, label, result);
  const hasIdColumn = validateNonEmptyString(table.idColumn, `${location} idColumn`, label, result);

  if (!Array.isArray(table.records)) {
    result.errors.push(`Template "${label}" Dataverse seed data ${location} records must be an array.`);
    return false;
  }

  return hasLogicalName && hasEntitySet && hasIdColumn;
}

function validateDataverseSeedAgainstSolutionMetadata(tables, metadata, scope, label, result) {
  const seedRecordsByEntitySetAndId = new Map();
  const seedTablesByLogicalName = new Map();
  const tableMetadata = [];

  tables.forEach(({ name, table }, tableIndex) => {
    const location = `table ${name}`;
    const solutionTable = findExactSeedTableMetadata(table, metadata, scope, location, label, result);
    tableMetadata.push(solutionTable);
    seedTablesByLogicalName.set(table.logicalName.toLowerCase(), table);

    table.records.forEach((record, recordIndex) => {
      const recordLocation = `${location} record[${recordIndex}]`;
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        result.errors.push(`Template "${label}" Dataverse seed data ${recordLocation} must be an object.`);
        return;
      }

      const recordId = record[table.idColumn];
      if (typeof recordId !== "string" || !isGuid(recordId)) {
        result.errors.push(
          `Template "${label}" Dataverse seed data ${recordLocation} must include GUID primary key ${table.idColumn}.`
        );
      } else {
        const normalizedId = recordId.toLowerCase();
        const recordKey = getSeedRecordKey(table.entitySet, normalizedId);
        const previous = seedRecordsByEntitySetAndId.get(recordKey);
        if (previous) {
          result.errors.push(
            `Template "${label}" Dataverse seed data duplicates record ID ${recordId}: ${previous.location}, ${recordLocation}.`
          );
        } else {
          seedRecordsByEntitySetAndId.set(recordKey, {
            entitySetName: table.entitySet,
            logicalName: table.logicalName,
            location: recordLocation,
            tableIndex
          });
        }
      }

      if (solutionTable) {
        validateDataverseSeedRecordFields(record, solutionTable, recordLocation, scope, label, result);
      }
    });
  });

  tables.forEach(({ name, table }, tableIndex) => {
    const solutionTable = tableMetadata[tableIndex];
    table.records.forEach((record, recordIndex) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        return;
      }
      const recordLocation = `table ${name} record[${recordIndex}]`;
      validateDataverseSeedCollectionLookups(record, table.logicalName, metadata,
        seedRecordsByEntitySetAndId, seedTablesByLogicalName, tableIndex, recordLocation, label, result);
      if (solutionTable) validateDataverseSeedRecordLookups(
        record,
        solutionTable,
        metadata,
        seedRecordsByEntitySetAndId,
        seedTablesByLogicalName,
        tableIndex,
        recordLocation,
        scope,
        label,
        result
      );
    });
  });
}

function validateDataverseSeedCollectionLookups(record, logicalName, metadata, recordsById, seedTables, tableIndex, location, label, result) {
  for (const [property, value] of Object.entries(record)) {
    if (!property.endsWith("@odata.bind")) continue;
    const navigation = property.slice(0, -"@odata.bind".length);
    const relationship = [...metadata.manyToManyRelationshipsByName.values()].find(relation =>
      (relation.firstTable === logicalName && relation.firstNavigationProperty.toLowerCase() === navigation.toLowerCase()) ||
      (relation.secondTable === logicalName && relation.secondNavigationProperty.toLowerCase() === navigation.toLowerCase()));
    if (!Array.isArray(value) && !relationship) continue;
    if (!relationship) {
      result.errors.push(`Template "${label}" Dataverse seed data ${location} collection lookup "${navigation}" was not found in relationship metadata.`);
      continue;
    }
    const fromFirst = relationship.firstTable === logicalName &&
      relationship.firstNavigationProperty.toLowerCase() === navigation.toLowerCase();
    const expectedNavigation = fromFirst ? relationship.firstNavigationProperty : relationship.secondNavigationProperty;
    const targetLogicalName = fromFirst ? relationship.secondTable : relationship.firstTable;
    if (navigation !== expectedNavigation || !Array.isArray(value)) {
      result.errors.push(`Template "${label}" Dataverse seed data ${location} collection lookup must use exact navigation "${expectedNavigation}" with an array of bindings.`);
      continue;
    }
    const targetTable = metadata.tablesByLogicalName.get(targetLogicalName) ?? seedTables.get(targetLogicalName);
    const expectedSet = targetTable?.entitySetName ?? targetTable?.entitySet;
    const seen = new Set();
    for (const reference of value) {
      const bind = parseODataBind(reference);
      if (!bind || bind.entitySetName !== expectedSet) {
        result.errors.push(`Template "${label}" Dataverse seed data ${location} collection lookup "${navigation}" must target /${expectedSet ?? targetLogicalName}(<guid>).`);
        continue;
      }
      const key = getSeedRecordKey(bind.entitySetName, bind.id);
      const targetRecord = recordsById.get(key);
      if (seen.has(key)) {
        result.errors.push(`Template "${label}" Dataverse seed data ${location} collection lookup "${navigation}" duplicates record ${bind.id}.`);
      }
      seen.add(key);
      if (!targetRecord || targetRecord.logicalName !== targetLogicalName) {
        result.errors.push(`Template "${label}" Dataverse seed data ${location} collection lookup "${navigation}" references record ${bind.id}, which is not present in the target seed table.`);
      } else if (targetRecord.tableIndex >= tableIndex) {
        result.errors.push(`Template "${label}" Dataverse seed data ${location} collection lookup "${navigation}" references ${targetRecord.location}, which must appear in an earlier table.`);
      }
    }
  }
}

function findExactSeedTableMetadata(table, metadata, scope, location, label, result) {
  const solutionTable = metadata.tablesByLogicalName.get(table.logicalName.toLowerCase());
  if (!solutionTable) {
    if (table.logicalName.includes("_")) {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} logicalName "${table.logicalName}" ` +
        `was not found in ${scope} solution metadata.`
      );
      return null;
    }
    return undefined;
  }

  if (table.logicalName !== solutionTable.logicalName) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} logicalName must exactly match "${solutionTable.logicalName}".`
    );
  }
  if (table.entitySet !== solutionTable.entitySetName) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} entitySet must exactly match "${solutionTable.entitySetName}".`
    );
  }
  if (table.idColumn !== solutionTable.primaryKey) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} idColumn must exactly match primary key "${solutionTable.primaryKey}".`
    );
  }

  return solutionTable;
}

function validateDataverseSeedRecordFields(record, solutionTable, location, scope, label, result) {
  for (const propertyName of Object.keys(record)) {
    if (
      propertyName === "@odata.etag" ||
      propertyName === "createdon" ||
      propertyName === "modifiedon" ||
      propertyName.endsWith("@odata.bind") ||
      propertyName.endsWith("@Microsoft.Dynamics.CRM.associatednavigationproperty") ||
      propertyName.endsWith("@OData.Community.Display.V1.FormattedValue") ||
      /^_.+_value$/.test(propertyName)
    ) {
      continue;
    }

    const attribute = solutionTable.attributesByLogicalName.get(propertyName.toLowerCase());
    if (!attribute) {
      const fileAttributeName = propertyName.endsWith("_name")
        ? propertyName.slice(0, -"_name".length)
        : null;
      const fileAttribute = fileAttributeName
        ? solutionTable.attributesByLogicalName.get(fileAttributeName.toLowerCase())
        : null;
      if (fileAttribute?.type === "file") {
        continue;
      }
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} property "${propertyName}" ` +
        `was not found on table "${solutionTable.logicalName}" in ${scope} solution metadata.`
      );
    } else if (propertyName !== attribute.logicalName) {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} property must exactly match "${attribute.logicalName}".`
      );
    } else {
      validateDataverseSeedChoiceValue(
        record[propertyName],
        attribute,
        location,
        scope,
        label,
        result
      );
    }
  }
}

function validateDataverseSeedChoiceValue(value, attribute, location, scope, label, result) {
  if (value === null || !attribute.choiceOptionsByLabel) {
    return;
  }

  const validValues = new Set(attribute.choiceOptionsByLabel.values());
  if (!Number.isInteger(value) || !validValues.has(value)) {
    const expectedValues = [...validValues].sort((left, right) => left - right).join(", ");
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} property "${attribute.logicalName}" ` +
      `value ${JSON.stringify(value)} must match a solution choice value in ${scope}: ${expectedValues}.`
    );
  }
}

function validateDataverseSeedRecordLookups(
  record,
  solutionTable,
  metadata,
  seedRecordsByEntitySetAndId,
  seedTablesByLogicalName,
  tableIndex,
  location,
  scope,
  label,
  result
) {
  for (const [propertyName, value] of Object.entries(record)) {
    if (propertyName.endsWith("@odata.bind")) {
      const navigationProperty = propertyName.slice(0, -"@odata.bind".length);
      if ([...metadata.manyToManyRelationshipsByName.values()].some(relationship =>
        (relationship.firstTable === solutionTable.logicalName && relationship.firstNavigationProperty.toLowerCase() === navigationProperty.toLowerCase()) ||
        (relationship.secondTable === solutionTable.logicalName && relationship.secondNavigationProperty.toLowerCase() === navigationProperty.toLowerCase()))) {
        continue;
      }
      const bind = parseODataBind(value);
      validateDataverseLookupReference({
        bind,
        lookupValue: value,
        metadata,
        navigationProperty,
        propertyName,
        seedRecordsByEntitySetAndId,
        seedTablesByLogicalName,
        solutionTable,
        tableIndex,
        location,
        scope,
        label,
        lookup: null,
        requireSeedRecord: true,
        result
      });
      continue;
    }

    const rawLookupMatch = /^_(.+)_value$/.exec(propertyName);
    if (!rawLookupMatch || value === null) {
      continue;
    }
    if (typeof value !== "string" || !isGuid(value)) {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" ` +
        "must be null or a GUID string."
      );
      continue;
    }
    const lookupAttribute = solutionTable.attributesByLogicalName.get(rawLookupMatch[1].toLowerCase());
    if (!lookupAttribute || lookupAttribute.type !== "lookup") {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} lookup attribute "${rawLookupMatch[1]}" ` +
        `was not found on table "${solutionTable.logicalName}" in ${scope} solution metadata.`
      );
      continue;
    }
    if (rawLookupMatch[1] !== lookupAttribute.logicalName) {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} lookup attribute must exactly match ` +
        `"${lookupAttribute.logicalName}".`
      );
    }

    const navigationProperty =
      record[`${propertyName}@Microsoft.Dynamics.CRM.associatednavigationproperty`];
    if (typeof navigationProperty !== "string" || navigationProperty.length === 0) {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" must include its exact ` +
        "Microsoft.Dynamics.CRM.associatednavigationproperty annotation."
      );
      continue;
    }
    const lookup = solutionTable.lookupsByAttributeLogicalName.get(lookupAttribute.logicalName.toLowerCase());
    validateDataverseLookupReference({
      bind: { entitySetName: null, id: value },
      lookupValue: value,
      metadata,
      navigationProperty,
      propertyName,
      seedRecordsByEntitySetAndId,
      seedTablesByLogicalName,
      solutionTable,
      tableIndex,
      location,
      scope,
      label,
      lookup,
      requireSeedRecord: false,
      result
    });
  }
}

function validateDataverseLookupReference({
  bind,
  lookupValue,
  metadata,
  navigationProperty,
  propertyName,
  seedRecordsByEntitySetAndId,
  seedTablesByLogicalName,
  solutionTable,
  tableIndex,
  location,
  scope,
  label,
  lookup,
  requireSeedRecord,
  result
}) {
  lookup ??= solutionTable.lookupsByNavigationProperty.get(navigationProperty.toLowerCase());
  if (!lookup) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup "${navigationProperty}" ` +
      `was not found on table "${solutionTable.logicalName}" in ${scope} relationship metadata.`
    );
    return;
  }
  if (lookup.navigationProperty && navigationProperty !== lookup.navigationProperty) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup must exactly match navigation property ` +
      `"${lookup.navigationProperty}".`
    );
  }

  if (!bind) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" ` +
      `has invalid record reference "${lookupValue}".`
    );
    return;
  }

  const targetTable = metadata.tablesBySchemaName.get(lookup.targetSchemaName.toLowerCase());
  const targetSeedTable = seedTablesByLogicalName.get(lookup.targetSchemaName.toLowerCase());
  const expectedEntitySetName = targetTable?.entitySetName ?? targetSeedTable?.entitySet ?? null;
  if (expectedEntitySetName && bind.entitySetName && bind.entitySetName !== expectedEntitySetName) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" ` +
      `must target entity set "${expectedEntitySetName}".`
    );
  }

  const referencedEntitySetName = bind.entitySetName ?? expectedEntitySetName;
  const targetSeedRecord = referencedEntitySetName
    ? seedRecordsByEntitySetAndId.get(getSeedRecordKey(referencedEntitySetName, bind.id))
    : null;
  if (!targetSeedRecord) {
    if (requireSeedRecord && referencedEntitySetName) {
      result.errors.push(
        `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" ` +
        `references record ${bind.id}, which is not present in the seed data.`
      );
    }
    return;
  }
  if (bind.entitySetName && targetSeedRecord.entitySetName !== bind.entitySetName) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" targets ` +
      `"${bind.entitySetName}", but record ${bind.id} belongs to "${targetSeedRecord.entitySetName}".`
    );
  }
  if (lookup.targetSchemaName.toLowerCase() !== targetSeedRecord.logicalName.toLowerCase()) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" targets table ` +
      `"${targetSeedRecord.logicalName}", but relationship metadata targets "${lookup.targetSchemaName}".`
    );
  }
  if (targetSeedRecord.tableIndex >= tableIndex) {
    result.errors.push(
      `Template "${label}" Dataverse seed data ${location} lookup "${propertyName}" references ` +
      `${targetSeedRecord.location}, which must appear in an earlier table.`
    );
  }
}

function getSeedRecordKey(entitySetName, id) {
  return `${entitySetName.toLowerCase()}\0${id.toLowerCase()}`;
}

function parseODataBind(value) {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^\/([^/()]+)\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i.exec(value);
  return match ? { entitySetName: match[1], id: match[2] } : null;
}

function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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
