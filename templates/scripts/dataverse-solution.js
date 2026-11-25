#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const API_VERSION = "v9.2";
const SUPPORTED_COLUMN_TYPES = new Set([
  "boolean",
  "choice",
  "datetime",
  "decimal",
  "integer",
  "memo",
  "money",
  "string"
]);
const REQUIRED_LEVELS = new Set(["None", "Recommended", "ApplicationRequired"]);
const OWNERSHIP_TYPES = new Set(["UserOwned", "OrganizationOwned"]);
const PREFIX = /^[a-z][a-z0-9]{1,7}$/;
const COMPONENT_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const UNIQUE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VERSION = /^\d+\.\d+\.\d+\.\d+$/;

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function approvalHash(planWithoutHash) {
  return crypto.createHash("sha256").update(stableStringify(planWithoutHash)).digest("hex");
}

function normalizeEnvironmentUrl(environmentUrl) {
  const parsed = new URL(environmentUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Environment URL must be an HTTPS origin without credentials, query, or fragment.");
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("Environment URL must not include a path.");
  }
  return parsed.origin;
}

function executionApprovalHash(plan, environmentUrl) {
  return crypto
    .createHash("sha256")
    .update(`${plan.approvalHash}\0${normalizeEnvironmentUrl(environmentUrl)}`)
    .digest("hex");
}

function label(text, languageCode) {
  return {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    LocalizedLabels: [{
      "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
      Label: text,
      LanguageCode: languageCode
    }]
  };
}

function requiredLevel(value) {
  return {
    Value: value,
    CanBeChanged: true,
    ManagedPropertyLogicalName: "canmodifyrequirementlevelsettings"
  };
}

