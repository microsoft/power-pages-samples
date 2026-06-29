# File Upload Samples

Power Pages offers several ways to let users upload and manage files. This folder
groups the file-upload **code-site (SPA)** samples by storage approach, plus a
pointer to Azure Blob (a storage backend you configure rather than code against).

## Choosing an approach

| Approach | Where the bytes live | Practical max per file | Best for | Sample |
| --- | --- | --- | --- | --- |
| **Notes (annotations)** | Dataverse, base64 in `annotation.documentbody` | small (~5 MB default) | Quick attach-to-a-record; the classic pattern | [`notes/`](notes/) ✅ built |
| **File / Image column** | native Dataverse file storage (binary) | 32 MB default → 10 GB (16 MB per portal call) | Larger, binary-clean files; the modern native type | [`file-column/`](file-column/) ✅ built |
| **SharePoint** | SharePoint document library (via a cloud flow) | small (cloud-flow payload limit) | Document management / collaboration; reusing SharePoint | [`sharepoint/`](sharepoint/) ✅ built |
| **Azure Blob Storage** | Azure Blob | 10 GB | Large files / offloading Dataverse | [docs](https://learn.microsoft.com/power-pages/configure/enable-azure-storage) |

**Notes**, **File column**, and **SharePoint** are built here as runnable React + Vite
samples. Notes and File column call the portal Web API directly; **SharePoint** can't
(the Web API has no SharePoint surface and code sites can't host the native
Liquid/form subgrid), so it reaches SharePoint through a **Power Automate cloud
flow**. **Azure Blob** is a storage backend you configure under the file APIs — linked
to the docs.

## The built samples

- **[File Upload (Notes)](notes/)** — each file is a Dataverse **note (annotation)**
  with the bytes base64-encoded, attached to the signed-in user's own contact.
  Simplest; best for small files. *(Microsoft docs call notes the pre-file-column
  pattern.)*
- **[File Upload (File Column)](file-column/)** — each file is stored in a native
  Dataverse **File column** on a per-user custom table (raw bytes, no base64;
  two-step create then `$value` download). The modern approach for larger or
  binary-clean files.
- **[File Upload (SharePoint)](sharepoint/)** — each file lives in a **SharePoint
  document library**, reached from the code site through a **Power Automate cloud
  flow** (the SPA calls the flow; the flow does the SharePoint work). Use it for
  document management / collaboration, or when files must live in SharePoint.

## Shared lessons (Notes & File column)

The Notes and File column samples were validated live on an Enhanced Data Model
site. Two things are easy to miss and they break the *secure, per-user*
configuration specifically:

- **A scoped table permission must declare its relationship.** A `Parent`-scoped
  permission needs `parentrelationship`; a `Contact`-scoped permission needs
  `contactrelationship` (the N:1 relationship schema name linking the child to its
  owner). Without it, every read fails with a CDS error (`9004010A` / HTTP 500)
  while create still succeeds — a confusing "uploads work but nothing shows up".
- **Web API `@odata.bind` is case-sensitive** and uses the lookup's PascalCase
  **navigation property** (schema name), not the lowercase logical column name.

Each sample's README has the full setup (Web API site settings, table permissions,
web roles) and the sign-in / trial-site notes.
