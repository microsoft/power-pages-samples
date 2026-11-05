import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactElement, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Caption1Strong,
  Caption2,
  Divider,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Label,
  Link,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  OverlayDrawer,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Select,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components'
import {
  ArrowReset20Regular,
  Briefcase20Regular,
  ChevronDown16Regular,
  ClipboardTaskListLtr20Regular,
  Dismiss24Regular,
  Home20Regular,
  Navigation24Regular,
  People20Regular,
  SignOut20Regular,
  Ribbon20Regular,
} from '@fluentui/react-icons'
import { useApp } from '../store/AppStore'
import { KEEP_NOTICE } from '../lib/notice'
import { PageNotice } from './PageNotice'
import { useMediaQuery } from './ui'
import { AuthButton, isAuthPage, useAccountLinks, useSignInLink, useSignOut } from './AuthButton'
import { useSessionKeepAlive } from '../hooks/useSessionKeepAlive'
import { useRoutePreload } from '../hooks/useRoutePreload'
import { GlobalSearch } from './search/GlobalSearch'
import { can, ROLE_LABELS, ROLE_PERSONA } from '../lib/access'
import type { Role } from '../data/types'
import { fullName } from '../lib/format'
import {
  ON_NAVY_FG,
  PROTOTYPE_BAR_BG,
  PROTOTYPE_BAR_FG,
  PROTOTYPE_BAR_FG_HOVER,
  SHELL_ACCENT,
  SHELL_BRAND_MARK,
  SHELL_BRAND_MARK_FG,
  SHELL_NAVY,
  SHELL_TEXT,
  SHELL_TEXT_MUTED,
  onNavyFocusVars,
  withAlpha,
} from '../theme/fluentTheme'

interface NavItem {
  label: string
  to: string
  desc?: string
  show?: boolean
}

interface NavGroup {
  id: string
  label: string
  to: string
  match: string[]
  icon: ReactElement
  /** Description of the group's landing page, shown on the "Overview" menu item. */
  overviewDesc?: string
  items?: NavItem[]
  show?: boolean
}

/** Light focus ring for controls rendered on the navy shell (portalled popovers keep the default). */
const ON_NAVY_VARS = onNavyFocusVars(SHELL_NAVY)


