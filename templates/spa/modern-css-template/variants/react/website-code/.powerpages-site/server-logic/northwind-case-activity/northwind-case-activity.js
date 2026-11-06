function get() {
    try {
        Server.Logger.Log("northwind-case-activity GET");
        function fail(code) { throw { code: code }; }
        function read(response) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || typeof data !== "object" || Array.isArray(data)) fail("DATAVERSE_ERROR");
            return data;
        }
        function all(entity, options) {
            var rows = [], tokensSeen = {}, extra = "";
            do {
                var page = read(Server.Connector.Dataverse.RetrieveMultipleRecords(entity, options + extra, true));
                if (!Array.isArray(page.value)) fail("DATAVERSE_ERROR");
                rows = rows.concat(page.value);
                extra = "";
                if (page["@odata.nextLink"] != null) {
                    if (typeof page["@odata.nextLink"] !== "string") fail("DATAVERSE_ERROR");
                    var parts = page["@odata.nextLink"].split("?")[1];
                    var tokens = parts ? parts.split("&").filter((part) => ["$skiptoken", "%24skiptoken"].includes(part.split("=")[0])) : [];
                    if (tokens.length !== 1) fail("DATAVERSE_ERROR");
                    var token = decodeURIComponent(tokens[0].slice(tokens[0].indexOf("=") + 1));
                    if (!token || token.length > 12000 || tokensSeen[token]) fail("DATAVERSE_ERROR");
                    tokensSeen[token] = true;
                    extra = "&$skiptoken=" + encodeURIComponent(token);
                }
            } while (extra);
            return rows;
        }
        function file(row, withContent) {
            if (!guid.test(row.annotationid || "") || String(row._objectid_value).toLowerCase() !== caseId ||
                typeof row.notetext !== "string" || row.notetext.indexOf("*WEB*") !== 0 || row.isdocument !== true) fail("NOT_FOUND");
            var extension = typeof row.filename === "string" && row.filename.match(/\.(pdf|png|jpe?g)$/i);
            var type = extension && ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" })[extension[1].toLowerCase()];
            if (!type || row.mimetype !== type || row.filename.length > 255 || /[\\/:*?"<>|\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(row.filename) ||
                !Number.isInteger(row.filesize) || row.filesize <= 0 || row.filesize > 5242880) fail("VALIDATION");
            if (withContent) {
                var content = row.documentbody;
                if (typeof content !== "string" || content.length % 4 !== 0 || content.length > 6990508 ||
                    /[^A-Za-z0-9+/=]/.test(content)) fail("VALIDATION");
                var padding = content.slice(-2) === "==" ? 2 : content.slice(-1) === "=" ? 1 : 0;
                if (content.indexOf("=") !== (padding ? content.length - padding : -1) || content.length / 4 * 3 - padding !== row.filesize) fail("VALIDATION");
                var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                if ((padding === 2 && (alphabet.indexOf(content[content.length - 3]) & 15)) ||
                    (padding === 1 && (alphabet.indexOf(content[content.length - 2]) & 3))) fail("VALIDATION");
                var bytes = [];
                for (var i = 0; i < Math.min(12, content.length); i += 4) {
                    var value = alphabet.indexOf(content[i]) * 262144 + alphabet.indexOf(content[i + 1]) * 4096 +
                        Math.max(0, alphabet.indexOf(content[i + 2])) * 64 + Math.max(0, alphabet.indexOf(content[i + 3]));
                    bytes.push((value >> 16) & 255, (value >> 8) & 255, value & 255);
                }
                var signature = type === "application/pdf" ? [37, 80, 68, 70, 45] : type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
                if (row.filesize < signature.length || signature.some((value, index) => bytes[index] !== value)) fail("VALIDATION");
                return { name: row.filename, type: type, content: content };
            }
            return { id: row.annotationid, name: row.filename, type: type, size: row.filesize };
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        var query = Server.Context.QueryParameters || {};
        if (Object.keys(query).some((key) => !["caseId", "documentId"].includes(key)) ||
            typeof query.caseId !== "string" || !guid.test(query.caseId) ||
            (query.documentId !== undefined && (typeof query.documentId !== "string" || !guid.test(query.documentId)))) fail("VALIDATION");
        var contact = Server.User.contactid.toLowerCase(), caseId = query.caseId.toLowerCase();
        var owned = all("incidents", "$select=incidentid,statecode&$expand=customerid_contact($select=contactid)&$filter=incidentid eq " +
            caseId + " and customerid_contact/contactid eq " + contact);
        if (owned.length !== 1 || String(owned[0].incidentid).toLowerCase() !== caseId ||
            !owned[0].customerid_contact || String(owned[0].customerid_contact.contactid).toLowerCase() !== contact) fail("NOT_FOUND");
        var notesQuery = "$select=annotationid,_objectid_value,notetext,isdocument,filename,mimetype,filesize" +
            (query.documentId === undefined ? "" : ",documentbody") + "&$filter=_objectid_value eq " + caseId +
            " and isdocument eq true and startswith" + "(notetext,'*WEB*')";
        if (query.documentId !== undefined) {
            var files = all("annotations", notesQuery + " and annotationid eq " + query.documentId.toLowerCase());
            if (files.length !== 1 || String(files[0].annotationid).toLowerCase() !== query.documentId.toLowerCase()) fail("NOT_FOUND");
            return JSON.stringify({ status: "success", data: file(files[0], true) });
        }
        var comments = all("adx_portalcomments", "$select=activityid,subject,description,createdon,_regardingobjectid_value,adx_portalcommentdirectioncode" +
            "&$filter=_regardingobjectid_value eq " + caseId + " and startswith" + "(subject,'*WEB*')&$orderby=createdon asc,activityid asc");
        var documents = all("annotations", notesQuery + "&$orderby=createdon asc,annotationid asc");
        return JSON.stringify({ status: "success", data: {
            comments: comments.map((row) => {
                if (!guid.test(row.activityid || "") || String(row._regardingobjectid_value).toLowerCase() !== caseId ||
                    typeof row.subject !== "string" || row.subject.indexOf("*WEB*") !== 0 ||
                    typeof row.description !== "string" || ![1, 2].includes(row.adx_portalcommentdirectioncode) ||
                    typeof row.createdon !== "string" || !Number.isFinite(Date.parse(row.createdon))) fail("NOT_FOUND");
                return { id: row.activityid, body: row.description, created: row.createdon,
                    author: row.adx_portalcommentdirectioncode === 1 ? "Customer" : "Support" };
            }), documents: documents.map((row) => file(row, false))
        } });
    } catch (error) {
        Server.Logger.Error("northwind-case-activity GET failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." : "The case conversation or document could not be loaded." });
    }
}

