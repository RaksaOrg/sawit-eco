import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { useFocusEffect } from '@react-navigation/native';
import { useTasks, MobileTask } from '../core/api/hooks';
import { apiRequest } from '../core/api/client';

const tTokens = foundationTokens;
type AttendancePunchStatus = { checkInAt: string | null; checkOutAt: string | null };

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
  const [attendance, setAttendance] = useState<AttendancePunchStatus>({
    checkInAt: null,
    checkOutAt: null,
  });
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(false);

  const { data: tasks, isLoading, refetch } = useTasks();

  const refreshAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const status = await apiRequest<AttendancePunchStatus>('/api/hris/attendance/self');
      setAttendance(status);
      setAttendanceError(false);
    } catch {
      setAttendanceError(true);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAttendance();
    }, [refreshAttendance]),
  );

  const attendanceAction = !attendance.checkInAt
    ? 'CHECK_IN'
    : !attendance.checkOutAt
      ? 'CHECK_OUT'
      : null;
  const attendanceLabel = attendanceLoading
    ? t('common.loading')
    : attendanceAction === 'CHECK_IN'
      ? t('today.checkin')
      : attendanceAction === 'CHECK_OUT'
        ? t('today.checkout')
        : t('today.attendance_complete');

  const userRole = session?.role || 'Owner';
  const tenantName = session?.tenantName || 'PT Sawit Lestari Jaya';
  const roleDisplay = `${userRole} ${tenantName} • ${tenantName}`;

  return (
    <AppScreen
      showTopHeader
      onTopHeaderAvatarPress={() => navigation?.navigate('Profile')}
      topHeaderCenter={
        <Pressable style={styles.dropdownSelector}>
          <Text style={styles.dropdownText}>{t('tab.today')}</Text>
          <Ionicons name="chevron-down" size={14} color={semanticTokens.color.textPrimary} />
        </Pressable>
      }
    >
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
            <Ionicons name="finger-print" size={26} color={semanticTokens.color.pdp} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitle}>{t('today.checkin')}</Text>
            <Text style={styles.actionSubtitle}>
              {attendanceAction === 'CHECK_OUT'
                ? t('today.checkout_desc')
                : attendanceAction === 'CHECK_IN'
                  ? t('today.checkin_desc')
                  : t('today.attendance_complete')}
            </Text>
          </View>
        </View>

        {attendanceError ? (
          <Text style={styles.attendanceError}>{t('today.attendance_error')}</Text>
        ) : null}
        <AppButton
          label={attendanceError ? t('common.retry') : attendanceLabel}
          variant="primary"
          icon="finger-print"
          onPress={() => {
            if (attendanceError) {
              void refreshAttendance();
            } else if (attendanceAction) {
              navigation?.navigate('SelfieVerification', {
                source: 'Today',
                attendanceAction,
              });
            }
          }}
          disabled={(!attendanceAction && !attendanceError) || attendanceLoading}
          loading={attendanceLoading}
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
  attendanceError: {
    color: semanticTokens.color.error,
    fontSize: tTokens.typography.labelSmall.size,
    marginBottom: tTokens.spacing.sm,
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
