// Catalog data for the showcase site.
//
// Templates come from templates/manifest.json: build.mjs fills the template
// categories below, so a new template appears on the site once its manifest
// entry merges. Samples have no manifest and are listed here by hand; the build
// fails when a sample folder is missing from this list.
window.CATALOG = (() => {
  const sample = (id, name, path, desc, tags, image = `${path}screenshot.png`) => ({
    id,
    name,
    path,
    desc,
    tags,
    images: image ? [{ label: "Screenshot", src: image }] : []
  });

  return {
    repo: "https://github.com/microsoft/power-pages-samples/tree/main/",
    // Optional site-only copy for templates whose manifest description reads
    // poorly in a catalog, such as the starter layouts that share one sentence.
    // Leave a template out to use its manifest description.
    templateOverrides: {
      "starter-layout-1": { desc: "A multipage starter with a navy hero and a photo beside the headline. Customize every section in the design studio." },
      "starter-layout-2": { desc: "A multipage starter with a light header and an illustration beside the headline. Customize every section in the design studio." },
      "starter-layout-3": { desc: "A multipage starter with a bold full-width color hero above a photo band. Customize every section in the design studio." },
      "starter-layout-4": { desc: "A multipage starter with a dark, image-led introduction. Customize every section in the design studio." },
      "starter-layout-5": { desc: "A multipage starter with a light layout and a photo beside the introduction. Customize every section in the design studio." }
    },
    groups: [
      {
        id: "templates",
        name: "Templates",
        intro: "Starting points for a new site. SPA templates give you framework code you own. Non-SPA templates are ready to use in the design studio with no code.",
        categories: [
          {
            id: "spa",
            name: "SPA templates",
            short: "SPA template",
            tag: "SPA",
            mat: "spa",
            blurb: "Code you own. Framework-based sites with Dataverse solutions and sample data, deployed with the Power Platform CLI.",
            howTo: "Import the Dataverse solution and sample data, then build and upload the website code with the Power Platform CLI.",
            // Filled from templates/manifest.json by build.mjs.
            items: []
          },
          {
            id: "non-spa",
            name: "Non-SPA templates",
            short: "Non-SPA template",
            tag: "Non-SPA",
            mat: "nonspa",
            blurb: "Ready in the design studio. Pick one when you create a site and customize it without writing code.",
            howTo: "Choose this template when you create a site in Power Pages design studio, or provision it with the Create Website API.",
            // Filled from templates/manifest.json by build.mjs.
            items: []
          }
        ]
      },
      {
        id: "samples",
        name: "Samples",
        intro: "Working examples that teach one pattern or capability.",
        categories: [
          {
            id: "apps",
            name: "Full applications",
            short: "App",
            mat: "apps",
            blurb: "Complete sites that combine sign-in, web roles, and the Web API in one place.",
            howTo: "Clone the folder, follow its README to set up Dataverse, then build and upload with the Power Platform CLI.",
            items: [
              sample("car-sales-react", "Car Sales Website", "samples/spa/apps/car-sales-website/react/", "A dashboard-style site with sign-in, web roles, virtual tables, and Web API calls.", ["React", "Vite"]),
              sample("car-sales-angular", "Car Sales Website", "samples/spa/apps/car-sales-website/angular/", "The car sales scenario built and uploaded with Angular CLI.", ["Angular"]),
              sample("credit-cards", "Credit Cards Website", "samples/spa/apps/credit-cards-website/react/", "A banking site with card browsing, applications, reviewer workflows, and role-based access.", ["React", "Vite"]),
              sample("vue-admin", "Vue Admin Template", "samples/spa/apps/vue-admin-template/vue/", "A Vue 3 admin-style site you can upload as a Power Pages SPA.", ["Vue", "Vite"])
            ]
          },
          {
            id: "snippets",
            name: "Single-topic snippets",
            short: "Snippet",
            mat: "snippets",
            blurb: "One capability per sample. Read it in a sitting and copy the pattern into your own site.",
            howTo: "Clone the folder, follow its README, then upload it with the Power Platform CLI to try it in your environment.",
            items: [
              sample("authentication", "Authentication", "samples/spa/snippets/authentication/", "Local sign-in, registration, password reset, invitations, external sign-in, and role-protected content.", ["React", "Vite"]),
              sample("cloud-flow", "Cloud flow", "samples/spa/snippets/cloud-flow/", "Call a Power Automate cloud flow from your site and show its response.", ["React", "Vite"]),
              sample("environment-variables", "Environment variables", "samples/spa/snippets/environment-variables/", "Expose client-safe environment variables and build-time constants with Vite.", ["React", "Vite"]),
              sample("fluent-ui", "Fluent UI loan application", "samples/spa/snippets/fluent-ui/", "A form-driven portal built with Fluent UI v9 controls and a data grid dashboard.", ["React", "Fluent UI"]),
              sample("localization", "Localization", "samples/spa/snippets/localization/", "Multilingual content, language switching, and translation patterns.", ["React", "i18next"]),
              sample("upload-notes", "File upload to notes", "samples/spa/snippets/file-upload/notes/", "Upload, list, download, and delete files stored as Dataverse notes.", ["React", "Web API"]),
              sample("upload-file-column", "File upload to a file column", "samples/spa/snippets/file-upload/file-column/", "Store files in a native Dataverse file column without base64 encoding.", ["React", "Web API"]),
              sample("upload-sharepoint", "File upload to SharePoint", "samples/spa/snippets/file-upload/sharepoint/", "Store files in a SharePoint document library through server logic and Microsoft Graph.", ["React", "SharePoint"]),
              sample("upload-azure-blob", "File upload to Azure Blob", "samples/spa/snippets/file-upload/azure-blob/", "Chunked uploads of up to 10 GB into your own Azure Blob container.", ["React", "Azure"])
            ]
          },
          {
            id: "server-logic",
            name: "Server logic",
            short: "Server logic",
            mat: "server",
            blurb: "JavaScript that runs on Power Pages servers. Works with both SPA and non-SPA sites.",
            howTo: "Import the included solution, then follow the README to configure the server logic and test it from your site.",
            items: [
              sample("csp-reporting", "CSP violation reporting", "samples/server-logic/csp-reporting/", "Collect browser Content Security Policy reports in a locked-down anonymous endpoint.", ["Reporting API"]),
              sample("custom-form-captcha", "CAPTCHA for custom forms", "samples/server-logic/custom-form-captcha/", "Verify a CAPTCHA token on the server before saving a custom form to Dataverse.", ["reCAPTCHA"], "samples/server-logic/custom-form-captcha/media/callback-form-captcha.png"),
              sample("malware-scan", "Malware scan for uploads", "samples/server-logic/malware-scan/", "Check form uploads with Microsoft Defender for Storage before the record is submitted.", ["Defender", "Azure Blob"], "samples/server-logic/malware-scan/media/scan-status-clean.png"),
              sample("sharepoint-integration", "SharePoint integration", "samples/server-logic/sharepoint-integration/", "Call Microsoft Graph and SharePoint Online with an Entra app registration.", ["Microsoft Graph"], null),
              sample("unbound-custom-api", "Unbound custom API", "samples/server-logic/unbound-custom-api/", "Call a Dataverse custom action with POST and a custom function with GET.", ["Dataverse"])
            ]
          }
        ]
      }
    ]
  };
})();
