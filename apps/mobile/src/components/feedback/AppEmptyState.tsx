import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { AppButton } from '../ui/AppButton';

const t = foundationTokens;

export function AppEmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon = 'file-tray-outline',
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.stateBox}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={semanticTokens.color.brand} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          variant="secondary"
          icon="refresh"
          onPress={onAction}
          height={38}
          radius={foundationTokens.radius.full}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: t.spacing['2xl'],
    paddingHorizontal: t.spacing.lg,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: t.radius.full,
    backgroundColor: semanticTokens.badge.info.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.md,
  },
  stateTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.title.size,
    fontWeight: t.typography.title.weight,
    textAlign: 'center',
  },
  stateSubtitle: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.bodyMedium.size,
    textAlign: 'center',
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.md,
    maxWidth: 280,
    lineHeight: t.typography.bodyMedium.lineHeight,
  },
});
