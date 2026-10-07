// Fixed projections and typed filters avoid exposing an arbitrary query proxy.
// The connector applies the caller's existing Company/N:N/Parent permissions.
// Internal SDK FetchXML avoids the documented OData relationship compiler error:
// https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues
// Prefix checks use indexOf because the host's case-insensitive source validator
// rejects the standard prefix method name before this handler can execute.
// Remove this workaround when the validator checks keyword boundaries.
// https://learn.microsoft.com/power-pages/configure/author-server-logic#limitations

function get() {
    try {
        if (!Server.User) throw new Error("Sign in before reading invoices or purchase orders.");
        var parameters = Server.Context.QueryParameters;
        var table = parameters["table"];
        var contract = tableContract(table);
        var selected = selectFields(parameters["select"], contract);
        if (parameters["mode"] === "record") {
            var id = parameters["id"];
            if (!isGuid(id)) throw new Error("Record ID must be a GUID.");
            var filter = { attribute: contract.id, operator: "eq", value: id };
            var recordBody = runRead(table, buildQuery(contract, selected, filter, "", 1, 1, ""));
            if (recordBody.value.length > 1 || (recordBody.value.length &&
                (!isGuid(recordBody.value[0][contract.id]) ||
                 recordBody.value[0][contract.id].toLowerCase() !== id.toLowerCase()))) throw new Error("Invalid scoped record response.");
            return JSON.stringify({ record: recordBody.value.length ? project(recordBody.value[0], selected, contract) : null });
        }
        if (parameters["mode"]) throw new Error("Unknown business read mode.");
        var pageSize = integer(parameters["pageSize"] || "50", 1, 5000);
        var page = integer(parameters["page"] || "1", 1, 100);
        var filter = parameters["filter"] ? JSON.parse(parameters["filter"]) : null;
        var order = parameters["orderBy"] || "createdon desc";
        var cookie = parameters["cookie"] || "";
        if (cookie.length > 20000 || (cookie && cookie.indexOf("<cookie") !== 0)) throw new Error("Invalid paging cookie.");
        var body = runRead(table, buildQuery(contract, selected, filter, order, pageSize, page, cookie));
        var total = body["@odata.count"];
        if (typeof total !== "number" || total < 0) total = body["@Microsoft.Dynamics.CRM.totalrecordcount"];
        if (typeof total !== "number" || total < 0) total = countRows(table, contract, filter);
        var rows = [];
        for (var i = 0; i < body.value.length; i++) rows.push(project(body.value[i], selected, contract));
        var result = { value: rows, "@odata.count": total };
        var more = body["@Microsoft.Dynamics.CRM.morerecords"];
        // Some connector responses omit annotation cookies. Simple FetchXML page
        // numbers are supported; probe a full page rather than truncating it.
        // https://learn.microsoft.com/power-apps/developer/data-platform/fetchxml/page-results
        if (more === true || (more !== false && rows.length === pageSize)) {
            if (page >= 100) throw new Error("Business read pagination exceeded 100 pages.");
            var nextCookie = pagingCookie(body["@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"]);
            result["@odata.nextLink"] = nextCursor(table, parameters, page + 1, nextCookie);
        }
        return JSON.stringify({ result: result });
    } catch (error) {
        // Never log request filters, cookies, or record bodies.
        var errorClass = error && typeof error.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,60}$/.test(error.name)
            ? error.name : "Error";
        Server.Logger.Error("Scoped business read failed (" + errorClass + ").");
        return JSON.stringify({
            status: "error",
            message: "Could not load invoice or purchase order data."
        });
    }
}

