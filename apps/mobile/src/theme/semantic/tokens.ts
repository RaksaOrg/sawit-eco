import { foundationTokens } from '../foundation/tokens';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'pdp';

export const semanticTokens = {
  color: {
    brand: foundationTokens.color.brand.primary,
    brandAccent: foundationTokens.color.brand.secondary,
    background: foundationTokens.color.bg.base,
    surface: foundationTokens.color.surface.card,
    surfaceSubtle: foundationTokens.color.surface.subtle,
    textPrimary: foundationTokens.color.text.primary,
    textSecondary: foundationTokens.color.text.secondary,
    textDisabled: foundationTokens.color.text.disabled,
    border: foundationTokens.color.border.default,
    borderStrong: foundationTokens.color.border.strong,
    success: foundationTokens.color.status.success,
    warning: foundationTokens.color.status.warning,
    error: foundationTokens.color.status.error,
    info: foundationTokens.color.status.info,
    pdp: foundationTokens.color.pdp,
    syncPending: foundationTokens.color.sync.pending,
    syncSynced: foundationTokens.color.sync.synced,
    syncFailed: foundationTokens.color.sync.failed,
  },
  badge: {
    neutral: {
      color: foundationTokens.color.text.secondary,
      background: foundationTokens.color.surface.subtle,
    },
    info: { color: foundationTokens.color.status.info, background: '#E8F1FB' },
    success: { color: foundationTokens.color.status.success, background: '#E8F5EC' },
    warning: { color: foundationTokens.color.status.warning, background: '#FFF3E8' },
    error: { color: foundationTokens.color.status.error, background: '#FBEAEA' },
    pdp: { color: foundationTokens.color.pdp, background: '#EEEEFD' },
  },
  risk: {
    RENDAH: 'success',
    SEDANG: 'warning',
    TINGGI: 'error',
    KRITIS: 'error',
  },
  attendance: {
    PRESENT: 'success',
    HALF_DAY: 'warning',
    ABSENT: 'error',
    LEAVE: 'neutral',
  },
  order: {
    SUBMITTED: 'warning',
    APPROVED: 'info',
    PAID: 'success',
    REJECTED: 'error',
    DELIVERED: 'success',
    CANCELLED: 'error',
  },
  sync: {
    PENDING: 'warning',
    SYNCED: 'success',
    FAILED: 'error',
  },
} as const;

export type SemanticTokens = typeof semanticTokens;
