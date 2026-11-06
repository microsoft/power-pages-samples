import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const solutionDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "solutions",
  "SPAPartnerPortalSite",
);
const workflowDirectory = path.join(solutionDirectory, "Workflows");
const syncWorkflow = "PRMSyncpartnerwebrole-8400DA99-63CC-F111-A05A-6045BD5E6428";
const invitationWorkflow = "PRMSendinvitation-B38969F4-A1CC-F111-A05A-70A8A510847E";
const roleIds = [
  "a83de8fe-a694-496e-a654-e49c34e2ebf6",
  "d1bc4702-d965-4d5c-8f6a-ad5e6cbd39f4",
  "3f8e01b2-0b59-4990-9f82-4051540f211b",
  "a872dee0-ad7f-4084-b9c6-849886d7dce7",
];

function readWorkflow(name) {
  return JSON.parse(
    readFileSync(path.join(workflowDirectory, `${name}.json`), "utf8"),
  );
}

function readWorkflowMetadata(name) {
  return readFileSync(
    path.join(workflowDirectory, `${name}.json.data.xml`),
    "utf8",
  );
}

test("solution ships only portal-specific support components", () => {
  const manifest = readFileSync(
    path.join(solutionDirectory, "Other", "Solution.xml"),
    "utf8",
  );
  const rootComponents = [...manifest.matchAll(/<RootComponent\b[^>]*\/>/g)].map(
    ([component]) => component,
  );

  assert.match(manifest, /<Version>1\.0\.0\.3<\/Version>/);
  assert.match(manifest, /description="Partner Portal \(Enhanced\)"/);
  assert.equal(rootComponents.filter((root) => /type="1"/.test(root)).length, 0);
  assert.equal(rootComponents.filter((root) => /type="29"/.test(root)).length, 2);
  assert.equal(
    rootComponents.filter((root) => /type="380"/.test(root)).length,
    0,
    "PAC serializes environment-variable definitions from their dedicated component files",
  );
  assert.equal(
    manifest.match(/<MissingDependency>/g)?.length ?? 0,
    1,
    "keep only the sync flow's dependency on the standard partner-contact-role column",
  );
  assert.match(manifest, /schemaName="adx_partnercontactrole"/);
  assert.doesNotMatch(manifest, /cr798_declinedon|cr798_declinereason|PRMOpportunityaction/);
  assert.equal(existsSync(path.join(solutionDirectory, "Entities")), false);

  const workflowFiles = readdirSync(workflowDirectory);
  assert.equal(workflowFiles.length, 4);
  assert.ok(workflowFiles.every((file) => !file.includes("PRMOpportunityaction")));
  assert.doesNotMatch(
    `${manifest}\n${workflowFiles.join("\n")}`,
    /Technician/i,
  );
});

test("flows retain their shipped behavior while requiring target-environment bindings", () => {
  const sync = readWorkflow(syncWorkflow).properties.definition;
  const syncMetadata = readWorkflowMetadata(syncWorkflow);
  const invitation = readWorkflow(invitationWorkflow).properties.definition;
  const invitationMetadata = readWorkflowMetadata(invitationWorkflow);
  const flowDefinitions = [
    [sync, syncMetadata],
    [invitation, invitationMetadata],
  ];

  for (const [definition, metadata] of flowDefinitions) {
    assert.match(metadata, /<StateCode>0<\/StateCode>/);
    assert.match(metadata, /<StatusCode>1<\/StatusCode>/);
  }
  assert.ok(sync.triggers.When_partner_role_or_status_changes);
  assert.ok(Object.keys(invitation.triggers).length > 0);

  const syncJson = JSON.stringify(sync);
  assert.match(
    syncJson,
    /parameters\('Partner Portal Dataverse URL \(cr798_PartnerPortalDataverseUrl\)'\)/,
  );
  assert.doesNotMatch(syncJson, /org[a-z0-9]+\.crm\d+\.dynamics\.com/i);
  assert.deepEqual(
    [...new Set(syncJson.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi))].sort(),
    [...roleIds].sort(),
  );
  assert.match(syncJson, /AssociateEntities/);
  assert.match(syncJson, /DisassociateEntities/);
  assert.match(syncJson, /adx_partnercontactrole/);

  const invitationJson = JSON.stringify(invitation);
  assert.match(invitationJson, /c0225729-ade6-4131-80e4-974ad0c97ccd/);
  assert.match(invitationJson, /ExecuteWorkflow/);
});

test("connection reference and URL environment variable are portable and unbound by default", () => {
  const customizations = readFileSync(
    path.join(solutionDirectory, "Other", "Customizations.xml"),
    "utf8",
  );
  const definition = readFileSync(
    path.join(
      solutionDirectory,
      "environmentvariabledefinitions",
      "cr798_PartnerPortalDataverseUrl",
      "environmentvariabledefinition.xml",
    ),
    "utf8",
  );

  assert.match(customizations, /connectionreferencelogicalname="new_sharedcommondataserviceforapps_b1053"/);
  assert.match(customizations, /<EnvironmentVariables\s*\/>/);
  assert.match(definition, /environmentvariabledefinitionid="\{65e3aa02-8f2c-4cac-9abc-98ae3deb1229\}"/);
  assert.match(definition, /schemaname="cr798_PartnerPortalDataverseUrl"/);
  assert.match(definition, /<type>100000000<\/type>/);
  assert.doesNotMatch(definition, /<defaultvalue>[^<]+<\/defaultvalue>/i);
  assert.match(definition, /<isrequired>1<\/isrequired>/);
});
