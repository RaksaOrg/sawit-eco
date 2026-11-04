import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  AppButton,
  AppCard,
  AppKpiTile,
  AppScreen,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { queueThenTrySync } from '../core/offline/actions';
import { enqueueEvent } from '../core/offline/outbox';

const tTokens = foundationTokens;

const attendanceFormSchema = z.object({
  blockCode: z.string().min(1),
  workDate: z.string().min(1),
  workerCount: z.string().min(1),
  notes: z.string().optional(),
});

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

export function AttendanceScreen({
  navigation,
}: {
  navigation?: { navigate: (screen: string, params?: unknown) => void };
}) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const t = createTranslator(language);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      blockCode: 'B2',
      workDate: new Date().toISOString().slice(0, 10),
      workerCount: '6',
      notes: '',
    },
  });

  const onSubmit = async (values: AttendanceFormValues) => {
    if (!session?.userId) return;
    setBusy(true);
    setToast(null);

    const idempotencyKey = `att-${session.userId}-${values.blockCode}-${values.workDate}-${Date.now()}`;
    const payload = {
      userId: session.userId,
      blockCode: values.blockCode,
      workDate: values.workDate,
      status: 'PRESENT',
      source: 'MOBILE',
      idempotencyKey,
      notes: values.notes
        ? `${values.notes} (${values.workerCount} pekerja)`
        : `${values.workerCount} pekerja`,
    };

    try {
      const { syncedOk } = await queueThenTrySync(async () => {
        return enqueueEvent('ATTENDANCE', payload, idempotencyKey);
      });
      setToast({
        type: 'success',
        msg: syncedOk ? t('attendance.success') : t('attendance.queued'),
      });
      reset();
    } catch {
      setToast({ type: 'error', msg: t('attendance.error') });
    } finally {
      setBusy(false);
    }
  };

  const userName = session?.userName || 'Owner PT Sawit Lestari Jaya';
  const roleName = session?.role || 'OWNER';
  const userSubtitle = `${userName} (${roleName})`;

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
        <Text style={styles.mainTitle}>{t('attendance.title')}</Text>
        <Text style={styles.mainSubtitle} numberOfLines={1}>
          {userSubtitle}
        </Text>
      </View>

      {toast ? (
        <View
          style={[
            styles.toast,
            {
              backgroundColor:
                toast.type === 'success'
                  ? semanticTokens.badge.success.background
                  : semanticTokens.badge.error.background,
              borderColor:
                toast.type === 'success'
                  ? semanticTokens.color.success
                  : semanticTokens.color.error,
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={toast.type === 'success' ? semanticTokens.color.success : semanticTokens.color.error}
          />
          <Text
            style={[
              styles.toastText,
              {
                color:
                  toast.type === 'success'
                    ? semanticTokens.color.success
                    : semanticTokens.color.error,
              },
            ]}
          >
            {toast.msg}
          </Text>
        </View>
      ) : null}

      <AppKpiTile
        label={t('attendance.totalHk')}
        value="5,5"
        unit="HK"
        status={`• ${t('attendance.pendingVerification')}`}
        icon="time-outline"
      />

      <AppCard style={styles.formCard}>
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="grid-outline" size={16} color={semanticTokens.color.textSecondary} />
            <Text style={styles.fieldLabel}>{t('attendance.blockLabel')}</Text>
          </View>
          <Controller
            control={control}
            name="blockCode"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.inputBox, errors.blockCode ? styles.inputError : null]}>
                <TextInput
                  style={styles.textInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder="B2"
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
                <Ionicons name="chevron-down" size={16} color={semanticTokens.color.textSecondary} />
              </View>
            )}
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="people-outline" size={16} color={semanticTokens.color.textSecondary} />
            <Text style={styles.fieldLabel}>{t('attendance.workerCountLabel')}</Text>
          </View>
          <Controller
            control={control}
            name="workerCount"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.inputBox, errors.workerCount ? styles.inputError : null]}>
                <TextInput
                  style={styles.textInput}
                  value={String(value || '')}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="6"
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
                <Ionicons name="chevron-down" size={16} color={semanticTokens.color.textSecondary} />
              </View>
            )}
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="chatbubble-outline" size={16} color={semanticTokens.color.textSecondary} />
            <Text style={styles.fieldLabel}>{t('attendance.notes')}</Text>
          </View>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
              </View>
            )}
          />
        </View>

        <AppButton
          label={t('attendance.submit')}
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={busy}
          fullWidth
          height={48}
          radius={tTokens.radius.md}
          style={{ backgroundColor: semanticTokens.color.pdp, marginTop: tTokens.spacing.xs }}
        />
      </AppCard>

      <AppCard style={styles.teamCard}>
        <View style={styles.teamHeaderRow}>
          <View style={styles.teamIconCircle}>
            <Ionicons name="people-outline" size={20} color={semanticTokens.color.pdp} />
          </View>
          <View style={styles.teamTitleCol}>
            <Text style={styles.teamTitle}>{t('attendance.teamTitle')}</Text>
            <Text style={styles.teamSubtitle}>{t('attendance.teamDescription')}</Text>
          </View>
        </View>

        <View style={styles.teamList}>
          <View style={styles.workerRow}>
            <Text style={styles.workerName}>{t('attendance.worker_1')}</Text>
            <View style={styles.presentBadge}>
              <Ionicons name="checkmark" size={12} color={semanticTokens.color.success} />
              <Text style={styles.presentBadgeText}>{t('attendance.present')}</Text>
            </View>
          </View>

          <View style={[styles.workerRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.workerName}>{t('attendance.worker_2')}</Text>
            <View style={styles.presentBadge}>
              <Ionicons name="checkmark" size={12} color={semanticTokens.color.success} />
              <Text style={styles.presentBadgeText}>{t('attendance.present')}</Text>
            </View>
          </View>
        </View>
      </AppCard>
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
    marginBottom: tTokens.spacing.md,
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
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.xs,
    padding: tTokens.spacing.sm,
    borderRadius: tTokens.radius.sm,
    borderWidth: tTokens.borderWidth.hairline,
    marginBottom: tTokens.spacing.md,
  },
  toastText: {
    fontSize: tTokens.typography.labelSmall.size,
    fontWeight: '600',
  },
  formCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
  },
  fieldGroup: {
    marginBottom: tTokens.spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.xs,
    marginBottom: tTokens.spacing.xs,
  },
  fieldLabel: {
    fontSize: tTokens.typography.labelLarge.size,
    fontWeight: '600',
    color: semanticTokens.color.textPrimary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F7FB',
    borderRadius: tTokens.radius.md,
    paddingHorizontal: tTokens.spacing.md,
    minHeight: 48,
  },
  inputError: {
    borderWidth: 1,
    borderColor: semanticTokens.color.error,
  },
  textInput: {
    flex: 1,
    fontSize: tTokens.typography.bodyLarge.size,
    color: semanticTokens.color.textPrimary,
    paddingVertical: 0,
  },
  teamCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    marginTop: tTokens.spacing.xs,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tTokens.spacing.md,
  },
  teamIconCircle: {
    width: 40,
    height: 40,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.badge.pdp.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tTokens.spacing.sm,
  },
  teamTitleCol: {
    flex: 1,
  },
  teamTitle: {
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    color: semanticTokens.color.textPrimary,
  },
  teamSubtitle: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    marginTop: tTokens.spacing['2xs'],
  },
  teamList: {
    backgroundColor: semanticTokens.color.surface,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tTokens.spacing.sm,
    borderBottomWidth: tTokens.borderWidth.hairline,
    borderBottomColor: semanticTokens.color.border,
  },
  workerName: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '600',
    color: semanticTokens.color.textPrimary,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: semanticTokens.badge.success.background,
    paddingHorizontal: tTokens.spacing.sm,
    paddingVertical: tTokens.spacing['2xs'],
    borderRadius: tTokens.radius.xs,
  },
  presentBadgeText: {
    fontSize: tTokens.typography.caption.size,
    fontWeight: '700',
    color: semanticTokens.color.success,
  },
});
