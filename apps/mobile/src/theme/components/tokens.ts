import { foundationTokens } from '../foundation/tokens';
import { semanticTokens } from '../semantic/tokens';

export const componentTokens = {
  screen: {
    padding: foundationTokens.spacing.md,
    background: semanticTokens.color.background,
  },
  header: {
    minHeight: 56,
    background: semanticTokens.color.surface,
    borderColor: semanticTokens.color.border,
  },
  card: {
    padding: foundationTokens.spacing.md,
    radius: foundationTokens.radius.md,
    background: semanticTokens.color.surface,
    borderColor: semanticTokens.color.border,
    elevation: foundationTokens.elevation.level1,
  },
  button: {
    minHeight: foundationTokens.touchTarget.min,
    heightSmall: 36,
    heightComfortable: 48,
    paddingHorizontal: foundationTokens.spacing.md,
    radius: foundationTokens.radius.md,
  },
  textField: {
    minHeight: foundationTokens.touchTarget.comfortable,
    paddingHorizontal: 12,
    radius: foundationTokens.radius.sm,
  },
  statusBadge: {
    height: 24,
    paddingHorizontal: foundationTokens.spacing.sm,
    radius: foundationTokens.radius.full,
    fontSize: foundationTokens.typography.labelSmall.size,
  },
  listItem: {
    minHeight: 56,
    multilineMinHeight: 72,
    paddingHorizontal: foundationTokens.spacing.md,
    borderColor: semanticTokens.color.border,
  },
  kpiTile: {
    padding: foundationTokens.spacing.md,
    radius: foundationTokens.radius.md,
    background: semanticTokens.color.surface,
    borderColor: semanticTokens.color.border,
  },
  syncBanner: {
    padding: foundationTokens.spacing.sm,
    radius: foundationTokens.radius.sm,
  },
  scanner: {
    size: 280,
    frameWidth: foundationTokens.borderWidth.heavy,
  },
  emptyState: {
    padding: foundationTokens.spacing['2xl'],
  },
} as const;

export type ComponentTokens = typeof componentTokens;
