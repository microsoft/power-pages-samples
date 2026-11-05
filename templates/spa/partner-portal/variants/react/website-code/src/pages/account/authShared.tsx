import { useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Body1,
  Button as FluentButton,
  Caption1,
  Divider,
  Input,
  Subtitle1,
  Text,
  Title3,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  type InputProps,
} from '@fluentui/react-components'
import {
  Building20Regular,
  Eye20Regular,
  EyeOff20Regular,
  Handshake20Regular,
  Key20Regular,
  Mail20Regular,
  Password20Regular,
  PeopleTeam20Regular,
  Person20Regular,
  PersonKey20Regular,
  Phone20Regular,
} from '@fluentui/react-icons'
import type { PartnerContactRole, Role } from '../../data/types'
import { AppLink, Button } from '../../components/ui'
import { AuthError, EXTERNAL_PROVIDERS, type AuthProviderConfig } from '../../services/authService'
import { fieldErrorFor, type FormError } from '../../components/forms'
import { ImageWithSkeleton } from '../../components/skeletons'
import { ON_NAVY_IMAGE_VARS } from '../program/ProgramHero'
import { can } from '../../lib/access'
import { useApp } from '../../store/AppStore'
import { ON_NAVY_FG, SHELL_ACCENT, SHELL_NAVY, withAlpha } from '../../theme/fluentTheme'

export type SignedInRole = Exclude<Role, 'anonymous'>

export const PERSONAS: { role: SignedInRole; label: string; name: string; contactId: string }[] = [
  { role: 'partner-admin', label: 'Partner Admin', name: 'Avery Chen', contactId: 'c-avery' },
  { role: 'partner-manager', label: 'Partner Manager', name: 'Jordan Patel', contactId: 'c-jordan' },
  { role: 'partner-seller', label: 'Partner Seller', name: 'Sam Rivera', contactId: 'c-sam' },
  { role: 'non-partner', label: 'Non-Partner Portal User', name: 'Taylor Brooks', contactId: 'c-taylor' },
]

export function roleForPartnerRole(r?: PartnerContactRole): SignedInRole {
  if (r === 'Partner Admin') return 'partner-admin'
  if (r === 'Partner Manager') return 'partner-manager'
  if (r === 'Partner Seller') return 'partner-seller'
  return 'non-partner'
}

/** True when `errors` contains a message for the field `label` (prefer `fieldErrorFor` + `FormField error`). */
export function hasError(errors: FormError[], label: string) {
  return !!fieldErrorFor(errors, label)
}

/**
 * Message for the field with `id` only. Use when every error carries an id, so similar labels
 * ("Password" vs "Passwords don't match") can't pick up each other's messages.
 */
export function errorForId(errors: FormError[], id: string): string | undefined {
  return fieldErrorFor(
    errors.filter(e => typeof e !== 'string' && e.id === id),
    id,
    id,
  )
}

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_HINT = `Use at least ${PASSWORD_MIN_LENGTH} characters, including 3 of these: lowercase letters, uppercase letters, numbers and symbols.`
export const PASSWORD_MISMATCH = 'Passwords don’t match. Enter the same password in both fields.'

/** Problem with a new password, or undefined when it meets the Power Pages default password policy. */
export function newPasswordProblem(password: string): string | undefined {
  if (!password) return undefined
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(r => r.test(password)).length
  if (kinds < 3) return 'Password must include 3 of these: lowercase letters, uppercase letters, numbers and symbols'
  return undefined
}

export const EMAIL_FORMAT = 'Enter an email address in the correct format, like name@example.com'

/** Basic email shape check used by the auth forms. */
export function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Only allow same-site relative return URLs. */
export function safeReturnUrl(raw: string | null): string {
  if (!raw) return '/'
  let url = raw
  try {
    if (/%2F/i.test(url)) url = decodeURIComponent(url)
  } catch {
    return '/'
  }
  return url.startsWith('/') && !url.startsWith('//') ? url : '/'
}

/** Invitation code from the query string (server links use `invitation`, the platform `InvitationCode`). */
export function invitationCodeFrom(params: URLSearchParams): string {
  return (params.get('invitationCode') ?? params.get('InvitationCode') ?? params.get('invitation') ?? '').trim()
}

