# How to: interact with Microsoft Graph and SharePoint using server logic 

This guide walks you through setting up and testing the **Server Logic** sample that integrates Power Pages with **Microsoft Graph** and **SharePoint Online**. 

## Step 1: Download the sample package 

1. Go to the GitHub repository [https://github.com/microsoft/power-pages-samples/server-logic/sharepoint-integration](https://github.com/microsoft/power-pages-samples/server-logic/sharepoint-integration). 
1. Select **Code \> Download ZIP** (or use git clone if you prefer). 

```bash
git clone https://github.com/microsoft/power-pages-samples
cd samples/server-logic/sharepoint-integration/
```
Extract event-registration.zip. 

## Step 2: Prerequisites 

Before you start, make sure you have: 

- Access to **Microsoft Entra ID (Azure AD)** with permission to register apps. 
- Access to a **SharePoint Online site** (for example, [https://contoso.sharepoint.com/sites/EventSite](https://contoso.sharepoint.com/sites/EventSite)). 

## Step 3: Create and configure the Azure AD application 

You need an **App Registration** to allow your Server Logic code to authenticate against Microsoft Graph. 

### Create the app registration 

1. Go to the [**Azure Portal**](https://portal.azure.com/) → **App registrations**. 
1. Select **+ New registration**. 
1. Provide a name (for example, PowerPages-Graph-Integration). 
1. Choose **Accounts in this organizational directory only**. 
1. Redirect URI is **not required** for this sample. 
1. Select **Register**. 

### Configure API permissions 

1. In the newly created app, go to **API Permissions** → **Add a permission**. 
1. Select **Microsoft Graph** → **Application permissions**. 
1. Add the following permissions: 

- Sites.ReadWrite.All (for SharePoint file operations) 
- Mail.Send *(optional – only needed if you plan to enable the email section)* 

1. Select **Grant admin consent** for your tenant. 

### Create a client secret 

1. Go to **Certificates & secrets** → **Client secrets**. 
1. Select **+ New client secret**. 
1. Add a description and choose an expiry period (for example, six months). 
1. Select **Add**, and **copy the generated value** immediately—this is your **CLIENT_SECRET**. 

### Collect required values 

From your Azure App: 

- **Client ID** → CLIENT_ID 
- **Tenant ID** → TENANT_ID 
- **Client Secret** → CLIENT_SECRET 

## Step 4: Identify your SharePoint site and folder 

The script uploads generated event tickets to a SharePoint site. 

1. Identify your **SharePoint hostname** and **site path**: 

> Example: 
>
> HOSTNAME = contoso.sharepoint.com 
>
> SITE_PATH = /sites/EventSite 

1. Ensure a document library called **Documents** exists (default). 

## Step 5: Deploy the package 

1. Create a new site by importing recently downloaded site from GitHub. Refer this document to import the site, [power-pages-solutions](https://learn.microsoft.com/power-pages/configure/power-pages-solutions#import-the-solution-into-the-target-environment)  
1. During the site upgrade you'll be asked to update the values for environment variables. Update below values captured in previous steps 

1. **Client ID**  
1. **Tenant ID** 
1. **Client Secret** (It prefers to keep it in a key vault and use in environments variable. For testing you can keep directly in environment variable) 
1. HOSTNAME  
1. SITE_PATH  

### Script Highlight: Configuration Section

```javascript
const CLIENT_ID = Server.SiteSetting.Get("CLIENT_ID");
const CLIENT_SECRET = Server.SiteSetting.Get("CLIENT_SECRET");;
const TENANT_ID = Server.SiteSetting.Get("TENANT_ID");

const HOSTNAME = Server.SiteSetting.Get("HOSTNAME"); 
const SITE_PATH = Server.SiteSetting.Get("SITE_PATH"); 
```
These are securely loaded from Power Pages Site Settings (environment variables).

## Step 6: Test the SharePoint integration 

The script is designed to process **event registration form submissions**, acquire a Microsoft Graph access token, generate an **HTML ticket**, upload it to SharePoint, and create a record in Dataverse. 

### Script Highlight: Calling Microsoft Graph for Access Token

```javascript
async function getAccessToken() {
   const body = {
      "client_id": CLIENT_ID,
      "client_secret": CLIENT_SECRET,
      "scope": "https://graph.microsoft.com/.default",
      "grant_type": "client_credentials"
   };
   const tokenResp = await Server.Connector.HttpClient.PostAsync(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      JSON.stringify(body),
      { "Content-Type": "application/x-www-form-urlencoded" },
      "application/x-www-form-urlencoded"
   );
   const tokenJson = JSON.parse(JSON.parse(tokenResp).Body);
   return tokenJson.access_token;
}
```

### Script Highlight: Uploading Ticket to SharePoint

```javascript
const siteResp = await Server.Connector.HttpClient.GetAsync(
  `https://graph.microsoft.com/v1.0/sites/${HOSTNAME}:${SITE_PATH}`,
  { Authorization: `Bearer ${accessToken}` }
);
const siteId = JSON.parse(JSON.parse(siteResp).Body).id;

const driveResp = await Server.Connector.HttpClient.GetAsync(
  `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
  { Authorization: `Bearer ${accessToken}` }
);
const driveId = JSON.parse(JSON.parse(driveResp).Body).id;

const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/Tickets/${fileName}:/content`;

await Server.Connector.HttpClient.PutAsync(
  uploadUrl,
  htmlTicket,
  { Authorization: `Bearer ${accessToken}`, "Content-Type": "text/html" },
  "text/html"
);
```

After a successful run: 

1. A new record should appear in **Dataverse** under crd69_eventregistrations. 
1. An HTML ticket file should be uploaded to your **SharePoint Documents → Tickets** folder. 
1. The crd69_ticketurl field will contain the link to the uploaded ticket file. 

## (Optional) Step 7: Enable email notification 

If you'd like to send a confirmation email to the attendee: 

1. Uncomment the **"Send confirmation email"** section in the script. 
1. Replace {senderUserId} with a valid **mailbox-enabled user ID** (for example, a service account). 
1. Ensure Mail.Send permission is added and admin-consented.
