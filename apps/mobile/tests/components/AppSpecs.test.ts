import { createAppButtonSpec, createAppStatusBadgeSpec, createAppSyncBannerSpec } from '../../src/components/AppSpecs';
import { foundationTokens } from '../../src/theme/tokens';

describe('mobile app specs', () => {
  it('creates status badge spec with semantic mapping', () => {
    const successBadge = createAppStatusBadgeSpec('Selesai', 'success');
    expect(successBadge.color).toBe(foundationTokens.color.status.success);
    expect(successBadge.height).toBe(24);
    expect(successBadge.radius).toBe(999);

    const defaultBadge = createAppStatusBadgeSpec('Draft');
    expect(defaultBadge.variant).toBe('neutral');
  });

  it('creates button spec with 44px min touch target', () => {
    const btn = createAppButtonSpec('Kirim', 'Emphasized');
    expect(btn.minHeight).toBe(44);
    expect(btn.accessibleRole).toBe('button');

    const defaultBtn = createAppButtonSpec('Batal');
    expect(defaultBtn.variant).toBe('Default');
  });

  it('creates sync banner spec based on pending outbox items', () => {
    const pending = createAppSyncBannerSpec(3);
    expect(pending.synced).toBe(false);
    expect(pending.variant).toBe('pending');

    const synced = createAppSyncBannerSpec(0);
    expect(synced.synced).toBe(true);
    expect(synced.variant).toBe('synced');
  });
});
