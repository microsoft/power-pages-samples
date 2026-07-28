---
name: add-power-pages-badge
description: Power Pages badge installer. Use when the user wants to add a fixed "Built with Microsoft Power Pages" badge, Power Pages logo, or powered-by Power Pages component to a website or app.
argument-hint: "[target website or app]"
---

# Add Power Pages Badge

Install the Power Pages badge as a small fixed component that works with the target website's framework, asset pipeline, and styling conventions.

The badge asset lives in this skill at [assets/PowerPages_scalable.svg](assets/PowerPages_scalable.svg).

## Step 1: Find the UI Owner

Locate the rendered app shell, landing page, layout, root component, or HTML template that owns persistent page chrome.

Prefer the closest owner of visible UI over router setup, entry files, or registration code.

Completion criterion: you can name the file that should render the badge and the styling mechanism that file already uses.

## Step 2: Copy the Badge Asset

Copy [assets/PowerPages_scalable.svg](assets/PowerPages_scalable.svg) into the target project instead of referencing the skill folder or any machine-local absolute path from production code.

Use the host project's existing convention:

- Vite or React: copy to `src/assets/` and import the SVG URL.
- Next.js or static public assets: copy to `public/` and reference the public URL.
- Plain HTML: copy to the nearest existing assets folder and use a relative `src`.
- Component libraries: put the asset where shared visual assets already live.

Completion criterion: the target site owns its copy of the SVG, and the badge code references that project-local copy.

## Step 3: Render the Badge

Render this text exactly:

```html
Built with <span>Microsoft Power Pages</span>
```

Use the Power Pages logo as decorative imagery with `alt=""` and `aria-hidden="true"`.

Give the wrapper a stable selector such as `powered-badge` so browser checks can find it.

For React, the component shape is:

```tsx
<div className="powered-badge">
  <img src={powerPagesLogo} width="14" height="14" alt="" aria-hidden="true" />
  Built with <span>Microsoft Power Pages</span>
</div>
```

For plain HTML, the component shape is:

```html
<div class="powered-badge">
  <img src="./assets/PowerPages_scalable.svg" width="14" height="14" alt="" aria-hidden="true" />
  Built with <span>Microsoft Power Pages</span>
</div>
```

Completion criterion: the page renders one badge with the logo, the exact label text, and no extra accessible name for the decorative logo.

## Step 4: Fit the Host Site

Follow the site's local styling system: CSS variables, utilities, component primitives, or inline style patterns already in use.

Use this visual contract unless the host design clearly requires a local adaptation:

```css
.powered-badge {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  color: var(--color-text-muted, #556b58);
  font-size: 0.7rem;
  white-space: nowrap;
  backdrop-filter: blur(8px);
}

.powered-badge span {
  color: var(--color-text, #1a2b1e);
  font-weight: 600;
}
```

On small screens, hide or reposition the badge if it covers navigation, cookie banners, toasts, chat widgets, or primary actions.

Completion criterion: the badge looks native to the host site and does not block important UI on desktop or mobile.

## Step 5: Validate

Run the narrowest relevant validation first, then the full project gate when the repo documents one.

If the site has a deployment manifest, bundle pattern list, or static asset allowlist, include emitted SVG assets there.

When a local page can run, inspect the badge in the browser and verify:

- The badge selector exists.
- The `img` source points at the project-local SVG.
- The image dimensions are around 14px to 18px.
- The visible text is `Built with Microsoft Power Pages`.

Completion criterion: validation passes, the browser shows the project-local logo, and deployment metadata covers the SVG if the platform needs explicit asset patterns.
