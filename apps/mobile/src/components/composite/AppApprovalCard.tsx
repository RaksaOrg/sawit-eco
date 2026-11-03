import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { AppCard } from '../layout/AppCard';
import { AppButton } from '../ui/AppButton';

const t = foundationTokens;

export function AppApprovalCard({
  orderNo,
  total,
  block,
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
  busy,
}: {
  orderNo: string;
  total: string;
  block: string;
  approveLabel: string;
  rejectLabel: string;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}) {
  return (
    <AppCard>
      <Text style={styles.title}>{orderNo}</Text>
      <Text style={styles.body}>{block}</Text>
      <Text style={styles.display}>{total}</Text>
      <View style={styles.row}>
        <AppButton
          label={rejectLabel}
          variant="danger"
          onPress={onReject}
          disabled={busy}
          style={{ flex: 1 }}
        />
        <AppButton
          label={approveLabel}
          variant="primary"
          onPress={onApprove}
          loading={busy}
          style={{ flex: 1 }}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.title.size,
    fontWeight: t.typography.title.weight,
  },
  body: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.bodyMedium.size,
    marginTop: t.spacing.xs,
  },
  display: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.display.size,
    fontWeight: t.typography.display.weight,
    marginVertical: t.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
  },
});
