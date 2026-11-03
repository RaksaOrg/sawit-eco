import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';

const t = foundationTokens;

export function AppLoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={semanticTokens.color.brand} />
      {label ? <Text style={styles.stateText}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.lg,
  },
  stateText: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.bodyMedium.size,
  },
});
