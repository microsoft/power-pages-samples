import type { CSSProperties } from 'react'
import { createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components'

/*
 * Zava Partner Portal theme: calm, dependable, industrial-modern. A deep navy shell around a light,
 * spacious canvas; rich teal for actions and links, soft aqua for highlights on dark surfaces, and
 * restrained orange/sage reserved for urgency, status and success.
 */

/** Palette (source of truth for the theme tokens below). */
export const PALETTE = {
  navy: '#142D40',
  teal: '#006C70',
  aqua: '#8BD3D4',
  canvas: '#F4F7F9',
  surface: '#FFFFFF',
  slate: '#243B4D',
  slateMuted: '#526575',
  border: '#DFE7EC',
} as const

/** Teal brand ramp anchored on #006C70 (brand 80 = primary) and rising to soft aqua (brand 130). */
export const contosoBrand: BrandVariants = {
  10: '#001011',
  20: '#001D1F',
  30: '#002A2C',
  40: '#00373A',
  50: '#004447',
  60: '#005155',
  70: '#005E62',
  80: '#006C70',
  90: '#1F8186',
  100: '#3A979B',
  110: '#56ADB0',
  120: '#70C1C3',
  130: '#8BD3D4',
  140: '#AEE1E2',
  150: '#CDEDED',
  160: '#E6F5F5',
}

/** Restrained orange (urgency / warning) and sage green (success), used only for status. */
const ORANGE = { fg: '#8A4A12', fg2: '#7A3F0C', fg3: '#A2561A', bg1: '#FCF2E8', bg2: '#F7E1CB', bg3: '#E3A062', border1: '#EFD0AE', border2: '#A2561A' }
const SAGE = { fg: '#3B6347', fg2: '#33573E', fg3: '#4A7356', inverted: '#A9CDB1', bg1: '#EEF4EF', bg2: '#DAE7DC', bg3: '#4E7A5B', border1: '#C3D7C7', border2: '#4E7A5B' }

/** Navy-tinted shadows, kept light: elevation reads from borders and spacing, not depth. */
const shadowTint = (alpha: number) => `rgba(20,45,64,${alpha})`

const baseTheme = createLightTheme(contosoBrand)

export const contosoTheme: Theme = {
  ...baseTheme,

  // Text: slate body, muted blue-gray secondary.
  colorNeutralForeground1: PALETTE.slate,
  colorNeutralForeground1Hover: PALETTE.slate,
  colorNeutralForeground1Pressed: PALETTE.slate,
  colorNeutralForeground1Selected: PALETTE.slate,
  colorNeutralForeground2: PALETTE.slateMuted,
  colorNeutralForeground2Hover: PALETTE.slate,
  colorNeutralForeground2Pressed: PALETTE.slate,
  colorNeutralForeground2Selected: PALETTE.slate,
  colorNeutralForeground3: '#576A7A',
  colorNeutralForeground3Hover: PALETTE.slateMuted,
  colorNeutralForeground3Pressed: PALETTE.slateMuted,
  colorNeutralForeground3Selected: PALETTE.slateMuted,
  colorNeutralForeground4: '#66798A',

  // Surfaces: white cards and headers on a cool off-white canvas.
  colorNeutralBackground1: PALETTE.surface,
  colorNeutralBackground1Hover: PALETTE.canvas,
  colorNeutralBackground1Pressed: '#E9EFF3',
  colorNeutralBackground1Selected: '#EDF2F5',
  colorNeutralBackground2: PALETTE.canvas,
  colorNeutralBackground2Hover: '#EDF2F5',
  colorNeutralBackground2Pressed: '#E2EAEF',
  colorNeutralBackground2Selected: '#E8EEF2',
  colorNeutralBackground3: '#EDF2F5',
  colorNeutralBackground3Hover: '#E6EDF1',
  colorNeutralBackground3Pressed: '#DCE5EB',
  colorNeutralBackground3Selected: '#E2EAEF',
  colorNeutralBackground4: '#E8EEF2',
  colorNeutralBackground5: '#E2EAEF',
  colorSubtleBackgroundHover: '#F0F4F7',
  colorSubtleBackgroundPressed: '#E6EDF1',
  colorSubtleBackgroundSelected: '#EBF0F4',
  colorNeutralStencil1: '#E6EDF1',
  colorNeutralStencil2: '#F2F6F8',

  // Borders: thin cool gray.
  colorNeutralStroke1: '#C8D3DB',
  colorNeutralStroke1Hover: '#B2C0CA',
  colorNeutralStroke1Pressed: '#9DAEBA',
  colorNeutralStroke1Selected: '#B2C0CA',
  colorNeutralStroke2: PALETTE.border,
  colorNeutralStroke3: '#EAF0F3',
  colorNeutralStrokeSubtle: '#E6EDF1',
  colorNeutralStrokeAccessible: '#5D6F7E',
  colorNeutralStrokeAccessibleHover: '#4B5D6C',
  colorNeutralStrokeAccessiblePressed: '#3D4F5E',

  // Keyboard focus: clear teal outline.
  colorStrokeFocus2: PALETTE.teal,

  // Restrained elevation. Cards use shadow4: a 1px cool-gray border ring plus a faint lift.
  shadow2: `0 1px 2px ${shadowTint(0.06)}`,
  shadow4: `0 0 0 1px ${PALETTE.border}, 0 1px 2px ${shadowTint(0.05)}`,
  shadow8: `0 0 0 1px ${PALETTE.border}, 0 2px 6px ${shadowTint(0.08)}`,
  shadow16: `0 0 0 1px ${PALETTE.border}, 0 4px 12px ${shadowTint(0.10)}`,
  shadow28: `0 0 0 1px ${PALETTE.border}, 0 8px 20px ${shadowTint(0.12)}`,
  shadow64: `0 0 0 1px ${PALETTE.border}, 0 16px 36px ${shadowTint(0.14)}`,

  // Subtle 150ms hover transitions (Fluent buttons, links and menu items use durationFaster).
  durationFaster: '150ms',

  // Informational status (e.g. "Delivered", "New"): steel blue in place of Fluent's bright blue.
  colorPaletteBlueBackground2: '#E8F0F6',
  colorPaletteBlueForeground2: '#2F5A78',
  colorPaletteBlueBorderActive: '#3F6E8C',

  // Status: sage green for success.
  colorPaletteGreenBackground1: SAGE.bg1,
  colorPaletteGreenBackground2: SAGE.bg2,
  colorPaletteGreenBackground3: SAGE.bg3,
  colorPaletteGreenForeground1: SAGE.fg,
  colorPaletteGreenForeground2: SAGE.fg2,
  colorPaletteGreenForeground3: SAGE.fg3,
  colorPaletteGreenBorder1: SAGE.border1,
  colorPaletteGreenBorder2: SAGE.border2,
  colorPaletteGreenBorderActive: SAGE.border2,
  colorStatusSuccessBackground1: SAGE.bg1,
  colorStatusSuccessBackground2: SAGE.bg2,
  colorStatusSuccessBackground3: SAGE.bg3,
  colorStatusSuccessForeground1: SAGE.fg,
  colorStatusSuccessForeground2: SAGE.fg2,
  colorStatusSuccessForeground3: SAGE.fg3,
  colorStatusSuccessForegroundInverted: SAGE.inverted,
  colorStatusSuccessBorder1: SAGE.border1,
  colorStatusSuccessBorder2: SAGE.border2,
  colorStatusSuccessBorderActive: SAGE.border2,

  // Status: restrained orange for urgency and warnings (Fluent's warning badges use the yellow palette).
  colorPaletteDarkOrangeBackground1: ORANGE.bg1,
  colorPaletteDarkOrangeBackground2: ORANGE.bg2,
  colorPaletteDarkOrangeBackground3: ORANGE.bg3,
  colorPaletteDarkOrangeForeground1: ORANGE.fg,
  colorPaletteDarkOrangeForeground2: ORANGE.fg2,
  colorPaletteDarkOrangeForeground3: ORANGE.fg3,
  colorPaletteDarkOrangeBorder1: ORANGE.border1,
  colorPaletteDarkOrangeBorder2: ORANGE.border2,
  colorPaletteDarkOrangeBorderActive: ORANGE.border2,
  colorPaletteYellowBackground1: ORANGE.bg1,
  colorPaletteYellowBackground2: ORANGE.bg2,
  colorPaletteYellowBackground3: ORANGE.bg3,
  colorPaletteYellowForeground1: ORANGE.fg,
  colorPaletteYellowForeground2: ORANGE.fg2,
  colorPaletteYellowForeground3: ORANGE.fg3,
  colorPaletteYellowBorder1: ORANGE.border1,
  colorPaletteYellowBorder2: ORANGE.border2,
  colorPaletteYellowBorderActive: ORANGE.border2,
  colorStatusWarningBackground1: ORANGE.bg1,
  colorStatusWarningBackground2: ORANGE.bg2,
  colorStatusWarningBackground3: ORANGE.bg3,
  colorStatusWarningForeground1: ORANGE.fg,
  colorStatusWarningForeground2: ORANGE.fg2,
  colorStatusWarningForeground3: ORANGE.fg3,
  colorStatusWarningBorder1: ORANGE.border1,
  colorStatusWarningBorder2: ORANGE.border2,
  colorStatusWarningBorderActive: ORANGE.border2,
}

/** Deep navy for the app shell (header/footer). */
export const SHELL_NAVY = PALETTE.navy
/** Lighter navy for raised surfaces on the shell. */
export const SHELL_NAVY_LIGHT = '#1C3A52'
/** Navy behind the marketing heroes (matches HeroBackdrop). */
export const HERO_NAVY = PALETTE.navy
/** Foreground on navy surfaces. */
export const ON_NAVY_FG = '#FFFFFF'
/** Default text on the shell (nav items, footer links). */
export const SHELL_TEXT = '#E7EEF2'
/** Secondary text on the shell (footer copy, role caption). */
export const SHELL_TEXT_MUTED = '#B9C8D2'
/** Soft aqua: selected-navigation indicator and highlights on dark surfaces. */
export const SHELL_ACCENT = PALETTE.aqua
/** Brand mark on the navy shell (logo tile) and the glyph drawn on it. */
export const SHELL_BRAND_MARK = PALETTE.aqua
export const SHELL_BRAND_MARK_FG = PALETTE.navy
/** Prototype-only notice strip (restrained orange). */
export const PROTOTYPE_BAR_BG = ORANGE.bg1
export const PROTOTYPE_BAR_FG = ORANGE.fg2
export const PROTOTYPE_BAR_FG_HOVER = '#5C2F09'
/** Warning badge foreground on the orange tint (6.2:1, WCAG AA). */
export const BADGE_WARNING_FG = ORANGE.fg

/** `#RRGGBB` → `rgba(r,g,b,alpha)`. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** Light focus ring for Fluent controls rendered on a navy surface (apply as `style`). */
export function onNavyFocusVars(navy: string): CSSProperties {
  return { '--colorStrokeFocus2': ON_NAVY_FG, '--colorStrokeFocus1': navy } as CSSProperties
}
