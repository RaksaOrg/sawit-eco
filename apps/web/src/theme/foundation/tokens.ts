export const foundationTokens = {
  color: {
    brand: {
      primary: '#0A6ED1',
      secondary: '#E9730C',
    },
    bg: {
      base: '#F5F6F7',
    },
    surface: {
      card: '#FFFFFF',
    },
    text: {
      primary: '#1D2D3E',
      secondary: '#556B82',
    },
    status: {
      success: '#30914C',
      warning: '#E9730C',
      error: '#BB0000',
    },
    border: {
      default: '#D9D9D9',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
    full: 999,
  },
} as const;

export type FoundationTokens = typeof foundationTokens;
