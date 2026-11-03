// Prototype catalog data. In the real site this would be generated from
// templates/manifest.json and a matching samples manifest.
window.CATALOG = (() => {
  const nonSpa = (id, page, label) => ({
    label,
    src: `templates/non-spa/${id}/previews/desktop-${page}.png`,
    mobile: `templates/non-spa/${id}/previews/mobile-${page}.png`
  });

  const starter = (n, look, pages = ["home", "subpage-1", "subpage-2"]) => {
    const id = `starter-layout-${n}`;
    const labels = ["Home page", "Sub page 1", "Sub page 2"];
    return {
      id,
      name: `Starter Layout ${n}`,
      path: `templates/non-spa/${id}/`,
      desc: `A multipage starter with ${look}. Customize every section in the design studio.`,
      publisher: "Microsoft",
      tags: ["Design studio"],
      features: ["Home page", "Subpages", "Contact us", "Search results"],
      devices: true,
      images: pages.map((p, i) => nonSpa(id, p, labels[i]))
    };
  };

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
    groups: [
      {
        id: "templates",
        name: "Templates",
        intro: "Starting points for a new site. SPA templates give you React code you own. Non-SPA templates are ready to use in the design studio with no code.",
        categories: [
          {
            id: "spa",
            name: "SPA templates",
            short: "SPA template",
            tag: "SPA",
            mat: "spa",
            blurb: "Code you own. React sites with Dataverse solutions and sample data, deployed with the Power Platform CLI.",
            howTo: "Import the Dataverse solution and sample data, then build and upload the website code with the Power Platform CLI.",
            items: [
              {
                id: "311-portal",
                name: "311 Portal",
                publisher: "Microsoft",
                path: "templates/spa/311-portal/",
                desc: "Citizen service requests, request tracking, city service maps, knowledge articles, and contact flows.",
                tags: ["React", "Vite"],
                features: ["Service requests", "Request tracking", "Map", "Knowledge base", "Admin view"],
                images: [
                  { label: "Home", src: "templates/spa/311-portal/previews/home.png" },
                  { label: "Map", src: "templates/spa/311-portal/previews/map.png" },
                  { label: "Knowledge", src: "templates/spa/311-portal/previews/knowledge.png" },
                  { label: "Contact", src: "templates/spa/311-portal/previews/contact.png" },
                  { label: "Admin", src: "templates/spa/311-portal/previews/admin.png" }
                ]
              },
              {
                id: "supplier-invoice-portal",
                name: "Supplier Invoice Portal",
                publisher: "Microsoft",
                path: "templates/spa/supplier-invoice-portal/",
                desc: "Supplier onboarding, purchase orders, invoice submission, review, and tracking.",
                tags: ["React", "Vite"],
                features: ["Supplier onboarding", "Purchase orders", "Invoice submission", "Approval review"],
                images: [
                  { label: "Home", src: "templates/spa/supplier-invoice-portal/previews/home.png" },
                  { label: "Dashboard", src: "templates/spa/supplier-invoice-portal/previews/dashboard.png" },
                  { label: "Invoices", src: "templates/spa/supplier-invoice-portal/previews/list.png" },
                  { label: "Submit invoice", src: "templates/spa/supplier-invoice-portal/previews/form.png" },
                  { label: "Purchase orders", src: "templates/spa/supplier-invoice-portal/previews/purchase-orders.png" },
                  { label: "Review", src: "templates/spa/supplier-invoice-portal/previews/review.png" }
                ]
              }
            ]
          },
          {
            id: "non-spa",
            name: "Non-SPA templates",
            short: "Non-SPA template",
            tag: "Non-SPA",
            mat: "nonspa",
            blurb: "Ready in the design studio. Pick one when you create a site and customize it without writing code.",
            howTo: "Choose this template when you create a site in Power Pages design studio, or provision it with the Create Website API.",
            items: [
              {
                id: "program-registration",
                name: "Program Registration",
                publisher: "Microsoft",
                path: "templates/non-spa/program-registration/",
                desc: "Let people browse programs and register for individual or multi-day classes.",
                tags: ["Design studio"],
                features: ["Course filters", "Date-time picker", "Email confirmations", "Custom themes"],
                devices: true,
                images: [
                  nonSpa("program-registration", "event-catalog", "After-school events"),
                  nonSpa("program-registration", "registrations", "My registrations"),
                  nonSpa("program-registration", "registration-flow", "Registration flow")
                ]
              },
              {
                id: "schedule-and-manage-meetings",
                name: "Schedule and Manage Meetings",
                publisher: "Microsoft",
                path: "templates/non-spa/schedule-and-manage-meetings/",
                desc: "Let people book appointments with specific staff members about specific topics.",
                tags: ["Design studio"],
                features: ["Location picker", "Step-by-step forms", "Calendars", "Email reminders"],
                devices: true,
                images: [
                  nonSpa("schedule-and-manage-meetings", "home", "Home page"),
                  nonSpa("schedule-and-manage-meetings", "service-selection", "Service selection"),
                  nonSpa("schedule-and-manage-meetings", "appointment-confirmation", "Appointment confirmation")
                ]
              },
              starter(1, "a navy hero and a photo beside the headline", ["home", "services", "contact"]),
              starter(2, "a light header and an illustration beside the headline"),
              starter(3, "a bold full-width color hero above a photo band"),
              starter(4, "a dark, image-led introduction"),
              starter(5, "a light layout and a photo beside the introduction"),
              {
                id: "blank-page",
                name: "Blank page",
                publisher: "Microsoft",
                path: "templates/non-spa/blank-page/",
                desc: "A single empty page for a completely custom site with no preset sections.",
                tags: ["Design studio"],
                features: ["Home page"],
                devices: true,
                images: [nonSpa("blank-page", "home", "Home page")]
              }
            ]
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
          },
          {
            id: "traditional",
            name: "Non-SPA sites",
            short: "Non-SPA site",
            mat: "traditional",
            blurb: "Sites built with Liquid and web templates on the enhanced data model.",
            howTo: "This sample is planned and not built yet.",
            items: [
              {
                id: "edm-liquid",
                name: "Liquid web template starter",
                path: "samples/traditional/edm-liquid-webtemplate-starter/",
                desc: "Render Dataverse rows with Liquid and a web template on the enhanced data model.",
                tags: ["Liquid"],
                planned: true,
                images: []
              }
            ]
          }
        ]
      }
    ]
  };
})();
