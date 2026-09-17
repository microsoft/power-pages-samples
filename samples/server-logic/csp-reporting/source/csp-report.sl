var MAX_BODY_SIZE_BYTES = 32768;
var MAX_REPORTS_PER_BATCH = 10;

function rejectReport() {
    throw new Error("CSP report rejected");
}

function getHeader(name) {
    var headers = Server.Context.Headers;
    var value = headers[name];

    return value === null || typeof value === "undefined" ? "" : String(value);
}

function getUtf8Length(value) {
    var length = 0;

    for (var index = 0; index < value.length; index++) {
        var codePoint = value.charCodeAt(index);

        if (codePoint < 0x80) {
            length++;
        } else if (codePoint < 0x800) {
            length += 2;
        } else if (codePoint >= 0xd800 && codePoint <= 0xdbff
            && index + 1 < value.length) {
            var nextCodePoint = value.charCodeAt(index + 1);

            if (nextCodePoint >= 0xdc00 && nextCodePoint <= 0xdfff) {
                length += 4;
                index++;
            } else {
                length += 3;
            }
        } else {
            length += 3;
        }
    }

    return length;
}

function isBoundedString(value, maximumLength, allowEmpty) {
    return typeof value === "string"
        && value.length <= maximumLength
        && (allowEmpty || value.length > 0);
}

function isHttpUrl(value) {
    return isBoundedString(value, 2048, false)
        && (value.indexOf("https://") === 0 || value.indexOf("http://") === 0);
}

function isFiniteIntegerInRange(value, minimum, maximum) {
    return typeof value === "number"
        && isFinite(value)
        && Math.floor(value) === value
        && value >= minimum
        && value <= maximum;
}

function validateReport(report) {
    if (!report || typeof report !== "object" || Array.isArray(report)) {
        rejectReport();
    }

    if (report.type !== "csp-violation"
        || !isFiniteIntegerInRange(report.age, 0, 86400000)
        || !isHttpUrl(report.url)
        || !isBoundedString(report.user_agent, 512, true)) {
        rejectReport();
    }

    var body = report.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        rejectReport();
    }

    if (body.disposition !== "report"
        || !isHttpUrl(body.documentURL)
        || !isBoundedString(body.blockedURL, 2048, true)
        || !isBoundedString(body.effectiveDirective, 128, false)
        || !/^[a-z0-9-]+$/.test(body.effectiveDirective)
        || !isBoundedString(body.originalPolicy, 4096, false)
        || !isBoundedString(body.referrer, 2048, true)
        || !isBoundedString(body.sample, 1024, true)
        || !isBoundedString(body.sourceFile, 2048, true)
        || !isFiniteIntegerInRange(body.statusCode, 0, 599)) {
        rejectReport();
    }

    if (typeof body.lineNumber !== "undefined"
        && !isFiniteIntegerInRange(body.lineNumber, 0, 10000000)) {
        rejectReport();
    }

    if (typeof body.columnNumber !== "undefined"
        && !isFiniteIntegerInRange(body.columnNumber, 0, 10000000)) {
        rejectReport();
    }
}

function post() {
    var contentType = getHeader("Content-Type").split(";")[0].trim().toLowerCase();
    var requestBody = Server.Context.Body;

    if (contentType !== "application/reports+json"
        || typeof requestBody !== "string"
        || requestBody.length === 0
        || getUtf8Length(requestBody) > MAX_BODY_SIZE_BYTES) {
        rejectReport();
    }

    var reports;
    try {
        reports = JSON.parse(requestBody);
    } catch (error) {
        rejectReport();
    }

    if (!Array.isArray(reports)
        || reports.length === 0
        || reports.length > MAX_REPORTS_PER_BATCH) {
        rejectReport();
    }

    for (var index = 0; index < reports.length; index++) {
        validateReport(reports[index]);
    }

    Server.Logger.Log("Accepted CSP violation report batch. Count: " + reports.length);

    return JSON.stringify({
        accepted: true,
        reportCount: reports.length
    });
}
