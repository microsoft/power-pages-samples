import type { Page } from "@playwright/test";

const organizations = {
  kitchen: {
    vol_organizationid: "10000000-0000-4000-8000-000000000001",
    vol_name: "Harbor Community Kitchen",
    vol_slug: "harbor-community-kitchen",
    vol_focus: "Food security",
    vol_description: "A neighborhood kitchen connecting volunteers with meal preparation and delivery programs."
  },
  greenway: {
    vol_organizationid: "10000000-0000-4000-8000-000000000002",
    vol_name: "Greenway Neighbors",
    vol_slug: "greenway-neighbors",
    vol_focus: "Environment",
    vol_description: "A volunteer network caring for shared gardens, trails, and public green spaces."
  },
  books: {
    vol_organizationid: "10000000-0000-4000-8000-000000000003",
    vol_name: "Open Book Collective",
    vol_slug: "open-book-collective",
    vol_focus: "Learning",
    vol_description: "A literacy collective supporting readers, tutors, and community learning events."
  }
};

const values = [
  ["20000000-0000-4000-8000-000000000001", "Weekend meal preparation", "Food support", "Harbor District", "3 hours on Saturday", "Prepare and package nourishing meals alongside an experienced kitchen team.", true, organizations.kitchen],
  ["20000000-0000-4000-8000-000000000002", "Neighborhood meal delivery", "Food support", "North Market", "2 hours every other week", "Deliver prepared meals and friendly check-ins to neighborhood residents.", false, organizations.kitchen],
  ["20000000-0000-4000-8000-000000000003", "Community garden morning", "Environment", "Riverside Garden", "2 hours monthly", "Plant, weed, and maintain shared growing beds with neighbors of all experience levels.", true, organizations.greenway],
  ["20000000-0000-4000-8000-000000000004", "Trail welcome team", "Environment", "Greenway Loop", "One Sunday morning", "Welcome trail visitors, share route information, and record maintenance observations.", false, organizations.greenway],
  ["20000000-0000-4000-8000-000000000005", "Seasonal litter survey", "Environment", "East Creek", "90 minutes quarterly", "Join a guided survey that helps the network plan future cleanup days.", false, organizations.greenway],
  ["20000000-0000-4000-8000-000000000006", "After-school reading partner", "Learning", "Central Library", "1 hour weekly for 8 weeks", "Read with a learner using prepared activities and support from a program coordinator.", true, organizations.books],
  ["20000000-0000-4000-8000-000000000007", "Book drive sorting day", "Learning", "South Commons", "One 3-hour shift", "Sort donated books by reading level and prepare community library bundles.", false, organizations.books],
  ["20000000-0000-4000-8000-000000000008", "Conversation club host", "Learning", "Online", "45 minutes twice monthly", "Facilitate a welcoming online conversation using provided prompts and activities.", false, organizations.books]
] as const;

const opportunityRows = values.map(
  ([id, title, category, place, commitment, summary, featured, organization]) => ({
    vol_opportunityid: id,
    vol_title: title,
    vol_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    vol_category: category,
    vol_place: place,
    vol_commitment: commitment,
    vol_summary: summary,
    vol_featured: featured,
    _vol_organizationid_value: organization.vol_organizationid,
    vol_OrganizationId: organization
  })
);

export async function mockVolunteerHubDataverse(page: Page) {
  await page.route("**/_layout/tokenhtml", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<input name="__RequestVerificationToken" value="test-token">'
    });
  });
  await page.route("**/_api/vol_opportunities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        "@odata.count": opportunityRows.length,
        value: opportunityRows
      })
    });
  });
  await page.route("**/_api/vol_organizations**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        "@odata.count": Object.keys(organizations).length,
        value: Object.values(organizations)
      })
    });
  });
}
