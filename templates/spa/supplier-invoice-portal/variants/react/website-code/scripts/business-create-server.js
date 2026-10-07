// Generated into two role-bound exports by postbuild.js; no runtime imports.
// Native SDK operations retain the caller's existing table permissions.
// https://learn.microsoft.com/power-pages/configure/server-objects#dataverse
// Native association authorization can still reject a validated create.

var CREATE_LOOKUPS = {
    _parentcustomerid_value: "parentcustomerid",
    _spnvc_contactid_value: "spnvc_contactid",
    _spnvc_supplieraccountid_value: "spnvc_supplieraccountid",
    _spnvc_purchaseorderid_value: "spnvc_purchaseorderid"
};
var INVOICE_CREATE_SELECT = ["spnvc_invoiceid", "spnvc_name", "spnvc_ponumber", "spnvc_description", "spnvc_submissiondate", "spnvc_duedate", "spnvc_amount", "spnvc_invoicestatus", "_spnvc_contactid_value", "_spnvc_supplieraccountid_value", "_spnvc_purchaseorderid_value", "createdon", "modifiedon"];
var PO_CREATE_SELECT = ["spnvc_purchaseorderid", "spnvc_name", "spnvc_description", "spnvc_totalamount", "spnvc_deliverydate", "spnvc_postatus", "_spnvc_supplieraccountid_value", "createdon", "modifiedon"];

function get() {
    try {
        var invoice = createInvoiceOperation();
        var parameters = Server.Context.QueryParameters;
        var field = invoice ? "purchaseOrderId" : "supplierId";
        var keys = Object.keys(parameters);
        if (keys.length !== 1 || keys[0] !== field || !createGuid(parameters[field])) stopCreate("Select a valid related record.");
        createAccess(invoice, parameters[field], requireCreateCaller());
        return JSON.stringify({ ready: true, creationVerified: false });
    } catch (error) {
        Server.Logger.Error("Business create preflight failed.");
        return JSON.stringify({
            status: "error", message: error && error.publicMessage || "Create prerequisites could not be verified.",
            httpStatus: error && error.httpStatus || 502, code: error && error.publicCode,
            innerCode: error && error.publicInnerCode, persistence: "not_attempted"
        });
    }
}

function post() {
    var attempted = false;
    var accepted = false;
    var rejected = false;
    try {
        var invoice = createInvoiceOperation();
        var input = createInput(invoice);
        var caller = requireCreateCaller();
        var access = createAccess(invoice, invoice ? input.purchaseOrderId : input.supplierId, caller);
        var accountId = access.accountId;
        var data;
        if (invoice) {
            data = {
                spnvc_name: input.invoiceNumber,
                spnvc_ponumber: access.poNumber,
                spnvc_description: input.description,
                spnvc_amount: input.amount,
                spnvc_invoicestatus: input.status === "Submitted" ? 2 : 1,
                "spnvc_ContactId@odata.bind": "/contacts(" + caller.contactid + ")",
                "spnvc_SupplierAccountId@odata.bind": "/accounts(" + accountId + ")",
                "spnvc_PurchaseOrderId@odata.bind": "/spnvc_purchaseorders(" + input.purchaseOrderId + ")"
            };
            if (input.dueDate) data.spnvc_duedate = input.dueDate;
            if (input.status === "Submitted") data.spnvc_submissiondate = new Date().toISOString();
        } else {
            data = {
                spnvc_name: input.poNumber,
                spnvc_description: input.description,
                spnvc_totalamount: input.totalAmount,
                spnvc_postatus: 1,
                "spnvc_SupplierAccountId@odata.bind": "/accounts(" + accountId + ")"
            };
            if (input.deliveryDate) data.spnvc_deliverydate = input.deliveryDate;
        }
        var table = invoice ? "spnvc_invoices" : "spnvc_purchaseorders";
        var entity = invoice ? "spnvc_invoice" : "spnvc_purchaseorder";
        var primary = invoice ? "spnvc_invoiceid" : "spnvc_purchaseorderid";
        // Validation and persistence are separate calls. The native write still
        // enforces table permissions; failed verification never triggers rollback.
        attempted = true;
        var envelope = createEnvelope(Server.Connector.Dataverse.CreateRecord(table, JSON.stringify(data)));
        if (!envelope.IsSuccessStatusCode) {
            rejected = envelope.StatusCode >= 400 && envelope.StatusCode < 500 &&
                envelope.StatusCode !== 408 && envelope.StatusCode !== 429;
            createConnectorFailure(envelope);
        }
        accepted = true;
        var id = createResponseId(envelope, primary);
        if (!id) stopCreate("The created record ID was not returned.", 502);
        var record = createReadOne(table, entity, primary, id, invoice ? INVOICE_CREATE_SELECT : PO_CREATE_SELECT);
        if (!sameCreateId(record._spnvc_supplieraccountid_value, accountId) ||
            (invoice && (!sameCreateId(record._spnvc_contactid_value, caller.contactid) ||
                         !sameCreateId(record._spnvc_purchaseorderid_value, input.purchaseOrderId)))) {
            stopCreate("The persisted record associations could not be verified.", 502);
        }
        var amount = record[invoice ? "spnvc_amount" : "spnvc_totalamount"];
        var status = record[invoice ? "spnvc_invoicestatus" : "spnvc_postatus"];
        if (record.spnvc_name !== data.spnvc_name || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
            !(invoice ? [1, 2, 5, 6, 7] : [1, 2, 3, 4, 5, 6]).includes(status)) {
            stopCreate("The persisted record fields could not be verified.", 502);
        }
        return JSON.stringify({ record: record });
    } catch (error) {
        if (attempted && !accepted && !rejected) {
            var denial = nativeCreateAssociationDenial(error, table);
            if (denial) {
                rejected = true;
                error = denial;
            }
        }
        var persistence = accepted ? "created_unverified" : attempted && !rejected ? "unknown" : rejected ? "rejected" : "not_attempted";
        // No input, query, identity, token, connector body or record is logged.
        Server.Logger.Error("Business create failed; persistence=" + persistence);
        var message = accepted
            ? "The create was accepted, but persistence could not be verified. Check existing records before submitting again."
            : attempted && !rejected
                ? "The create outcome is unknown. Check existing records before submitting again."
                : error && error.publicMessage || "The caller-scoped create could not complete.";
        return JSON.stringify({
            status: "error", message: message, persistence: persistence,
            httpStatus: error && error.httpStatus || 502,
            code: error && error.publicCode,
            innerCode: error && error.publicInnerCode
        });
    }
}

