# Invoke unbound Dataverse Custom APIs from server logic

This sample shows how Power Pages server logic can invoke both forms of an
unbound Dataverse Custom API:

- A **Custom Action** by using `POST` with request parameters.
- A **Custom Function** by using `GET` with OData parameter aliases and no
  request body.

The importable unmanaged solution includes the Power Pages site, server logic,
two Custom APIs, their parameters and response properties, and a compiled,
signed Dataverse plug-in. No code compilation or plug-in registration is
required after import.

![Successful action and function responses from the server logic endpoint](./screenshot.png)

## Solution contents

| Component | Value |
| --- | --- |
| Solution | `ServerLogicUnboundCustomApiSample_1_0_0_0.zip` |
| Server logic endpoint | `sl-unbound-customapi-manual-test` |
| Custom Action | `new_ServerLogicUnboundActionManualTest` |
| Custom Function | `new_ServerLogicUnboundFunctionManualTest` |
| Action inputs | `InputText` (String), `InputNumber` (Integer) |
| Function inputs | `InputText` (String), `InputNumber` (Integer) |
| Action and function outputs | `ResponseText` (String), `ResponseNumber` (Integer) |
| Access | Anonymous Users and Authenticated Users web roles |

## Prerequisites

- A Power Platform environment with Power Pages provisioned.
- A Power Pages site that uses the enhanced data model.
- Permission to import solutions and reactivate a Power Pages site.
- The standard Power Pages managed solutions. The package declares these
  dependencies:
  - `PowerPages_CoreBase` version `1.1.2605.1` or later.
  - `Basic` version `1.0`.

## Import and activate the sample

1. Download
   [`ServerLogicUnboundCustomApiSample_1_0_0_0.zip`](./ServerLogicUnboundCustomApiSample_1_0_0_0.zip).
2. In [Power Apps](https://make.powerapps.com), open the target environment,
   select **Solutions**, and import the ZIP file.
3. Open [Power Pages](https://make.powerpages.microsoft.com) in the same
   environment. Locate the imported **Power Pages Server Logic Unbound Custom
   API Sample** site and reactivate it.
4. Choose an available site address when prompted.
5. Publish all customizations and wait for the site to finish provisioning.

Site reactivation is required after the first import because a Power Pages site
address cannot be provisioned by a portable solution package.

## Run the sample

Browse to:

```text
https://<your-site-domain>/_api/serverlogics/sl-unbound-customapi-manual-test
```

The endpoint returns a wrapper whose `data` property is a JSON string. Parse
`data` to inspect the action and function results. A successful response has
this shape:

```json
{
  "success": true,
  "serverLogicName": "sl-unbound-customapi-manual-test",
  "data": "{\"overallPass\":true,...}"
}
```

After parsing `data`, both calls report the expected values:

```json
{
  "overallPass": true,
  "action": {
    "method": "POST",
    "response": {
      "statusCode": 200,
      "body": {
        "ResponseNumber": 42
      }
    },
    "passed": true
  },
  "function": {
    "method": "GET",
    "request": {
      "InputText": "Manual GET parameter test / aliases",
      "InputNumber": 61
    },
    "response": {
      "statusCode": 200,
      "body": {
        "ResponseNumber": 68
      }
    },
    "passed": true
  }
}
```

## How it works

The server logic sends a body with the unbound action:

```javascript
var actionRequest = {
    InputText: "Manual test from Power Pages",
    InputNumber: 35
};

var actionResponse = Server.Connector.Dataverse.InvokeCustomApi(
    "POST",
    "new_ServerLogicUnboundActionManualTest",
    JSON.stringify(actionRequest)
);
```

The unbound function uses `GET` and puts its input values in OData parameter
aliases. The binding list stays in the operation path, while the encoded values
stay in the query string:

```javascript
function encodeODataStringAlias(value) {
    return encodeURIComponent("'" + value.replace(/'/g, "''") + "'");
}

var functionRequest = {
    InputText: "Manual GET parameter test / aliases",
    InputNumber: 61
};
var functionUrl =
    "new_ServerLogicUnboundFunctionManualTest(InputText=@text,InputNumber=@number)"
    + "?@text=" + encodeODataStringAlias(functionRequest.InputText)
    + "&@number=" + functionRequest.InputNumber;

var functionResponse = Server.Connector.Dataverse.InvokeCustomApi(
    "GET",
    functionUrl
);
```

The plug-in echoes each input text and adds `7` to `InputNumber`. The action
therefore returns `42`, while the function returns `68`. The server logic parses
the connector response and sets `overallPass` only when both calls return the
expected values.

## Imported Custom API configuration

The action is global (`Binding Type = Global`) and is not a function:

![Unbound Custom Action configuration](./media/unbound-custom-action-configuration.png)

The function is also global and has `Is Function = Yes`:

![Unbound Custom Function configuration](./media/unbound-custom-function-configuration.png)

Its two inputs are configured as Custom API request parameters:

![Unbound Custom Function request parameters](./media/unbound-custom-function-request-parameters.png)

## Source files

- [`source/sl-unbound-customapi-manual-test.sl`](./source/sl-unbound-customapi-manual-test.sl)
  contains the server logic included in the solution.
- [`source/EchoPlugin.cs`](./source/EchoPlugin.cs) contains the equivalent
  Dataverse plug-in source. The solution already contains the compiled, signed
  assembly; the source is included for learning and review.

## Security note

This demonstration endpoint is assigned to both anonymous and authenticated
web roles because it returns only deterministic sample values. For production
code, grant only the minimum required web roles, validate every input, avoid
returning sensitive Dataverse data, and review the privileges of the plug-in
execution user.

## Troubleshooting

- **404 from the server logic URL:** confirm that the imported site is active,
  the endpoint name is unchanged, and customizations are published.
- **Custom API not found:** confirm the two Custom APIs and the plug-in assembly
  were imported successfully, then publish all customizations.
- **Managed dependency error during import:** provision Power Pages in the
  target environment so the required Power Pages core solutions are installed.
