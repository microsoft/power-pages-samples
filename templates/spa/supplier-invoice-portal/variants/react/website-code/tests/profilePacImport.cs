using System.Collections;
using System.Reflection;
using System.Runtime.Loader;

var (assemblyDirectory, frameworkDirectory, siteDirectory) = (args[0], args[1], args[2]);
AssemblyLoadContext.Default.Resolving += (context, name) =>
{
    var path = Path.Combine(assemblyDirectory, name.Name + ".dll");
    if (!File.Exists(path)) path = Path.Combine(frameworkDirectory, name.Name + ".dll");
    return File.Exists(path) ? context.LoadFromAssemblyPath(path) : null;
};
var assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(assemblyDirectory, "bolt.module.paportal.dll"));
var parserType = assembly.GetType("bolt.module.paportal.core.PortalDirectoryParser", true)!;
var constructor = parserType.GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).Single();
var parameters = constructor.GetParameters();
var locale = DispatchProxy.Create(parameters[5].ParameterType, typeof(OfflineServices));
var progress = DispatchProxy.Create(parameters[3].ParameterType, typeof(OfflineServices));
var output = DispatchProxy.Create(parameters[7].ParameterType, typeof(OfflineServices));
var loggerAssembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(frameworkDirectory, "Microsoft.Extensions.Logging.Abstractions.dll"));
var logger = loggerAssembly.GetType("Microsoft.Extensions.Logging.Abstractions.NullLogger", true)!
    .GetProperty("Instance")!.GetValue(null);
var config = parameters[2].ParameterType.GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).Single()
    .Invoke(new object[] { siteDirectory, locale });
var provider = assembly.GetType("bolt.module.paportal.PortalMetaDataProvider", true)!
    .GetMethod("GetExportImportMetaData", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)!;

IList Parse(string entityName)
{
    var metadata = provider.Invoke(null, new object[] { entityName, locale, 2 })!;
    var type = metadata.GetType();
    // Parse the same Git-format records as code-site upload without invoking
    // an uploader, authenticating, or generating local deployment metadata.
    type.GetMethod("SetForGitFormat", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(metadata, null);
    var folder = type.GetProperty("FolderName")!.GetValue(metadata)!.ToString()!;
    var parser = constructor.Invoke(new object?[] { Path.Combine(siteDirectory, folder),
        Guid.Parse("11111111-1111-4111-8111-111111111111"), config, progress, logger, locale, true, output });
    var schema = type.GetProperty("XmlNodeRef")!.GetValue(metadata)!;
    return (IList)parserType.GetMethod("ParseEntityFolder")!.Invoke(parser, new[] { metadata, schema })!;
}

Guid Id(object value)
{
    if (value is Guid id) return id;
    var referenced = value.GetType().GetProperty("Id")?.GetValue(value);
    return referenced is Guid reference ? reference : Guid.Parse(value.ToString()!);
}

int Choice(object value)
{
    return value is int number ? number :
        Convert.ToInt32(value.GetType().GetProperty("Value")?.GetValue(value) ?? value);
}

var fields = Parse("adx_sitesetting").Cast<IDictionary<string, object>>()
    .Single(setting => setting["name"].ToString() == "Webapi/contact/fields");
var expected = new[] { "contactid", "fullname", "_parentcustomerid_value",
    "firstname", "lastname", "emailaddress1", "telephone1", "jobtitle" }.Order();
if (!fields["value"].ToString()!.Split(',').Order().SequenceEqual(expected))
    throw new Exception("Actual PAC importer Contact field list differs from the eight intended properties.");
var permissions = Parse("adx_entitypermission").Cast<IDictionary<string, object>>();
var authenticated = permissions.Single(permission => Id(permission["id"]) ==
    Guid.Parse("c5e8551a-659b-45fb-baf4-1968b39c4410"));
if (authenticated["entitylogicalname"].ToString() != "contact" || Choice(authenticated["scope"]) != 756150004 ||
    authenticated["read"] is not true || authenticated["write"] is not true ||
    new[] { "append", "appendto", "create", "delete" }.Any(privilege => authenticated[privilege] is not false))
    throw new Exception("Actual PAC importer changed the narrow Authenticated Contact Self grant.");
var relations = (IDictionary)authenticated["relatedEntities"];
var roles = ((IEnumerable)relations["adx_entitypermission_webrole"]!).Cast<object>().Select(Id).ToArray();
if (!roles.SequenceEqual(new[] { Guid.Parse("2ab5e3ba-0309-f111-8406-6045bd04a357") }))
    throw new Exception("Actual PAC importer lost the default Authenticated Users role association.");
Console.WriteLine("Actual PAC Git-format importer parsed eight Contact properties and the narrow Authenticated Self role grant.");

public class OfflineServices : DispatchProxy
{
    protected override object? Invoke(MethodInfo? method, object?[]? arguments)
    {
        if (method?.ReturnType == typeof(void)) return null;
        if (method?.ReturnType == typeof(string)) return string.Join(" ", arguments ?? Array.Empty<object>());
        if (method?.ReturnType == typeof(bool)) return false;
        if (method?.ReturnType == typeof(int)) return 0;
        throw new NotSupportedException("Unexpected offline-only PAC service call: " + method);
    }
}
