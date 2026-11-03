import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export function AppCard({
  children,
  style,
  background,
  radius,
  padding,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  background?: string;
  radius?: number;
  padding?: number;
}) {
  return (
    <View
      style={[
        styles.card,
        background ? { backgroundColor: background } : null,
        radius !== undefined ? { borderRadius: radius } : null,
        padding !== undefined ? { padding } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.card.background,
    borderRadius: c.card.radius,
    padding: c.card.padding,
    borderWidth: t.borderWidth.hairline,
    borderColor: c.card.borderColor,
    marginBottom: t.spacing.md,
  },
});
