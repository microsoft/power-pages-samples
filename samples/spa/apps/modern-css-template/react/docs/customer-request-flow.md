# Northwind customer request flow

The native **Send action** creates a durable reviewed snapshot before mail validation. Portal publication and email delivery follow separate paths; a rejected, queued or failed email does not block the approved portal response.

```mermaid
flowchart TD
    customer["Customer signs in<br/>contact + Authenticated Users web role"]
    submit["Submit a new support request<br/>POST /_api/incidents"]
    case["Case created<br/>incident: Customer = signed-in Contact<br/>Origin = Web; optional product lookup"]
    files["Optional case attachments<br/>annotation: portal-marked files"]

    trigger["Case-created automation<br/>workflow: active Web case created by this portal<br/>Check effective agent mode = Semi"]
    dispatch["Reserve agent dispatch once per case<br/>annotation: internal dispatch receipt"]
    agent["Case Management Agent<br/>Northwind business-line configuration<br/>msdyn_intent + msdyn_intentsolutionmap + knowledgearticle"]
    outcome{"Usable intent and guidance?"}
    handoff["Hand off to a representative<br/>incident: requires human handling"]
    draft["AI-generated or staff-written reply<br/>email + activityparty<br/>Regarding = case; To = case Contact"]
    review["Representative reviews and clicks Send<br/>systemuser + reviewed email"]

    approval["Capture Send approval durably<br/>Native Send PreValidation hook<br/>annotation: SYSTEM-authored reviewed snapshot"]
    mail["Normal Dynamics email sending<br/>email + activityparty + mailbox"]
    mailResult["Email outcome<br/>Queued / Sent / Failed / Rejected"]
    publish["Independent portal-publishing flow<br/>workflow: validate approval and case Contact<br/>Convert snapshot to text; reserve once per email"]
    receipt["Publication receipt<br/>annotation: email-to-comment mapping"]
    response["Customer-visible support response<br/>adx_portalcomment<br/>Outgoing = 2; subject begins *WEB*"]
    view["Customer opens or refreshes their case<br/>Contact-scoped incident access<br/>Parent-scoped conversation and files"]
    reply["Customer replies to support<br/>adx_portalcomment: Incoming = 1<br/>Same authorized case"]

    customer --> submit --> case
    case --> files
    case --> trigger --> dispatch --> agent --> outcome
    outcome -->|Yes| draft
    outcome -->|NoIntent or handoff| handoff --> draft
    draft --> review
    review --> approval
    approval --> mail --> mailResult
    approval --> publish
    publish --> receipt
    receipt --> response --> view --> reply
    files --> view

    classDef independent fill:#e7f4ed,stroke:#26734d,stroke-width:2px,color:#173b2a
    class approval,publish independent
```

There is deliberately **no arrow from email outcome to portal publication**. The captured approval survives immediate mail rejection because it is committed outside the mail transaction. Publishing to the portal does not send or retry email. A valid native Send request must reach the server; ordinary Save/AutoSave and browser validation that prevents Send are not approval events.

## Key entities by step

| Step | Key entity or configuration | Role |
|---|---|---|
| Customer identity | `contact`; web role | Identifies the signed-in customer and grants authenticated portal access. |
| Request creation | `incident`; optional `product`; portal application `systemuser` | Stores the request, Contact customer, Web origin, product association and creation provenance. |
| Customer files | `annotation` | Stores portal-designated attachments linked to the authorized case. This is separate from internal automation notes. |
| Automation | `workflow` | Defines the case-created automation and response-publishing cloud flow. |
| Agent dispatch | Internal `annotation` | Records dispatch and prevents repeated agent invocation for the same case. |
| Agent guidance | Business-line configuration; `msdyn_intent`; `msdyn_intentsolutionmap`; `knowledgearticle` | Selects supported guidance and enforces human-review mode. No matching intent can lead to human handoff rather than a draft. |
| Reviewed response | `email`; `activityparty`; staff `systemuser` | Holds the response and its sender/recipient relationships. The sole To recipient must be the case's Contact. |
| Native Send hook | `pluginassembly`; `plugintype`; `sdkmessageprocessingstep` | Registers scoped, synchronous PreValidation processing on `Send` for `email`; checks caller access and requires a non-transactional context. |
| Send approval | Separate SYSTEM-authored `annotation` request | Captures reviewed HTML, source version, case, Contact, reviewer and timestamp before mail outcome is known. It survives a rejected send. |
| Email delivery | `email`; `activityparty`; `mailbox` | Handles normal email transport and its own status. It must not determine whether the approved portal response is published. |
| Publication tracking | Internal `annotation` receipt | Reserves one publication per source email and records its separate portal-comment ID. Existing published snapshots remain immutable. |
| Portal conversation | `adx_portalcomment` linked to `incident` | Stores outgoing Support responses and incoming customer replies. |

## Boundaries retained

- Customers see only cases whose Customer is their signed-in Contact, and the permitted comments/files under those cases. Internal dispatch, approval and publication notes are not customer-visible.
- Raw Email and Portal Comment Web APIs remain disabled. Case activity is read through the existing ownership-checking Server Logic endpoint.
- Ordinary draft Save, AutoSave and record-only `IssueSend: false` do not authorize publication. The scoped native `IssueSend: true` request captures approval; it is not an independent audit that a human read the response.
- The consumer accepts only SYSTEM-authored approval requests and rechecks the approved case's current Contact. A draft edit after rejected Send cannot replace the captured text.
- The current publication contract is plain text, 1-4,000 converted characters, without silent truncation. Email attachments are not automatically copied into portal files.
- The email and portal comment use different activity IDs. Repeated Send actions must not duplicate an already published response.
- Editing a case or adding a customer reply does not automatically invoke the case-created agent flow again.
- Neither agent handoff nor clicking Send implies the case is resolved. Case status remains separately managed.

See the [template solution](../README.md#template-solution-moderncssmetadata), the flow definitions in [`integrations/case-management`](../integrations/case-management/) and the [staff publishing instructions](../README.md#publish-an-approved-response).
