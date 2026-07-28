#!/usr/bin/env node

// Reports what a Power Pages solution zip actually contains so the template
// README, manifest entry, and seed data can be written from facts instead of
// assumptions.
//
// Usage:
//   node inspect-solution-zip.js <path-to-solution.zip> [--json] [--list-source-files]
//
// The zip reading here is deliberately dependency-free because this repo has no
// package.json at the root and CI runs plain Node. It mirrors the reader in
// templates/scripts/validate-templates.js.

const fs = require("node:fs");
const zlib = require("node:zlib");

// Dataverse solution component type codes. Only the ones a Power Pages template
// solution realistically carries are mapped; anything else is reported by number.
// See https://learn.microsoft.com/power-apps/developer/data-platform/reference/entities/solutioncomponent
const COMPONENT_TYPE_NAMES = {
  1: "Table",
  2: "Column",
  9: "Option set",
  20: "Security role",
  26: "View",
  29: "Process or cloud flow",
  59: "Chart",
  60: "Form",
  61: "Web resource",
  62: "Site map",
  70: "Field security profile",
  80: "Model-driven app",
  92: "Plug-in step",
  300: "Canvas app",
  371: "Connection reference",
  380: "Environment variable definition",
  381: "Environment variable value"
};

function main() {
  const args = process.argv.slice(2);
  const zipPath = args.find((arg) => !arg.startsWith("--"));
  const asJson = args.includes("--json");
  const listSourceFiles = args.includes("--list-source-files");

  if (!zipPath) {
    console.error("Usage: node inspect-solution-zip.js <path-to-solution.zip> [--json] [--list-source-files]");
    process.exitCode = 2;
    return;
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`error: solution zip does not exist: ${zipPath}`);
    process.exitCode = 2;
    return;
  }

  const buffer = fs.readFileSync(zipPath);

  // Git LFS pointers are small text files that look like a committed zip until
  // you open them. Catching that here saves a confusing zip parse error later.
  if (buffer.subarray(0, 64).toString("utf8").startsWith("version https://git-lfs")) {
    console.error(`error: ${zipPath} is a Git LFS pointer, not a real zip. Run 'git lfs pull' first.`);
    process.exitCode = 1;
    return;
  }

  let entries;
  let solutionXml;
  try {
    entries = readZipEntries(buffer);
    solutionXml = readEntryText(buffer, entries, "solution.xml");
  } catch (error) {
    console.error(`error: could not read ${zipPath} as a solution zip: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (!solutionXml) {
    console.error(`error: ${zipPath} does not contain solution.xml, so it is not a solution export`);
    process.exitCode = 1;
    return;
  }

  const report = {
    zipPath,
    zipSizeBytes: buffer.length,
    managedState: detectManagedState(solutionXml),
    uniqueName: readTag(solutionXml, "UniqueName"),
    displayName: readLocalizedName(solutionXml),
    version: readTag(solutionXml, "Version"),
    publisherPrefix: readTag(solutionXml, "CustomizationPrefix"),
    rootComponents: summarizeRootComponents(solutionXml),
    missingDependencies: readMissingDependencies(solutionXml),
    siteComponentCount: countComponentFolders(entries, "powerpagecomponents/"),
    siteWebFileCount: listFileContent(entries, "powerpagecomponents/").length,
    siteSourceFiles: listFileContent(entries, "powerpagessourcefiles/")
  };

  report.hasSite = report.siteComponentCount > 0;
  report.hasSiteSourceFiles = report.siteSourceFiles.length > 0;

  if (asJson) {
    const payload = listSourceFiles ? report : { ...report, siteSourceFiles: undefined };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printReport(report, listSourceFiles);
}

function printReport(report, listSourceFiles) {
  console.log(`Solution:        ${report.displayName || "(no localized name)"} (${report.uniqueName})`);
  console.log(`Version:         ${report.version}`);
  console.log(`Managed state:   ${report.managedState}`);
  console.log(`Publisher prefix:${report.publisherPrefix ? ` ${report.publisherPrefix}` : " (none)"}`);
  console.log(`Zip size:        ${(report.zipSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log("");

  console.log("Solution components:");
  if (report.rootComponents.length === 0) {
    console.log("  (none declared as root components)");
  }
  for (const group of report.rootComponents) {
    const label = COMPONENT_TYPE_NAMES[group.type] || `Type ${group.type}`;
    console.log(`  ${label} (${group.count}):`);
    for (const name of group.schemaNames) {
      console.log(`    - ${name}`);
    }
    if (group.count > group.schemaNames.length) {
      console.log(`    - (${group.count - group.schemaNames.length} more without a schema name)`);
    }
  }
  console.log("");

  console.log(`Site components:   ${report.siteComponentCount} (powerpagecomponents/, includes ${report.siteWebFileCount} web files)`);
  console.log(`Site source files: ${report.siteSourceFiles.length} (powerpagessourcefiles/)`);
  console.log("");

  if (report.missingDependencies.length > 0) {
    console.log("Missing dependencies (prerequisites the target environment must already have):");
    for (const dependency of report.missingDependencies) {
      console.log(`  - ${dependency.schemaName} from ${dependency.solution}`);
    }
    console.log("");
  }

  if (listSourceFiles && report.hasSiteSourceFiles) {
    console.log("Site source files:");
    for (const name of report.siteSourceFiles) {
      console.log(`  - ${name}`);
    }
    console.log("");
  }

  console.log("Checklist:");
  console.log(`  ${report.managedState === "unmanaged" ? "ok  " : "FAIL"} unmanaged export`);
  console.log(`  ${report.hasSite ? "ok  " : "FAIL"} contains a Power Pages site`);
  console.log(`  ${report.hasSiteSourceFiles ? "ok  " : "note"} contains site source files (README needs a "Customize this template" section when present)`);
}

function summarizeRootComponents(solutionXml) {
  const groups = new Map();
  // Attribute order inside RootComponent is not guaranteed, so match the whole
  // tag and pull attributes out of it individually.
  const pattern = /<RootComponent\s+([^>]*?)\/?>/g;
  let match;

  while ((match = pattern.exec(solutionXml)) !== null) {
    const attributes = match[1];
    const rawType = readAttribute(attributes, "type");
    if (rawType === null) {
      continue;
    }

    const type = Number(rawType);
    if (!groups.has(type)) {
      groups.set(type, { type, count: 0, schemaNames: [] });
    }

    const group = groups.get(type);
    group.count += 1;
    const schemaName = readAttribute(attributes, "schemaName");
    if (schemaName) {
      group.schemaNames.push(schemaName);
    }
  }

  return [...groups.values()].sort((left, right) => left.type - right.type);
}

function readMissingDependencies(solutionXml) {
  const dependencies = [];
  const pattern = /<Required\s+([^>]*)\/>/g;
  let match;

  while ((match = pattern.exec(solutionXml)) !== null) {
    const attributes = match[1];
    dependencies.push({
      schemaName: readAttribute(attributes, "schemaName") || readAttribute(attributes, "displayName") || "(unnamed)",
      solution: readAttribute(attributes, "solution") || "(unknown solution)"
    });
  }

  return dependencies;
}

function readAttribute(attributes, name) {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attributes);
  return match ? decodeXmlText(match[1]) : null;
}

function readTag(xml, tagName) {
  const match = new RegExp(`<${tagName}>([^<]*)</${tagName}>`).exec(xml);
  return match ? decodeXmlText(match[1].trim()) : "";
}

function readLocalizedName(xml) {
  // The first LocalizedName inside SolutionManifest is the solution's own display
  // name. Publisher names appear later, so anchor on the first match only.
  const match = /<LocalizedName\s+description="([^"]*)"/.exec(xml);
  return match ? decodeXmlText(match[1]) : "";
}

