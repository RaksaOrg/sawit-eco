import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';

const t = foundationTokens;

export function AppProgress({ progress, label }: { progress: number; label?: string }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.caption}>{label}</Text> : null}
      <ProgressBar
        progress={Math.min(1, Math.max(0, progress))}
        color={semanticTokens.color.brand}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: t.spacing.sm,
  },
  caption: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.caption.size,
  },
});
