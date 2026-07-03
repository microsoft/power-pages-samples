# File Upload Samples

Power Pages offers several ways to let users upload and manage files. This folder
groups the file-upload **code-site (SPA)** samples by storage approach.

## Choosing an approach

| Approach | Where the bytes live | Practical max per file | Best for | Sample |
| --- | --- | --- | --- | --- |
| **Notes (annotations)** | Dataverse, base64 in `annotation.documentbody` | small (~5 MB default) | Quick attach-to-a-record; the classic pattern | [`notes/`](notes/) ✅ built |
| **File / Image column** | native Dataverse file storage (binary) | 32 MB default → 10 GB (16 MB per portal call) | Larger, binary-clean files; the modern native type | [`file-column/`](file-column/) ✅ built |
| **SharePoint** | SharePoint document library (via **server logic** + Graph) | text documents, ~2 MB (see note) | Document management / collaboration; reusing SharePoint | [`sharepoint/`](sharepoint/) ✅ built |
| **Azure Blob Storage** | your Azure Blob container | 10 GB | Large files / offloading Dataverse | [`azure-blob/`](azure-blob/) ✅ built |

**Notes**, **File column**, **SharePoint**, and **Azure Blob** are all built here as
runnable React + Vite samples. Notes and File column call the portal Web API directly,
and Azure Blob uses the dedicated file-management Web API (`/_api/file/...`).
**SharePoint** can't use the Web API (it has no SharePoint surface, and code sites
can't host the native Liquid/form subgrid), so it uses **server logic** (server-side
JS) + Microsoft Graph.

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
  document library**, reached from the code site through **server logic** (server-side
  JavaScript) that holds an Entra app and calls **Microsoft Graph**. Use it for
  document management / collaboration, or when files must live in SharePoint. *(Server
  logic's HttpClient is text-only, so this sample handles text documents — see its
  README for the binary caveat.)*
- **[File Upload (Azure Blob)](azure-blob/)** — the bytes go to **your Azure Blob
  container** via the dedicated file-management Web API (`/_api/file/...`:
  initialize → stream blocks → download/delete), tracked by an annotation
  placeholder on the user's contact. Best for large files and keeping binaries out
  of Dataverse. *(Needs manual Azure storage + IAM setup; not yet validated live.)*

## Shared lessons

The Notes and File column samples were validated live on an Enhanced Data Model
site; the Azure Blob sample stores its placeholders as annotations on the contact,
so the **same per-user permission lessons apply to it**. Two things are easy to miss
and they break the *secure, per-user* configuration specifically:

- **A scoped table permission must declare its relationship.** A `Parent`-scoped
  permission needs `parentrelationship`; a `Contact`-scoped permission needs
  `contactrelationship` (the N:1 relationship schema name linking the child to its
  owner). Without it, every read fails with a CDS error (`9004010A` / HTTP 500)
  while create still succeeds — a confusing "uploads work but nothing shows up".
- **Web API `@odata.bind` is case-sensitive** and uses the lookup's PascalCase
  **navigation property** (schema name), not the lowercase logical column name.

Each sample's README has the full setup (Web API site settings, table permissions,
web roles) and the sign-in / trial-site notes.
