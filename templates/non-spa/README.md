# Non-SPA Power Pages templates

Non-SPA templates in this directory are provisioned by the Power Pages Create Website API.
The platform owns the generated website source and solutions; this repository owns the catalog
metadata, documentation, and preview assets used to discover and select them.

[`templates/manifest.json`](../manifest.json) is the source of truth for exact API template names,
requirements, warnings, capabilities, and responsive preview paths.

## Templates

| Preview | Template | Scenario |
| --- | --- | --- |
| <img src="starter-layout-1/previews/desktop-home.png" alt="Starter Layout 1 home page" width="220" /> | [Starter Layout 1](starter-layout-1/) | Multipage starting point with reusable navigation and common pages. |
| <img src="starter-layout-2/previews/desktop-home.png" alt="Starter Layout 2 home page" width="220" /> | [Starter Layout 2](starter-layout-2/) | Multipage starting point with reusable navigation and common pages. |
| <img src="starter-layout-3/previews/desktop-home.png" alt="Starter Layout 3 home page" width="220" /> | [Starter Layout 3](starter-layout-3/) | Multipage starting point with reusable navigation and common pages. |
| <img src="starter-layout-4/previews/desktop-home.png" alt="Starter Layout 4 home page" width="220" /> | [Starter Layout 4](starter-layout-4/) | Multipage starting point with reusable navigation and common pages. |
| <img src="starter-layout-5/previews/desktop-home.png" alt="Starter Layout 5 home page" width="220" /> | [Starter Layout 5](starter-layout-5/) | Multipage starting point with reusable navigation and common pages. |
| <img src="blank-page/previews/desktop-home.png" alt="Blank Page home page" width="220" /> | [Blank Page](blank-page/) | Minimal starting point for a custom site. |
| — | [Program Registration](program-registration/) | Browse programs, review availability, and register. |
| — | [Schedule and Manage Meetings](schedule-and-manage-meetings/) | Select locations and schedule appointments. |

## Common workflow

1. Resolve a published samples release or explicit development ref to an immutable commit SHA.
1. Fetch the manifest and all selected preview assets from that same revision.
1. Present only metadata from the selected manifest entry; do not guess or rewrite API identifiers.
1. Verify the template's documented product and environment prerequisites.
1. Submit the exact `provisioning.templateName` to the Create Website API.
1. After provisioning, independently verify the resulting data model and Bootstrap assets before
   model- or version-specific authoring.

These entries are metadata for platform provisioning. They do not contain repository solutions,
seed data, or downloadable website-code variants.