function post() {
    try {
        Server.Logger.Log("northwind-case-activity POST");
        function fail(code) { throw { code: code }; }
        function read(response, empty) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            if (empty) return response;
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || !Array.isArray(data.value)) fail("DATAVERSE_ERROR");
            return data.value;
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        if (Object.keys(Server.Context.QueryParameters || {}).length || typeof Server.Context.Body !== "string" || Server.Context.Body.length > 7014508) fail("VALIDATION");
        var body;
        try { body = JSON.parse(Server.Context.Body); } catch (_) { fail("VALIDATION"); }
        if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.caseId !== "string" || !guid.test(body.caseId)) fail("VALIDATION");
        var caseId = body.caseId.toLowerCase(), contact = Server.User.contactid.toLowerCase();
        var owned = read(Server.Connector.Dataverse.RetrieveMultipleRecords("incidents",
            "$select=incidentid,statecode,statuscode&$expand=customerid_contact($select=contactid)&$filter=incidentid eq " + caseId +
            " and customerid_contact/contactid eq " + contact, true));
        if (owned.length !== 1 || String(owned[0].incidentid).toLowerCase() !== caseId ||
            !owned[0].customerid_contact || String(owned[0].customerid_contact.contactid).toLowerCase() !== contact) fail("NOT_FOUND");
        if (owned[0].statecode !== 0) fail("FORBIDDEN");
        var entity, payload;
        if (body.kind === "comment") {
            if (Object.keys(body).sort().join(",") !== "body,caseId,kind" || typeof body.body !== "string" ||
                !body.body.trim() || body.body.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.body)) fail("VALIDATION");
            entity = "adx_portalcomments";
            payload = { subject: "*WEB* Customer message", description: body.body.trim(), adx_portalcommentdirectioncode: 1,
                "regardingobjectid_incident_adx_portalcomment@odata.bind": "/incidents(" + caseId + ")" };
        } else if (body.kind === "document") {
            if (Object.keys(body).sort().join(",") !== "caseId,content,kind,name,type" || typeof body.name !== "string" ||
                !body.name.trim() || body.name !== body.name.trim() || body.name.length > 255 ||
                /[\\/:*?"<>|\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(body.name)) fail("VALIDATION");
            var extension = body.name.match(/\.(pdf|png|jpe?g)$/i);
            var type = extension && ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" })[extension[1].toLowerCase()];
            if (!type || body.type !== type || typeof body.content !== "string" || !body.content || body.content.length % 4 !== 0 ||
                body.content.length > 6990508 || /[^A-Za-z0-9+/=]/.test(body.content)) fail("VALIDATION");
            var content = body.content, padding = content.slice(-2) === "==" ? 2 : content.slice(-1) === "=" ? 1 : 0;
            var size = content.length / 4 * 3 - padding;
            if (content.indexOf("=") !== (padding ? content.length - padding : -1) || size <= 0 || size > 5242880) fail("VALIDATION");
            var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            if ((padding === 2 && (alphabet.indexOf(content[content.length - 3]) & 15)) ||
                (padding === 1 && (alphabet.indexOf(content[content.length - 2]) & 3))) fail("VALIDATION");
            var bytes = [];
            for (var i = 0; i < Math.min(12, content.length); i += 4) {
                var value = alphabet.indexOf(content[i]) * 262144 + alphabet.indexOf(content[i + 1]) * 4096 +
                    Math.max(0, alphabet.indexOf(content[i + 2])) * 64 + Math.max(0, alphabet.indexOf(content[i + 3]));
                bytes.push((value >> 16) & 255, (value >> 8) & 255, value & 255);
            }
            var signature = type === "application/pdf" ? [37, 80, 68, 70, 45] : type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
            if (size < signature.length || signature.some((value, index) => bytes[index] !== value)) fail("VALIDATION");
            entity = "annotations";
            payload = { subject: "Northwind customer document", notetext: "*WEB* Customer-uploaded document", filename: body.name,
                mimetype: type, isdocument: true, documentbody: content, "objectid_incident@odata.bind": "/incidents(" + caseId + ")" };
        } else fail("VALIDATION");
        var result = read(Server.Connector.Dataverse.CreateRecord(entity, JSON.stringify(payload)), true);
        var created = null;
        Object.keys(result.Headers || {}).some((key) => {
            if (!["entityid", "odata-entityid"].includes(key.toLowerCase())) return false;
            var match = String(result.Headers[key]).match(/(?:^|[\({])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:$|[\)}])/i);
            if (match) created = match[1].toLowerCase();
            return !!created;
        });
        if (!created) fail("DATAVERSE_ERROR");
        // A customer response answers "Waiting for Details" (3); return the case to "In Progress" (1).
        // The response is already saved, so a failed status change must not invite a duplicate resubmission.
        var statusChanged = false;
        if (owned[0].statuscode === 3) {
            try {
                var latest = read(Server.Connector.Dataverse.RetrieveMultipleRecords("incidents",
                    "$select=incidentid,statecode,statuscode&$filter=incidentid eq " + caseId, true));
                if (latest.length === 1 && String(latest[0].incidentid).toLowerCase() === caseId &&
                    latest[0].statecode === 0 && latest[0].statuscode === 3) {
                    read(Server.Connector.Dataverse.UpdateRecord("incidents", caseId, JSON.stringify({ statuscode: 1 })), true);
                    statusChanged = true;
                }
            } catch (_) {
                Server.Logger.Error("northwind-case-activity POST status change failed");
            }
        }
        return JSON.stringify({ status: "success", data: { id: created, statusChanged: statusChanged } });
    } catch (error) {
        Server.Logger.Error("northwind-case-activity POST failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "FORBIDDEN", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." :
            code === "VALIDATION" ? "Check the message or file. Use a matching PDF, PNG or JPEG up to 5 MiB." :
                "The change could not be confirmed. Reload the case before submitting it again." });
    }
}
