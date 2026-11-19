# Community Blog template draft

An accessible editorial blog starter for organizations to publish practical articles, organize topics, and introduce their authors.

This installable Power Pages template includes a React editorial experience, an unmanaged Dataverse solution, fictional seed data, responsive previews, and source-bound quality evidence.

## Audience

- makers

## Data model

Power Pages platform tables plus template-owned custom Dataverse tables in a supporting unmanaged solution.

## Planned pages

- **Home** (`/`): Introduce the publication with a featured story and recent editorial picks.
- **Articles** (`/articles`): Browse and filter all published articles by topic or search term.
- **Article** (`/articles/designing-readable-guides`): Read a complete long-form article with author and topic context.
- **Authors** (`/authors`): Meet the contributors behind the publication.
- **Author profile** (`/authors/maya-chen`): Explore an author biography and their published work.

## Local development

```powershell
cd variants\react\website-code
npm install
npm run quality
npm run previews
```

## Supporting solution

The unpacked unmanaged `CommunityBlog` solution is under `solutions/CommunityBlog/`.
It uses the `blog` publisher prefix and contains the Author, Category, and Post tables plus the Author-to-Posts and Category-to-Posts relationships.

## Install manually

Use the create-site template installer when available. For a manual installation:

1. Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction).
2. Confirm English (LCID 1033) is installed and JavaScript attachments are allowed in the target environment.
3. Authenticate PAC CLI to the target environment.
4. Pack and import the supporting unmanaged solution from the repository root:

   ```powershell
   $temp = Join-Path $env:TEMP "community-blog-unmanaged.zip"
   pac solution pack --zipfile $temp --folder templates\spa\community-blog\solutions\CommunityBlog --packagetype Unmanaged
   pac solution import --path $temp --publish-changes
   Remove-Item -LiteralPath $temp
   ```

5. Apply `seed-data/data.json` with an installer that preserves the stable GUIDs and exact `blog_AuthorId` and `blog_CategoryId` navigation properties. Import Authors and Categories before Posts.
6. Restore, build, and upload the React code site:

   ```powershell
   cd templates\spa\community-blog\variants\react\website-code
   npm ci
   npm run build
   pac pages upload-code-site --rootPath .
   ```

The seed package contains 3 fictional authors, 4 categories, and 8 articles. It contains no personal, payment, or production data.

## Quality evidence

- Five declared routes at desktop and mobile widths
- Ten automated accessibility reports with score 100
- Exceptional-design review score 34/40 with no failed critical gate
- CodeQL JavaScript/TypeScript report with zero findings
- Unit, build, functional Playwright, and accessibility Playwright checks

Automated accessibility checks do not prove full WCAG conformance; perform manual assessment for a production site.