function pascalCase(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function logicalName(prefix, name) {
  return `${prefix}_${name.replace(/[-_\s]+/g, "").toLowerCase()}`;
}

function schemaName(prefix, name) {
  return `${prefix}_${pascalCase(name)}`;
}

function validateSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    return ["The Dataverse specification must be an object."];
  }
  if (spec.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }
  const publisher = spec.publisher ?? {};
  if (!UNIQUE_NAME.test(publisher.uniqueName ?? "")) {
    errors.push("publisher.uniqueName is invalid.");
  }
  if (typeof publisher.friendlyName !== "string" || publisher.friendlyName.length === 0) {
    errors.push("publisher.friendlyName is required.");
  }
  if (!PREFIX.test(publisher.prefix ?? "")) {
    errors.push("publisher.prefix must contain 2-8 lowercase letters or digits and start with a letter.");
  }
  if (
    !Number.isInteger(publisher.optionValuePrefix) ||
    publisher.optionValuePrefix < 10000 ||
    publisher.optionValuePrefix > 99999
  ) {
    errors.push("publisher.optionValuePrefix must be an integer from 10000 through 99999.");
  }
  const solution = spec.solution ?? {};
  if (!UNIQUE_NAME.test(solution.uniqueName ?? "")) {
    errors.push("solution.uniqueName is invalid.");
  }
  if (typeof solution.friendlyName !== "string" || solution.friendlyName.length === 0) {
    errors.push("solution.friendlyName is required.");
  }
  if (!VERSION.test(solution.version ?? "")) {
    errors.push("solution.version must use four numeric parts.");
  }
  const languageCode = spec.languageCode ?? 1033;
  if (!Number.isInteger(languageCode) || languageCode < 1) {
    errors.push("languageCode must be a positive LCID.");
  }
  if (!Array.isArray(spec.tables) || spec.tables.length === 0) {
    errors.push("tables must contain at least one table.");
    return errors;
  }

  const tableNames = new Set();
  for (const table of spec.tables) {
    if (!COMPONENT_NAME.test(table?.name ?? "")) {
      errors.push("Every table name must start with a letter and contain only letters and digits.");
      continue;
    }
    if (tableNames.has(table.name.toLowerCase())) {
      errors.push(`Duplicate table name "${table.name}".`);
    }
    tableNames.add(table.name.toLowerCase());
    for (const property of ["displayName", "displayCollectionName", "description"]) {
      if (typeof table[property] !== "string" || table[property].length === 0) {
        errors.push(`Table "${table.name}" ${property} is required.`);
      }
    }
    if (!OWNERSHIP_TYPES.has(table.ownership)) {
      errors.push(`Table "${table.name}" has unsupported ownership "${table.ownership}".`);
    }
    if (!table.primaryName || !COMPONENT_NAME.test(table.primaryName.name ?? "")) {
      errors.push(`Table "${table.name}" requires a valid primaryName.`);
    } else if (
      typeof table.primaryName.displayName !== "string" ||
      !Number.isInteger(table.primaryName.maxLength) ||
      table.primaryName.maxLength < 1 ||
      table.primaryName.maxLength > 850
    ) {
      errors.push(`Table "${table.name}" primaryName is invalid.`);
    }
    const columnNames = new Set();
    for (const column of table.columns ?? []) {
      if (!COMPONENT_NAME.test(column?.name ?? "")) {
        errors.push(`Table "${table.name}" contains an invalid column name.`);
        continue;
      }
      if (columnNames.has(column.name.toLowerCase())) {
        errors.push(`Table "${table.name}" contains duplicate column "${column.name}".`);
      }
      columnNames.add(column.name.toLowerCase());
      if (!SUPPORTED_COLUMN_TYPES.has(column.type)) {
        errors.push(`Column "${table.name}.${column.name}" has unsupported type "${column.type}".`);
      }
      if (!REQUIRED_LEVELS.has(column.required ?? "None")) {
        errors.push(`Column "${table.name}.${column.name}" has invalid required level.`);
      }
      for (const property of ["displayName", "description"]) {
        if (typeof column[property] !== "string" || column[property].length === 0) {
          errors.push(`Column "${table.name}.${column.name}" ${property} is required.`);
        }
      }
      if (column.type === "choice") {
        if (!Array.isArray(column.options) || column.options.length < 2) {
          errors.push(`Choice column "${table.name}.${column.name}" requires at least two options.`);
        } else if (new Set(column.options.map((option) => option.label)).size !== column.options.length) {
          errors.push(`Choice column "${table.name}.${column.name}" contains duplicate labels.`);
        }
      }
    }
  }

  const relationshipNames = new Set();
  for (const relationship of spec.relationships ?? []) {
    if (!COMPONENT_NAME.test(relationship?.name ?? "")) {
      errors.push("Every relationship requires a valid name.");
      continue;
    }
    if (relationshipNames.has(relationship.name.toLowerCase())) {
      errors.push(`Duplicate relationship name "${relationship.name}".`);
    }
    relationshipNames.add(relationship.name.toLowerCase());
    if (!tableNames.has(String(relationship.oneTable).toLowerCase())) {
      errors.push(`Relationship "${relationship.name}" references unknown oneTable.`);
    }
    if (!tableNames.has(String(relationship.manyTable).toLowerCase())) {
      errors.push(`Relationship "${relationship.name}" references unknown manyTable.`);
    }
    if (!relationship.lookup || !COMPONENT_NAME.test(relationship.lookup.name ?? "")) {
      errors.push(`Relationship "${relationship.name}" requires a valid lookup.`);
    } else {
      if (typeof relationship.lookup.displayName !== "string" || relationship.lookup.displayName.length === 0) {
        errors.push(`Relationship "${relationship.name}" lookup displayName is required.`);
      }
      if (typeof relationship.lookup.description !== "string" || relationship.lookup.description.length === 0) {
        errors.push(`Relationship "${relationship.name}" lookup description is required.`);
      }
      if (!REQUIRED_LEVELS.has(relationship.lookup.required ?? "None")) {
        errors.push(`Relationship "${relationship.name}" lookup required level is invalid.`);
      }
    }
  }
  return errors;
}

