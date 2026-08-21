(() => {
    "use strict";

    const sampleRoot = document.querySelector(".custom-api-sample");
    if (!sampleRoot || sampleRoot.dataset.serverLogicSampleInitialized === "true") {
        return;
    }

    sampleRoot.dataset.serverLogicSampleInitialized = "true";

    const endpoint = "/_api/serverlogics/sl-unbound-customapi-manual-test";

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value === null || value === undefined ? "-" : String(value);
        }
    };

    const setBadge = (id, passed) => {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        element.textContent = passed ? "PASS" : "FAIL";
        element.classList.remove("sample-pass", "sample-fail");
        element.classList.add(passed ? "sample-pass" : "sample-fail");
    };

    const renderOperation = (prefix, operation) => {
        const response = operation.response || {};
        const body = response.body || {};
        const request = operation.request || {};

        setBadge(`${prefix}-badge`, Boolean(operation.passed));
        setText(`${prefix}-method`, operation.method);
        setText(`${prefix}-name`, operation.name);
        setText(`${prefix}-request-text`, request.InputText);
        setText(`${prefix}-request-number`, request.InputNumber);
        setText(`${prefix}-status`, `${response.statusCode} ${response.reasonPhrase || ""}`.trim());
        setText(`${prefix}-response-text`, body.ResponseText);
        setText(`${prefix}-response-number`, body.ResponseNumber);
        setText(
            `${prefix}-json`,
            JSON.stringify({ request, response }, null, 2)
        );
    };

    const renderSuccess = (outer, result) => {
        const overall = document.getElementById("sample-overall");
        const passed = Boolean(outer.success && result.overallPass);

        setText(
            "sample-overall-text",
            passed
                ? `PASS - Action and parameterized Function succeeded (request ${outer.requestId}).`
                : "FAIL - One or more Custom API checks did not return the expected values."
        );

        if (overall) {
            overall.classList.add(passed ? "sample-pass" : "sample-fail");
        }

        renderOperation("sample-action", result.action || {});
        renderOperation("sample-function", result.function || {});
        setText("sample-function-url", result.function && result.function.url);
    };

    const renderFailure = (error) => {
        const overall = document.getElementById("sample-overall");

        setText("sample-overall-text", `FAIL - ${error.message}`);
        if (overall) {
            overall.classList.add("sample-fail");
        }

        setBadge("sample-action-badge", false);
        setBadge("sample-function-badge", false);
    };

    const runSample = async () => {
        try {
            const response = await fetch(endpoint, {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });
            const text = await response.text();

            if (!response.ok) {
                throw new Error(`Server Logic returned HTTP ${response.status}: ${text}`);
            }

            const outer = JSON.parse(text);
            if (!outer.success) {
                throw new Error(outer.error || "The Server Logic response reported failure.");
            }

            const result = typeof outer.data === "string" ? JSON.parse(outer.data) : outer.data;
            renderSuccess(outer, result);
        } catch (error) {
            renderFailure(error instanceof Error ? error : new Error(String(error)));
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runSample, { once: true });
    } else {
        runSample();
    }
})();
