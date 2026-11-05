import { makeStyles, tokens } from '@fluentui/react-components'

/** Spaces the linked items in `ValidationSummary` so each link meets the 24px target-size rule (WCAG 2.5.8). */
export const useSummaryStyles = makeStyles({
  summary: {
    '& li + li': { marginTop: tokens.spacingVerticalS },
  },
})
