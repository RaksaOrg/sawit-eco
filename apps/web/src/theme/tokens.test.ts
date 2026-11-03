import { foundationTokens } from './foundation/tokens';
import { webTokens, mobileTokens, semanticTokens } from './semantic/tokens';
import { mobilePaperTheme } from './components/mobile-adapter';

describe('Token compliance with locked UI-SPEC section 2', () => {
  it('foundation values match Token Table Final', () => {
    expect(foundationTokens.color.brand.primary).toBe('#0A6ED1');
    expect(foundationTokens.color.status.success).toBe('#30914C');
    expect(foundationTokens.color.status.error).toBe('#BB0000');
    expect(foundationTokens.spacing.md).toBe(16);
    expect(foundationTokens.radius.md).toBe(8);
  });

  it('web tokens map to Fiori CSS variables', () => {
    expect(webTokens.color.brand.primary).toBe('var(--sapBrandColor)');
    expect(webTokens.spacing.lg).toBe('1.5rem');
    expect(webTokens.radius.full).toBe('50%');
  });

  it('mobile tokens + adapter map to foundation', () => {
    expect(mobileTokens.primary).toBe('#0A6ED1');
    expect(mobileTokens.background).toBe('#F5F6F7');
    expect(semanticTokens.mobile).toBe(mobileTokens);
    expect(semanticTokens.web).toBe(webTokens);
    expect(mobilePaperTheme.colors.primary).toBe('#0A6ED1');
    expect(mobilePaperTheme.roundness).toBe(8);
    expect(mobilePaperTheme.spacing.md).toBe(16);
  });
});
