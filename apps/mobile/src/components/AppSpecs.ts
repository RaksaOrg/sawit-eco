import { foundationTokens } from '../theme/tokens';

export type AppBadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'pdp';

export interface AppBadgeSpec {
  text: string;
  variant: AppBadgeVariant;
  color: string;
  background: string;
  height: number;
  radius: number;
  accessibleRole: 'text';
}

export function createAppStatusBadgeSpec(
  text: string,
  variant: AppBadgeVariant = 'neutral',
): AppBadgeSpec {
  const colorMap: Record<AppBadgeVariant, string> = {
    neutral: foundationTokens.color.text.secondary,
    info: foundationTokens.color.brand.primary,
    success: foundationTokens.color.status.success,
    warning: foundationTokens.color.status.warning,
    error: foundationTokens.color.status.error,
    pdp: '#6366F1',
  };

  return {
    text,
    variant,
    color: colorMap[variant],
    background: foundationTokens.color.surface.card,
    height: 24,
    radius: foundationTokens.radius.full,
    accessibleRole: 'text',
  };
}

export interface AppButtonSpec {
  label: string;
  variant: 'Emphasized' | 'Default' | 'Transparent' | 'Negative';
  minHeight: number;
  accessibleRole: 'button';
}

export function createAppButtonSpec(
  label: string,
  variant: AppButtonSpec['variant'] = 'Default',
): AppButtonSpec {
  return {
    label,
    variant,
    minHeight: 44,
    accessibleRole: 'button',
  };
}

export interface AppSyncBannerSpec {
  pendingCount: number;
  synced: boolean;
  messageKey: string;
  variant: 'pending' | 'synced';
}

export function createAppSyncBannerSpec(pendingCount: number): AppSyncBannerSpec {
  return {
    pendingCount,
    synced: pendingCount === 0,
    messageKey: pendingCount === 0 ? 'common:offline.synced' : 'common:offline.queued',
    variant: pendingCount === 0 ? 'synced' : 'pending',
  };
}
