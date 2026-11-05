import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Body1Strong,
  Button,
  Caption1,
  Caption1Strong,
  Caption2,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components'
import { Building20Regular, ChevronDown16Regular, Form20Regular, LockClosed20Regular, Person20Regular, ShieldPerson20Regular, SignOut20Regular } from '@fluentui/react-icons'
import { useApp } from '../store/AppStore'
import { can, ROLE_LABELS } from '../lib/access'
import { useAuth } from '../hooks/useAuth'
import { useRoutePreload } from '../hooks/useRoutePreload'
import { ON_NAVY_FG, SHELL_TEXT, SHELL_TEXT_MUTED, withAlpha } from '../theme/fluentTheme'

export interface AccountLink {
  label: string
  to: string
  icon: ReactElement
}

/** SPA auth pages (and the server paths that forward to them); the header hides "Sign in" on these. */
const AUTH_PATHS = ['/login', '/registration', '/redeem-invitation', '/forgot-password', '/reset-password', '/external-login-confirmation', '/signin', '/account/login', '/register']

export function isAuthPage(pathname: string) {
  const p = pathname.toLowerCase()
  return AUTH_PATHS.some(a => p === a || p.startsWith(`${a}/`))
}

/** Account links grouped by meaning: personal settings vs organisation administration (by capability). */
export function useAccountLinks(): { account: AccountLink[]; organisation: AccountLink[] } {
  const { session } = useApp()
  const role = session.role
  if (role === 'anonymous') return { account: [], organisation: [] }
  return {
    account: [
      { label: 'Profile', to: '/profile/', icon: <Person20Regular /> },
      { label: 'Sign-in & security', to: '/Account/Manage/ChangePassword', icon: <LockClosed20Regular /> },
    ],
    organisation: [
      { label: 'Parent account', to: '/profile/parent-account/', icon: <Building20Regular />, show: can(role, 'parent-account') },
      { label: 'Manage access', to: '/profile/manage-access/', icon: <ShieldPerson20Regular />, show: can(role, 'manage-access') },
      { label: 'Register to be a partner', to: '/profile/register-to-be-a-partner/', icon: <Form20Regular />, show: can(role, 'register-partner') },
    ]
      .filter(i => i.show)
      .map(({ label, to, icon }) => ({ label, to, icon })),
  }
}

/** Props for a "Sign in" link to the SPA /login page that returns to the current page. */
export function useSignInLink() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const preload = useRoutePreload()
  const here = pathname + search
  const href = here === '/' || isAuthPage(pathname) ? '/login' : `/login?ReturnUrl=${encodeURIComponent(here)}`
  return (after?: () => void) => ({
    ...preload(href),
    href,
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      after?.()
      navigate(href)
    },
  })
}

/** Signs out (Power Pages session on the deployed site, prototype persona otherwise). */
export function useSignOut() {
  const { logout } = useAuth()
  const { pathname, search } = useLocation()
  return () => logout(pathname + search)
}

const useStyles = makeStyles({
  onNavy: {
    color: SHELL_TEXT,
    backgroundColor: 'transparent',
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    ':hover': { color: ON_NAVY_FG, backgroundColor: withAlpha(ON_NAVY_FG, 0.08) },
    ':hover:active': { color: ON_NAVY_FG, backgroundColor: withAlpha(ON_NAVY_FG, 0.14) },
    '& .fui-Button__icon': { color: 'inherit' },
  },
  trigger: { gap: '8px', paddingInlineStart: '4px', paddingInlineEnd: '4px', textAlign: 'start' },
  name: { display: 'block', color: 'inherit' },
  role: { display: 'block', color: SHELL_TEXT_MUTED, fontWeight: tokens.fontWeightRegular },
  popover: { minWidth: '280px' },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: '4px',
  },
  block: { display: 'block' },
  muted: { color: tokens.colorNeutralForeground2 },
})

/**
 * Header auth entry point: "Sign in" (to /login) for visitors, or the user menu with account links and
 * "Sign out" for signed-in users. The name and role come from the Power Pages user / web roles when deployed.
 */
export function AuthButton() {
  const s = useStyles()
  const { session } = useApp()
  const { displayName, user, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const preload = useRoutePreload()
  const signInLink = useSignInLink()
  const signOut = useSignOut()
  const { account, organisation } = useAccountLinks()
  if (!isAuthenticated || session.role === 'anonymous') {
    if (isAuthPage(pathname)) return null
    return (
      <Button as="a" {...signInLink()} appearance="primary" size="small">
        Sign in
      </Button>
    )
  }
  return (
    <Menu positioning={{ position: 'below', align: 'end', offset: 6 }}>
      <MenuTrigger disableButtonEnhancement>
        <Button appearance="transparent" className={mergeClasses(s.onNavy, s.trigger)} icon={<ChevronDown16Regular />} iconPosition="after">
          <Avatar name={displayName} color="brand" size={28} aria-hidden="true" />
          <span className="sr-only md:not-sr-only md:block">
            <Caption1Strong className={s.name}>{displayName}</Caption1Strong>
            <Caption2 className={s.role}>{ROLE_LABELS[session.role]}</Caption2>
          </span>
        </Button>
      </MenuTrigger>
      <MenuPopover className={s.popover}>
        <div className={s.header}>
          <Body1Strong as="p" className={s.block}>
            {displayName}
          </Body1Strong>
          {user?.email && (
            <Caption1 as="p" className={mergeClasses(s.block, s.muted)}>
              {user.email}
            </Caption1>
          )}
        </div>
        <MenuList aria-label="User menu">
          <MenuGroup>
            <MenuGroupHeader>Your account</MenuGroupHeader>
            {account.map(i => (
              <MenuItem {...preload(i.to)} key={i.to} icon={i.icon} onClick={() => navigate(i.to)}>
                {i.label}
              </MenuItem>
            ))}
          </MenuGroup>
          {organisation.length > 0 && (
            <>
              <MenuDivider />
              <MenuGroup>
                <MenuGroupHeader>Organisation</MenuGroupHeader>
                {organisation.map(i => (
                  <MenuItem {...preload(i.to)} key={i.to} icon={i.icon} onClick={() => navigate(i.to)}>
                    {i.label}
                  </MenuItem>
                ))}
              </MenuGroup>
            </>
          )}
          <MenuDivider />
          <MenuItem icon={<SignOut20Regular />} onClick={signOut}>
            Sign out
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}