const useStyles = makeStyles({
  root: { minHeight: '100dvh' },
  header: { backgroundColor: SHELL_NAVY, position: 'sticky', top: 0, zIndex: 50 },
  footer: { backgroundColor: SHELL_NAVY, color: SHELL_TEXT_MUTED },
  footerText: { fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  skipLink: { backgroundColor: SHELL_NAVY, color: ON_NAVY_FG, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 'none',
    textDecoration: 'none',
    outlineOffset: '2px',
    ':focus-visible': { outline: `2px solid ${ON_NAVY_FG}` },
  },
  logoMark: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: SHELL_BRAND_MARK },
  logoTitle: { display: 'block', color: ON_NAVY_FG },
  logoSub: { display: 'block', color: withAlpha(ON_NAVY_FG, 0.7) },
  navGroup: { display: 'flex', alignItems: 'stretch', alignSelf: 'stretch', borderBottom: '2px solid transparent', borderTop: '2px solid transparent' },
  navGroupActive: { borderBottomColor: SHELL_ACCENT },
  onNavy: {
    color: SHELL_TEXT,
    backgroundColor: 'transparent',
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    ':hover': { color: ON_NAVY_FG, backgroundColor: withAlpha(ON_NAVY_FG, 0.08) },
    ':hover:active': { color: ON_NAVY_FG, backgroundColor: withAlpha(ON_NAVY_FG, 0.14) },
    '& .fui-Button__icon': { color: 'inherit' },
  },
  onNavyActive: { color: ON_NAVY_FG },
  navTrigger: { minHeight: '40px', alignSelf: 'center', gap: '4px' },
  navChevron: { marginInlineStart: '2px', flex: 'none' },
  block: { display: 'block' },
  menuPopover: { minWidth: '280px' },
  menuItemText: { display: 'flex', flexDirection: 'column', paddingTop: '2px', paddingBottom: '2px' },
  menuItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorBrandForeground1,
    boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}`,
  },
  menuItemDesc: { color: tokens.colorNeutralForeground2 },
  protoBar: { backgroundColor: PROTOTYPE_BAR_BG, color: PROTOTYPE_BAR_FG, fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200 },
  protoText: { color: PROTOTYPE_BAR_FG },
  protoReset: {
    color: PROTOTYPE_BAR_FG,
    ':hover': { color: PROTOTYPE_BAR_FG_HOVER },
    ':hover:active': { color: PROTOTYPE_BAR_FG_HOVER },
    '& .fui-Button__icon': { color: 'inherit' },
  },
  protoCompact: { minHeight: '40px' },
  protoTrigger: { color: PROTOTYPE_BAR_FG, fontWeight: tokens.fontWeightSemibold, ':hover': { color: PROTOTYPE_BAR_FG_HOVER }, ':hover:active': { color: PROTOTYPE_BAR_FG_HOVER } },
  protoSurface: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '260px' },
  footerLink: {
    color: SHELL_TEXT,
    fontSize: 'inherit',
    lineHeight: 'inherit',
    paddingTop: '4px',
    paddingBottom: '4px',
    display: 'inline-block',
    ':hover': { color: ON_NAVY_FG },
    ':active': { color: ON_NAVY_FG },
  },
  drawerLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '44px',
    paddingInlineStart: '12px',
    paddingInlineEnd: '12px',
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    borderRadius: tokens.borderRadiusMedium,
    ':hover': { color: tokens.colorNeutralForeground1, backgroundColor: tokens.colorNeutralBackground1Hover, textDecoration: 'none' },
    ':active': { color: tokens.colorNeutralForeground1 },
    '&[aria-current="page"]': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
      boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}`,
      fontWeight: tokens.fontWeightSemibold,
    },
  },
  drawerGroup: { fontWeight: tokens.fontWeightSemibold },
  drawerSub: { marginInlineStart: '12px', paddingInlineStart: '4px', borderInlineStartWidth: '1px', borderInlineStartStyle: 'solid', borderInlineStartColor: tokens.colorNeutralStroke2, marginBottom: '8px' },
  drawerIcon: { display: 'flex', color: tokens.colorNeutralForeground2 },
  drawerUser: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' },
  drawerUserText: { display: 'flex', flexDirection: 'column', minWidth: 0, overflowWrap: 'anywhere' },
  drawerSectionHeading: { display: 'block', color: tokens.colorNeutralForeground2, padding: '8px 12px 4px' },
  drawerSignOut: { width: '100%', minHeight: '44px', justifyContent: 'flex-start', paddingInlineStart: '12px', fontWeight: tokens.fontWeightRegular },
})

/** Client-side navigation for anchors: keeps modified/middle clicks native, routes plain clicks. */
function useLinkClick() {
  const navigate = useNavigate()
  return (to: string, after?: () => void) => (e: ReactMouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    after?.()
    navigate(to)
  }
}

function Logo() {
  const s = useStyles()
  const onClick = useLinkClick()
  const preload = useRoutePreload()
  return (
    <a {...preload('/')} href="/" onClick={onClick('/')} className={s.logoLink}>
      <span className={s.logoMark} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h8M2 12h10" stroke={SHELL_BRAND_MARK_FG} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span>
        <Body1Strong className={s.logoTitle}>Partner Portal</Body1Strong>
        <Caption2 className={s.logoSub}>Zava</Caption2>
      </span>
    </a>
  )
}

