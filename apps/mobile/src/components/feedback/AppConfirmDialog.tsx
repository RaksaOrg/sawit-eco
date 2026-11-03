import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { AppButton } from '../ui/AppButton';

const t = foundationTokens;

export function AppConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.body}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton label={cancelLabel} variant="ghost" onPress={onCancel} />
          <AppButton label={confirmLabel} variant="primary" onPress={onConfirm} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  body: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.bodyMedium.size,
    lineHeight: t.typography.bodyMedium.lineHeight,
    marginTop: t.spacing.xs,
  },
});
