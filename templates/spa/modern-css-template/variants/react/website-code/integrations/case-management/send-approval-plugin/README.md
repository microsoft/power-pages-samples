# Native Send approval capture

This plug-in captures a reviewed Northwind response before Dynamics validates or delivers the email. It does not replace the Send button, send mail, change recipients, override consent, or update cases.

## Registration

Register `Northwind.SendApproval.SendApprovalPlugin` from the signed `Northwind.SendApproval` assembly:

| Setting | Value |
|---|---|
| Isolation | Sandbox |
| SDK message / primary table | `Send` / `email` |
| Stage / mode / execution order | PreValidation (`10`) / synchronous (`0`) / `1` |
| Execution user | Calling user; caller reads and row access are checked explicitly |
| Assembly/type/step solution | `ModernCSSMetadata` (template solution, publisher `ppst`) |

Discover the actual SDK message and email filter in each destination. The Web API action is `SendEmail`, but the plug-in message is **Send**. Do not copy environment-specific registration IDs.

### Portal application user

The hook only captures replies on Web cases created by the site's application user (**Portals-&lt;site name&gt;**). It resolves that user's ID at Send time, in this order:

1. Current value of the `ppst_ModernCss_PortalApplicationUserId` environment variable (shipped in the `ModernCSSMetadata` solution; set it during solution import).
2. That variable's default value.
3. Legacy unsecure step configuration (optional):

```json
{
  "portalApplicationUserId": "<verified portal application-user GUID>"
}
```

If none is set, an eligible Send fails with a message naming the variable. An invalid GUID is rejected the same way. The step ships in the solution without configuration, so no environment-specific ID travels with it.

For an initial restricted rollout, add `"testEmailId": "<synthetic email GUID>"` to the step configuration. Remove it only after rejected-mail/successful-publication acceptance. No credentials or secure configuration are needed.

## Authorization and persistence

The hook ignores record-only `IssueSend: false`, unrelated cases, incoming email, account customers, non-Web cases and recipients other than the sole case-customer Contact. Scoped processing requires caller read access to the case and read/write access to the email. Reviewed Draft and Failed email states are supported; processing already queued mail does not authorize another snapshot.

After these checks, SYSTEM writes an internal approval Note. Ordinary note writers and portal users cannot forge that provenance. Set the publish flow's `ppst_ModernCss_ApprovalWriterUserId` environment variable to the destination environment's actual SYSTEM user GUID.

The subject is `Northwind portal: Reviewed Send approval`, without a `*WEB*` prefix. The JSON `notetext` contains schema version 1, `approvalMethod: NativeSend`, email/case/Contact IDs, captured version, initiating reviewer, approval time, correlation ID, base64-encoded HTML and `outsideTransaction: true`. Base64 avoids presenting the captured HTML as rich note content. The 100,000-character Note limit is enforced without truncation.

PreValidation normally runs outside the mail transaction, but nested requests can share a transaction. The hook checks `IsInTransaction` and rejects that context rather than allowing mail rollback to erase approval. Use a standalone Send request. Once the Note is committed, subsequent mail rejection cannot undo it. If capture itself fails, Send reports the error instead of silently losing the portal request.

The consumer publishes the captured content and rechecks current case ownership; it does not re-read mutable email body, recipient or delivery fields. Repeated Send attempts can create separate audit notes, but the per-email publication receipt prevents duplicate comments.

## Build and checks

Requires the .NET SDK, .NET Framework 4.6.2 reference assemblies and the pinned `Microsoft.CrmSdk.CoreAssemblies` package. Dataverse supplies the runtime SDK assemblies; upload only this plug-in DLL.

Build a signed release with a private strong-name key **outside the repository**:

```powershell
dotnet build .\Northwind.SendApproval.csproj -c Release "-p:AssemblyOriginatorKeyFile=<secure-path>\northwind-send-approval.snk" "-p:Version=1.0.1"
```

Keep that key in protected storage for subsequent assembly updates. Do not commit it; `*.snk`, `bin/` and `obj/` are ignored. Record only the public key token and deployed hash in deployment metadata. In-place assembly updates require the same strong-name key and major.minor version as the registered assembly; the template solution ships version `1.0.1.0`.

Use a short output directory for the executable checks on Windows; deep worktree paths can exceed .NET Framework's configuration-loader limit:

```powershell
$output = Join-Path $env:TEMP "northwind-send-approval-tests"
dotnet build .\tests\Northwind.SendApproval.Tests.csproj -c Release -o $output
& "$output\Northwind.SendApproval.Tests.exe"
```

Checks cover capture, ordinary saves, record-only sends, caller authorization, recipient/case scope, transaction rejection, storage limits, absence of email writes or sends, and portal-user resolution (environment variable current/default value, legacy configuration fallback, missing or invalid values).

Live acceptance must use labeled synthetic mail to a non-deliverable Contact with **Do not email** enabled. Verify both outcomes: native rejection with no sent timestamp, and publication of the exact approved snapshot. Never disable consent or use a real recipient merely to exercise a failure path. Also verify that an ordinary caller-created Note with the same subject cannot trigger publication.