function tableContract(table) {
    if (table === "spnvc_invoices") {
        return {
            entity: "spnvc_invoice", id: "spnvc_invoiceid",
            columns: ["spnvc_invoiceid", "spnvc_name", "spnvc_ponumber", "spnvc_description", "spnvc_submissiondate", "spnvc_duedate", "spnvc_amount", "spnvc_invoicestatus", "_spnvc_contactid_value", "_spnvc_supplieraccountid_value", "_spnvc_purchaseorderid_value", "createdon", "modifiedon"],
            lookups: { _spnvc_contactid_value: "spnvc_contactid", _spnvc_supplieraccountid_value: "spnvc_supplieraccountid", _spnvc_purchaseorderid_value: "spnvc_purchaseorderid" },
            numbers: ["spnvc_amount", "spnvc_invoicestatus"],
            dates: ["spnvc_submissiondate", "spnvc_duedate", "createdon", "modifiedon"],
            related: false
        };
    }
    if (table === "spnvc_purchaseorders") {
        return {
            entity: "spnvc_purchaseorder", id: "spnvc_purchaseorderid",
            columns: ["spnvc_purchaseorderid", "spnvc_name", "spnvc_description", "spnvc_totalamount", "spnvc_deliverydate", "spnvc_postatus", "_spnvc_supplieraccountid_value", "createdon", "modifiedon"],
            lookups: { _spnvc_supplieraccountid_value: "spnvc_supplieraccountid" },
            numbers: ["spnvc_totalamount", "spnvc_postatus"],
            dates: ["spnvc_deliverydate", "createdon", "modifiedon"],
            related: true
        };
    }
    if (table === "spnvc_invoicecomments") {
        return {
            entity: "spnvc_invoicecomment", id: "spnvc_invoicecommentid",
            columns: ["spnvc_invoicecommentid", "spnvc_name", "spnvc_commenttext", "spnvc_linkedaction", "_spnvc_invoiceid_value", "_spnvc_authorcontactid_value", "createdon", "modifiedon"],
            lookups: { _spnvc_invoiceid_value: "spnvc_invoiceid", _spnvc_authorcontactid_value: "spnvc_authorcontactid" },
            numbers: [],
            dates: ["createdon", "modifiedon"],
            related: false
        };
    }
    if (table === "spnvc_invoiceattachments") {
        return {
            entity: "spnvc_invoiceattachment", id: "spnvc_invoiceattachmentid",
            columns: ["spnvc_invoiceattachmentid", "spnvc_name", "spnvc_filesize", "spnvc_filetype", "spnvc_file_name", "_spnvc_invoiceid_value", "_spnvc_invoicecommentid_value", "createdon", "modifiedon"],
            lookups: { _spnvc_invoiceid_value: "spnvc_invoiceid", _spnvc_invoicecommentid_value: "spnvc_invoicecommentid" },
            numbers: [],
            dates: ["createdon", "modifiedon"],
            related: false
        };
    }
    throw new Error("Unsupported business read table.");
}

function selectFields(raw, contract) {
    if (typeof raw !== "string" || raw.length > 1000) throw new Error("Explicit business read fields are required.");
    var columns = raw.split(",");
    for (var i = 0; i < columns.length; i++) {
        if (!contract.columns.includes(columns[i])) throw new Error("Unsupported business read field.");
    }
    return columns;
}

function integer(value, min, max) {
    if (typeof value !== "string" || !/^[0-9]+$/.test(value)) throw new Error("Invalid business read page.");
    var result = Number(value);
    if (!Number.isInteger(result) || result < min || result > max) throw new Error("Business read page is out of range.");
    return result;
}

function isGuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function xml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function field(attribute, contract) {
    if (contract.columns.includes(attribute)) return { name: contract.lookups[attribute] || attribute, related: false };
    if (contract.related && attribute === "spnvc_SupplierAccountId/accountcategorycode") return { name: "accountcategorycode", related: true };
    if (contract.related && attribute === "spnvc_SupplierAccountId/statecode") return { name: "statecode", related: true };
    throw new Error("Unsupported business read filter field.");
}

function filterXml(filter, contract, budget, depth) {
    if (filter === null || filter === undefined) return "";
    if (typeof filter !== "object" || ++budget.nodes > 64 || depth > 8) throw new Error("Invalid business read filter.");
    if (filter.type === "and" || filter.type === "or") {
        if (!Array.isArray(filter.filters)) throw new Error("Invalid business read filter group.");
        var grouped = "";
        for (var i = 0; i < filter.filters.length; i++) grouped += filterXml(filter.filters[i], contract, budget, depth + 1);
        return grouped ? '<filter type="' + filter.type + '">' + grouped + "</filter>" : "";
    }
    var column = field(filter.attribute, contract);
    if (column.related) budget.related = true;
    var operator = filter.operator;
    if (!["eq", "ne", "contains"].includes(operator)) throw new Error("Unsupported business read operator.");
    var value = filter.value;
    if (value === null) {
        if (operator === "contains") throw new Error("Invalid contains filter.");
        return '<condition attribute="' + column.name + '"' + (column.related ? ' entityname="supplier"' : "") +
            ' operator="' + (operator === "eq" ? "null" : "not-null") + '"/>';
    }
    if (contract.lookups[filter.attribute] || filter.attribute === contract.id) {
        if (!isGuid(value) || operator === "contains") throw new Error("Lookup filter ID must be a GUID.");
    } else if (contract.numbers.includes(filter.attribute) || column.related) {
        if (typeof value !== "number" || !Number.isFinite(value) || operator === "contains") throw new Error("Invalid numeric filter.");
    } else if (typeof value !== "string" || value.length > 1000) {
        throw new Error("Invalid text or date filter.");
    }
    if (contract.dates.includes(filter.attribute) && (operator === "contains" ||
        !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))) throw new Error("Invalid date filter.");
    if (operator === "contains") {
        // FetchXML LIKE interprets %, _ and [. Escape those SDK wildcards so the
        // public contains operation retains OData's literal substring semantics.
        value = "%" + value.replace(/[[%_]/g, escapeLikeCharacter) + "%";
        operator = "like";
    }
    return '<condition attribute="' + column.name + '"' + (column.related ? ' entityname="supplier"' : "") +
        ' operator="' + operator + '" value="' + xml(value) + '"/>';
}

