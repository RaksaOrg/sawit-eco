import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';

const t = foundationTokens;

export function AppSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: t.spacing.lg }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.spacing.sm,
  },
  sectionTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.title.size,
    fontWeight: t.typography.title.weight,
  },
});