function createInvoiceOperation() {
    if (Server.Context.ServerLogicName === "submit-invoice") return true;
    if (Server.Context.ServerLogicName === "create-purchase-order") return false;
    stopCreate("Unknown create operation.");
}

function requireCreateCaller() {
    if (!Server.User || !createGuid(Server.User.contactid)) stopCreate("Sign in with a valid portal Contact.", 401);
    return createCaller(Server.User.contactid);
}

function createAccess(invoice, selectedId, caller) {
    var accountId = invoice ? caller._parentcustomerid_value : selectedId;
    if (invoice && (!createGuid(accountId) ||
        caller["_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"] !== "account")) {
        stopCreate("Your Company Name must reference a Supplier Account.");
    }
    activeCreateAccount(accountId);
    if (!invoice) return { accountId: accountId };
    var po = createReadOne("spnvc_purchaseorders", "spnvc_purchaseorder", "spnvc_purchaseorderid", selectedId,
        ["spnvc_purchaseorderid", "spnvc_name", "spnvc_postatus", "_spnvc_supplieraccountid_value"]);
    if (!sameCreateId(po._spnvc_supplieraccountid_value, accountId)) stopCreate("The selected PO does not belong to your Company.", 403);
    if (po.spnvc_postatus !== 2 && po.spnvc_postatus !== 3) stopCreate("Select an Issued or Partially Invoiced PO.");
    return { accountId: accountId, poNumber: createText(po.spnvc_name, "PO number", 100, true) };
}

function stopCreate(message, status, code, innerCode) {
    var error = new Error(message);
    error.publicMessage = message;
    error.httpStatus = status || 400;
    error.publicCode = code;
    error.publicInnerCode = innerCode;
    throw error;
}

function createGuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function sameCreateId(left, right) {
    return createGuid(left) && createGuid(right) && left.toLowerCase() === right.toLowerCase();
}

function createText(value, label, maximum, required) {
    if (value === undefined && !required) return "";
    if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) stopCreate("Invalid " + label + ".");
    return value;
}

function createDate(value, label, required) {
    if ((value === undefined || value === "") && !required) return "";
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) ||
        !Number.isFinite(Date.parse(value))) stopCreate("Invalid " + label + ".");
    var day = value.slice(0, 10);
    if (new Date(day + "T00:00:00Z").toISOString().slice(0, 10) !== day) stopCreate("Invalid " + label + ".");
    return value;
}

