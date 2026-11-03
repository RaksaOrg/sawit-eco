import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';

const t = foundationTokens;

export function AppHeader({
  title,
  subtitle,
  onBack,
  right,
  center = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={onBack}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={semanticTokens.color.textPrimary} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, alignItems: center ? 'center' : 'flex-start' }}>
        <Text style={[styles.headerTitle, center && styles.textCenter]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, center && styles.textCenter]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  textCenter: {
    textAlign: 'center',
  },
  headerTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.headline.size,
    fontWeight: t.typography.headline.weight,
  },
  headerSubtitle: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.labelSmall.size,
  },
});
