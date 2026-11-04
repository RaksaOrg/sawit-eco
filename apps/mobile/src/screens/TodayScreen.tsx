import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppKpiTile,
  AppListItem,
  AppLoadingState,
  AppScreen,
  AppSection,
  AppStatusBadge,
  AppSyncBanner,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { useTasks, MobileTask } from '../core/api/hooks';
import { queueThenTrySync } from '../core/offline/actions';
import { enqueueEvent } from '../core/offline/outbox';

const tTokens = foundationTokens;

export function TodayScreen({
  navigation,
}: {
  navigation?: { navigate: (screen: string, params?: unknown) => void };
}) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const pendingCount = useMobileAppStore((s) => s.pendingSyncCount);
  const isSyncing = useMobileAppStore((s) => s.isSyncing);
  const t = createTranslator(language);

  const { data: tasks, isLoading, refetch } = useTasks();

  const handleQuickCheckin = async () => {
    if (!session?.userId) return;
    const idempotencyKey = `att-${session.userId}-TODAY-${Date.now()}`;
    await queueThenTrySync(async () => {
      return enqueueEvent(
        'ATTENDANCE',
        {
          userId: session.userId,
          blockCode: 'A1',
          workDate: new Date().toISOString().slice(0, 10),
          status: 'PRESENT',
          source: 'MOBILE',
          idempotencyKey,
        },
        idempotencyKey,
      );
    });
  };

  const userRole = session?.role || 'Owner';
  const tenantName = session?.tenantName || 'PT Sawit Lestari Jaya';
  const roleDisplay = `${userRole} ${tenantName} • ${tenantName}`;

  return (
    <AppScreen>
      <View style={styles.topHeader}>
        <View style={styles.brandGroup}>
          <Image
            source={require('../../assets/brand-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.brandTextCol}>
            <Text style={styles.brandSawit}>{t('login.brand1')}</Text>
            <Text style={styles.brandEco}>{t('login.brand2')}</Text>
          </View>
        </View>

        <Pressable style={styles.dropdownSelector}>
          <Text style={styles.dropdownText}>{t('tab.today')}</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={semanticTokens.color.textPrimary}
          />
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable style={styles.bellButton} hitSlop={8}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={semanticTokens.color.brand}
            />
          </Pressable>
          <Pressable
            style={styles.avatarButton}
            hitSlop={8}
            onPress={() => navigation?.navigate('Profile')}
          >
            <Ionicons
              name="person"
              size={17}
              color={semanticTokens.color.surface}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>{t('today.title')}</Text>
        <Text style={styles.mainSubtitle} numberOfLines={1}>
          {roleDisplay}
        </Text>
      </View>

      <AppSyncBanner
        pendingCount={pendingCount}
        syncing={isSyncing}
        variant="pill"
        message={
          isSyncing
            ? t('sync.syncing')
            : pendingCount === 0
              ? t('common.synced')
              : `${pendingCount} ${t('today.offline')}`
        }
      />

      <AppKpiTile
        label={t('today.productivity')}
        value="215"
        unit="Kg/HK"
        status={`4 ${t('today.aboveTarget')}`}
      />

      <AppCard style={styles.actionCard}>
        <View style={styles.actionHeaderRow}>
          <View style={styles.actionIconWrapper}>
            <Ionicons
              name="finger-print"
              size={26}
              color={semanticTokens.color.pdp}
            />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitle}>{t('today.checkin')}</Text>
            <Text style={styles.actionSubtitle}>{t('today.checkin_desc')}</Text>
          </View>
        </View>

        <AppButton
          label={t('today.checkin')}
          variant="primary"
          icon="finger-print"
          onPress={handleQuickCheckin}
          fullWidth
          height={48}
          radius={tTokens.radius.md}
          style={{ backgroundColor: semanticTokens.color.pdp }}
        />
      </AppCard>

      <AppSection title={t('tasks.title')}>
        {isLoading ? (
          <AppLoadingState label={t('common.loading')} />
        ) : !tasks || tasks.length === 0 ? (
          <AppEmptyState
            title={t('today.empty')}
            subtitle={t('today.empty_sub')}
            actionLabel={t('common.retry')}
            icon="clipboard-outline"
            onAction={refetch}
          />
        ) : (
          tasks.map((task: MobileTask) => (
            <AppListItem
              key={task.id}
              title={`${task.kodeTugas} · ${t('attendance.blockLabel')} ${task.blokKode}`}
              description={`${task.aktivitas} (${t('tasks.target')}: ${task.targetKuantitas} ${task.satuanTarget})`}
              status={
                <AppStatusBadge
                  text={task.isOverdue ? t('tasks.overdue') : task.status}
                  variant={task.isOverdue ? 'error' : 'info'}
                />
              }
              icon="clipboard-outline"
              onPress={() => navigation?.navigate('TaskDetail', { task })}
            />
          ))
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tTokens.spacing.sm,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.xs,
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandSawit: {
    color: semanticTokens.color.brand,
    fontSize: tTokens.typography.labelLarge.size,
    lineHeight: tTokens.typography.labelLarge.lineHeight,
    fontWeight: '800',
  },
  brandEco: {
    color: semanticTokens.color.brand,
    fontSize: tTokens.typography.labelLarge.size,
    lineHeight: tTokens.typography.labelLarge.lineHeight,
    fontWeight: '800',
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing['2xs'],
    paddingVertical: tTokens.spacing['2xs'],
    paddingHorizontal: tTokens.spacing.sm,
    borderRadius: tTokens.radius.sm,
    backgroundColor: semanticTokens.color.surface,
    borderWidth: tTokens.borderWidth.hairline,
    borderColor: semanticTokens.color.border,
  },
  dropdownText: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.sm,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.badge.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.color.pdp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    marginTop: tTokens.spacing.xs,
    marginBottom: tTokens.spacing.sm,
  },
  mainTitle: {
    fontSize: tTokens.typography.display.size,
    fontWeight: tTokens.typography.display.weight,
    lineHeight: tTokens.typography.display.lineHeight,
    color: semanticTokens.color.textPrimary,
  },
  mainSubtitle: {
    fontSize: tTokens.typography.labelSmall.size,
    fontWeight: '500',
    color: semanticTokens.color.textSecondary,
    marginTop: tTokens.spacing['2xs'],
  },
  actionCard: {
    padding: tTokens.spacing.md,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tTokens.spacing.md,
  },
  actionIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.badge.pdp.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tTokens.spacing.sm,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    color: semanticTokens.color.textPrimary,
  },
  actionSubtitle: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    marginTop: tTokens.spacing['2xs'],
    lineHeight: tTokens.typography.caption.lineHeight,
  },
});