/** User-facing messages for a failed auth call (server validation messages when available). */
export function authErrorMessages(e: unknown): string[] {
  if (e instanceof AuthError) return e.messages
  return [e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.']
}

const useProviderStyles = makeStyles({
  divider: { marginTop: tokens.spacingVerticalXL, marginBottom: tokens.spacingVerticalXL },
})

/** External identity providers stacked full width (vertical-stack sign-in layout). */
export function ExternalProviderButtons({
  verb,
  busyId,
  disabled,
  onSelect,
}: {
  verb: 'Sign in' | 'Sign up'
  busyId?: string | null
  disabled?: boolean
  onSelect: (provider: AuthProviderConfig) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {EXTERNAL_PROVIDERS.map(p => (
        <Button
          key={p.id}
          className="w-full"
          icon={<PersonKey20Regular />}
          pending={busyId === p.id}
          pendingLabel="Redirecting…"
          disabledFocusable={disabled && busyId !== p.id}
          onClick={() => onSelect(p)}
        >
          {`${verb} with ${p.displayName}`}
        </Button>
      ))}
    </div>
  )
}

/** "or … with email" separator between the provider buttons and the local form. */
export function EmailDivider({ children }: { children: ReactNode }) {
  const styles = useProviderStyles()
  return (
    <div aria-hidden="true">
      <Divider className={styles.divider}>
        <Caption1>{children}</Caption1>
      </Divider>
    </div>
  )
}

const VALUE_PROPS = [
  'Distributed opportunities routed to your territory',
  'Deal registration with 180-day protection',
  'Customer accounts and contacts in one place',
  'Role-based access for Partner Admins, Managers and Sellers',
]

const useAuthStyles = makeStyles({
  split: {
    display: 'flex',
    flexDirection: 'column',
    '@media (min-width: 1024px)': {
      flexDirection: 'row',
      border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
      backgroundColor: tokens.colorNeutralBackground1,
    },
  },
  brand: {
    display: 'none',
    flexDirection: 'column',
    flexShrink: 0,
    backgroundColor: SHELL_NAVY,
    color: tokens.colorNeutralForegroundStaticInverted,
    '@media (min-width: 1024px)': { display: 'flex', width: '420px' },
  },
  photo: { width: '100%', height: '176px', flexShrink: 0 },
  accent: { width: '1px', height: '32px', marginBottom: tokens.spacingVerticalL, backgroundColor: SHELL_ACCENT },
  brandHeading: { display: 'block', margin: `0 0 ${tokens.spacingVerticalM}`, color: tokens.colorNeutralForegroundStaticInverted },
  brandBody: { display: 'block', color: withAlpha(ON_NAVY_FG, 0.75) },
  valueProp: { fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300, color: withAlpha(ON_NAVY_FG, 0.8) },
  dot: { width: '4px', height: '4px', marginTop: '8px', flexShrink: 0, backgroundColor: tokens.colorBrandForegroundInverted },
  introTitle: { display: 'block', margin: `0 0 ${tokens.spacingVerticalXS}`, color: tokens.colorNeutralForeground1 },
  introBody: { display: 'block', margin: `0 0 ${tokens.spacingVerticalXXL}`, color: tokens.colorNeutralForeground2 },
  password: { width: '100%', minWidth: 0, maxWidth: '100%' },
  nav: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  navHeading: {
    display: 'block',
    margin: 0,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL, tokens.spacingVerticalXS),
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  navGroup: { ':not(:first-child)': { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` } },
  navList: { listStyleType: 'none', margin: 0, padding: `${tokens.spacingVerticalXS} 0` },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    boxSizing: 'border-box',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
    borderInlineStartWidth: tokens.strokeWidthThick,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: 'transparent',
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    textDecorationLine: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover, color: tokens.colorBrandForeground1, textDecorationLine: 'none' },
    ':active': { color: tokens.colorBrandForeground1 },
  },
  navItemActive: {
    borderInlineStartColor: tokens.colorBrandStroke1,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover, color: tokens.colorBrandForeground1 },
  },
  navIcon: { flexShrink: 0, display: 'inline-flex' },
})

/** Split sign-in style card: form first; the navy brand panel (photo + value props) shows to its left from lg up only. */
export function AuthSplit({ children, panelHeading = 'Your partner portal, everything in one place.' }: { children: ReactNode; panelHeading?: string }) {
  const styles = useAuthStyles()
  return (
    <div className={styles.split}>
      <div className="flex-1 flex lg:justify-center lg:px-6 lg:py-10">
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
      <div className={mergeClasses(styles.brand, 'lg:order-first')}>
        <ImageWithSkeleton
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&h=700&fit=crop"
          alt="A team of colleagues working together at laptops"
          className={styles.photo}
          style={ON_NAVY_IMAGE_VARS}
        />
        <div className="p-8 flex-1 flex flex-col">
          <div className={styles.accent} aria-hidden="true" />
          <Subtitle1 as="p" className={styles.brandHeading}>
            {panelHeading}
          </Subtitle1>
          <Body1 as="p" className={mergeClasses(styles.brandBody, 'mb-6')}>
            Zava partners use the portal to register deals, receive opportunities and work with their customers.
          </Body1>
          <ul className="space-y-3">
            {VALUE_PROPS.map(v => (
              <li key={v} className={mergeClasses('flex items-start gap-3', styles.valueProp)}>
                <span className={styles.dot} aria-hidden="true" />
                {v}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Optional form-side heading (h2) and short description used on the auth pages. */
export function AuthIntro({ title, children }: { title?: string; children?: ReactNode }) {
  const styles = useAuthStyles()
  return (
    <>
      {title && (
        <Title3 as="h2" className={styles.introTitle}>
          {title}
        </Title3>
      )}
      {children && (
        <Body1 as="p" className={styles.introBody}>
          {children}
        </Body1>
      )}
    </>
  )
}

/** Fluent password Input with a show/hide toggle. */
export function PasswordInput({
  className,
  onChange,
  ...props
}: Omit<InputProps, 'type' | 'contentAfter' | 'onChange'> & { onChange?: (e: ChangeEvent<HTMLInputElement>) => void }) {
  const styles = useAuthStyles()
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      className={mergeClasses(styles.password, className)}
      type={visible ? 'text' : 'password'}
      onChange={e => onChange?.(e)}
      contentAfter={
        <FluentButton
          type="button"
          appearance="transparent"
          size="small"
          icon={visible ? <EyeOff20Regular /> : <Eye20Regular />}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible(v => !v)}
        />
      }
    />
  )
}


type NavLink = { label: string; to: string; icon: ReactElement }

const normalizePath = (p: string) => p.replace(/\/+$/, '').toLowerCase()

/**
 * Portal personas all sign in with a local password, so "Set password" (for accounts that only use an external
 * provider) is listed only while the user is on that page.
 */
export const HAS_LOCAL_PASSWORD = true

/** Left sub-navigation shared by Profile and the account security pages, grouped by what the user is managing. */
export function SecurityNav() {
  const { session } = useApp()
  const { pathname } = useLocation()
  const styles = useAuthStyles()
  const here = normalizePath(pathname)
  const setPassword = '/Account/Manage/SetPassword'
  const groups: { id: string; title: string; links: NavLink[] }[] = [
    {
      id: 'account',
      title: 'Your account',
      links: [
        { label: 'Profile', to: '/profile/', icon: <Person20Regular /> },
        ...(can(session.role, 'register-partner') ? [{ label: 'Register to be a partner', to: '/profile/register-to-be-a-partner/', icon: <Handshake20Regular /> }] : []),
      ],
    },
    {
      id: 'security',
      title: 'Sign-in & security',
      links: [
        ...(!HAS_LOCAL_PASSWORD || here === normalizePath(setPassword) ? [{ label: 'Set password', to: setPassword, icon: <Key20Regular /> }] : []),
        { label: 'Change password', to: '/Account/Manage/ChangePassword', icon: <Password20Regular /> },
        { label: 'Change email', to: '/Account/Manage/ChangeEmail', icon: <Mail20Regular /> },
        { label: 'Change phone number', to: '/Account/Manage/ChangePhoneNumber', icon: <Phone20Regular /> },
        { label: 'External sign-in providers', to: '/Account/Manage/ChangeLogin', icon: <PersonKey20Regular /> },
      ],
    },
    {
      id: 'organisation',
      title: 'Organisation',
      links: [
        ...(can(session.role, 'parent-account') ? [{ label: 'Parent account', to: '/profile/parent-account/', icon: <Building20Regular /> }] : []),
        ...(can(session.role, 'manage-access') ? [{ label: 'Manage access', to: '/profile/manage-access/', icon: <PeopleTeam20Regular /> }] : []),
      ],
    },
  ]
  return (
    <nav aria-label="Account settings" className={styles.nav}>
      {groups
        .filter(g => g.links.length > 0)
        .map(g => (
          <div key={g.id} className={styles.navGroup}>
            <Text as="p" id={`account-nav-${g.id}`} className={styles.navHeading}>
              {g.title}
            </Text>
            <ul className={styles.navList} aria-labelledby={`account-nav-${g.id}`}>
              {g.links.map(l => {
                const active = here === normalizePath(l.to)
                return (
                  <li key={l.to}>
                    <AppLink to={l.to} aria-current={active ? 'page' : undefined} className={mergeClasses(styles.navItem, active && styles.navItemActive)}>
                      <span className={styles.navIcon} aria-hidden="true">
                        {l.icon}
                      </span>
                      {l.label}
                    </AppLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
    </nav>
  )
}