function normalizeColumn(column, prefix, optionValuePrefix, languageCode) {
  const normalized = {
    name: column.name,
    logicalName: logicalName(prefix, column.name),
    schemaName: schemaName(prefix, column.name),
    displayName: column.displayName,
    description: column.description,
    type: column.type,
    required: column.required ?? "None",
    languageCode
  };
  for (const property of [
    "dateTimeBehavior",
    "defaultValue",
    "format",
    "maxLength",
    "maxValue",
    "minValue",
    "precision"
  ]) {
    if (column[property] !== undefined) {
      normalized[property] = column[property];
    }
  }
  if (column.type === "choice") {
    normalized.options = column.options.map((option, index) => ({
      label: option.label,
      value: option.value ?? optionValuePrefix * 10000 + index
    }));
  }
  if (column.type === "boolean") {
    normalized.trueLabel = column.trueLabel ?? "Yes";
    normalized.falseLabel = column.falseLabel ?? "No";
    normalized.defaultValue = column.defaultValue ?? false;
  }
  return normalized;
}

function buildPlan(spec) {
  const errors = validateSpec(spec);
  if (errors.length > 0) {
    throw new Error(`Invalid Dataverse specification:\n- ${errors.join("\n- ")}`);
  }
  const languageCode = spec.languageCode ?? 1033;
  const prefix = spec.publisher.prefix;
  const tableMap = new Map();
  const tables = spec.tables.map((table) => {
    const normalized = {
      name: table.name,
      logicalName: logicalName(prefix, table.name),
      schemaName: schemaName(prefix, table.name),
      displayName: table.displayName,
      displayCollectionName: table.displayCollectionName,
      description: table.description,
      ownership: table.ownership,
      hasActivities: table.hasActivities ?? false,
      hasNotes: table.hasNotes ?? false,
      languageCode,
      primaryName: {
        name: table.primaryName.name,
        logicalName: logicalName(prefix, table.primaryName.name),
        schemaName: schemaName(prefix, table.primaryName.name),
        displayName: table.primaryName.displayName,
        description: table.primaryName.description ?? table.primaryName.displayName,
        maxLength: table.primaryName.maxLength,
        required: table.primaryName.required ?? "ApplicationRequired"
      },
      columns: (table.columns ?? []).map((column) =>
        normalizeColumn(column, prefix, spec.publisher.optionValuePrefix, languageCode)
      )
    };
    tableMap.set(table.name.toLowerCase(), normalized);
    return normalized;
  });

  const relationships = (spec.relationships ?? []).map((relationship) => {
    const oneTable = tableMap.get(relationship.oneTable.toLowerCase());
    const manyTable = tableMap.get(relationship.manyTable.toLowerCase());
    return {
      name: relationship.name,
      schemaName: schemaName(prefix, relationship.name),
      oneTable: oneTable.logicalName,
      manyTable: manyTable.logicalName,
      lookup: {
        name: relationship.lookup.name,
        logicalName: logicalName(prefix, relationship.lookup.name),
        schemaName: `${schemaName(prefix, relationship.lookup.name)}Id`,
        displayName: relationship.lookup.displayName,
        description: relationship.lookup.description,
        required: relationship.lookup.required ?? "None"
      },
      associatedMenuLabel: relationship.associatedMenuLabel ?? manyTable.displayCollectionName,
      languageCode
    };
  });

  const core = {
    planVersion: 1,
    publisher: {
      uniqueName: spec.publisher.uniqueName,
      friendlyName: spec.publisher.friendlyName,
      prefix,
      optionValuePrefix: spec.publisher.optionValuePrefix
    },
    solution: {
      uniqueName: spec.solution.uniqueName,
      friendlyName: spec.solution.friendlyName,
      version: spec.solution.version
    },
    languageCode,
    tables,
    relationships,
    operations: [
      `Ensure publisher ${spec.publisher.uniqueName}`,
      `Ensure unmanaged solution ${spec.solution.uniqueName}`,
      ...tables.flatMap((table) => [
        `Create table ${table.logicalName}`,
        ...table.columns.map((column) => `Create column ${table.logicalName}.${column.logicalName}`)
      ]),
      ...relationships.map((relationship) => `Create relationship ${relationship.schemaName}`),
      "Publish all customizations"
    ]
  };
  return { ...core, approvalHash: approvalHash(core) };
}

