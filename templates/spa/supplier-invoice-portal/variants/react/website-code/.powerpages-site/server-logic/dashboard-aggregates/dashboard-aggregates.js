// Server Logic: dashboard-aggregates
// Purpose: Runs OData $apply aggregate/groupby queries against Dataverse directly
// (via Server.Connector.Dataverse) so the invoice/PO dashboard can show status
// counts and amount totals.
//
// Why this exists: the Power Pages *client* Web API rejects every $apply request
// with "WebAPI * is not enabled". It injects a synthetic wildcard (entity, "*")
// field-permission requirement whenever a GET has no $select, and $apply responses
// never carry $select (their columns are aggregate aliases like "count" or "total",
// which don't exist on the base entity schema, so $select can't reference them
// either). See https://learn.microsoft.com/power-pages/configure/configure-table-permissions
// for that Web API field allowlist. Server logic isn't subject to that gate: it
// still enforces table permissions (Supplier: own invoices only via the
// spnvc_contact_invoice_submitter relationship; Reviewer: all invoices), but it
// talks to Dataverse directly rather than through the client Web API, so the
// same $apply queries that fail from the browser succeed here.
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

// Returns [{ statusValue, count }] for every status value present in entitySetName,
// grouped server-side instead of listing and counting records client-side.
function getStatusCounts(entitySetName, statusField) {
    var query = "$apply=groupby((" + statusField + "),aggregate($count as recordcount))";
    var result = Server.Connector.Dataverse.RetrieveMultipleRecords(entitySetName, query);
    var body = JSON.parse(result.Body);
    var rows = body.value || [];

    return rows.map(function (row) {
        return { statusValue: row[statusField], count: row.recordcount };
    });
}

// Returns the sum and average of spnvc_amount across every invoice the caller can
// see (Dataverse applies the same table-permission scope it would for any other
// query). Two queries are used because the Power Pages Web API historically
// rejected multiple aggregate expressions in a single $apply call with a 500 --
// keeping the same split here avoids re-introducing that failure mode.
function getInvoiceAmountStats() {
    var sumResult = Server.Connector.Dataverse.RetrieveMultipleRecords(
        "spnvc_invoices",
        "$apply=aggregate(spnvc_amount with sum as total)"
    );
    var avgResult = Server.Connector.Dataverse.RetrieveMultipleRecords(
        "spnvc_invoices",
        "$apply=aggregate(spnvc_amount with average as avg)"
    );

    var sumBody = JSON.parse(sumResult.Body);
    var avgBody = JSON.parse(avgResult.Body);
    var total = (sumBody.value && sumBody.value[0] && sumBody.value[0].total) || 0;
    var avg = (avgBody.value && avgBody.value[0] && avgBody.value[0].avg) || 0;

    return { total: total, avg: avg };
}
