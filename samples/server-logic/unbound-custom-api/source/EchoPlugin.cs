using System;
using System.Reflection;
using Microsoft.Xrm.Sdk;

[assembly: AssemblyTitle("PowerPages.ServerLogic.UnboundCustomApiManualTest")]
[assembly: AssemblyDescription("Dataverse plug-in for the Power Pages Server Logic Custom API sample.")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace PowerPages.ServerLogic.UnboundCustomApiManualTest
{
    /// <summary>
    /// Returns values that show whether the Custom API received the request.
    /// </summary>
    public sealed class EchoPlugin : IPlugin
    {
        /// <summary>
        /// Executes the sample Custom API.
        /// </summary>
        /// <param name="serviceProvider">Provides Dataverse execution services.</param>
        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var tracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var inputText = context.InputParameters.Contains("InputText")
                ? context.InputParameters["InputText"] as string
                : string.Empty;
            var inputNumber = context.InputParameters.Contains("InputNumber")
                && context.InputParameters["InputNumber"] is int
                    ? (int)context.InputParameters["InputNumber"]
                    : 0;

            context.OutputParameters["ResponseText"] = string.IsNullOrEmpty(inputText)
                ? string.Format("{0} completed successfully.", context.MessageName)
                : string.Format("{0} received: {1}", context.MessageName, inputText);
            context.OutputParameters["ResponseNumber"] = inputNumber + 7;

            tracingService.Trace(
                "Sample Custom API completed. Message={0}, InputNumber={1}, ResponseNumber={2}.",
                context.MessageName,
                inputNumber,
                inputNumber + 7);
        }
    }
}
