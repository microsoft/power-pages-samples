// ---------------------------------------------------------------------------
// config.ts — the one value you must change per environment.
//
// When you add a cloud flow to a Power Pages site (Set up > Cloud flows >
// Add cloud flow) the site generates a unique trigger URL that ends with the
// flow's GUID:
//
//     https://<your-site>.powerappsportals.com/_api/cloudflow/v1.0/trigger/4d22a1a2-8a67-...
//                                                                          ^^^^^^^^^^^^^^^^
//                                                                          this is FLOW_ID
//
// Paste that GUID here. Flows are registered per environment, so this value
// changes when you promote the site to another environment.
// ---------------------------------------------------------------------------
export const FLOW_ID = '00000000-0000-0000-0000-000000000000'
