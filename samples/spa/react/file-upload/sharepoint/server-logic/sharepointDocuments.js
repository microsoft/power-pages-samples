// ===========================================================================
// sharepointDocuments — Power Pages SERVER LOGIC
//
// This is the server-side half of the SharePoint sample. It is NOT bundled with
// the SPA — create it in the design studio (Set up -> Server logic -> + New
// server logic, named "sharepointDocuments"), assign the Authenticated Users web
// role, and paste this code (Edit code -> Open Visual Studio Code). See README.
//
// The SPA calls it at /_api/serverlogics/sharepointdocuments (with the CSRF
// token). Each HTTP verb maps to a function below:
//   GET    (no id)      -> list the signed-in user's files
//   GET    (?id=...)    -> download one file's content
//   POST   {fileName,fileContent} -> upload a file
//   DELETE (?id=...)    -> delete a file
//
// The logic holds an Entra app (client-credentials) and calls Microsoft Graph to
// reach a SharePoint document library, so the SPA never sees the secret and the
// browser never talks to Graph directly.
//
// ⚠️ IMPORTANT LIMITATION: server logic's HttpClient only accepts
// application/json, text/html and application/x-www-form-urlencoded request
// bodies — there is NO application/octet-stream. So this sample handles
// **text-based documents** (.txt, .csv, .json, .md, .html, .xml): they upload as
// real, natively-usable SharePoint files. Binary files (PDF, PNG, …) can't be
// streamed as raw bytes through this path today — see the README for the caveat.
//
// Docs: https://learn.microsoft.com/power-pages/configure/server-logic-graph-sharepoint
// ===========================================================================

const CLIENT_ID = Server.SiteSetting.Get("SharePoint/ClientId");
const CLIENT_SECRET = Server.SiteSetting.Get("SharePoint/ClientSecret");
const TENANT_ID = Server.SiteSetting.Get("SharePoint/TenantId");
const HOSTNAME = Server.SiteSetting.Get("SharePoint/Hostname");
const SITE_PATH = Server.SiteSetting.Get("SharePoint/SitePath");

const GRAPH = "https://graph.microsoft.com/v1.0";

// --- Helpers --------------------------------------------------------------

// HttpClient returns a JSON string describing the response; its `Body` is itself
// a JSON (or text) string. Parse the envelope, then the body when it's JSON.
function envelope(resp) {
  return JSON.parse(resp);
}
function jsonBody(resp) {
  return JSON.parse(envelope(resp).Body);
}

async function getAccessToken() {
  const form =
    "client_id=" + encodeURIComponent(CLIENT_ID) +
    "&client_secret=" + encodeURIComponent(CLIENT_SECRET) +
    "&scope=" + encodeURIComponent("https://graph.microsoft.com/.default") +
    "&grant_type=client_credentials";
  const resp = await Server.Connector.HttpClient.PostAsync(
    "https://login.microsoftonline.com/" + TENANT_ID + "/oauth2/v2.0/token",
    form,
    {},
    "application/x-www-form-urlencoded"
  );
  return jsonBody(resp).access_token;
}

// Resolve the document library's drive id from the host + site path.
async function getDriveId(token) {
  const auth = { Authorization: "Bearer " + token };
  const siteResp = await Server.Connector.HttpClient.GetAsync(
    GRAPH + "/sites/" + HOSTNAME + ":" + SITE_PATH, auth);
  const siteId = jsonBody(siteResp).id;
  const driveResp = await Server.Connector.HttpClient.GetAsync(
    GRAPH + "/sites/" + siteId + "/drive", auth);
  return jsonBody(driveResp).id;
}

// Each user is fenced to their own folder, derived SERVER-SIDE from the
// authenticated user (never a client-supplied id). Adjust the id property to
// your runtime if needed (Server.User exposes the signed-in user).
function userFolder() {
  const user = Server.User;
  if (!user) {
    throw new Error("You must be signed in.");
  }
  return "user-" + (user.Id || user.contactid || user.fullname);
}

// --- HTTP verb handlers ---------------------------------------------------

// GET: list (no id) or download one file (?id=...)
async function get() {
  const token = await getAccessToken();
  const driveId = await getDriveId(token);
  const auth = { Authorization: "Bearer " + token };
  const folder = userFolder();
  const id = Server.Context.QueryParameters["id"];

  if (id) {
    // Download: fetch the file's content (text) and its metadata.
    const metaResp = await Server.Connector.HttpClient.GetAsync(
      GRAPH + "/drives/" + driveId + "/items/" + id + "?$select=name,file", auth);
    const meta = jsonBody(metaResp);
    const contentResp = await Server.Connector.HttpClient.GetAsync(
      GRAPH + "/drives/" + driveId + "/items/" + id + "/content", auth);
    return {
      fileName: meta.name,
      mimeType: (meta.file && meta.file.mimeType) || "text/plain",
      // Content is returned as text (see the binary limitation in the header).
      fileContent: envelope(contentResp).Body
    };
  }

  // List: the user's folder children (empty if the folder doesn't exist yet).
  const listResp = await Server.Connector.HttpClient.GetAsync(
    GRAPH + "/drives/" + driveId + "/root:/" + folder +
      ":/children?$select=id,name,size,lastModifiedDateTime", auth);
  const env = envelope(listResp);
  if (env.StatusCode === 404) return [];
  const items = JSON.parse(env.Body).value || [];
  return items.map(function (i) {
    return { id: i.id, name: i.name, size: i.size, modified: i.lastModifiedDateTime };
  });
}

// POST: upload a text document. Body: { fileName, fileContent }.
async function post() {
  const input = JSON.parse(Server.Context.Body);
  if (!input || !input.fileName) {
    throw new Error("fileName and fileContent are required.");
  }
  const token = await getAccessToken();
  const driveId = await getDriveId(token);
  const auth = { Authorization: "Bearer " + token };
  const folder = userFolder();

  // PUT the content to <folder>/<fileName>. Graph creates the folder path as
  // needed. Content type must be text/html (octet-stream isn't allowed here).
  const uploadUrl = GRAPH + "/drives/" + driveId + "/root:/" +
    folder + "/" + encodeURIComponent(input.fileName) + ":/content";
  const resp = await Server.Connector.HttpClient.PutAsync(
    uploadUrl, input.fileContent || "", auth, "text/html");
  const env = envelope(resp);
  if (!env.IsSuccessStatusCode) {
    throw new Error("Upload failed (Graph status " + env.StatusCode + ").");
  }
  return { fileId: JSON.parse(env.Body).id };
}

// DELETE: remove a file by id (?id=...).
async function del() {
  const id = Server.Context.QueryParameters["id"];
  if (!id) throw new Error("id is required.");
  const token = await getAccessToken();
  const driveId = await getDriveId(token);
  const auth = { Authorization: "Bearer " + token };
  const resp = await Server.Connector.HttpClient.DeleteAsync(
    GRAPH + "/drives/" + driveId + "/items/" + id, auth);
  const env = envelope(resp);
  if (!env.IsSuccessStatusCode) {
    throw new Error("Delete failed (Graph status " + env.StatusCode + ").");
  }
  return { status: "deleted" };
}