// Solution names and schema names are XML attribute values, so an ampersand or
// angle bracket in a display name arrives escaped. Decoding keeps the report
// readable and keeps copied names usable in the template README.
function decodeXmlText(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function detectManagedState(solutionXml) {
  const match = /<Managed>\s*([01])\s*<\/Managed>/i.exec(solutionXml);
  if (!match) {
    return "unknown";
  }

  return match[1] === "1" ? "managed" : "unmanaged";
}

// Each site component is stored as a folder of zip entries:
//   powerpagecomponents/<guid>/powerpagecomponent.xml        metadata, always present
//   powerpagecomponents/<guid>/filecontent/<name>            binary, only for web files
// Counting raw entries would double-count and would also make a site look larger
// than it is, so components are counted by folder.
function countComponentFolders(entries, prefix) {
  const folders = new Set();
  for (const entry of entries) {
    const name = normalizeZipName(entry.name);
    if (!name.startsWith(prefix)) {
      continue;
    }

    const remainder = name.slice(prefix.length);
    const separatorIndex = remainder.indexOf("/");
    if (separatorIndex > 0) {
      folders.add(remainder.slice(0, separatorIndex));
    }
  }

  return folders.size;
}

// Returns the real file names carried under a prefix, which is what a reviewer
// needs to spot planning notes or screenshots that were checked into the site.
function listFileContent(entries, prefix) {
  const marker = "/filecontent/";
  return entries
    .map((entry) => normalizeZipName(entry.name))
    .filter((name) => name.startsWith(prefix) && name.includes(marker) && !name.endsWith("/"))
    .map((name) => name.slice(name.indexOf(marker) + marker.length))
    .sort((left, right) => left.localeCompare(right));
}

function normalizeZipName(name) {
  return name.replace(/\\/g, "/");
}

function readEntryText(buffer, entries, wantedName) {
  const entry = entries.find((candidate) => normalizeZipName(candidate.name) === wantedName);
  if (!entry) {
    return null;
  }

  const localHeaderOffset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error(`bad local file header for ${entry.name}`);
  }

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed.toString("utf8");
  }

  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed).toString("utf8");
  }

  throw new Error(`unsupported compression method ${entry.compressionMethod} for ${entry.name}`);
}

function readZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset === -1) {
    throw new Error("missing end of central directory, so the file is not a valid zip");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  // 0xffff and 0xffffffff are the ZIP64 sentinel values. Solution exports that
  // large are unusual, and parsing the ZIP64 locator is not worth carrying here,
  // so fail loudly instead of silently reporting truncated counts.
  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error("zip uses the ZIP64 format, which this inspector does not read");
  }

  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("bad central directory header");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");

    entries.push({ name, compressionMethod, compressedSize, localHeaderOffset });
    offset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer) {
  // Zip comments can be up to 65,535 bytes, so scan backward through that window
  // for the end-of-central-directory signature.
  const minimumOffset = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
}

main();
