jest.mock('react-native-paper', () => ({
  MD3LightTheme: {
    dark: false,
    colors: {
      primary: '#000',
      background: '#fff',
      surface: '#fff',
      onSurface: '#000',
      onSurfaceVariant: '#444',
      error: '#f00',
      outline: '#ccc',
    },
  },
}));

import { mobilePaperTheme } from '../../src/theme';
import { foundationTokens } from '../../src/theme/foundation/tokens';
import { semanticTokens } from '../../src/theme/semantic/tokens';

describe('mobile paper theme mapping', () => {
  it('maps semantic tokens into paper theme', () => {
    expect(mobilePaperTheme.colors.primary).toBe(semanticTokens.color.brand);
    expect(mobilePaperTheme.colors.secondary).toBe(semanticTokens.color.brandAccent);
    expect(mobilePaperTheme.colors.background).toBe(semanticTokens.color.background);
    expect(mobilePaperTheme.colors.surface).toBe(semanticTokens.color.surface);
    expect(mobilePaperTheme.colors.onSurface).toBe(semanticTokens.color.textPrimary);
    expect(mobilePaperTheme.colors.onSurfaceVariant).toBe(
      semanticTokens.color.textSecondary,
    );
    expect(mobilePaperTheme.colors.error).toBe(semanticTokens.color.error);
    expect(mobilePaperTheme.colors.outline).toBe(semanticTokens.color.border);
    expect(mobilePaperTheme.roundness).toBe(foundationTokens.radius.md);
  });
});