function escapeLikeCharacter(character) {
    return "[" + character + "]";
}

function queryParts(contract, filter) {
    var budget = { nodes: 0, related: false };
    var condition = filterXml(filter, contract, budget, 0);
    var link = budget.related
        ? '<link-entity name="account" from="accountid" to="spnvc_supplieraccountid" alias="supplier" link-type="outer"/>'
        : "";
    return { condition: condition ? '<filter type="and">' + condition + "</filter>" : "", link: link };
}

function buildQuery(contract, selected, filter, order, pageSize, page, cookie) {
    var attributes = "";
    for (var i = 0; i < selected.length; i++) attributes += '<attribute name="' + field(selected[i], contract).name + '"/>';
    var sorts = "";
    if (order) {
        var parts = order.split(",");
        if (parts.length > 10) throw new Error("Too many business read sort fields.");
        for (var j = 0; j < parts.length; j++) {
            var match = /^([a-zA-Z_][a-zA-Z0-9_]*)(?: (asc|desc))?$/.exec(parts[j].trim());
            if (!match) throw new Error("Invalid business read sort.");
            sorts += '<order attribute="' + field(match[1], contract).name + '" descending="' + (match[2] === "desc") + '"/>';
        }
    }
    var scope = queryParts(contract, filter);
    return '<fetch count="' + pageSize + '" page="' + page + '" returntotalrecordcount="true"' +
        (cookie ? ' paging-cookie="' + xml(cookie) + '"' : "") + '><entity name="' + contract.entity + '">' +
        attributes + sorts + scope.condition + scope.link + "</entity></fetch>";
}

function runRead(table, query) {
    var raw = Server.Connector.Dataverse.RetrieveMultipleRecords(table, "fetchXml=" + encodeURIComponent(query));
    var envelope = JSON.parse(raw);
    if (!envelope.IsSuccessStatusCode) throw new Error("Scoped business read failed (HTTP " + envelope.StatusCode + ").");
    var body = JSON.parse(envelope.Body);
    if (!body || !Array.isArray(body.value)) throw new Error("Missing scoped business read response.");
    return body;
}

function countRows(table, contract, filter) {
    var scope = queryParts(contract, filter);
    var query = '<fetch aggregate="true"><entity name="' + contract.entity + '"><attribute name="' +
        contract.id + '" alias="recordcount" aggregate="count"/>' + scope.condition + scope.link + "</entity></fetch>";
    var body = runRead(table, query);
    if (body.value.length === 0) return 0;
    var count = body.value[0].recordcount;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) throw new Error("Missing scoped business read count.");
    return count;
}

function project(record, selected, contract) {
    if (!record || typeof record !== "object" || !isGuid(record[contract.id])) throw new Error("Invalid scoped business record.");
    var result = {};
    for (var i = 0; i < selected.length; i++) {
        var property = selected[i];
        var logical = contract.lookups[property] || property;
        var value = record[property] !== undefined ? record[property] : record[logical];
        if (value !== undefined) result[property] = value;
        var annotation = "@OData.Community.Display.V1.FormattedValue";
        var formatted = record[property + annotation] !== undefined ? record[property + annotation] : record[logical + annotation];
        if (typeof formatted === "string") result[property + annotation] = formatted;
    }
    return result;
}

function pagingCookie(raw) {
    if (!raw) return "";
    if (typeof raw !== "string") throw new Error("Invalid scoped paging cookie.");
    // SDK cookies can be raw XML or an envelope with a twice URI-encoded
    // pagingcookie attribute: <cookie pagenumber="2" pagingcookie="%253c..." />.
    // https://learn.microsoft.com/power-apps/developer/data-platform/fetchxml/page-results
    var wrapped = /\bpagingcookie="([^"]*)"/.exec(raw);
    var cookie = wrapped ? decodeURIComponent(decodeURIComponent(wrapped[1])) : raw;
    if (cookie.indexOf("<cookie") !== 0 || cookie.length > 20000) throw new Error("Invalid scoped paging cookie.");
    return cookie;
}

function nextCursor(table, parameters, page, cookie) {
    var query = "table=" + encodeURIComponent(table) + "&select=" + encodeURIComponent(parameters["select"]) +
        "&pageSize=" + encodeURIComponent(parameters["pageSize"] || "50") + "&page=" + page;
    if (parameters["filter"]) query += "&filter=" + encodeURIComponent(parameters["filter"]);
    if (parameters["orderBy"]) query += "&orderBy=" + encodeURIComponent(parameters["orderBy"]);
    if (cookie) query += "&cookie=" + encodeURIComponent(cookie);
    return "/_api/serverlogics/invoice-po-reads?" + query;
}
