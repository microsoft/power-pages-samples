function get() {
    try {
        Server.Logger.Log("northwind-cases GET");
        function fail(code) { throw { code: code }; }
        function read(response) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || !Array.isArray(data.value)) fail("DATAVERSE_ERROR");
            return data;
        }
        function dto(row) {
            if (!guid.test(row.incidentid || "") || typeof row.ticketnumber !== "string" || typeof row.title !== "string" ||
                (row.description != null && typeof row.description !== "string") || !Number.isInteger(row.statecode) || !Number.isInteger(row.statuscode) ||
                typeof row.createdon !== "string" || !Number.isFinite(Date.parse(row.createdon)) ||
                typeof row.modifiedon !== "string" || !Number.isFinite(Date.parse(row.modifiedon))) fail("DATAVERSE_ERROR");
            if (!row.customerid_contact || typeof row.customerid_contact.contactid !== "string" || row.customerid_contact.contactid.toLowerCase() !== contact) fail("NOT_FOUND");
            return { id: row.incidentid, number: row.ticketnumber, title: row.title, description: row.description == null ? "" : row.description,
                state: row.statecode, status: row.statuscode, created: row.createdon, updated: row.modifiedon };
        }
        function cursor(token) { return encodeURIComponent(JSON.stringify({ v: 1, owner: contact, token: token })); }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        var contact = Server.User.contactid.toLowerCase();
        var query = Server.Context.QueryParameters || {};
        if (Object.keys(query).some((key) => !["id", "cursor"].includes(key)) ||
            (query.id !== undefined && query.cursor !== undefined) || (query.id !== undefined && !guid.test(query.id))) fail("VALIDATION");
        var options = "$select=incidentid,ticketnumber,title,description,statecode,statuscode,createdon,modifiedon" +
            "&$expand=customerid_contact($select=contactid)&$filter=customerid_contact/contactid eq " + contact;
        if (query.id !== undefined) options += " and incidentid eq " + query.id.toLowerCase();
        options += "&$orderby=createdon desc,incidentid asc";
        if (query.cursor !== undefined) {
            var saved;
            try {
                if (typeof query.cursor !== "string" || query.cursor.length > 32768) fail("VALIDATION");
                saved = JSON.parse(decodeURIComponent(query.cursor));
            } catch (_) { fail("VALIDATION"); }
            if (!saved || Object.keys(saved).sort().join(",") !== "owner,token,v" || saved.v !== 1 || saved.owner !== contact ||
                typeof saved.token !== "string" || !saved.token || saved.token.length > 12000 || /[\u0000-\u001f]/.test(saved.token)) fail("VALIDATION");
            options += "&$skiptoken=" + encodeURIComponent(saved.token);
        }
        var page = read(Server.Connector.Dataverse.RetrieveMultipleRecords("incidents", options, true));
        var next = null;
        if (page["@odata.nextLink"] != null) {
            if (typeof page["@odata.nextLink"] !== "string") fail("DATAVERSE_ERROR");
            var parts = page["@odata.nextLink"].split("?")[1];
            var tokens = parts ? parts.split("&").filter((part) => part.split("=")[0] === "$skiptoken" || part.split("=")[0] === "%24skiptoken") : [];
            if (tokens.length !== 1) fail("DATAVERSE_ERROR");
            var token = decodeURIComponent(tokens[0].slice(tokens[0].indexOf("=") + 1));
            if (!token || token.length > 12000) fail("DATAVERSE_ERROR");
            next = cursor(token);
            if (next === query.cursor) fail("DATAVERSE_ERROR");
        }
        var items = page.value.map(dto);
        if (query.id !== undefined && (items.length !== 1 || items[0].id.toLowerCase() !== query.id.toLowerCase())) fail("NOT_FOUND");
        return JSON.stringify({ status: "success", data: { items: items, cursor: next } });
    } catch (error) {
        Server.Logger.Error("northwind-cases GET failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." : "Unable to read your cases." });
    }
}

