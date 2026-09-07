/**
 * The four-square Microsoft logo. Inlined as SVG rather than pulled from a CDN
 * so the sign-in and registration pages render identically offline and inside
 * the Power Pages shell, which blocks some external asset hosts.
 *
 * Brand guidelines: https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps
 */
export function MicrosoftMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}
