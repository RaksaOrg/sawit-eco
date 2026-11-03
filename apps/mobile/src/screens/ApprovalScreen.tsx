import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  AppApprovalCard,
  AppEmptyState,
  AppHeader,
  AppLoadingState,
  AppScreen,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { usePendingOrders, MobileOrder } from '../core/api/hooks';
import { apiRequest } from '../core/api/client';

export function ApprovalScreen() {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const t = createTranslator(language);
  const { data: orders, isLoading, refetch } = usePendingOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const decide = async (order: MobileOrder, decision: 'APPROVED' | 'REJECTED') => {
    if (!session) return;
    setBusyId(order.id);
    setNotice(null);
    try {
      await apiRequest('/api/commerce/orders', {
        method: 'POST',
        body: JSON.stringify({
          action: 'decide',
          orderId: order.id,
          approverId: session.userId,
          decision,
        }),
      });
      setNotice(t('approval.success'));
      await refetch();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('approval.title')} subtitle={session?.tenantName} />
      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
      {isLoading ? (
        <AppLoadingState label={t('common.loading')} />
      ) : !orders || orders.length === 0 ? (
        <AppEmptyState
          title={t('approval.empty')}
          subtitle={t('approval.empty_sub')}
          actionLabel={t('common.retry')}
          onAction={refetch}
        />
      ) : (
        orders.map((order: MobileOrder) => (
          <AppApprovalCard
            key={order.id}
            orderNo={`SO-${order.id.slice(0, 8).toUpperCase()}`}
            total={`Rp ${order.totalHarga.toLocaleString('id-ID')}`}
            block={`${t('attendance.blockLabel')} ${order.items[0]?.blokKode || '-'} · ${order.items[0]?.alasanRekomendasi || t('approval.orderTitle')}`}
            approveLabel={t('approval.approve')}
            rejectLabel={t('approval.reject')}
            busy={busyId === order.id}
            onApprove={() => decide(order, 'APPROVED')}
            onReject={() => decide(order, 'REJECTED')}
          />
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    padding: foundationTokens.spacing.sm,
    borderRadius: foundationTokens.radius.sm,
    backgroundColor: semanticTokens.color.success,
    marginBottom: foundationTokens.spacing.md,
  },
  noticeText: {
    color: semanticTokens.color.surface,
    fontSize: foundationTokens.typography.labelSmall.size,
  },
});
