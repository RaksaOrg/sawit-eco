import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  AppButton,
  AppCard,
  AppScreen,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';

const tTokens = foundationTokens;

export function AccountManagementScreen({
  navigation,
}: {
  navigation?: { goBack: () => void; navigate: (screen: string) => void };
}) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const setSession = useMobileAppStore((s) => s.setSession);
  const t = createTranslator(language);

  // Validation schema with i18n messages
  const accountSchema = z.object({
    fullName: z.string().min(1, `${t('account.fullname')} ${t('common.required')}`),
    companyName: z.string().min(1, `${t('account.company')} ${t('common.required')}`),
    phone: z
      .string()
      .min(1, `${t('account.phone')} ${t('common.required')}`)
      .regex(/^\+?[0-9]{8,16}$/, t('account.invalid_phone')),
    email: z
      .string()
      .min(1, `${t('account.email')} ${t('common.required')}`)
      .email(t('account.invalid_email')),
  });
  type AccountFormValues = z.infer<typeof accountSchema>;

  const [accountNotification, setAccountNotification] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      fullName: session?.userName ?? '',
      companyName: session?.tenantName ?? '',
      phone: session?.phone ?? '',
      email: (session as any)?.email ?? '',
    },
  });

  const watchedFullName = watch('fullName');

  const onSubmit = async (values: AccountFormValues) => {
    if (session) {
      await setSession({
        ...session,
        userName: values.fullName.trim(),
        tenantName: values.companyName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
      } as any);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      navigation?.goBack();
    }, 600);
  };

  return (
    <AppScreen>
      {/* Top Header Bar */}
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

          <View style={styles.avatarButton}>
            <Ionicons
              name="person"
              size={17}
              color={semanticTokens.color.surface}
            />
          </View>
        </View>
      </View>

      <View style={styles.managementContainer}>
        {/* Header Title with Back Button */}
        <View style={styles.mgmtTitleRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={semanticTokens.color.textPrimary}
            />
          </Pressable>
          <Text style={styles.mgmtTitle}>{t('account.manage_title')}</Text>
        </View>
        <Text style={styles.mgmtSubtitle}>{t('account.manage_subtitle')}</Text>

        {/* Profile Summary Card */}
        <AppCard style={styles.profileSummaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryAvatarCircle}>
              <Ionicons
                name="person"
                size={30}
                color={semanticTokens.color.pdp}
              />
            </View>

            <View style={styles.summaryInfoCol}>
              <Text style={styles.summaryName}>
                {watchedFullName.trim() || t('common.empty')}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {session?.role || 'USER'}
                </Text>
              </View>
            </View>

            <Pressable style={styles.changePhotoButton} hitSlop={8}>
              <Text style={styles.changePhotoText}>{t('account.change_photo')}</Text>
            </Pressable>
          </View>
        </AppCard>

        {/* Section 1: Informasi Profil */}
        <Text style={styles.mgmtSectionHeader}>{t('account.section_profile')}</Text>
        <AppCard style={styles.mgmtCard}>
          {/* Field Nama lengkap */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Ionicons
                name="person-outline"
                size={15}
                color={semanticTokens.color.textSecondary}
              />
              <Text style={styles.fieldCaption}>{t('account.fullname')}</Text>
            </View>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.fieldInput, errors.fullName && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('account.fullname_placeholder')}
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
              )}
            />
            {errors.fullName?.message ? (
              <Text style={styles.fieldErrorText}>{errors.fullName.message}</Text>
            ) : null}
          </View>
          <View style={styles.fieldDivider} />

          {/* Field Nama perusahaan */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Ionicons
                name="business-outline"
                size={15}
                color={semanticTokens.color.textSecondary}
              />
              <Text style={styles.fieldCaption}>{t('account.company')}</Text>
            </View>
            <Controller
              control={control}
              name="companyName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.fieldInput, errors.companyName && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('account.company_placeholder')}
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
              )}
            />
            {errors.companyName?.message ? (
              <Text style={styles.fieldErrorText}>{errors.companyName.message}</Text>
            ) : null}
          </View>
          <View style={styles.fieldDivider} />

          {/* Field Nomor telepon */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Ionicons
                name="call-outline"
                size={15}
                color={semanticTokens.color.textSecondary}
              />
              <Text style={styles.fieldCaption}>{t('account.phone')}</Text>
            </View>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.fieldInput, errors.phone && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  placeholder={t('account.phone_placeholder')}
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
              )}
            />
            {errors.phone?.message ? (
              <Text style={styles.fieldErrorText}>{errors.phone.message}</Text>
            ) : null}
          </View>
          <View style={styles.fieldDivider} />

          {/* Field Email */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldLabelRow}>
              <Ionicons
                name="mail-outline"
                size={15}
                color={semanticTokens.color.textSecondary}
              />
              <Text style={styles.fieldCaption}>{t('account.email')}</Text>
            </View>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.fieldInput, errors.email && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder={t('account.email_placeholder')}
                  placeholderTextColor={semanticTokens.color.textDisabled}
                />
              )}
            />
            {errors.email?.message ? (
              <Text style={styles.fieldErrorText}>{errors.email.message}</Text>
            ) : null}
          </View>
        </AppCard>

        {/* Section 2: Keamanan Akun */}
        <Text style={styles.mgmtSectionHeader}>{t('account.section_security')}</Text>
        <AppCard style={styles.mgmtCard}>
          {/* Kata sandi row */}
          <View style={styles.securityRow}>
            <View style={styles.securityIconCircle}>
              <Ionicons
                name="key-outline"
                size={18}
                color={semanticTokens.color.pdp}
              />
            </View>
            <View style={styles.securityTextCol}>
              <Text style={styles.securityTitle}>{t('account.password')}</Text>
              <Text style={styles.securitySubtitle}>
                {t('account.password_last_updated')}
              </Text>
            </View>
            <Pressable hitSlop={8}>
              <Text style={styles.actionLinkText}>{t('account.change')}</Text>
            </Pressable>
          </View>
          <View style={styles.fieldDivider} />

          {/* Verifikasi dua langkah row */}
          <View style={styles.securityRow}>
            <View style={styles.securityIconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={semanticTokens.color.pdp}
              />
            </View>
            <View style={styles.securityTextCol}>
              <Text style={styles.securityTitle}>{t('account.two_factor')}</Text>
            </View>
            <View style={styles.unverifiedBadge}>
              <Text style={styles.unverifiedBadgeText}>
                {t('account.not_activated')}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Section 3: Preferensi & Privasi */}
        <Text style={styles.mgmtSectionHeader}>{t('account.section_preferences')}</Text>
        <AppCard style={styles.mgmtCard}>
          {/* Notifikasi akun */}
          <View style={styles.securityRow}>
            <View style={styles.securityIconCircle}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={semanticTokens.color.pdp}
              />
            </View>
            <View style={styles.securityTextCol}>
              <Text style={styles.securityTitle}>{t('account.notifications')}</Text>
            </View>
            <Switch
              value={accountNotification}
              onValueChange={setAccountNotification}
              trackColor={{
                false: semanticTokens.color.border,
                true: semanticTokens.color.pdp,
              }}
              thumbColor={semanticTokens.color.surface}
            />
          </View>
          <View style={styles.fieldDivider} />

          {/* Perlindungan data pribadi (PDP) */}
          <View style={styles.securityRow}>
            <View style={styles.securityIconCircle}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={semanticTokens.color.pdp}
              />
            </View>
            <View style={styles.securityTextCol}>
              <Text style={styles.securityTitle}>
                {t('account.pdp')}
              </Text>
            </View>
            <View style={styles.pdpActiveBadge}>
              <Text style={styles.pdpActiveBadgeText}>{t('account.active')}</Text>
            </View>
          </View>
        </AppCard>

        {/* Actions at bottom */}
        <AppButton
          label={saveSuccess ? t('account.saved_success') : t('account.save_changes')}
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          fullWidth
          height={48}
          radius={tTokens.radius.md}
          style={{ backgroundColor: semanticTokens.color.pdp, marginTop: tTokens.spacing.sm }}
        />

        <Pressable
          style={styles.cancelButton}
          onPress={() => navigation?.goBack()}
          hitSlop={8}
        >
          <Text style={styles.cancelButtonText}>{t('account.cancel')}</Text>
        </Pressable>
      </View>
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
  managementContainer: {
    paddingBottom: tTokens.spacing.xl,
  },
  mgmtTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.sm,
    marginTop: tTokens.spacing.xs,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: tTokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semanticTokens.color.surface,
  },
  mgmtTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
  },
  mgmtSubtitle: {
    fontSize: tTokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
    marginTop: 4,
    marginBottom: tTokens.spacing.md,
    lineHeight: 20,
  },
  profileSummaryCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    marginBottom: tTokens.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: semanticTokens.badge.pdp.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tTokens.spacing.md,
  },
  summaryInfoCol: {
    flex: 1,
  },
  summaryName: {
    fontSize: 16,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
  },
  roleBadge: {
    backgroundColor: semanticTokens.badge.pdp.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tTokens.radius.xs,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: semanticTokens.color.pdp,
  },
  changePhotoButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tTokens.radius.sm,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
  mgmtSectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
    marginTop: tTokens.spacing.sm,
    marginBottom: tTokens.spacing.xs,
  },
  mgmtCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    marginBottom: tTokens.spacing.sm,
  },
  fieldItem: {
    paddingVertical: tTokens.spacing.xs,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fieldCaption: {
    fontSize: 12,
    color: semanticTokens.color.textSecondary,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
    paddingVertical: 0,
  },
  inputError: {
    color: semanticTokens.color.error,
  },
  fieldErrorText: {
    fontSize: 11,
    color: semanticTokens.color.error,
    marginTop: 3,
  },
  fieldDivider: {
    height: tTokens.borderWidth.hairline,
    backgroundColor: semanticTokens.color.border,
    marginVertical: tTokens.spacing.xs,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tTokens.spacing.xs,
  },
  securityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semanticTokens.badge.pdp.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tTokens.spacing.sm,
  },
  securityTextCol: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },
  securitySubtitle: {
    fontSize: 12,
    color: semanticTokens.color.textSecondary,
    marginTop: 2,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
  unverifiedBadge: {
    backgroundColor: semanticTokens.badge.warning.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tTokens.radius.xs,
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: semanticTokens.color.warning,
  },
  pdpActiveBadge: {
    backgroundColor: semanticTokens.badge.pdp.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tTokens.radius.xs,
  },
  pdpActiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tTokens.spacing.md,
    marginTop: tTokens.spacing.xs,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
});
