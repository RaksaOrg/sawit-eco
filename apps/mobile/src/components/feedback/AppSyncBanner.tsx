import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';

const t = foundationTokens;

export function AppSyncBanner({
  pendingCount,
  message,
  syncing = false,
  variant = 'banner',
}: {
  pendingCount: number;
  message: string;
  syncing?: boolean;
  variant?: 'banner' | 'pill';
}) {
  const synced = pendingCount === 0 && !syncing;
  const iconName = syncing
    ? 'sync'
    : synced
      ? 'checkmark-circle'
      : 'cloud-offline-outline';

  if (variant === 'pill') {
    return (
      <View
        style={[
          styles.pill,
          {
            backgroundColor: synced
              ? semanticTokens.badge.success.background
              : semanticTokens.badge.warning.background,
            borderColor: synced
              ? semanticTokens.color.success
              : semanticTokens.color.warning,
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={message}
      >
        <Ionicons
          name={iconName}
          size={14}
          color={synced ? semanticTokens.color.success : semanticTokens.color.warning}
        />
        <Text
          style={[
            styles.pillText,
            { color: synced ? semanticTokens.color.success : semanticTokens.color.warning },
          ]}
        >
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: syncing
            ? semanticTokens.color.info
            : synced
              ? semanticTokens.color.syncSynced
              : semanticTokens.color.syncPending,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={message}
    >
      <Ionicons
        name={iconName}
        size={16}
        color={semanticTokens.color.surface}
      />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.sm,
    marginBottom: t.spacing.md,
  },
  bannerText: {
    color: semanticTokens.color.surface,
    fontSize: t.typography.bodyMedium.size,
    fontWeight: '500',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing['2xs'],
    borderRadius: t.radius.full,
    borderWidth: t.borderWidth.hairline,
    marginBottom: t.spacing.md,
  },
  pillText: {
    fontSize: t.typography.caption.size,
    fontWeight: '600',
  },
});