function useNavGroups(): NavGroup[] {
  const { session } = useApp()
  const role = session.role
  const groups: NavGroup[] = [
    { id: 'home', label: 'Home', to: '/', match: ['/'], icon: <Home20Regular /> },
    {
      id: 'program',
      label: 'Partner program',
      to: '/partner-program/',
      match: ['/partner-program'],
      icon: <Ribbon20Regular />,
      overviewDesc: 'Why partner with Zava',
      // The Technician workspace keeps to work orders; program pages stay public by URL.
      show: !can(role, 'work-orders'),
      items: [
        { label: 'Program details', to: '/partner-program/partner-program-details/', desc: 'Tiers, benefits and requirements' },
        { label: 'Become a partner', to: '/partner-program/become-a-partner/', desc: 'How to apply and what happens next' },
        { label: 'Frequently asked questions', to: '/partner-program/partner-program-FAQs/', desc: 'Program, registration and support answers' },
      ],
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      to: '/opportunities/',
      match: ['/opportunities'],
      icon: <Briefcase20Regular />,
      overviewDesc: 'Your pipeline at a glance',
      show: can(role, 'opportunities'),
      items: [
        { label: 'Distributed opportunities', to: '/opportunities/distributed-opportunities/', desc: 'Delivered by Zava — accept or decline', show: can(role, 'distributed') },
        { label: 'Managed opportunities', to: '/opportunities/managed-opportunities/', desc: 'Your accepted, registered and collaborative pipeline' },
        { label: 'Create opportunity', to: '/opportunities/managed-opportunities/create-opportunity/', desc: 'Add a partner-sourced opportunity' },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      to: '/customers/',
      match: ['/customers'],
      icon: <People20Regular />,
      overviewDesc: 'Accounts and contacts at a glance',
      show: can(role, 'customers'),
      items: [
        { label: 'Customer accounts', to: '/customers/customer-accounts/', desc: 'Accounts managed by your organization' },
        { label: 'Customer contacts', to: '/customers/customer-contacts/', desc: 'People at your customer accounts' },
      ],
    },
    {
      id: 'work-orders',
      label: 'Work orders',
      to: '/work-orders/',
      match: ['/work-orders'],
      icon: <ClipboardTaskListLtr20Regular />,
      show: can(role, 'work-orders'),
    },
  ]
  return groups.filter(g => g.show !== false)
}

function normalizePath(p: string) {
  const lower = p.toLowerCase().split(/[?#]/)[0]
  return lower.endsWith('/') ? lower : `${lower}/`
}

function isActive(pathname: string, g: NavGroup) {
  if (g.id === 'home') return pathname === '/'
  return g.match.some(m => pathname.toLowerCase().startsWith(m.toLowerCase()))
}

function visibleItems(g: NavGroup) {
  return (g.items ?? []).filter(i => i.show !== false)
}

/** Header menu items: an "Overview" entry for the group's landing page first (unless it is already listed). */
function menuItems(g: NavGroup): NavItem[] {
  const items = visibleItems(g)
  const landingListed = items.some(i => normalizePath(i.to) === normalizePath(g.to))
  return landingListed ? items : [{ label: 'Overview', to: g.to, desc: g.overviewDesc }, ...items]
}

/** The most specific item whose path prefixes the current path (so "Overview" only wins on the landing page). */
function currentItemTo(pathname: string, items: NavItem[]) {
  const p = normalizePath(pathname)
  let best: string | undefined
  for (const i of items) {
    const to = normalizePath(i.to)
    if (p.startsWith(to) && (!best || to.length > normalizePath(best).length)) best = i.to
  }
  return best
}

function NavMenu({ group }: { group: NavGroup }) {
  const s = useStyles()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onClick = useLinkClick()
  const preload = useRoutePreload()
  const active = isActive(pathname, group)
  const btnClass = mergeClasses(s.onNavy, s.navTrigger, active && s.onNavyActive)

  if (!group.items) {
    return (
      <div className={mergeClasses(s.navGroup, active && s.navGroupActive)}>
        <Button {...preload(group.to)} as="a" href={group.to} onClick={onClick(group.to)} appearance="transparent" icon={group.icon} aria-current={active ? 'page' : undefined} className={btnClass}>
          {group.label}
        </Button>
      </div>
    )
  }

  const items = menuItems(group)
  const current = currentItemTo(pathname, items)
  return (
    <div className={mergeClasses(s.navGroup, active && s.navGroupActive)}>
      <Menu positioning={{ position: 'below', align: 'start', offset: 4 }}>
        <MenuTrigger disableButtonEnhancement>
          <Button appearance="transparent" icon={group.icon} aria-current={active ? 'true' : undefined} className={btnClass}>
            {group.label}
            <ChevronDown16Regular aria-hidden="true" className={s.navChevron} />
          </Button>
        </MenuTrigger>
        <MenuPopover className={s.menuPopover}>
          <MenuList aria-label={group.label}>
            {items.map(item => {
              const itemActive = item.to === current
              return (
                <MenuItem {...preload(item.to)} key={item.to} onClick={() => navigate(item.to)} aria-current={itemActive ? 'page' : undefined} className={itemActive ? s.menuItemActive : undefined}>
                  <span className={s.menuItemText}>
                    <Body1Strong>{item.label}</Body1Strong>
                    {item.desc && <Caption1 className={s.menuItemDesc}>{item.desc}</Caption1>}
                  </span>
                </MenuItem>
              )
            })}
          </MenuList>
        </MenuPopover>
      </Menu>
    </div>
  )
}

function RoleSwitcher({ id, size }: { id: string; size: 'small' | 'medium' }) {
  const s = useStyles()
  const { session, setRole } = useApp()
  // The select already shows the role; screen-reader users also hear the switch confirmed.
  const [announcement, setAnnouncement] = useState('')
  // A contact signed in via invitation/approval is not a seed persona; show it as its own option so
  // choosing any persona (even the same role) fires onChange and switches back to the seed persona.
  const customContact =
    session.role !== 'anonymous' && session.contact && session.contact.id !== ROLE_PERSONA[session.role] ? session.contact : undefined
  return (
    <span className="flex items-center gap-2">
      <Label htmlFor={id} size={size} className={s.protoText}>
        Viewing as
      </Label>
      <Select
        id={id}
        size={size}
        value={customContact ? 'custom' : session.role}
        onChange={(_, data) => {
          if (data.value === 'custom') return
          setRole(data.value as Role)
          setAnnouncement(`Now viewing as ${ROLE_LABELS[data.value as Role]}.`)
        }}
      >
        {customContact && (
          <option value="custom">
            {`${customContact.firstName} ${customContact.lastName} (${ROLE_LABELS[session.role]})`}
          </option>
        )}
        {(Object.keys(ROLE_LABELS) as Role[]).filter(r => r === 'anonymous' || ROLE_PERSONA[r]).map(r => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </span>
  )
}

/** Prototype-only strip: switch persona to experience each web role's access. Collapses to one line on phones. */
function PrototypeBar() {
  const s = useStyles()
  const { session, resetData, notify } = useApp()
  const navigate = useNavigate()
  const compact = useMediaQuery('(max-width: 767px)')
  const coarse = useMediaQuery('(pointer: coarse)')
  const [open, setOpen] = useState(false)
  const reset = () => {
    setOpen(false)
    resetData()
    notify('Mock data has been reset.', 'info')
    navigate('/', KEEP_NOTICE)
  }

  if (compact) {
    return (
      <div className={s.protoBar}>
        <div className={mergeClasses('px-4 flex items-center gap-3', s.protoCompact)}>
          <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)} positioning="below-start" trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <Button appearance="transparent" size="small" icon={<ChevronDown16Regular />} iconPosition="after" className={s.protoTrigger}>
                Prototype
              </Button>
            </PopoverTrigger>
            <PopoverSurface aria-label="Prototype settings" className={s.protoSurface}>
              <RoleSwitcher id="role-switcher" size="medium" />
              <Button icon={<ArrowReset20Regular />} onClick={reset}>
                Reset mock data
              </Button>
            </PopoverSurface>
          </Popover>
          <Caption1 className={mergeClasses(s.protoText, 'truncate min-w-0 ms-auto')}>{ROLE_LABELS[session.role]}</Caption1>
        </div>
      </div>
    )
  }

  return (
    <div className={s.protoBar}>
      <div className="max-w-[1440px] mx-auto px-6 py-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Caption1Strong>Prototype · mock data</Caption1Strong>
        <RoleSwitcher id="role-switcher" size={coarse ? 'medium' : 'small'} />
        <Button appearance="transparent" size="small" icon={<ArrowReset20Regular />} className={mergeClasses(s.protoReset, 'ms-auto')} onClick={reset}>
          Reset mock data
        </Button>
      </div>
    </div>
  )
}

const FOOTER_LINKS = [
  { label: 'Partner program', to: '/partner-program/' },
  { label: 'Become a partner', to: '/partner-program/become-a-partner/' },
  { label: 'Frequently asked questions', to: '/partner-program/partner-program-FAQs/' },
  { label: 'Sitemap', to: '/sitemap/' },
]

function Footer() {
  const s = useStyles()
  const onClick = useLinkClick()
  const preload = useRoutePreload()
  return (
    <footer className={s.footer} style={ON_NAVY_VARS}>
      <div className={mergeClasses('max-w-[1440px] mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3', s.footerText)}>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {FOOTER_LINKS.map(l => (
              <li key={l.to}>
                <Link {...preload(l.to)} href={l.to} onClick={onClick(l.to)} className={s.footerLink}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>© 2026 Zava</p>
      </div>
    </footer>
  )
}

function MobileNav({ groups, open, onClose }: { groups: NavGroup[]; open: boolean; onClose: () => void }) {
  const s = useStyles()
  const { session } = useApp()
  const { pathname } = useLocation()
  const onClick = useLinkClick()
  const preload = useRoutePreload()
  const signInLink = useSignInLink()
  const { account, organisation } = useAccountLinks()
  const signOut = useSignOut()
  const signedIn = session.role !== 'anonymous'
  const name = fullName(session.contact)
  const accountLinks = [...account, ...organisation]
  const currentAccount = currentItemTo(pathname, accountLinks)
  return (
    <OverlayDrawer open={open} onOpenChange={(_, data) => !data.open && onClose()} position="start" aria-label="Navigation">
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close navigation menu" icon={<Dismiss24Regular />} onClick={onClose} />}>
          Partner Portal
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <nav id="mobile-nav" aria-label="Mobile">
          <ul>
            {groups.map(g => {
              const items = visibleItems(g)
              const currentItem = currentItemTo(pathname, items)
              const groupCurrent = isActive(pathname, g) && !currentItem
              return (
                <li key={g.id}>
                  <Link {...preload(g.to)} href={g.to} onClick={onClick(g.to, onClose)} className={mergeClasses(s.drawerLink, s.drawerGroup)} aria-current={groupCurrent ? 'page' : undefined}>
                    <span className={s.drawerIcon} aria-hidden="true">
                      {g.icon}
                    </span>
                    {g.label}
                  </Link>
                  {items.length > 0 && (
                    <ul className={s.drawerSub}>
                      {items.map(i => (
                        <li key={i.to}>
                          <Link {...preload(i.to)} href={i.to} onClick={onClick(i.to, onClose)} className={s.drawerLink} aria-current={i.to === currentItem ? 'page' : undefined}>
                            {i.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
        <Divider className="my-3" />
        {signedIn ? (
          <section aria-label="Your account">
            <div className={s.drawerUser}>
              <Avatar name={name} color="brand" size={36} aria-hidden="true" />
              <span className={s.drawerUserText}>
                <Body1Strong className={s.block}>{name}</Body1Strong>
                {session.contact?.email && <Caption1 className={mergeClasses(s.block, s.menuItemDesc)}>{session.contact.email}</Caption1>}
                <Caption1 className={mergeClasses(s.block, s.menuItemDesc)}>{ROLE_LABELS[session.role]}</Caption1>
              </span>
            </div>
            <nav aria-label="Account">
              {[
                { heading: 'Your account', links: account },
                { heading: 'Organisation', links: organisation },
              ]
                .filter(sec => sec.links.length > 0)
                .map(sec => (
                  <div key={sec.heading}>
                    <Caption1Strong as="h2" className={s.drawerSectionHeading}>
                      {sec.heading}
                    </Caption1Strong>
                    <ul>
                      {sec.links.map(l => (
                        <li key={l.to}>
                          <Link {...preload(l.to)} href={l.to} onClick={onClick(l.to, onClose)} className={s.drawerLink} aria-current={l.to === currentAccount ? 'page' : undefined}>
                            <span className={s.drawerIcon} aria-hidden="true">
                              {l.icon}
                            </span>
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </nav>
            <Button
              appearance="subtle"
              icon={<SignOut20Regular />}
              className={mergeClasses(s.drawerSignOut, 'mt-2')}
              onClick={() => {
                onClose()
                signOut()
              }}
            >
              Sign out
            </Button>
          </section>
        ) : (
          !isAuthPage(pathname) && (
            <div className="px-3 py-2">
              <Body1 as="p" className="mb-3">
                Sign in to manage your opportunities and customers.
              </Body1>
              <Button as="a" {...signInLink(onClose)} appearance="primary" className="w-full">
                Sign in
              </Button>
            </div>
          )
        )}
      </DrawerBody>
    </OverlayDrawer>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const s = useStyles()
  const { mode } = useApp()
  const groups = useNavGroups()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const destination = `${location.pathname}?id=${new URLSearchParams(location.search).get('id') ?? ''}`
  const previousDestination = useRef(destination)
  const navigateTo = useNavigate()
  // Live only: keeps the Power Pages session alive during SPA navigation; on expiry, back to sign-in.
  const onSessionExpired = useCallback(() => navigateTo('/login?sessionExpired=true'), [navigateTo])
  useSessionKeepAlive({ onSessionExpired })

  useEffect(() => {
    if (previousDestination.current === destination) return
    previousDestination.current = destination
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const main = mainRef.current
    if (!main) return
    // Lazy pages can render after the navigation effect. Observe content, not filter/query changes.
    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>('h1')
      if (!heading?.getClientRects().length) return
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      observer.disconnect()
    }
    const observer = new MutationObserver(focusHeading)
    observer.observe(main, { childList: true, subtree: true })
    const frame = requestAnimationFrame(focusHeading)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [destination])

  return (
    <div className={mergeClasses('flex flex-col', s.root)}>
      <a href="#main" className={mergeClasses('sr-only-focusable fixed top-2 left-2 z-[200] px-3 py-2', s.skipLink)}>
        Skip to content
      </a>
      {mode !== 'live' && <PrototypeBar />}
      <header className={s.header} style={ON_NAVY_VARS}>
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center gap-6">
          <span className={searching ? 'hidden md:flex' : 'flex'}>
            <Logo />
          </span>
          <nav aria-label="Primary" className={searching ? 'hidden' : 'hidden lg:flex self-stretch gap-1 flex-1'}>
            {groups.map(g => (
              <NavMenu key={g.id} group={g} />
            ))}
          </nav>
          <GlobalSearch active={searching} onActiveChange={setSearching} />
          <div className={mergeClasses('items-center gap-3', searching ? 'hidden md:flex' : 'flex')}>
            <AuthButton />
            <Button
              appearance="transparent"
              className={mergeClasses(s.onNavy, 'lg:hidden!')}
              icon={<Navigation24Regular />}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            />
          </div>
        </div>
      </header>
      <MobileNav groups={groups} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <PageNotice onDismissed={() => mainRef.current?.focus({ preventScroll: true })} />
        {/* Remounts the route subtree per path so each navigation gets a fresh Suspense boundary and transition. */}
        <div key={location.pathname}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}

/** Standard page container width used by every route. */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`max-w-[1440px] mx-auto px-6 py-8 ${className}`}>{children}</div>
}
