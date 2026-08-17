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

function get() {
    var actionRequest = {
        InputText: "Manual test from Power Pages",
        InputNumber: 35
    };
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
            "new_ServerLogicUnboundFunctionManualTest"
        )
    );
    var actionPassed = actionResponse.isSuccess
        && actionResponse.body
        && actionResponse.body.ResponseNumber === 42
        && actionResponse.body.ResponseText.indexOf(actionRequest.InputText) >= 0;
    var functionPassed = functionResponse.isSuccess
        && functionResponse.body
        && functionResponse.body.ResponseNumber === 7;

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
            request: null,
            response: functionResponse,
            passed: functionPassed
        }
    });
}
