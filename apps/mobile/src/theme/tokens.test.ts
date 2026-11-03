import { foundationTokens, semanticTokens, componentTokens } from './tokens';

describe('mobile Fiori-inspired tokens', () => {
  it('uses 44px touch target and 8pt grid', () => {
    expect(foundationTokens.touchTarget.min).toBe(44);
    expect(foundationTokens.spacing.md).toBe(16);
    expect(foundationTokens.radius.md).toBe(8);
  });

  it('maps semantic status and risk tokens', () => {
    expect(semanticTokens.risk.TINGGI).toBe('error');
    expect(semanticTokens.attendance.PRESENT).toBe('success');
    expect(semanticTokens.sync.PENDING).toBe('warning');
  });

  it('defines component tokens from foundation scale', () => {
    expect(componentTokens.button.minHeight).toBe(foundationTokens.touchTarget.min);
    expect(componentTokens.scanner.size).toBe(280);
    expect(componentTokens.listItem.minHeight).toBe(56);
  });
});
