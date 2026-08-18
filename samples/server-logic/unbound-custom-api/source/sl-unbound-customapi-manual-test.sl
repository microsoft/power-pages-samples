function parseConnectorResponse(raw) {
    var response = JSON.parse(raw);
    var body = response.Body ? JSON.parse(response.Body) : null;

    return {
        statusCode: response.StatusCode,
        isSuccess: response.IsSuccessStatusCode,
        reasonPhrase: response.ReasonPhrase,
        body: body
    };
}

function encodeODataStringAlias(value) {
    return encodeURIComponent("'" + value.replace(/'/g, "''") + "'");
}

function get() {
    var actionRequest = {
        InputText: "Manual test from Power Pages",
        InputNumber: 35
    };
    var functionRequest = {
        InputText: "Manual GET parameter test / aliases",
        InputNumber: 61
    };
    var functionUrl = "new_ServerLogicUnboundFunctionManualTest(InputText=@text,InputNumber=@number)"
        + "?@text=" + encodeODataStringAlias(functionRequest.InputText)
        + "&@number=" + functionRequest.InputNumber;
    var actionResponse = parseConnectorResponse(
        Server.Connector.Dataverse.InvokeCustomApi(
            "POST",
            "new_ServerLogicUnboundActionManualTest",
            JSON.stringify(actionRequest)
        )
    );
    var functionResponse = parseConnectorResponse(
        Server.Connector.Dataverse.InvokeCustomApi(
            "GET",
            functionUrl
        )
    );
    var actionPassed = actionResponse.isSuccess
        && actionResponse.body
        && actionResponse.body.ResponseNumber === 42
        && actionResponse.body.ResponseText.indexOf(actionRequest.InputText) >= 0;
    var functionPassed = functionResponse.isSuccess
        && functionResponse.body
        && functionResponse.body.ResponseNumber === 68
        && functionResponse.body.ResponseText.indexOf(functionRequest.InputText) >= 0;

    return JSON.stringify({
        overallPass: actionPassed && functionPassed,
        action: {
            method: "POST",
            name: "new_ServerLogicUnboundActionManualTest",
            request: actionRequest,
            response: actionResponse,
            passed: actionPassed
        },
        function: {
            method: "GET",
            name: "new_ServerLogicUnboundFunctionManualTest",
            url: functionUrl,
            request: functionRequest,
            response: functionResponse,
            passed: functionPassed
        }
    });
}
