function get() {
    try {
        Server.Logger.Log("northwind-knowledge GET");
        function fail(code) { throw { code: code }; }
        function read(response) {
            if (typeof response === "string") response = JSON.parse(response);
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || !Array.isArray(data.value)) fail("DATAVERSE_ERROR");
            return data;
        }
        function eligible(row) {
            return guid.test(row.knowledgearticleid || "") && row.statecode === 3 && row.isinternal === false && row.isrootarticle === false &&
                String(row._languagelocaleid_value).toLowerCase() === language &&
                (row.publishon == null || (Number.isFinite(Date.parse(row.publishon)) && Date.parse(row.publishon) <= now)) &&
                (row.expirationdate == null || (Number.isFinite(Date.parse(row.expirationdate)) && Date.parse(row.expirationdate) > now));
        }
        function latest(row) {
            var root = row._rootarticleid_value;
            if (root != null && !guid.test(root)) fail("DATAVERSE_ERROR");
            var key = root || row.knowledgearticleid;
            if (!newest[key]) {
                var group = root ? "_rootarticleid_value eq " + root : "knowledgearticleid eq " + row.knowledgearticleid;
                var page = read(Server.Connector.Dataverse.RetrieveMultipleRecords("knowledgearticles",
                    "$select=knowledgearticleid&$filter=" + filter + " and " + group +
                    "&$orderby=majorversionnumber desc,minorversionnumber desc,knowledgearticleid asc&$top=1", true));
                if (page.value.length !== 1 || !guid.test(page.value[0].knowledgearticleid || "")) fail("NOT_FOUND");
                newest[key] = page.value[0].knowledgearticleid.toLowerCase();
            }
            return newest[key] === row.knowledgearticleid.toLowerCase();
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        // Published external knowledge is public; anonymous visitors are limited by the Anonymous Users read permission and the filter below.
        var language = Server.SiteSetting.Get("Northwind/KnowledgeLanguageLocaleId");
        if (typeof language !== "string" || !guid.test(language)) fail("CONFIGURATION");
        language = language.toLowerCase();
        var query = Server.Context.QueryParameters || {};
        if (Object.keys(query).some((key) => !["id", "cursor"].includes(key)) ||
            (query.id !== undefined && query.cursor !== undefined) ||
            (query.id !== undefined && (typeof query.id !== "string" || !guid.test(query.id)))) fail("VALIDATION");
        var now = Date.now(), timestamp = new Date(now).toISOString(), newest = {};
        var filter = "statecode eq 3 and isinternal eq false and isrootarticle eq false and _languagelocaleid_value eq " + language +
            " and (publishon eq null or publishon le " + timestamp + ") and (expirationdate eq null or expirationdate gt " + timestamp + ")";
        var options = "$select=knowledgearticleid,articlepublicnumber,title,description,content,statecode,isinternal,isrootarticle," +
            "_languagelocaleid_value,_rootarticleid_value,publishon,expirationdate&$filter=" + filter;
        if (query.id !== undefined) options += " and knowledgearticleid eq " + query.id.toLowerCase();
        options += "&$orderby=knowledgearticleid asc";
        if (query.cursor !== undefined) {
            if (typeof query.cursor !== "string" || query.cursor.length > 32768) fail("VALIDATION");
            var saved;
            try { saved = JSON.parse(decodeURIComponent(query.cursor)); } catch (_) { fail("VALIDATION"); }
            if (!saved || Object.keys(saved).sort().join(",") !== "language,token,v" || saved.v !== 1 || saved.language !== language ||
                typeof saved.token !== "string" || !saved.token || saved.token.length > 12000 || /[\u0000-\u001f]/.test(saved.token)) fail("VALIDATION");
            options += "&$skiptoken=" + encodeURIComponent(saved.token);
        }
        var page = read(Server.Connector.Dataverse.RetrieveMultipleRecords("knowledgearticles", options, true));
        var items = [];
        page.value.forEach((row) => {
            if (!eligible(row)) fail("NOT_FOUND");
            if (!latest(row)) return;
            if (typeof row.articlepublicnumber !== "string" || typeof row.title !== "string" ||
                (row.description != null && typeof row.description !== "string") || (row.content != null && typeof row.content !== "string")) fail("DATAVERSE_ERROR");
            items.push({ id: row.knowledgearticleid, number: row.articlepublicnumber, title: row.title,
                description: row.description || "", content: row.content || "" });
        });
        if (query.id !== undefined && (items.length !== 1 || items[0].id.toLowerCase() !== query.id.toLowerCase())) fail("NOT_FOUND");
        var next = null;
        if (page["@odata.nextLink"] != null) {
            if (typeof page["@odata.nextLink"] !== "string") fail("DATAVERSE_ERROR");
            var parts = page["@odata.nextLink"].split("?")[1];
            var tokens = parts ? parts.split("&").filter((part) => ["$skiptoken", "%24skiptoken"].includes(part.split("=")[0])) : [];
            if (tokens.length !== 1) fail("DATAVERSE_ERROR");
            var token = decodeURIComponent(tokens[0].slice(tokens[0].indexOf("=") + 1));
            if (!token || token.length > 12000) fail("DATAVERSE_ERROR");
            next = encodeURIComponent(JSON.stringify({ v: 1, language: language, token: token }));
            if (next === query.cursor) fail("DATAVERSE_ERROR");
        }
        return JSON.stringify({ status: "success", data: { items: items, cursor: next } });
    } catch (error) {
        Server.Logger.Error("northwind-knowledge GET failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "VALIDATION", "CONFIGURATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." : "Published knowledge is unavailable. Contact the site administrator if this continues." });
    }
}
