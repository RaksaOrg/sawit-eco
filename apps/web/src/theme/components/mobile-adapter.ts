import { mobileTokens } from '../semantic/tokens';

/** RN Paper Fiori-inspired adapter. ponytail: map token ke MD3-style theme, upgrade path pakai PaperProvider theme saat app mobile nyata dibuat. */
export const mobilePaperTheme = {
  colors: {
    primary: mobileTokens.primary,
    secondary: mobileTokens.accent,
    background: mobileTokens.background,
    surface: mobileTokens.surface,
    onSurface: mobileTokens.textPrimary,
    onSurfaceVariant: mobileTokens.textSecondary,
    error: mobileTokens.error,
    outline: mobileTokens.divider,
  },
  roundness: mobileTokens.radius.md,
  spacing: mobileTokens.spacing,
} as const;

export type MobilePaperTheme = typeof mobilePaperTheme;
