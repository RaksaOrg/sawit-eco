import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens, type BadgeVariant } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export function AppStatusBadge({
  text,
  variant = 'neutral',
}: {
  text: string;
  variant?: BadgeVariant;
}) {
  const spec = semanticTokens.badge[variant];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[styles.badge, { backgroundColor: spec.background }]}
    >
      <Text style={[styles.badgeText, { color: spec.color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: c.statusBadge.height,
    borderRadius: c.statusBadge.radius,
    paddingHorizontal: c.statusBadge.paddingHorizontal,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: c.statusBadge.fontSize,
    fontWeight: '500',
  },
});
