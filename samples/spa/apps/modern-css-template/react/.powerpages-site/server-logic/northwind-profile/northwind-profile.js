function get() {
    try {
        Server.Logger.Log("northwind-profile GET");
        function fail(code) { throw { code: code }; }
        function read(response) {
            if (typeof response === "string") response = JSON.parse(response);
            if (response && response.StatusCode === 404) fail("NOT_FOUND");
            if (!response || !(response.StatusCode >= 200 && response.StatusCode < 300) || response.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
            var data = typeof response.Body === "string" ? JSON.parse(response.Body) : response.Body;
            if (!data || typeof data !== "object" || Array.isArray(data)) fail("DATAVERSE_ERROR");
            return data;
        }
        function text(value) {
            if (value == null) return "";
            if (typeof value !== "string") fail("DATAVERSE_ERROR");
            return value;
        }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        if (Object.keys(Server.Context.QueryParameters || {}).length) fail("VALIDATION");
        var id = Server.User.contactid.toLowerCase();
        var response = Server.Connector.Dataverse.RetrieveRecord("contacts", id,
            "$select=contactid,firstname,lastname,emailaddress1,telephone1,address1_composite&$expand=parentcustomerid_account($select=accountid,name)", true);
        var row = read(response);
        if (typeof row.contactid !== "string" || row.contactid.toLowerCase() !== id) fail("DATAVERSE_ERROR");
        var account = null;
        if (row.parentcustomerid_account != null) {
            if (!guid.test(row.parentcustomerid_account.accountid || "") || typeof row.parentcustomerid_account.name !== "string") fail("DATAVERSE_ERROR");
            account = { id: row.parentcustomerid_account.accountid, name: row.parentcustomerid_account.name };
        }
        return JSON.stringify({ status: "success", data: {
            id: row.contactid, firstName: text(row.firstname), lastName: text(row.lastname),
            email: text(row.emailaddress1), phone: text(row.telephone1), address: text(row.address1_composite), account: account
        } });
    } catch (error) {
        Server.Logger.Error("northwind-profile GET failed");
        var code = error && ["UNAUTHENTICATED", "NOT_FOUND", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." : "Unable to read your profile." });
    }
}

function patch() {
    try {
        Server.Logger.Log("northwind-profile PATCH");
        function fail(code) { throw { code: code }; }
        var guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!Server.User || !guid.test(Server.User.contactid || "")) fail("UNAUTHENTICATED");
        if (Object.keys(Server.Context.QueryParameters || {}).length) fail("VALIDATION");
        var body;
        try { body = JSON.parse(Server.Context.Body); } catch (_) { fail("VALIDATION"); }
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 3 ||
            Object.keys(body).some((key) => !["firstName", "lastName", "phone"].includes(key))) fail("VALIDATION");
        if (typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.phone !== "string" ||
            body.firstName.length > 50 || !body.lastName.trim() || body.lastName.length > 50 || body.phone.length > 50 ||
            /[\u0000-\u001f\u007f]/.test(body.firstName + body.lastName + body.phone)) fail("VALIDATION");
        var result = Server.Connector.Dataverse.UpdateRecord("contacts", Server.User.contactid.toLowerCase(), JSON.stringify({
            firstname: body.firstName.trim(), lastname: body.lastName.trim(), telephone1: body.phone.trim()
        }));
        if (typeof result === "string") result = JSON.parse(result);
        if (!result || !(result.StatusCode >= 200 && result.StatusCode < 300) || result.IsSuccessStatusCode === false) fail("DATAVERSE_ERROR");
        var confirmed = JSON.parse(get());
        if (confirmed.status !== "success") {
            Server.Logger.Error("northwind-profile PATCH confirmation failed");
            return JSON.stringify({ status: "error", code: "DATAVERSE_ERROR", message: "The profile update was accepted, but its refreshed values could not be loaded. Reload before saving again." });
        }
        return JSON.stringify(confirmed);
    } catch (error) {
        Server.Logger.Error("northwind-profile PATCH failed");
        var code = error && ["UNAUTHENTICATED", "VALIDATION"].includes(error.code) ? error.code : "DATAVERSE_ERROR";
        return JSON.stringify({ status: "error", code: code, message: code === "UNAUTHENTICATED" ? "Sign in to continue." : "Unable to update your profile." });
    }
}