function createMoney(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 922337203685477) stopCreate("Enter a valid positive amount.");
    return value;
}

function createInput(invoice) {
    if (typeof Server.Context.Body !== "string" || Server.Context.Body.length > 30000) stopCreate("Invalid create request.");
    var input;
    try { input = JSON.parse(Server.Context.Body); } catch (error) { stopCreate("Invalid create JSON."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) stopCreate("Invalid create request.");
    var allowed = invoice
        ? ["invoiceNumber", "description", "amount", "dueDate", "purchaseOrderId", "status"]
        : ["poNumber", "description", "totalAmount", "deliveryDate", "supplierId", "status"];
    var keys = Object.keys(input);
    for (var i = 0; i < keys.length; i++) if (!allowed.includes(keys[i])) stopCreate("Unknown create field.");
    input.description = createText(input.description, "description", 10000, false);
    if (invoice) {
        input.invoiceNumber = createText(input.invoiceNumber, "invoice number", 200, true);
        input.amount = createMoney(input.amount);
        if (!createGuid(input.purchaseOrderId)) stopCreate("Select a valid purchase order.");
        input.status = input.status === undefined ? "Draft" : input.status;
        if (input.status !== "Draft" && input.status !== "Submitted") stopCreate("Invalid initial invoice status.");
        input.dueDate = createDate(input.dueDate, "due date", input.status === "Submitted");
        if (input.status === "Submitted" && input.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10)) stopCreate("Due date cannot be in the past.");
    } else {
        input.poNumber = createText(input.poNumber, "PO number", 200, true);
        input.totalAmount = createMoney(input.totalAmount);
        if (!createGuid(input.supplierId)) stopCreate("Select a valid Supplier Account.");
        if (input.status !== undefined && input.status !== "Draft") stopCreate("New purchase orders must start as Draft.");
        input.deliveryDate = createDate(input.deliveryDate, "delivery date", false);
    }
    return input;
}

function createEnvelope(raw) {
    var envelope = JSON.parse(raw);
    if (!envelope || typeof envelope.IsSuccessStatusCode !== "boolean" ||
        typeof envelope.StatusCode !== "number" || !Number.isInteger(envelope.StatusCode) ||
        envelope.StatusCode < 100 || envelope.StatusCode > 599 ||
        envelope.IsSuccessStatusCode !== (envelope.StatusCode >= 200 && envelope.StatusCode < 300) ||
        typeof envelope.Body !== "string") stopCreate("Invalid Dataverse response.", 502);
    return envelope;
}