function post() {
    try {
        Server.Logger.Log("northwind-cases POST");
        function fail(code) { throw { code: code }; }
        function read(response, empty) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            if (empty) return response;
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || typeof data !== "object") fail("DATAVERSE_ERROR");
            return data;
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        if (Object.keys(Server.Context.QueryParameters || {}).length) fail("VALIDATION");
        var body;
        try { body = JSON.parse(Server.Context.Body); } catch (_) { fail("VALIDATION"); }
        if (!body || typeof body !== "object" || Array.isArray(body) ||
            Object.keys(body).some((key) => !["description", "impact", "productId"].includes(key)) ||
            typeof body.description !== "string" || !body.description.trim() || body.description.length > 2000 ||
            !["Work is blocked", "Service is impaired", "I have a question"].includes(body.impact) ||
            /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.description + body.impact) ||
            (body.productId !== undefined && (typeof body.productId !== "string" || !guid.test(body.productId)))) fail("VALIDATION");
        var description = body.description.trim() + "\n\nBusiness impact: " + body.impact.trim();
        if (description.length > 2000) fail("VALIDATION");
        var contact = Server.User.contactid.toLowerCase();
        var payload = { title: body.description.trim().split(/[\r\n]/)[0].slice(0, 200), description: description,
            caseorigincode: 3, // Web
            "customerid_contact@odata.bind": "/contacts(" + contact + ")" };
        if (body.productId !== undefined) {
            var productResponse = Server.Connector.Dataverse.RetrieveRecord("products", body.productId.toLowerCase(), "$select=productid,statecode", true);
            if (typeof productResponse === "string") productResponse = JSON.parse(productResponse);
            if (productResponse && productResponse.StatusCode === 404) fail("NOT_FOUND");
            var product = read(productResponse);
            if (typeof product.productid !== "string" || product.productid.toLowerCase() !== body.productId.toLowerCase() || product.statecode !== 0) fail("VALIDATION");
            payload["productid@odata.bind"] = "/products(" + product.productid + ")";
        }
        // Dataverse supplies the verified Active / In Progress initial state (0 / 1).
        var result = read(Server.Connector.Dataverse.CreateRecord("incidents", JSON.stringify(payload)), true);
        var id = null;
        Object.keys(result.Headers || {}).some((key) => {
            if (!["entityid", "odata-entityid"].includes(key.toLowerCase())) return false;
            var match = String(result.Headers[key]).match(/(?:^|[\({])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:$|[\)}])/i);
            if (match) id = match[1].toLowerCase();
            return !!id;
        });
        if (!id) fail("DATAVERSE_ERROR");
        var row = read(Server.Connector.Dataverse.RetrieveRecord("incidents", id,
            "$select=incidentid,ticketnumber,title,description,statecode,statuscode,createdon,modifiedon&$expand=customerid_contact($select=contactid)", true));
        if (String(row.incidentid).toLowerCase() !== id || !row.customerid_contact || String(row.customerid_contact.contactid).toLowerCase() !== contact ||
            typeof row.ticketnumber !== "string" || typeof row.title !== "string" || typeof row.description !== "string" ||
            !Number.isInteger(row.statecode) || !Number.isInteger(row.statuscode) ||
            typeof row.createdon !== "string" || !Number.isFinite(Date.parse(row.createdon)) ||
            typeof row.modifiedon !== "string" || !Number.isFinite(Date.parse(row.modifiedon))) fail("DATAVERSE_ERROR");
        return JSON.stringify({ status: "success", data: { id: row.incidentid, number: row.ticketnumber, title: row.title,
            description: row.description, state: row.statecode, status: row.statuscode, created: row.createdon, updated: row.modifiedon } });
    } catch (error) {
        Server.Logger.Error("northwind-cases POST failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." :
            code === "VALIDATION" ? "Check the case details. Description and business impact together must fit within 2,000 characters." :
                "Case creation could not be confirmed. Reload your cases before submitting again." });
    }
}

function patch() {
    try {
        Server.Logger.Log("northwind-cases PATCH");
        function fail(code) { throw { code: code }; }
        function read(response, empty) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            if (empty) return response;
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || typeof data !== "object") fail("DATAVERSE_ERROR");
            return data;
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        if (Object.keys(Server.Context.QueryParameters || {}).length) fail("VALIDATION");
        var body;
        try { body = JSON.parse(Server.Context.Body); } catch (_) { fail("VALIDATION"); }
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).sort().join(",") !== "description,id,title" ||
            typeof body.id !== "string" || !guid.test(body.id) || typeof body.title !== "string" || !body.title.trim() || body.title.length > 200 ||
            typeof body.description !== "string" || !body.description.trim() || body.description.length > 2000 ||
            /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.title + body.description)) fail("VALIDATION");
        var contact = Server.User.contactid.toLowerCase();
        var id = body.id.toLowerCase();
        var options = "$select=incidentid,ticketnumber,title,description,statecode,statuscode,createdon,modifiedon" +
            "&$expand=customerid_contact($select=contactid)&$filter=incidentid eq " + id + " and customerid_contact/contactid eq " + contact;
        var page = read(Server.Connector.Dataverse.RetrieveMultipleRecords("incidents", options, true));
        if (!Array.isArray(page.value)) fail("DATAVERSE_ERROR");
        if (page.value.length !== 1 || String(page.value[0].incidentid).toLowerCase() !== id ||
            !page.value[0].customerid_contact || String(page.value[0].customerid_contact.contactid).toLowerCase() !== contact) fail("NOT_FOUND");
        if (page.value[0].statecode !== 0) fail("FORBIDDEN");
        read(Server.Connector.Dataverse.UpdateRecord("incidents", id, JSON.stringify({ title: body.title.trim(), description: body.description.trim() })), true);
        var row = read(Server.Connector.Dataverse.RetrieveRecord("incidents", id,
            "$select=incidentid,ticketnumber,title,description,statecode,statuscode,createdon,modifiedon&$expand=customerid_contact($select=contactid)", true));
        if (String(row.incidentid).toLowerCase() !== id || !row.customerid_contact || String(row.customerid_contact.contactid).toLowerCase() !== contact ||
            typeof row.ticketnumber !== "string" || typeof row.title !== "string" || typeof row.description !== "string" ||
            !Number.isInteger(row.statecode) || !Number.isInteger(row.statuscode) ||
            typeof row.createdon !== "string" || !Number.isFinite(Date.parse(row.createdon)) ||
            typeof row.modifiedon !== "string" || !Number.isFinite(Date.parse(row.modifiedon))) fail("DATAVERSE_ERROR");
        return JSON.stringify({ status: "success", data: { id: row.incidentid, number: row.ticketnumber, title: row.title,
            description: row.description, state: row.statecode, status: row.statuscode, created: row.createdon, updated: row.modifiedon } });
    } catch (error) {
        Server.Logger.Error("northwind-cases PATCH failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "FORBIDDEN", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." :
            code === "VALIDATION" ? "Check the title (200 characters) and description (2,000 characters)." :
                "The case update could not be confirmed. Reload before saving again." });
    }
}
