interface ZavaLogoProps {
  size?: number
  className?: string
  variant?: 'dark' | 'light'
}

export default function ZavaLogo({ size = 36, className, variant = 'dark' }: ZavaLogoProps) {
  const bgFill = variant === 'dark' ? '#1B4965' : '#fff'
  const zFill = variant === 'dark' ? '#fff' : '#1B4965'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Rounded square background */}
      <rect width="40" height="40" rx="9" fill={bgFill} />
      {/* Z letterform — bold geometric */}
      <path
        d="M10 10 L30 10 L30 15 L17 30 L30 30 L30 35 L10 35 L10 30 L23 15 L10 15 Z"
        fill={zFill}
      />
      {/* Teal accent bar at bottom */}
      <rect x="10" y="37" width="20" height="3" rx="1.5" fill="#3D8B7A" />
    </svg>
  )
}
