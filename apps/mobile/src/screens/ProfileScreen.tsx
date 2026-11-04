import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppButton,
  AppCard,
  AppKpiTile,
  AppListItem,
  AppScreen,
  AppSection,
  AppStatusBadge,
  AppSyncBanner,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { flushOutbox } from '../core/offline/actions';
import { hasPermission } from '../core/auth/rbac';

const tTokens = foundationTokens;

export function ProfileScreen({
  navigation,
}: {
  navigation?: { navigate: (screen: string) => void };
}) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const pendingCount = useMobileAppStore((s) => s.pendingSyncCount);
  const isSyncing = useMobileAppStore((s) => s.isSyncing);
  const logout = useMobileAppStore((s) => s.logout);
  const t = createTranslator(language);

  const canApprove = hasPermission(session?.role, 'commerce:approve');
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  const handleSync = async () => {
    await flushOutbox();
  };

  const fullName = session?.userName || t('common.empty');
  const companyName = session?.tenantName || '';
  const phone = session?.phone || '';
  const email = (session as any)?.email || '';

  return (
    <AppScreen showTopHeader>
      {/* Title Section */}
      <Text style={styles.mainTitle}>{t('profile.title')}</Text>

      {/* User Info Card */}
      <AppCard style={styles.card}>
        <View style={styles.infoRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={24} color={semanticTokens.color.textPrimary} />
          </View>

          <View style={styles.infoTextCol}>
            <Text style={styles.userName}>{fullName}</Text>
            {email ? <Text style={styles.userEmail}>{email}</Text> : null}
          </View>
        </View>

        {/* User Role Badge */}
        {session?.role ? (
          <View style={{ marginTop: tTokens.spacing.sm, alignSelf: 'flex-start' }}>
            <AppStatusBadge text={session.role} variant="pdp" />
          </View>
        ) : null}
      </AppCard>

      {/* User Details Card */}
      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.sectionInfo')}</Text>

        {companyName ? (
          <View style={styles.detailRow}>
            <Ionicons
              name="storefront-outline"
              size={18}
              color={semanticTokens.color.textSecondary}
            />
            <Text style={styles.detailText}>{companyName}</Text>
          </View>
        ) : null}

        {phone ? (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={18} color={semanticTokens.color.textSecondary} />
            <Text style={styles.detailText}>{phone}</Text>
          </View>
        ) : null}
      </AppCard>

      {/* KPI Tile */}
      <AppKpiTile label={t('profile.totalHk')} value="24,5" unit="HK" />

      {/* Sync Banner */}
      <AppSyncBanner
        pendingCount={pendingCount}
        syncing={isSyncing}
        message={
          isSyncing
            ? t('sync.syncing')
            : pendingCount === 0
              ? t('common.synced')
              : `${pendingCount} ${t('sync.pending')}`
        }
      />

      {/* Action List Items */}
      <AppListItem
        title={t('profile.syncTitle')}
        description={t('profile.syncDescription')}
        status={
          <AppStatusBadge
            text={pendingCount === 0 ? t('common.synced') : t('profile.pending')}
            variant={pendingCount === 0 ? 'success' : 'warning'}
          />
        }
      />

      <AppListItem
        title={t('profile.pdpTitle')}
        description={t('profile.pdpDescription')}
        status={<AppStatusBadge text={t('profile.active')} variant="pdp" />}
      />

      {/* Actions Section */}
      <AppSection
        title={t('profile.sectionActions')}
        action={
          <Pressable onPress={() => navigation?.navigate('AccountManagement')} hitSlop={8}>
            <Text style={styles.sectionSubtitle}>{t('profile.sectionActionsDesc')}</Text>
          </Pressable>
        }
      >
        {/* Quick entry button to Kelola Akun */}
        <View style={styles.buttonRow}>
          <AppButton
            label={t('profile.sectionActionsDesc')}
            variant="secondary"
            icon="settings-outline"
            onPress={() => navigation?.navigate('AccountManagement')}
          />
        </View>

        {canApprove ? (
          <View style={styles.buttonRow}>
            <AppButton
              label={t('approval.title')}
              variant="secondary"
              icon="checkmark-done-outline"
              onPress={() => navigation?.navigate('Approvals')}
            />
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <AppButton
            label={t('profile.sync')}
            variant="primary"
            icon="sync-outline"
            onPress={handleSync}
            loading={isSyncing}
          />
        </View>

        <View style={styles.buttonRow}>
          <AppButton
            label={t('profile.logout')}
            variant="danger"
            loading={isLogoutLoading}
            onPress={() => {
              setIsLogoutLoading(true);
              setTimeout(() => {
                logout();
                setIsLogoutLoading(false);
              }, 500);
            }}
          />
        </View>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  mainTitle: {
    fontSize: tTokens.typography.display.size,
    fontWeight: tTokens.typography.display.weight,
    lineHeight: tTokens.typography.display.lineHeight,
    color: semanticTokens.color.textPrimary,
    marginBottom: tTokens.spacing.sm,
  },
  card: {
    marginBottom: tTokens.spacing.md,
    padding: tTokens.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: semanticTokens.badge.pdp.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    color: semanticTokens.color.textPrimary,
    lineHeight: tTokens.typography.title.lineHeight,
  },
  userEmail: {
    fontSize: tTokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    color: semanticTokens.color.textPrimary,
    marginBottom: tTokens.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: tTokens.spacing.xs,
    borderBottomWidth: tTokens.borderWidth.hairline,
    borderBottomColor: semanticTokens.color.border,
  },
  detailText: {
    fontSize: tTokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
  },
  sectionSubtitle: {
    fontSize: tTokens.typography.labelSmall.size,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
  buttonRow: {
    marginBottom: tTokens.spacing.sm,
  },
});
