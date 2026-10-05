// Server Logic: dashboard-aggregates
// Aggregate aliases are not table columns in the client Web API field allowlist.
// The protected Dataverse connector runs FetchXML aggregates under the caller's
// table permissions: Supplier Company Name Account and reviewer N:N assignments.
// FetchXML also avoids OData's documented N:N/Parent permission-chain issue:
// https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues
// API URL: https://<site-url>/_api/serverlogics/dashboard-aggregates?stat=<stat>

function get() {
    try {
        Server.Logger.Log("dashboard-aggregates GET called");

        var stat = Server.Context.QueryParameters["stat"];

        if (stat === "invoice-status-counts") {
            return JSON.stringify({ status: "success", counts: getStatusCounts("spnvc_invoices", "spnvc_invoicestatus") });
        }

        if (stat === "po-status-counts") {
            return JSON.stringify({ status: "success", counts: getStatusCounts("spnvc_purchaseorders", "spnvc_postatus") });
        }

        if (stat === "invoice-amount-stats") {
            return JSON.stringify({ status: "success", stats: getInvoiceAmountStats() });
        }

        return JSON.stringify({ status: "error", message: "Unknown or missing 'stat' query parameter: " + stat });
    } catch (err) {
        Server.Logger.Error("dashboard-aggregates GET failed: " + err.message);
        return JSON.stringify({ status: "error", message: err.message });
    }
}

// Runs a RetrieveMultipleRecords call and turns any non-2xx Dataverse response into
// a JS Error carrying the real OData error message/status code, instead of letting
// callers blindly JSON.parse an error body. Without this, a Dataverse-side failure
// (e.g. an unsupported $apply construct) surfaces to the browser only as the
// platform's generic "Exception occurred while processing this request" -- the
// actual reason is only visible in result.Body/StatusCode, which this logs and
// re-throws so it reaches our own try/catch in get() and gets returned to the caller.
//
// Server.Connector.Dataverse.RetrieveMultipleRecords returns its {StatusCode, Body,
// IsSuccessStatusCode, ...} envelope as a JSON STRING, not an object (matching the
// documented Server.Connector.CloudFlow.TriggerAsync pattern of
// `JSON.parse(response)` before touching its fields) -- reading .StatusCode/.Body
// directly off the raw return value silently yields undefined for both, which is
// why an outer JSON.parse is required here before the envelope fields are usable.
function runQuery(entitySetName, query) {
    var result = JSON.parse(Server.Connector.Dataverse.RetrieveMultipleRecords(entitySetName, query));

    Server.Logger.Log(
        "dashboard-aggregates query " + entitySetName + " '" + query + "' -> " +
        "StatusCode=" + result.StatusCode + " Body=" + result.Body
    );

    if (!result.IsSuccessStatusCode) {
        throw new Error(
            "Dataverse query failed (HTTP " + result.StatusCode + ") for " + entitySetName +
            " '" + query + "': " + result.Body
        );
    }

    return JSON.parse(result.Body);
}

// Returns [{ statusValue, count }] for every status value present in entitySetName,
// grouped server-side instead of listing and counting records client-side.
// Uses an explicit loop instead of a map() callback because the server logic
// script validator rejects unnamed function literals as a prohibited pattern;
// a for-loop needs no callback at all.
function getStatusCounts(entitySetName, statusField) {
    // FetchXML avoids the documented OData/N:N permission-chain query failure.
    // The connector still applies the caller's Account/Parent table permissions.
    // https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues
    var entityName = entitySetName === "spnvc_invoices" ? "spnvc_invoice" : "spnvc_purchaseorder";
    var xml = '<fetch aggregate="true"><entity name="' + entityName + '">' +
        '<attribute name="' + statusField + '" alias="statusValue" groupby="true" />' +
        '<attribute name="' + entityName + 'id" alias="recordcount" aggregate="count" />' +
        '</entity></fetch>';
    var query = "fetchXml=" + encodeURIComponent(xml);
    var body = runQuery(entitySetName, query);
    var rows = body.value || [];

    var results = [];
    for (var i = 0; i < rows.length; i++) {
        results.push({ statusValue: rows[i].statusValue, count: rows[i].recordcount });
    }
    return results;
}

// Returns the sum and average of spnvc_amount across every invoice the caller can
// see (Dataverse applies the same table-permission scope it would for any other
// query). Two queries are used because the Power Pages Web API historically
// rejected multiple aggregate expressions in a single $apply call with a 500 --
// keeping the same split here avoids re-introducing that failure mode.
function getInvoiceAmountStats() {
    var sumXml = '<fetch aggregate="true"><entity name="spnvc_invoice">' +
        '<attribute name="spnvc_amount" alias="total" aggregate="sum" /></entity></fetch>';
    var avgXml = '<fetch aggregate="true"><entity name="spnvc_invoice">' +
        '<attribute name="spnvc_amount" alias="avg" aggregate="avg" /></entity></fetch>';
    var sumBody = runQuery("spnvc_invoices", "fetchXml=" + encodeURIComponent(sumXml));
    var avgBody = runQuery("spnvc_invoices", "fetchXml=" + encodeURIComponent(avgXml));

    var total = (sumBody.value && sumBody.value[0] && sumBody.value[0].total) || 0;
    var avg = (avgBody.value && avgBody.value[0] && avgBody.value[0].avg) || 0;

    return { total: total, avg: avg };
}