function tablePayload(table) {
  return {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: table.schemaName,
    Description: label(table.description, table.languageCode),
    DisplayCollectionName: label(table.displayCollectionName, table.languageCode),
    DisplayName: label(table.displayName, table.languageCode),
    HasActivities: table.hasActivities,
    HasNotes: table.hasNotes,
    IsActivity: false,
    OwnershipType: table.ownership,
    Attributes: [{
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      AttributeType: "String",
      AttributeTypeName: { Value: "StringType" },
      Description: label(table.primaryName.description, table.languageCode),
      DisplayName: label(table.primaryName.displayName, table.languageCode),
      IsPrimaryName: true,
      RequiredLevel: requiredLevel(table.primaryName.required),
      SchemaName: table.primaryName.schemaName,
      FormatName: { Value: "Text" },
      MaxLength: table.primaryName.maxLength
    }]
  };
}

function columnPayload(column) {
  const common = {
    Description: label(column.description, column.languageCode),
    DisplayName: label(column.displayName, column.languageCode),
    RequiredLevel: requiredLevel(column.required),
    SchemaName: column.schemaName
  };
  switch (column.type) {
    case "string":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        AttributeType: "String",
        AttributeTypeName: { Value: "StringType" },
        FormatName: { Value: column.format ?? "Text" },
        MaxLength: column.maxLength ?? 100
      };
    case "memo":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        AttributeType: "Memo",
        AttributeTypeName: { Value: "MemoType" },
        Format: column.format ?? "TextArea",
        MaxLength: column.maxLength ?? 2000
      };
    case "integer":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        AttributeType: "Integer",
        AttributeTypeName: { Value: "IntegerType" },
        Format: column.format ?? "None",
        MinValue: column.minValue ?? -2147483648,
        MaxValue: column.maxValue ?? 2147483647
      };
    case "decimal":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
        AttributeType: "Decimal",
        AttributeTypeName: { Value: "DecimalType" },
        MinValue: column.minValue ?? -100000000000,
        MaxValue: column.maxValue ?? 100000000000,
        Precision: column.precision ?? 2
      };
    case "money":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
        AttributeType: "Money",
        AttributeTypeName: { Value: "MoneyType" },
        MinValue: column.minValue ?? 0,
        MaxValue: column.maxValue ?? 922337203685477,
        PrecisionSource: 2
      };
    case "datetime":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        AttributeType: "DateTime",
        AttributeTypeName: { Value: "DateTimeType" },
        Format: column.format ?? "DateAndTime",
        DateTimeBehavior: { Value: column.dateTimeBehavior ?? "UserLocal" }
      };
    case "boolean":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        AttributeType: "Boolean",
        AttributeTypeName: { Value: "BooleanType" },
        DefaultValue: column.defaultValue,
        OptionSet: {
          OptionSetType: "Boolean",
          TrueOption: {
            Value: 1,
            Label: label(column.trueLabel, column.languageCode)
          },
          FalseOption: {
            Value: 0,
            Label: label(column.falseLabel, column.languageCode)
          }
        }
      };
    case "choice":
      return {
        ...common,
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        AttributeType: "Picklist",
        AttributeTypeName: { Value: "PicklistType" },
        OptionSet: {
          "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
          IsGlobal: false,
          OptionSetType: "Picklist",
          Options: column.options.map((option) => ({
            Value: option.value,
            Label: label(option.label, column.languageCode)
          }))
        }
      };
    default:
      throw new Error(`Unsupported column type ${column.type}.`);
  }
}

function relationshipPayload(relationship) {
  return {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: relationship.schemaName,
    AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName",
      Group: "Details",
      Label: label(relationship.associatedMenuLabel, relationship.languageCode),
      Order: 10000
    },
    CascadeConfiguration: {
      Assign: "NoCascade",
      Delete: "RemoveLink",
      Merge: "NoCascade",
      Reparent: "NoCascade",
      Share: "NoCascade",
      Unshare: "NoCascade"
    },
    ReferencedAttribute: `${relationship.oneTable}id`,
    ReferencedEntity: relationship.oneTable,
    ReferencingEntity: relationship.manyTable,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      AttributeType: "Lookup",
      AttributeTypeName: { Value: "LookupType" },
      Description: label(relationship.lookup.description, relationship.languageCode),
      DisplayName: label(relationship.lookup.displayName, relationship.languageCode),
      RequiredLevel: requiredLevel(relationship.lookup.required),
      SchemaName: relationship.lookup.schemaName
    }
  };
}

