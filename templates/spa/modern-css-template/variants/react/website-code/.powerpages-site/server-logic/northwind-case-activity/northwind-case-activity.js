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
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        var query = Server.Context.QueryParameters || {};
        if (Object.keys(query).some((key) => key !== "caseId") || typeof query.caseId !== "string" || !guid.test(query.caseId)) fail("VALIDATION");
        var contact = Server.User.contactid.toLowerCase(), caseId = query.caseId.toLowerCase();
        var owned = all("incidents", "$select=incidentid,statecode&$expand=customerid_contact($select=contactid)&$filter=incidentid eq " +
            caseId + " and customerid_contact/contactid eq " + contact);
        if (owned.length !== 1 || String(owned[0].incidentid).toLowerCase() !== caseId ||
            !owned[0].customerid_contact || String(owned[0].customerid_contact.contactid).toLowerCase() !== contact) fail("NOT_FOUND");
        // Notes attached to portal comments are readable only by a direct single-record Web API GET, never through
        // collection queries or expands. Customer uploads therefore record their note ID on the owning comment.
        var comments = all("adx_portalcomments", "$select=activityid,subject,description,createdon,_regardingobjectid_value,adx_portalcommentdirectioncode" +
            "&$filter=_regardingobjectid_value eq " + caseId + "&$orderby=createdon asc,activityid asc");
        var documents = [], referenced = {};
        // Agent or staff replies can be created without a body; omit them rather than failing the whole timeline.
        comments = comments.filter((row) => row.description != null).map((row) => {
            if (!guid.test(row.activityid || "") || String(row._regardingobjectid_value).toLowerCase() !== caseId ||
                (row.subject != null && typeof row.subject !== "string") ||
                typeof row.description !== "string" || ![1, 2].includes(row.adx_portalcommentdirectioncode) ||
                typeof row.createdon !== "string" || !Number.isFinite(Date.parse(row.createdon))) fail("NOT_FOUND");
            var body = row.description;
            var reference = row.adx_portalcommentdirectioncode === 1 && row.subject !== "Customer message" &&
                body.match(/^Attachment uploaded: ([^\r\n]+)\r?\nDocument reference: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
            if (reference) {
                body = "Attachment uploaded: " + reference[1];
                var name = reference[1], documentId = reference[2].toLowerCase();
                var extension = name.match(/\.(pdf|docx?|png|jpe?g|gif|zip)$/i);
                var type = extension && ({ pdf: "application/pdf", doc: "application/msword",
                    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", zip: "application/zip" })[extension[1].toLowerCase()];
                if (type && name.length <= 255 && !/[\\/:*?"<>|\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(name) && !referenced[documentId]) {
                    referenced[documentId] = true;
                    documents.push({ id: documentId, name: name, type: type, created: row.createdon });
                }
            }
            return { id: row.activityid, subject: row.subject == null ? "" : row.subject, body: body, created: row.createdon,
                author: row.adx_portalcommentdirectioncode === 1 ? "Customer" : "Support" };
        });
        return JSON.stringify({ status: "success", data: { comments: comments, documents: documents } });
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
        function proofFile(type, content, expectedSize) {
            if (!["application/pdf", "image/png", "image/jpeg"].includes(type) || typeof content !== "string" ||
                !content || content.length % 4 !== 0 || content.length > 6990508 || /[^A-Za-z0-9+/=]/.test(content)) return false;
            var padding = content.slice(-2) === "==" ? 2 : content.slice(-1) === "=" ? 1 : 0;
            var size = content.length / 4 * 3 - padding;
            if (content.indexOf("=") !== (padding ? content.length - padding : -1) || size <= 0 || size > 5242880 ||
                (expectedSize !== undefined && size !== expectedSize)) return false;
            var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            if ((padding === 2 && (alphabet.indexOf(content[content.length - 3]) & 15)) ||
                (padding === 1 && (alphabet.indexOf(content[content.length - 2]) & 3))) return false;
            var bytes = [];
            for (var i = 0; i < Math.min(12, content.length); i += 4) {
                var value = alphabet.indexOf(content[i]) * 262144 + alphabet.indexOf(content[i + 1]) * 4096 +
                    Math.max(0, alphabet.indexOf(content[i + 2])) * 64 + Math.max(0, alphabet.indexOf(content[i + 3]));
                bytes.push((value >> 16) & 255, (value >> 8) & 255, value & 255);
            }
            var signature = type === "application/pdf" ? [37, 80, 68, 70, 45] : type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
            return size >= signature.length && signature.every((value, index) => bytes[index] === value);
        }
        function restoreStatus() {
            var result = { statusChanged: false, processingConfirmed: true };
            if (owned[0].statuscode !== 3) return result;
            try {
                var latest = read(Server.Connector.Dataverse.RetrieveMultipleRecords("incidents",
                    "$select=incidentid,statecode,statuscode&$filter=incidentid eq " + caseId, true));
                if (latest.length !== 1 || String(latest[0].incidentid).toLowerCase() !== caseId ||
                    ![0, 1, 2].includes(latest[0].statecode) || !Number.isInteger(latest[0].statuscode)) fail("DATAVERSE_ERROR");
                if (latest[0].statecode === 0 && latest[0].statuscode === 3) {
                    read(Server.Connector.Dataverse.UpdateRecord("incidents", caseId, JSON.stringify({ statuscode: 1 })), true);
                    result.statusChanged = true;
                }
            } catch (_) {
                Server.Logger.Error("northwind-case-activity POST status change failed");
                result.processingConfirmed = false;
            }
            return result;
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
        if (body.kind === "attachmentReceipt") {
            if (Object.keys(body).sort().join(",") !== "caseId,commentId,documentId,kind" ||
                typeof body.commentId !== "string" || !guid.test(body.commentId) ||
                typeof body.documentId !== "string" || !guid.test(body.documentId)) fail("VALIDATION");
            var commentId = body.commentId.toLowerCase(), savedId = body.documentId.toLowerCase();
            var parents = read(Server.Connector.Dataverse.RetrieveMultipleRecords("adx_portalcomments",
                "$select=activityid,subject,description,_regardingobjectid_value,adx_portalcommentdirectioncode,_createdby_value" +
                "&$filter=activityid eq " + commentId + " and _regardingobjectid_value eq " + caseId, true));
            if (parents.length !== 1) fail("NOT_FOUND");
            var parent = parents[0];
            // Notes on portal comments are only returned by a direct single-record read, not by collection queries or expands.
            var noteResponse = Server.Connector.Dataverse.RetrieveRecord("annotations", savedId,
                "$select=annotationid,subject,notetext,isdocument,filename,mimetype,documentbody,_objectid_value,_createdby_value", true);
            if (typeof noteResponse === "string") noteResponse = JSON.parse(noteResponse);
            if (!noteResponse || !(noteResponse.StatusCode >= 200 && noteResponse.StatusCode < 300)) fail("NOT_FOUND");
            var saved = typeof noteResponse.Body === "string" ? JSON.parse(noteResponse.Body) : noteResponse.Body;
            var reference = typeof parent.description === "string" &&
                parent.description.match(/\nDocument reference: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
            if (!saved || typeof saved !== "object" || String(saved.annotationid).toLowerCase() !== savedId ||
                String(parent.activityid).toLowerCase() !== commentId || String(saved._objectid_value).toLowerCase() !== commentId ||
                String(parent._regardingobjectid_value).toLowerCase() !== caseId || parent.adx_portalcommentdirectioncode !== 1 ||
                !reference || reference[1].toLowerCase() !== savedId || !guid.test(saved._createdby_value || "") ||
                String(saved._createdby_value).toLowerCase() !== String(parent._createdby_value).toLowerCase() ||
                saved.isdocument !== true || typeof saved.notetext !== "string" || saved.notetext.indexOf("*WEB*") !== 0) fail("NOT_FOUND");
            var content = saved.documentbody;
            if (typeof content !== "string" || !content || content.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(content)) fail("VALIDATION");
            saved.filesize = content.length / 4 * 3 - (content.slice(-2) === "==" ? 2 : content.slice(-1) === "=" ? 1 : 0);
            var suffix = typeof saved.filename === "string" && saved.filename.match(/\.(pdf|docx?|png|jpe?g|gif|zip)$/i);
            var savedType = suffix && ({ pdf: "application/pdf", doc: "application/msword",
                docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", zip: "application/zip" })[suffix[1].toLowerCase()];
            if (!savedType || saved.mimetype !== savedType || !saved.filename.trim() || saved.filename !== saved.filename.trim() ||
                saved.filename.length > 255 || /[\\/:*?"<>|\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(saved.filename) ||
                !Number.isInteger(saved.filesize) || saved.filesize <= 0 || saved.filesize > 3932160) fail("VALIDATION");
            // The comment subject is not writable through the Web API, so it is the trusted intake marker.
            // Notes on portal comments cannot be updated by the server connector, so the note itself is left as uploaded.
            var verifiedSubject = "Customer document uploaded", ordinarySubject = "Customer attachment uploaded";
            if (parent.subject === verifiedSubject || parent.subject === ordinarySubject) {
                return JSON.stringify({ status: "success", data: { id: savedId, statusChanged: false, processingConfirmed: true } });
            }
            try {
                var commentSubject = ["application/pdf", "image/png", "image/jpeg"].includes(savedType) &&
                    proofFile(savedType, content, saved.filesize) ? verifiedSubject : ordinarySubject;
                var processing = restoreStatus();
                if (!processing.processingConfirmed) {
                    return JSON.stringify({ status: "success", data: { id: savedId,
                        statusChanged: processing.statusChanged, processingConfirmed: false } });
                }
                // Publish the trigger marker last, after the parent and saved content checks.
                read(Server.Connector.Dataverse.UpdateRecord("adx_portalcomments", commentId,
                    JSON.stringify({ subject: commentSubject })), true);
                return JSON.stringify({ status: "success", data: { id: savedId, statusChanged: processing.statusChanged,
                    processingConfirmed: processing.processingConfirmed } });
            } catch (_) {
                Server.Logger.Error("northwind-case-activity POST saved attachment processing failed");
                return JSON.stringify({ status: "success", data: { id: savedId,
                    statusChanged: !!(processing && processing.statusChanged), processingConfirmed: false } });
            }
        }
        var entity, payload;
        if (body.kind === "comment") {
            if (Object.keys(body).sort().join(",") !== "body,caseId,kind" || typeof body.body !== "string" ||
                !body.body.trim() || body.body.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.body)) fail("VALIDATION");
            entity = "adx_portalcomments";
            payload = { subject: "Customer message", description: body.body.trim(), adx_portalcommentdirectioncode: 1,
                "regardingobjectid_incident_adx_portalcomment@odata.bind": "/incidents(" + caseId + ")" };
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
        var status = restoreStatus();
        return JSON.stringify({ status: "success", data: { id: created, statusChanged: status.statusChanged } });
    } catch (error) {
        Server.Logger.Error("northwind-case-activity POST failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "FORBIDDEN", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." :
            code === "VALIDATION" ? body && body.kind === "attachmentReceipt" ?
                "The saved attachment metadata could not be confirmed. Reload the case." :
                "Check the message or file. Use a matching PDF, PNG or JPEG up to 5 MiB." :
                "The change could not be confirmed. Reload the case before submitting it again." });
    }
}
