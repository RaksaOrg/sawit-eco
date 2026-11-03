export const foundationTokens = {
  color: {
    brand: {
      primary: '#04653E',
      secondary: '#E9730C',
    },
    bg: {
      base: '#F5F6F7',
    },
    surface: {
      card: '#FFFFFF',
      subtle: '#EAECEE',
    },
    text: {
      primary: '#1D2D3E',
      secondary: '#556B82',
      disabled: '#95A5A6',
    },
    status: {
      success: '#107E3E',
      warning: '#E9730C',
      error: '#BB0000',
      info: '#0A6ED1',
    },
    border: {
      default: '#D9D9D9',
      strong: '#89919A',
    },
    sync: {
      pending: '#F59E0B',
      synced: '#10B981',
      failed: '#EF4444',
    },
    pdp: '#6366F1',
  },
  spacing: {
    '2xs': 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  radius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 16,
    full: 999,
  },
  borderWidth: {
    hairline: 0.5,
    default: 1,
    focus: 2,
    heavy: 3,
  },
  typography: {
    display: { size: 28, weight: '700' as const, lineHeight: 34 },
    headline: { size: 22, weight: '600' as const, lineHeight: 28 },
    title: { size: 18, weight: '600' as const, lineHeight: 24 },
    bodyLarge: { size: 16, weight: '400' as const, lineHeight: 22 },
    bodyMedium: { size: 14, weight: '400' as const, lineHeight: 20 },
    labelLarge: { size: 14, weight: '600' as const, lineHeight: 18 },
    labelSmall: { size: 12, weight: '500' as const, lineHeight: 16 },
    caption: { size: 11, weight: '400' as const, lineHeight: 14 },
  },
  elevation: {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
  },
  touchTarget: {
    min: 44,
    comfortable: 48,
  },
} as const;

export type FoundationTokens = typeof foundationTokens;