function isTransientMetadataError(error) {
  const status = Number(error?.status);
  const details = String(error?.details ?? error?.message ?? "");
  return status === 429 ||
    status >= 500 ||
    /0x80040216/i.test(details) ||
    /another \[(?:EntityCustomization|PublishAll)\] running/i.test(details);
}

async function retryMetadataOperation({
  operation,
  execute,
  exists,
  journal,
  sleep,
  maxAttempts = 6
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await execute();
      return;
    } catch (error) {
      if (exists && await exists()) {
        journal.retries.push({
          operation,
          attempt,
          outcome: "verified-after-error"
        });
        return;
      }
      if (!isTransientMetadataError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = attempt * 5000;
      journal.retries.push({
        operation,
        attempt,
        delayMs,
        status: error.status ?? null
      });
      await sleep(delayMs);
    }
  }
}

async function applyPlan(plan, client, options = {}) {
  if (!plan || plan.planVersion !== 1) {
    throw new Error("Unsupported or missing Dataverse plan.");
  }
  const journal = { completed: [], tables: {}, retries: [] };
  const sleep = options.sleep ?? ((delayMs) =>
    new Promise((resolve) => setTimeout(resolve, delayMs)));
  try {
    const existingPublisher = await client.findPublisher(plan.publisher.uniqueName);
    let publisherId;
    if (existingPublisher) {
      if (
        existingPublisher.customizationprefix !== plan.publisher.prefix ||
        existingPublisher.customizationoptionvalueprefix !== plan.publisher.optionValuePrefix
      ) {
        throw new Error(`Existing publisher ${plan.publisher.uniqueName} does not match the approved plan.`);
      }
      publisherId = existingPublisher.publisherid;
      journal.completed.push(`publisher:${plan.publisher.uniqueName}:existing`);
    } else {
      publisherId = await client.createPublisher(plan.publisher);
      journal.completed.push(`publisher:${plan.publisher.uniqueName}:created`);
    }

    const existingSolution = await client.findSolution(plan.solution.uniqueName);
    if (existingSolution) {
      if (existingSolution.version !== plan.solution.version) {
        throw new Error(`Existing solution ${plan.solution.uniqueName} has a different version.`);
      }
      if (
        typeof existingSolution._publisherid_value !== "string" ||
        existingSolution._publisherid_value.toLowerCase() !== publisherId.toLowerCase()
      ) {
        throw new Error(`Existing solution ${plan.solution.uniqueName} belongs to a different publisher.`);
      }
      journal.completed.push(`solution:${plan.solution.uniqueName}:existing`);
    } else {
      await client.createSolution(plan.solution, publisherId);
      journal.completed.push(`solution:${plan.solution.uniqueName}:created`);
    }

    for (const table of plan.tables) {
      if (await client.findTable(table.schemaName)) {
        throw new Error(`Table ${table.schemaName} already exists; clean-environment apply is required.`);
      }
      const tableId = await client.createTable(table, plan.solution.uniqueName);
      journal.tables[table.logicalName] = tableId;
      journal.completed.push(`table:${table.logicalName}`);
      for (const column of table.columns) {
        await retryMetadataOperation({
          operation: `column:${table.logicalName}.${column.logicalName}`,
          execute: () =>
            client.createColumn(table.logicalName, column, plan.solution.uniqueName),
          exists: typeof client.findColumn === "function"
            ? () => client.findColumn(table.logicalName, column.logicalName)
            : null,
          journal,
          sleep
        });
        journal.completed.push(`column:${table.logicalName}.${column.logicalName}`);
      }
    }

    for (const relationship of plan.relationships) {
      if (await client.findRelationship(relationship.schemaName)) {
        throw new Error(`Relationship ${relationship.schemaName} already exists; clean-environment apply is required.`);
      }
      await retryMetadataOperation({
        operation: `relationship:${relationship.schemaName}`,
        execute: () =>
          client.createRelationship(relationship, plan.solution.uniqueName),
        exists: () => client.findRelationship(relationship.schemaName),
        journal,
        sleep
      });
      journal.completed.push(`relationship:${relationship.schemaName}`);
    }

    await retryMetadataOperation({
      operation: "publish",
      execute: () => client.publish(),
      exists: null,
      journal,
      sleep
    });
    journal.completed.push("publish");
    return journal;
  } catch (error) {
    error.journal = journal;
    throw error;
  }
}

