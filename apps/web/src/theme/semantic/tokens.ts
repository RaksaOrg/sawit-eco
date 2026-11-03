import { foundationTokens } from '../foundation/tokens';

export const webTokens = {
  color: {
    brand: { primary: 'var(--sapBrandColor)', secondary: 'var(--sapHighlightColor)' },
    bg: { base: 'var(--sapBackgroundColor)' },
    surface: { card: 'var(--sapTile_Background)' },
    text: { primary: 'var(--sapTextColor)', secondary: 'var(--sapContent_LabelColor)' },
    status: {
      success: 'var(--sapSuccessColor)',
      warning: 'var(--sapWarningColor)',
      error: 'var(--sapErrorColor)',
    },
    border: { default: 'var(--sapList_BorderColor)' },
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  radius: { sm: '0.25rem', md: '0.5rem', full: '50%' },
} as const;

export const mobileTokens = {
  primary: foundationTokens.color.brand.primary,
  accent: foundationTokens.color.brand.secondary,
  background: foundationTokens.color.bg.base,
  surface: foundationTokens.color.surface.card,
  textPrimary: foundationTokens.color.text.primary,
  textSecondary: foundationTokens.color.text.secondary,
  success: foundationTokens.color.status.success,
  warning: foundationTokens.color.status.warning,
  error: foundationTokens.color.status.error,
  divider: foundationTokens.color.border.default,
  spacing: foundationTokens.spacing,
  radius: foundationTokens.radius,
} as const;

export const semanticTokens = { web: webTokens, mobile: mobileTokens } as const;

export type SemanticTokens = typeof semanticTokens;
