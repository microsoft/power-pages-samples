using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace Northwind.SendApproval
{
    public sealed class SendApprovalPlugin : IPlugin
    {
        public const string ApprovalSubject = "Northwind portal: Reviewed Send approval";
        public const string PortalUserVariable = "ppst_ModernCss_PortalApplicationUserId";
        private readonly Guid? configuredPortalApplicationUserId;
        private readonly Guid? testEmailId;

        public SendApprovalPlugin(string unsecureConfiguration, string secureConfiguration)
        {
            if (string.IsNullOrWhiteSpace(unsecureConfiguration))
                return;
            PluginSettings settings;
            using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(unsecureConfiguration)))
                settings = (PluginSettings)new DataContractJsonSerializer(typeof(PluginSettings)).ReadObject(stream);
            if (!string.IsNullOrEmpty(settings.PortalApplicationUserId))
                configuredPortalApplicationUserId = ParseUserId(settings.PortalApplicationUserId, "step configuration");
            if (!string.IsNullOrEmpty(settings.TestEmailId))
            {
                Guid parsed;
                if (!Guid.TryParse(settings.TestEmailId, out parsed) || parsed == Guid.Empty)
                    throw new InvalidPluginExecutionException("The Send approval test email ID is invalid.");
                testEmailId = parsed;
            }
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var trace = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            if (context.Stage != 10 || context.Mode != 0 || !string.Equals(context.MessageName, "Send", StringComparison.OrdinalIgnoreCase))
                return;

            var emailId = GetEmailId(context);
            if (emailId == Guid.Empty || (testEmailId.HasValue && testEmailId.Value != emailId))
                return;
            if (context.InputParameters.Contains("IssueSend") && context.InputParameters["IssueSend"] is bool && !(bool)context.InputParameters["IssueSend"])
                return;

            var factory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var caller = factory.CreateOrganizationService(context.InitiatingUserId);
            var email = caller.Retrieve("email", emailId, new ColumnSet("directioncode", "statecode", "statuscode", "regardingobjectid", "description", "versionnumber"));
            var regarding = email.GetAttributeValue<EntityReference>("regardingobjectid");
            if (!email.GetAttributeValue<bool>("directioncode") || regarding == null || regarding.LogicalName != "incident")
                return;

            var system = factory.CreateOrganizationService(null);
            var portalApplicationUserId = ResolvePortalApplicationUserId(system);
            var incident = system.Retrieve("incident", regarding.Id, new ColumnSet("caseorigincode", "createdby", "customerid"));
            var customer = incident.GetAttributeValue<EntityReference>("customerid");
            if (incident.GetAttributeValue<OptionSetValue>("caseorigincode")?.Value != 3 ||
                incident.GetAttributeValue<EntityReference>("createdby")?.Id != portalApplicationUserId ||
                customer == null || customer.LogicalName != "contact")
                return;

            caller.Retrieve("incident", regarding.Id, new ColumnSet("incidentid"));
            if (!context.InputParameters.Contains("IssueSend") || !(context.InputParameters["IssueSend"] is bool))
                throw new InvalidPluginExecutionException("Northwind cannot confirm this Send request. Parameters: " + string.Join(", ", context.InputParameters.Keys));
            if (context.IsInTransaction)
                throw new InvalidPluginExecutionException("Northwind portal approval requires a standalone Send action, not a transactional batch. No portal approval was recorded.");

            var status = email.GetAttributeValue<OptionSetValue>("statuscode")?.Value;
            if (email.GetAttributeValue<OptionSetValue>("statecode")?.Value != 0 || (status != 1 && status != 8))
                return;

            var access = (RetrievePrincipalAccessResponse)system.Execute(new RetrievePrincipalAccessRequest
            {
                Principal = new EntityReference("systemuser", context.InitiatingUserId),
                Target = new EntityReference("email", emailId)
            });
            var required = AccessRights.ReadAccess | AccessRights.WriteAccess;
            if ((access.AccessRights & required) != required)
                throw new InvalidPluginExecutionException("You must be authorized to read and edit this email before approving a portal response.");

            var recipients = new QueryExpression("activityparty")
            {
                ColumnSet = new ColumnSet("partyid"),
                TopCount = 2
            };
            recipients.Criteria.AddCondition("activityid", ConditionOperator.Equal, emailId);
            recipients.Criteria.AddCondition("participationtypemask", ConditionOperator.Equal, 2);
            var parties = caller.RetrieveMultiple(recipients).Entities;
            var recipient = parties.Count == 1 ? parties[0].GetAttributeValue<EntityReference>("partyid") : null;
            if (recipient == null || recipient.LogicalName != "contact" || recipient.Id != customer.Id)
            {
                trace.Trace("Northwind portal approval skipped for email {0}: not a sole case-customer To recipient.", emailId);
                return;
            }

            var version = email.RowVersion;
            if (string.IsNullOrEmpty(version) && email.Contains("versionnumber"))
                version = email.GetAttributeValue<long>("versionnumber").ToString(CultureInfo.InvariantCulture);
            if (string.IsNullOrEmpty(version))
                throw new InvalidPluginExecutionException("The reviewed email version could not be read. No portal approval was recorded.");

            var snapshot = new SendApprovalSnapshot
            {
                SchemaVersion = 1,
                ApprovalMethod = "NativeSend",
                EmailId = emailId.ToString(),
                CaseId = regarding.Id.ToString(),
                ContactId = customer.Id.ToString(),
                SourceEmailVersion = version,
                ApprovedBy = context.InitiatingUserId.ToString(),
                ApprovedAt = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture),
                CorrelationId = context.CorrelationId.ToString(),
                HtmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(email.GetAttributeValue<string>("description") ?? string.Empty)),
                OutsideTransaction = !context.IsInTransaction
            };
            string json;
            using (var stream = new MemoryStream())
            {
                new DataContractJsonSerializer(typeof(SendApprovalSnapshot)).WriteObject(stream, snapshot);
                json = Encoding.UTF8.GetString(stream.ToArray());
            }
            if (json.Length > 100000)
                throw new InvalidPluginExecutionException("The reviewed email exceeds the portal approval storage limit. Shorten its body before Send; no portal approval was recorded.");

            // SYSTEM authors the request; portal users and ordinary note writers cannot forge this provenance.
            // PreValidation must be outside a parent transaction so a later Send rejection cannot roll this back.
            var note = new Entity("annotation");
            note["subject"] = ApprovalSubject;
            note["notetext"] = json;
            note["isdocument"] = false;
            note["objectid"] = regarding;
            var requestId = system.Create(note);
            trace.Trace("Northwind Send approval recorded: request {0}, email {1}, case {2}, outside transaction {3}.",
                requestId, emailId, regarding.Id, snapshot.OutsideTransaction);
        }

        // The environment variable's current value wins, then its default value, then the legacy step configuration.
        private Guid ResolvePortalApplicationUserId(IOrganizationService system)
        {
            var query = new QueryExpression("environmentvariabledefinition")
            {
                ColumnSet = new ColumnSet("defaultvalue"),
                TopCount = 1
            };
            query.Criteria.AddCondition("schemaname", ConditionOperator.Equal, PortalUserVariable);
            var current = query.AddLink("environmentvariablevalue", "environmentvariabledefinitionid", "environmentvariabledefinitionid", JoinOperator.LeftOuter);
            current.EntityAlias = "current";
            current.Columns = new ColumnSet("value");
            var definition = system.RetrieveMultiple(query).Entities.FirstOrDefault();
            var value = definition?.GetAttributeValue<AliasedValue>("current.value")?.Value as string;
            if (string.IsNullOrWhiteSpace(value))
                value = definition?.GetAttributeValue<string>("defaultvalue");
            if (!string.IsNullOrWhiteSpace(value))
                return ParseUserId(value, "environment variable " + PortalUserVariable);
            if (configuredPortalApplicationUserId.HasValue)
                return configuredPortalApplicationUserId.Value;
            throw new InvalidPluginExecutionException("The portal application-user ID is not configured. Set the " + PortalUserVariable + " environment variable.");
        }

        private static Guid ParseUserId(string value, string source)
        {
            Guid parsed;
            if (!Guid.TryParse(value.Trim(), out parsed) || parsed == Guid.Empty)
                throw new InvalidPluginExecutionException("The portal application-user ID in the " + source + " is invalid.");
            return parsed;
        }

        private static Guid GetEmailId(IPluginExecutionContext context)
        {
            if (context.InputParameters.Contains("EmailId") && context.InputParameters["EmailId"] is Guid)
                return (Guid)context.InputParameters["EmailId"];
            if (context.InputParameters.Contains("Target"))
            {
                var reference = context.InputParameters["Target"] as EntityReference;
                if (reference != null && reference.LogicalName == "email") return reference.Id;
                var entity = context.InputParameters["Target"] as Entity;
                if (entity != null && entity.LogicalName == "email") return entity.Id;
            }
            return context.PrimaryEntityName == "email" ? context.PrimaryEntityId : Guid.Empty;
        }
    }

    [DataContract]
    public sealed class PluginSettings
    {
        [DataMember(Name = "portalApplicationUserId", EmitDefaultValue = false)]
        public string PortalApplicationUserId { get; set; }
        [DataMember(Name = "testEmailId", EmitDefaultValue = false)]
        public string TestEmailId { get; set; }
    }

    [DataContract]
    public sealed class SendApprovalSnapshot
    {
        [DataMember(Name = "schemaVersion")] public int SchemaVersion { get; set; }
        [DataMember(Name = "approvalMethod")] public string ApprovalMethod { get; set; }
        [DataMember(Name = "emailId")] public string EmailId { get; set; }
        [DataMember(Name = "caseId")] public string CaseId { get; set; }
        [DataMember(Name = "contactId")] public string ContactId { get; set; }
        [DataMember(Name = "sourceEmailVersion")] public string SourceEmailVersion { get; set; }
        [DataMember(Name = "approvedBy")] public string ApprovedBy { get; set; }
        [DataMember(Name = "approvedAt")] public string ApprovedAt { get; set; }
        [DataMember(Name = "correlationId")] public string CorrelationId { get; set; }
        [DataMember(Name = "htmlBase64")] public string HtmlBase64 { get; set; }
        [DataMember(Name = "outsideTransaction")] public bool OutsideTransaction { get; set; }
    }
}
