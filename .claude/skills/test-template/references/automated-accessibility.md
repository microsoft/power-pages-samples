# Automated accessibility

Quality-standard React templates use Playwright, `@axe-core/playwright`, and Microsoft's
`accessibility-insights-report` package. The browser extension is not required.

## Required coverage

Run axe-core against every route and state declared in `template-quality.json` at desktop and mobile sizes.
Prepare state before scanning: populate carts, reveal validation errors, and open menus or dialogs that are
part of the approved experience. Automated checks inspect visible content, so hidden interactive content
must be revealed explicitly.

For every route and viewport:

1. Open the tested local or deployed site with Playwright.
2. Prepare the declared state.
3. Run `AxeBuilder.analyze()`.
4. Fail on any violation.
5. Pass the returned `AxeResults` to `reporterFactory()` from `accessibility-insights-report`.
6. Save a self-contained HTML report under `docs/a11y-reports/`.

Generate `docs/a11y-reports/accessibility-summary.json` with:

- report package and axe-core versions
- automated score `100`
- total violations `0`
- one scan record for every route and viewport
- pass, incomplete, and violation counts
- report filenames and SHA-256 hashes

Run the same workflow against the final deployed Power Pages URL. Any accessibility-relevant source change
invalidates the quality digest and requires new scans.

## Claim boundary

The completion claim is: **100% of declared automated accessibility scans passed with zero axe-core violations.**

Do not claim that automated scans prove full WCAG 2.2 Level AA compliance. Microsoft documents that a full
Accessibility Insights Assessment includes assisted and manual requirements that require human analysis.
If a contributor separately completes a manual assessment, preserve it as supplementary evidence; it is not
the deterministic automated gate.
