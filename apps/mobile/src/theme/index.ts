import { MD3LightTheme } from 'react-native-paper';
import { foundationTokens } from './foundation/tokens';
import { semanticTokens } from './semantic/tokens';

export * from './tokens';

export const mobilePaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: semanticTokens.color.brand,
    secondary: semanticTokens.color.brandAccent,
    background: semanticTokens.color.background,
    surface: semanticTokens.color.surface,
    onSurface: semanticTokens.color.textPrimary,
    onSurfaceVariant: semanticTokens.color.textSecondary,
    error: semanticTokens.color.error,
    outline: semanticTokens.color.border,
  },
  roundness: foundationTokens.radius.md,
} as const;

export type MobilePaperTheme = typeof mobilePaperTheme;
