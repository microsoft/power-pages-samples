using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Remoting.Messaging;
using System.Runtime.Remoting.Proxies;
using System.Runtime.Serialization.Json;
using System.Text;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Northwind.SendApproval;

internal static class Program
{
    private static int passed;
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Test(string name, Action<Fixture> change, bool publishes, bool rejects = false)
    {
        var fixture = new Fixture();
        change(fixture);
        var plugin = new SendApprovalPlugin(fixture.Config, null);
        var rejected = false;
        try { plugin.Execute(fixture); }
        catch (InvalidPluginExecutionException) { rejected = true; }
        Check(rejected == rejects, name + ": unexpected rejection state");
        Check((fixture.System.Created.Count == 1) == publishes, name + ": unexpected publication capture");
        Check(fixture.Caller.Created.Count == 0, "Approval must have SYSTEM provenance");
        if (publishes)
        {
            var note = fixture.System.Created[0];
            Check(note.GetAttributeValue<string>("subject") == SendApprovalPlugin.ApprovalSubject, "Wrong request marker");
            Check(!note.GetAttributeValue<bool>("isdocument"), "Approval must not be a portal file");
            using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(note.GetAttributeValue<string>("notetext"))))
            {
                var snapshot = (SendApprovalSnapshot)new DataContractJsonSerializer(typeof(SendApprovalSnapshot)).ReadObject(stream);
                Check(snapshot.ApprovedBy == fixture.StaffId.ToString(), "Wrong reviewer");
                Check(snapshot.CaseId == fixture.CaseId.ToString() && snapshot.ContactId == fixture.ContactId.ToString(), "Wrong audience");
                Check(snapshot.OutsideTransaction && snapshot.ApprovalMethod == "NativeSend", "Wrong authorization signal");
                Check(Encoding.UTF8.GetString(Convert.FromBase64String(snapshot.HtmlBase64)) == fixture.Email.GetAttributeValue<string>("description"), "Snapshot changed");
                Check(snapshot.SourceEmailVersion == "42", "Version not captured");
            }
        }
        Console.WriteLine("PASS " + name);
        passed++;
    }
    private static int Main()
    {
        Test("Native Send captures reviewed HTML before transport", f => { }, true);
        Test("Record-only Send does not approve publication", f => f.Input["IssueSend"] = false, false);
        Test("Ordinary saves do not approve publication", f => f.Context.Values["MessageName"] = "Update", false);
        Test("Unrelated cases remain unaffected", f => f.Case["createdby"] = new EntityReference("systemuser", Guid.NewGuid()), false);
        Test("Non-Web cases remain unaffected", f => f.Case["caseorigincode"] = new OptionSetValue(1), false);
        Test("Incoming email does not approve publication", f => f.Email["directioncode"] = false, false);
        Test("Account customers remain unaffected", f => f.Case["customerid"] = new EntityReference("account", Guid.NewGuid()), false);
        Test("Transactional Send fails before any approval write", f => f.Context.Values["IsInTransaction"] = true, false, true);
        Test("Read-only reviewer cannot approve", f => f.System.Rights = AccessRights.ReadAccess, false, true);
        Test("Other recipients are not portal responses", f => f.Parties.Entities[0]["partyid"] = new EntityReference("contact", Guid.NewGuid()), false);
        Test("Multiple To recipients are not portal responses", f => f.Parties.Entities.Add(new Entity("activityparty") { ["partyid"] = new EntityReference("contact", f.ContactId) }), false);
        Test("Missing Send intent is rejected", f => f.Input.Remove("IssueSend"), false, true);
        Test("Already queued emails do not create a new approval", f => { f.Email["statecode"] = new OptionSetValue(1); f.Email["statuscode"] = new OptionSetValue(6); }, false);
        Test("Explicit retry of failed mail can authorize a snapshot", f => f.Email["statuscode"] = new OptionSetValue(8), true);
        Test("Oversized capture fails without truncation", f => f.Email["description"] = new string('x', 100000), false, true);
        Test("Environment variable identifies the portal user without step configuration", f => { f.Config = null; f.SetVariable(f.PortalId.ToString(), null); }, true);
        Test("Environment variable overrides the legacy step configuration", f => { f.Config = "{\"portalApplicationUserId\":\"" + Guid.NewGuid() + "\"}"; f.SetVariable(f.PortalId.ToString(), null); }, true);
        Test("Environment variable default value applies when no current value exists", f => { f.Config = null; f.SetVariable(null, f.PortalId.ToString()); }, true);
        Test("Other portal users from the environment variable remain unaffected", f => { f.Config = null; f.SetVariable(Guid.NewGuid().ToString(), null); }, false);
        Test("Missing portal user configuration is rejected", f => f.Config = null, false, true);
        Test("Invalid environment variable value is rejected", f => f.SetVariable("not-a-guid", null), false, true);
        Test("Unrelated incoming email does not need the portal user setting", f => { f.Config = null; f.Email["directioncode"] = false; }, false);
        Console.WriteLine(passed + " Send approval checks passed.");
        return 0;
    }

    private sealed class ContextProxy : RealProxy
    {
        public readonly Dictionary<string, object> Values = new Dictionary<string, object>();
        public ContextProxy() : base(typeof(IPluginExecutionContext)) { }
        public override IMessage Invoke(IMessage message)
        {
            var call = (IMethodCallMessage)message;
            object result;
            if (!Values.TryGetValue(call.MethodName.Replace("get_", ""), out result))
                throw new Exception("Unexpected context access: " + call.MethodName);
            return new ReturnMessage(result, null, 0, call.LogicalCallContext, call);
        }
    }
    private sealed class Fixture : IServiceProvider, IOrganizationServiceFactory, ITracingService
    {
        public readonly Guid EmailId = Guid.NewGuid(), CaseId = Guid.NewGuid(), ContactId = Guid.NewGuid(), PortalId = Guid.NewGuid(), StaffId = Guid.NewGuid();
        public readonly ParameterCollection Input = new ParameterCollection();
        public readonly ContextProxy Context = new ContextProxy();
        public readonly FakeService Caller = new FakeService(), System = new FakeService();
        public readonly Entity Email, Case;
        public readonly EntityCollection Parties = new EntityCollection();
        public string Config;
        public void SetVariable(string current, string defaultValue)
        {
            var definition = new Entity("environmentvariabledefinition", Guid.NewGuid()) { ["defaultvalue"] = defaultValue };
            if (current != null) definition["current.value"] = new AliasedValue("environmentvariablevalue", "value", current);
            System.Variables.Entities.Clear();
            System.Variables.Entities.Add(definition);
        }
        public Fixture()
        {
            Config = "{\"portalApplicationUserId\":\"" + PortalId + "\"}";
            Input["EmailId"] = EmailId; Input["IssueSend"] = true;
            Email = new Entity("email", EmailId)
            {
                ["directioncode"] = true, ["statecode"] = new OptionSetValue(0), ["statuscode"] = new OptionSetValue(1),
                ["regardingobjectid"] = new EntityReference("incident", CaseId), ["description"] = "<p>Reviewed caf\u00e9 &amp; customer guidance.</p>", ["versionnumber"] = 42L
            };
            Case = new Entity("incident", CaseId) { ["caseorigincode"] = new OptionSetValue(3), ["createdby"] = new EntityReference("systemuser", PortalId), ["customerid"] = new EntityReference("contact", ContactId) };
            Parties.Entities.Add(new Entity("activityparty") { ["partyid"] = new EntityReference("contact", ContactId) });
            Caller.Records["email"] = Email; Caller.Records["incident"] = Case; Caller.Parties = Parties; System.Records["incident"] = Case;
            Context.Values["Stage"] = 10; Context.Values["Mode"] = 0; Context.Values["MessageName"] = "Send"; Context.Values["InputParameters"] = Input;
            Context.Values["PrimaryEntityName"] = "email"; Context.Values["PrimaryEntityId"] = EmailId;
            Context.Values["InitiatingUserId"] = StaffId; Context.Values["IsInTransaction"] = false; Context.Values["CorrelationId"] = Guid.NewGuid();
        }
        public object GetService(Type type)
        {
            if (type == typeof(IPluginExecutionContext)) return Context.GetTransparentProxy();
            if (type == typeof(IOrganizationServiceFactory) || type == typeof(ITracingService)) return this;
            throw new Exception("Unexpected service");
        }
        public IOrganizationService CreateOrganizationService(Guid? id) { Check(!id.HasValue || id.Value == StaffId, "Unexpected impersonation"); return id.HasValue ? Caller : System; }
        public void Trace(string format, params object[] args) { }
    }
    private sealed class FakeService : IOrganizationService
    {
        public readonly Dictionary<string, Entity> Records = new Dictionary<string, Entity>();
        public readonly List<Entity> Created = new List<Entity>();
        public EntityCollection Parties;
        public readonly EntityCollection Variables = new EntityCollection();
        public AccessRights Rights = AccessRights.ReadAccess | AccessRights.WriteAccess;
        public Guid Create(Entity entity) { Check(entity.LogicalName == "annotation", "Only approval notes may be written"); Created.Add(entity); return Guid.NewGuid(); }
        public Entity Retrieve(string entityName, Guid id, ColumnSet columns) { Check(Records[entityName].Id == id, "Unexpected row read"); return Records[entityName]; }
        public EntityCollection RetrieveMultiple(QueryBase query)
        {
            var expression = (QueryExpression)query;
            if (expression.EntityName == "environmentvariabledefinition")
            {
                Check(Parties == null, "The environment variable must be read with SYSTEM");
                Check((string)expression.Criteria.Conditions[0].Values[0] == SendApprovalPlugin.PortalUserVariable, "Unexpected environment variable");
                return Variables;
            }
            Check(expression.EntityName == "activityparty", "Unexpected query");
            return Parties;
        }
        public OrganizationResponse Execute(OrganizationRequest request)
        {
            Check(request is RetrievePrincipalAccessRequest, "Never send email from this plug-in");
            var response = new RetrievePrincipalAccessResponse(); response.Results["AccessRights"] = Rights; return response;
        }
        public void Update(Entity entity) { throw new Exception("Email and case updates are forbidden"); }
        public void Delete(string entityName, Guid id) { throw new Exception("Deletes are forbidden"); }
        public void Associate(string entityName, Guid id, Relationship relationship, EntityReferenceCollection related) { throw new Exception("Associations are forbidden"); }
        public void Disassociate(string entityName, Guid id, Relationship relationship, EntityReferenceCollection related) { throw new Exception("Disassociations are forbidden"); }
    }
}
