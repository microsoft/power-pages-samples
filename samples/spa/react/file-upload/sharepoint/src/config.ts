// ---------------------------------------------------------------------------
// config.ts
//
// FLOW_ID is the last segment of the flow's trigger URL:
//   https://<your-site>.powerappsportals.com/_api/cloudflow/v1.0/trigger/<FLOW_ID>
// Replace the placeholder below with your own flow's GUID after you create the
// "SharePoint Documents" flow (see README "Set up the flow"), and keep it in sync
// with `processid`/`flowapiurl` in
// .powerpages-site/cloud-flow-consumer/sharepoint-documents.cloudflowconsumer.yml
// ---------------------------------------------------------------------------
export const FLOW_ID = 'b187d40f-b330-4c54-808c-aa692dcb29d2'

export const config = {
  /**
   * Client-side guards. SharePoint documents go through the cloud-flow trigger as
   * base64 text, and the Power Pages flow trigger has a request-size ceiling, so
   * this sample is for SMALL files. Keep this conservative (~3.5 MB) — larger
   * files need a different transport (e.g. an upload session in the flow).
   */
  maxFileBytes: 3.5 * 1024 * 1024,
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'],
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.txt'],
} as const