function nativeCreateAssociationDenial(error, table) {
    if ((table !== "spnvc_invoices" && table !== "spnvc_purchaseorders") ||
        !error || typeof error.message !== "string" || error.message.length > 20000) return null;
    // The captured SDK throws before returning an envelope:
    //   Error executing POST request to 'spnvc_purchaseorders': {"error":{
    //     "code":"90040106","message":"You don't have permission to associate or disassociate table account to spnvc_purchaseorder",
    //     "innererror":{"code":"90040106","type":"EntityPermissionAppendToIsMissingDuringAssociationChange"}}}
    // Parse only that operation/table prefix and native validator signature.
    // Truncated, unrelated, or arbitrary failures must retain unknown outcome.
    // https://learn.microsoft.com/power-pages/configure/web-api-http-requests-handle-errors#error-codes
    var prefix = "Error executing POST request to '" + table + "': ";
    if (error.message.indexOf(prefix) !== 0) return null;
    var body;
    try { body = JSON.parse(error.message.slice(prefix.length)); } catch (parseError) { return null; }
    var detail = body && body.error;
    var inner = detail && detail.innererror;
    if (!detail || detail.code !== "90040106" || !inner || inner.code !== detail.code ||
        inner.type !== "EntityPermissionAppendToIsMissingDuringAssociationChange" ||
        typeof detail.message !== "string") return null;
    var rule = table === "spnvc_purchaseorders"
        ? /^You (?:don't|don\u2019t) have permission to associate or disassociate table account to spnvc_purchaseorder$/
        : /^You (?:don't|don\u2019t) have permission to associate or disassociate table (?:contact|account|spnvc_purchaseorder) to spnvc_invoice$/;
    if (!rule.test(detail.message)) return null;
    var result = new Error(detail.message);
    result.publicMessage = detail.message;
    result.httpStatus = 403;
    result.publicCode = detail.code;
    result.publicInnerCode = inner.code;
    return result;
}

function createConnectorFailure(envelope) {
    var code;
    var innerCode;
    var message = "Caller-scoped Dataverse operation failed (HTTP " + envelope.StatusCode + ").";
    if (envelope.Body) {
        var body;
        try { body = JSON.parse(envelope.Body); } catch (error) { body = null; }
        if (body && body.error) {
            if (typeof body.error.code === "string" && /^(?:0x)?[0-9a-f]{8}$/i.test(body.error.code)) code = body.error.code;
            if (body.error.innererror && typeof body.error.innererror.code === "string" &&
                /^(?:0x)?[0-9a-f]{8}$/i.test(body.error.innererror.code)) innerCode = body.error.innererror.code;
            // Only the schema-only association message is safe to expose.
            if (typeof body.error.message === "string" &&
                /^You (?:don't|don\u2019t) have permission to associate or disassociate table [a-zA-Z_][a-zA-Z0-9_]* (?:to|with) [a-zA-Z_][a-zA-Z0-9_]*$/.test(body.error.message)) {
                message = body.error.message;
            }
        }
    }
    stopCreate(message, envelope.StatusCode >= 400 && envelope.StatusCode <= 599 ? envelope.StatusCode : 502, code, innerCode);
}

function createRows(table, query) {
    // Cached eligibility or a cached missing row cannot verify a new create.
    // https://learn.microsoft.com/power-pages/configure/server-objects#retrievemultiplerecords
    var envelope = createEnvelope(Server.Connector.Dataverse.RetrieveMultipleRecords(table, query, true));
    if (!envelope.IsSuccessStatusCode) createConnectorFailure(envelope);
    var body = JSON.parse(envelope.Body);
    if (!body || !Array.isArray(body.value)) stopCreate("Missing caller-scoped records.", 502);
    return body.value;
}

function createCaller(id) {
    var rows = createRows("contacts", "$select=contactid,_parentcustomerid_value&$filter=contactid eq " + id + "&$top=2");
    if (rows.length !== 1 || !sameCreateId(rows[0].contactid, id)) stopCreate("Your own Contact could not be verified.", 403);
    return rows[0];
}

function createReadOne(table, entity, primary, id, selected) {
    if (!createGuid(id)) stopCreate("Invalid related record ID.");
    var attributes = "";
    for (var i = 0; i < selected.length; i++) attributes += '<attribute name="' + (CREATE_LOOKUPS[selected[i]] || selected[i]) + '"/>';
    var query = '<fetch top="2"><entity name="' + entity + '">' + attributes +
        '<filter><condition attribute="' + primary + '" operator="eq" value="' + id + '"/></filter></entity></fetch>';
    var rows = createRows(table, "fetchXml=" + encodeURIComponent(query));
    if (rows.length !== 1 || !sameCreateId(rows[0][primary], id)) stopCreate("The selected record is not accessible.", 403);
    var result = {};
    for (var j = 0; j < selected.length; j++) {
        var key = selected[j];
        var logical = CREATE_LOOKUPS[key] || key;
        var value = rows[0][key] !== undefined ? rows[0][key] : rows[0][logical];
        if (value !== undefined) result[key] = value;
        var annotation = "@OData.Community.Display.V1.FormattedValue";
        var formatted = rows[0][key + annotation] !== undefined ? rows[0][key + annotation] : rows[0][logical + annotation];
        if (typeof formatted === "string") result[key + annotation] = formatted;
    }
    return result;
}

function activeCreateAccount(id) {
    var account = createReadOne("accounts", "account", "accountid", id, ["accountid", "accountcategorycode", "statecode"]);
    if (account.accountcategorycode !== 132140000 || account.statecode !== 0) stopCreate("Select an active Supplier Account.", 403);
}

function createResponseId(envelope, primary) {
    var headers = envelope.Headers;
    if (headers && typeof headers === "object" && !Array.isArray(headers)) {
        var keys = Object.keys(headers);
        for (var i = 0; i < keys.length; i++) {
            var name = keys[i].toLowerCase();
            var value = headers[keys[i]];
            if (name === "entityid" && createGuid(value)) return value;
            if ((name === "location" || name === "odata-entityid") && typeof value === "string") {
                var match = /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)(?:\?.*)?$/i.exec(value);
                if (match) return match[1];
            }
        }
    }
    if (envelope.Body) {
        var record = JSON.parse(envelope.Body);
        if (record && createGuid(record[primary])) return record[primary];
    }
    return null;
}
