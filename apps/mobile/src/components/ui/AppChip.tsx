import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export function AppChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing['2xs'],
    borderRadius: c.button.radius,
    backgroundColor: semanticTokens.color.surfaceSubtle,
    borderWidth: 1,
    borderColor: semanticTokens.color.border,
  },
  caption: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.caption.size,
  },
});
