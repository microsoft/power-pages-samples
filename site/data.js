// Catalog configuration for the templates site.
//
// Every template comes from templates/manifest.json: build.mjs fills the
// categories below, so a new template appears on the site once its manifest
// entry merges. This file only holds the copy around the templates.
window.CATALOG = (() => {
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
        intro: "Starting points for a new site. SPA templates give you framework code you own. Non-SPA templates are ready-to-use sites built with Liquid and web templates.",
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
            blurb: "Sites built with Liquid and web templates, available through platform provisioning or repository artifacts.",
            howTo: "Choose this template when you create a site in Power Pages design studio, or provision it with the Create Website API.",
            // Filled from templates/manifest.json by build.mjs.
            items: []
          }
        ]
      }
    ]
  };
})();