class DataverseWebApiClient {
  constructor({ environmentUrl, token, fetchImpl = globalThis.fetch }) {
    this.environmentUrl = environmentUrl.replace(/\/+$/, "");
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async request(method, relativePath, { body, solutionUniqueName, allowNotFound = false } = {}) {
    const response = await this.fetchImpl(
      `${this.environmentUrl}/api/data/${API_VERSION}/${relativePath}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          ...(solutionUniqueName ? { "MSCRM.SolutionUniqueName": solutionUniqueName } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      }
    );
    if (allowNotFound && response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const details = await response.text();
      const error = new Error(`${method} ${relativePath} failed with ${response.status}: ${details}`);
      error.status = response.status;
      error.details = details;
      throw error;
    }
    if (response.status === 204) {
      return {
        entityId: response.headers.get("odata-entityid") ?? response.headers.get("OData-EntityId")
      };
    }
    return response.json();
  }

  async findPublisher(uniqueName) {
    const result = await this.request(
      "GET",
      `publishers?$select=publisherid,uniquename,customizationprefix,customizationoptionvalueprefix&$filter=uniquename eq '${odataString(uniqueName)}'`
    );
    return result.value?.[0] ?? null;
  }

  async whoAmI() {
    return this.request("GET", "WhoAmI");
  }

  async createPublisher(publisher) {
    const response = await this.request("POST", "publishers", {
      body: {
        uniquename: publisher.uniqueName,
        friendlyname: publisher.friendlyName,
        customizationprefix: publisher.prefix,
        customizationoptionvalueprefix: publisher.optionValuePrefix
      }
    });
    return guidFromEntityId(response.entityId, "publisher");
  }

  async findSolution(uniqueName) {
    const result = await this.request(
      "GET",
      `solutions?$select=solutionid,uniquename,version,_publisherid_value&$filter=uniquename eq '${odataString(uniqueName)}'`
    );
    return result.value?.[0] ?? null;
  }

  async createSolution(solution, publisherId) {
    await this.request("POST", "solutions", {
      body: {
        uniquename: solution.uniqueName,
        friendlyname: solution.friendlyName,
        version: solution.version,
        "publisherid@odata.bind": `/publishers(${publisherId})`
      }
    });
  }

  async findTable(schemaNameValue) {
    const result = await this.request(
      "GET",
      `EntityDefinitions?$select=MetadataId,LogicalName,SchemaName&$filter=SchemaName eq '${odataString(schemaNameValue)}'`
    );
    return result.value?.[0] ?? null;
  }

  async createTable(table, solutionUniqueName) {
    const response = await this.request("POST", "EntityDefinitions", {
      body: tablePayload(table),
      solutionUniqueName
    });
    return guidFromEntityId(response.entityId, `table ${table.schemaName}`);
  }

  async createColumn(tableLogicalName, column, solutionUniqueName) {
    await this.request(
      "POST",
      `EntityDefinitions(LogicalName='${odataString(tableLogicalName)}')/Attributes`,
      { body: columnPayload(column), solutionUniqueName }
    );
  }

  async findColumn(tableLogicalName, columnLogicalName) {
    const result = await this.request(
      "GET",
      `EntityDefinitions(LogicalName='${odataString(tableLogicalName)}')/Attributes?` +
      `$select=MetadataId,LogicalName,SchemaName&` +
      `$filter=LogicalName eq '${odataString(columnLogicalName)}'`
    );
    return result.value?.[0] ?? null;
  }

  async findRelationship(schemaNameValue) {
    const result = await this.request(
      "GET",
      `RelationshipDefinitions?$select=MetadataId,SchemaName&$filter=SchemaName eq '${odataString(schemaNameValue)}'`
    );
    return result.value?.[0] ?? null;
  }

  async createRelationship(relationship, solutionUniqueName) {
    await this.request("POST", "RelationshipDefinitions", {
      body: relationshipPayload(relationship),
      solutionUniqueName
    });
  }

  async publish() {
    await this.request("POST", "PublishAllXml", { body: {} });
  }
}

function odataString(value) {
  return value.replaceAll("'", "''");
}

function guidFromEntityId(entityId, description) {
  const match = /\(([0-9a-f-]{36})\)$/i.exec(entityId ?? "");
  if (!match) {
    throw new Error(`Dataverse did not return a metadata ID for ${description}.`);
  }
  return match[1];
}

function runPac(args, options = {}) {
  const result = spawnSync("pac", args, {
    cwd: options.cwd,
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error(`pac ${args.join(" ")} failed: ${childProcessError(result)}`);
  }
  return result.stdout.trim();
}

function runAz(args) {
  const result = process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec,
        ["/d", "/s", "/c", `az ${args.map(quoteCmdArgument).join(" ")}`],
        { encoding: "utf8", windowsHide: true }
      )
    : spawnSync("az", args, { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`az ${args.join(" ")} failed: ${childProcessError(result)}`);
  }
  return result.stdout.trim();
}

function quoteCmdArgument(value) {
  if (!/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    throw new Error("Azure CLI argument contains unsupported characters.");
  }
  return value;
}

function childProcessError(result) {
  return (result.error?.message || result.stderr || result.stdout || "unknown child-process error").trim();
}

function parseAccessToken(output) {
  const match = /(?:^|\r?\n)\s*(?:Token:\s*|Bearer\s+)?(eyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,})\s*(?:\r?\n|$)/m.exec(
    output
  );
  if (!match) {
    throw new Error("PAC did not return a recognizable access token.");
  }
  return match[1];
}

function getDataverseToken(environmentUrl) {
  return parseAccessToken(runAz([
    "account",
    "get-access-token",
    "--resource",
    environmentUrl,
    "--query",
    "accessToken",
    "--output",
    "tsv"
  ]));
}

function assertApproved(plan, approvedHash) {
  if (plan.approvalHash !== approvedHash) {
    throw new Error("Approval hash does not match the immutable Dataverse plan.");
  }
  const { approvalHash: ignored, ...core } = plan;
  if (approvalHash(core) !== plan.approvalHash) {
    throw new Error("Dataverse plan contents do not match its approval hash.");
  }
}

function assertExecutionApproved(plan, environmentUrl, approvedHash) {
  assertApproved(plan, plan.approvalHash);
  if (executionApprovalHash(plan, environmentUrl) !== approvedHash) {
    throw new Error("Approval hash does not match the immutable plan and target environment.");
  }
}

function exportAndUnpack({ plan, environmentUrl, familyRoot, pacRunner = runPac }) {
  const solutionFolder = path.resolve(familyRoot, "solutions", plan.solution.uniqueName);
  if (fs.existsSync(solutionFolder)) {
    throw new Error(`Refusing to overwrite existing solution folder: ${solutionFolder}`);
  }
  fs.mkdirSync(path.dirname(solutionFolder), { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-pages-template-solution-"));
  const zipPath = path.join(tempRoot, `${plan.solution.uniqueName}.zip`);
  try {
    pacRunner([
      "solution",
      "export",
      "--environment",
      environmentUrl,
      "--name",
      plan.solution.uniqueName,
      "--path",
      zipPath,
      "--managed",
      "false",
      "--overwrite"
    ]);
    pacRunner([
      "solution",
      "unpack",
      "--zipfile",
      zipPath,
      "--folder",
      solutionFolder,
      "--packagetype",
      "Unmanaged"
    ]);
    const solutionXmlPath = path.join(solutionFolder, "Other", "Solution.xml");
    if (!fs.existsSync(solutionXmlPath)) {
      throw new Error("PAC unpack did not create Other/Solution.xml.");
    }
    const solutionXml = fs.readFileSync(solutionXmlPath, "utf8");
    if (!new RegExp(`<UniqueName>\\s*${escapeRegExp(plan.solution.uniqueName)}\\s*</UniqueName>`, "i").test(solutionXml)) {
      throw new Error("Unpacked solution unique name does not match the approved plan.");
    }
    if (!/<Managed>\s*0\s*<\/Managed>/i.test(solutionXml)) {
      throw new Error("Unpacked solution is not authoritative unmanaged metadata.");
    }
    return solutionFolder;
  } catch (error) {
    if (fs.existsSync(solutionFolder)) {
      fs.rmSync(solutionFolder, { recursive: true, force: true });
    }
    throw error;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      if (!args.spec || !args.out) {
        throw new Error("plan requires --spec and --out.");
      }
      const plan = buildPlan(JSON.parse(fs.readFileSync(path.resolve(args.spec), "utf8")));
      fs.writeFileSync(path.resolve(args.out), JSON.stringify(plan, null, 2) + "\n");
      console.log(`Wrote Dataverse plan to ${path.resolve(args.out)}.`);
      console.log(`Approval hash: ${plan.approvalHash}`);
      for (const operation of plan.operations) {
        console.log(`- ${operation}`);
      }
      return;
    }
    if (args.command === "apply") {
      if (!args.plan || !args.environment || !args.approve || !args.journal) {
        throw new Error("apply requires --plan, --environment, --approve, and --journal.");
      }
      const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), "utf8"));
      const environmentUrl = normalizeEnvironmentUrl(args.environment);
      assertExecutionApproved(plan, environmentUrl, args.approve);
      runPac(["env", "select", "--environment", environmentUrl]);
      const client = new DataverseWebApiClient({
        environmentUrl,
        token: getDataverseToken(environmentUrl)
      });
      await client.whoAmI();
      try {
        const journal = await applyPlan(plan, client);
        fs.writeFileSync(path.resolve(args.journal), JSON.stringify(journal, null, 2) + "\n");
      } catch (error) {
        fs.writeFileSync(
          path.resolve(args.journal),
          JSON.stringify({
            ...(error.journal ?? {}),
            error: error.message,
            incomplete: true
          }, null, 2) + "\n"
        );
        throw error;
      }
      console.log("Dataverse plan applied and published.");
      return;
    }
    if (args.command === "export") {
      if (!args.plan || !args.environment || !args.approve || !args["family-root"]) {
        throw new Error("export requires --plan, --environment, --approve, and --family-root.");
      }
      const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), "utf8"));
      const environmentUrl = normalizeEnvironmentUrl(args.environment);
      assertExecutionApproved(plan, environmentUrl, args.approve);
      const folder = exportAndUnpack({
        plan,
        environmentUrl,
        familyRoot: args["family-root"]
      });
      console.log(`Exported authoritative unmanaged solution to ${folder}.`);
      return;
    }
    if (args.command === "approval") {
      if (!args.plan || !args.environment) {
        throw new Error("approval requires --plan and --environment.");
      }
      const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), "utf8"));
      assertApproved(plan, plan.approvalHash);
      const environmentUrl = normalizeEnvironmentUrl(args.environment);
      console.log(`Environment: ${environmentUrl}`);
      console.log(`Execution approval hash: ${executionApprovalHash(plan, environmentUrl)}`);
      return;
    }
    throw new Error("Command must be plan, approval, apply, or export.");
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  DataverseWebApiClient,
  applyPlan,
  approvalHash,
  assertApproved,
  assertExecutionApproved,
  buildPlan,
  columnPayload,
  executionApprovalHash,
  exportAndUnpack,
  getDataverseToken,
  isTransientMetadataError,
  normalizeEnvironmentUrl,
  parseAccessToken,
  relationshipPayload,
  retryMetadataOperation,
  stableStringify,
  tablePayload,
  validateSpec
};
