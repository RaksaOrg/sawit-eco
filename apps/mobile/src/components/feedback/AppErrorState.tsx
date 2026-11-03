import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { AppButton } from '../ui/AppButton';

const t = foundationTokens;

export function AppErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <Ionicons name="alert-circle-outline" size={40} color={semanticTokens.color.error} />
      <Text style={[styles.stateTitle, { color: semanticTokens.color.error }]}>{message}</Text>
      {retryLabel && onRetry ? (
        <AppButton label={retryLabel} variant="secondary" onPress={onRetry} />
      ) : null}
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
  stateTitle: {
    fontSize: t.typography.title.size,
    fontWeight: t.typography.title.weight,
    textAlign: 'center',
  },
});
