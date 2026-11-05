function post() {
    try {
        Server.Logger.Log("northwind-feedback POST");
        function fail(code) { throw { code: code }; }
        function read(response, empty) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            if (empty) return response;
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || typeof data !== "object" || Array.isArray(data)) fail("DATAVERSE_ERROR");
            return data;
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        if (Object.keys(Server.Context.QueryParameters || {}).length) fail("VALIDATION");
        var body;
        try { body = JSON.parse(Server.Context.Body); } catch (_) { fail("VALIDATION"); }
        if (!body || typeof body !== "object" || Array.isArray(body)) fail("VALIDATION");
        var contact = Server.User.contactid.toLowerCase();
        var payload = { "CreatedByContact@odata.bind": "/contacts(" + contact + ")" };
        if (body.kind === "contact") {
            if (Object.keys(body).sort().join(",") !== "kind,message" || typeof body.message !== "string" ||
                !body.message.trim() || body.message.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.message)) fail("VALIDATION");
            payload.title = "Northwind support contact request";
            payload.comments = body.message.trim();
            payload["ContactId@odata.bind"] = "/contacts(" + contact + ")";
        } else if (body.kind === "article") {
            if (Object.keys(body).sort().join(",") !== "articleId,helpful,kind" || typeof body.articleId !== "string" ||
                !guid.test(body.articleId) || typeof body.helpful !== "boolean") fail("VALIDATION");
            var language = Server.SiteSetting.Get("Northwind/KnowledgeLanguageLocaleId");
            if (typeof language !== "string" || !guid.test(language)) fail("CONFIGURATION");
            language = language.toLowerCase();
            var now = Date.now(), timestamp = new Date(now).toISOString(), id = body.articleId.toLowerCase();
            var filter = "statecode eq 3 and isinternal eq false and isrootarticle eq false and _languagelocaleid_value eq " + language +
                " and (publishon eq null or publishon le " + timestamp + ") and (expirationdate eq null or expirationdate gt " + timestamp + ")";
            var page = read(Server.Connector.Dataverse.RetrieveMultipleRecords("knowledgearticles",
                "$select=knowledgearticleid,statecode,isinternal,isrootarticle,_languagelocaleid_value,_rootarticleid_value,publishon,expirationdate&$filter=" +
                filter + " and knowledgearticleid eq " + id, true));
            if (!Array.isArray(page.value) || page.value.length !== 1) fail("NOT_FOUND");
            var row = page.value[0];
            if (String(row.knowledgearticleid).toLowerCase() !== id || row.statecode !== 3 || row.isinternal !== false || row.isrootarticle !== false ||
                String(row._languagelocaleid_value).toLowerCase() !== language ||
                (row.publishon != null && (!Number.isFinite(Date.parse(row.publishon)) || Date.parse(row.publishon) > now)) ||
                (row.expirationdate != null && (!Number.isFinite(Date.parse(row.expirationdate)) || Date.parse(row.expirationdate) <= now))) fail("NOT_FOUND");
            if (row._rootarticleid_value != null && !guid.test(row._rootarticleid_value)) fail("DATAVERSE_ERROR");
            var group = row._rootarticleid_value ? "_rootarticleid_value eq " + row._rootarticleid_value : "knowledgearticleid eq " + id;
            var latest = read(Server.Connector.Dataverse.RetrieveMultipleRecords("knowledgearticles", "$select=knowledgearticleid&$filter=" +
                filter + " and " + group + "&$orderby=majorversionnumber desc,minorversionnumber desc,knowledgearticleid asc&$top=1", true));
            if (!Array.isArray(latest.value) || latest.value.length !== 1 || String(latest.value[0].knowledgearticleid).toLowerCase() !== id) fail("NOT_FOUND");
            payload.title = "Northwind article helpfulness";
            payload["KnowledgeArticleId@odata.bind"] = "/knowledgearticles(" + id + ")";
            payload.rating = body.helpful ? 1 : 0;
            payload.minrating = 0;
            payload.maxrating = 1;
            payload.comments = body.helpful ? "Helpful" : "Not helpful";
        } else fail("VALIDATION");
        var result = read(Server.Connector.Dataverse.CreateRecord("feedback", JSON.stringify(payload)), true);
        var created = null;
        Object.keys(result.Headers || {}).some((key) => {
            if (!["entityid", "odata-entityid"].includes(key.toLowerCase())) return false;
            var match = String(result.Headers[key]).match(/(?:^|[\({])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:$|[\)}])/i);
            if (match) created = match[1].toLowerCase();
            return !!created;
        });
        if (!created) fail("DATAVERSE_ERROR");
        return JSON.stringify({ status: "success", data: { id: created } });
    } catch (error) {
        Server.Logger.Error("northwind-feedback POST failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "VALIDATION", "CONFIGURATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." :
            code === "VALIDATION" ? "Check the request. Contact messages must contain 1 to 2,000 characters." : "Your feedback could not be confirmed. Check with support before submitting it again." });
    }
}
