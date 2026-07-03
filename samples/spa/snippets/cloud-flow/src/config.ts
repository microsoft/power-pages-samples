// ---------------------------------------------------------------------------
// config.ts — the cloud flow's ID (the last segment of its trigger URL):
//
//     https://<your-site>.powerappsportals.com/_api/cloudflow/v1.0/trigger/<FLOW_ID>
//
// Two ways to get this value:
//
//   A) Import the bundled flow (flow/CloudFlowSample_1_0_0_0.zip — see the
//      README "Option A"). An unmanaged-solution import preserves the flow's
//      GUID, so the value below already matches — no change needed.
//
//   B) Author your own flow (README "Option B"): register it under
//      Set up > Cloud flows, copy the trigger URL, and paste its last GUID
//      segment here. It differs per flow and per environment.
// ---------------------------------------------------------------------------
export const FLOW_ID = '49563951-9a6f-f111-ab0d-000d3a3b829d'
