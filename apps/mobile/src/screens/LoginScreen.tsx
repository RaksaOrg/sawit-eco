import React, { useState } from 'react';
import {
  ActivityIndicator,
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

import { AppScreen } from '../components/AppComponents';
import { GoogleIcon, MicrosoftIcon } from '../components/icons';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { apiRequest } from '../core/api/client';
import { MobileSession } from '../core/auth/session';
import { semanticTokens } from '../theme/semantic/tokens';

type UserRole = 'OWNER' | 'MANDOR';

const DEMO_ACCOUNTS = {
  OWNER: {
    identifier: 'owner@sawitlestari.co.id',
    password: 'owner123',
  },
  MANDOR: {
    identifier: '6281200000001',
    password: 'mandor123',
  },
} as const;

export function LoginScreen() {
  const language = 'en';
  const setSession = useMobileAppStore((s) => s.setSession);
  const t = createTranslator(language);

  const loginSchema = z.object({
    identifier: z.string().min(1, t('common.required')),
    password: z.string().min(1, `${t('auth.password')} ${t('common.required')}`),
  });
  type LoginFormValues = z.infer<typeof loginSchema>;

  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    const role: UserRole = values.identifier.includes('@') ? 'OWNER' : 'MANDOR';
    try {
      const data = await apiRequest<MobileSession>('/api/auth/mobile-login', {
        method: 'POST',
        body: JSON.stringify({
          ...(role === 'OWNER'
            ? { email: values.identifier.trim() }
            : { waNumber: values.identifier.replace(/\D/g, '') }),
          password: values.password,
          role,
        }),
      });
      await setSession(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('auth.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    const account = DEMO_ACCOUNTS[role];
    setValue('identifier', account.identifier);
    setValue('password', account.password);
    await onSubmit(account);
  };

  return (
    <AppScreen
      style={styles.screen}
      backgroundSource={require('../../assets/farm-bg.png')}
    >
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/brand-logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View style={styles.brandTextCol}>
          <Text style={styles.brandSawit}>{t('login.brand1')}</Text>
          <Text style={styles.brandEco}>{t('login.brand2')}</Text>
        </View>
      </View>

      <Text style={styles.welcome}>{t('login.welcome')}</Text>
      <Text style={styles.welcomeSub}>{t('login.welcome_sub')}</Text>

      <View style={styles.formContainer}>
        <Controller
          control={control}
          name="identifier"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.inputBox, errors.identifier ? styles.inputBoxError : null]}>
              <Ionicons name="person-outline" size={20} color="#8D9CB5" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={value}
                onChangeText={onChange}
                placeholder={t('login.identifier_label')}
                placeholderTextColor="#8D9CB5"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          )}
        />
        {errors.identifier ? (
          <Text style={styles.fieldError}>{errors.identifier.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View
              style={[
                styles.inputBox,
                styles.inputBoxSpacing,
                errors.password ? styles.inputBoxError : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#8D9CB5"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={value}
                onChangeText={onChange}
                placeholder={t('login.password_label')}
                placeholderTextColor="#8D9CB5"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
                style={styles.eyeToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8D9CB5"
                />
              </Pressable>
            </View>
          )}
        />
        {errors.password ? (
          <Text style={styles.fieldError}>{errors.password.message}</Text>
        ) : null}

        <View style={styles.rowBetween}>
          <Pressable style={styles.rememberRow} onPress={() => setRemember((v) => !v)}>
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.rememberText}>{t('login.remember_me')}</Text>
          </Pressable>
          <Pressable hitSlop={8}>
            <Text style={styles.link}>{t('login.forgot_password')}</Text>
          </Pressable>
        </View>

        {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('login.sign_in')} →</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('login.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.socialButton}>
          <GoogleIcon size={20} />
          <Text style={styles.socialLabel}>{t('login.continue_google')}</Text>
        </Pressable>
        <Pressable style={styles.socialButton}>
          <MicrosoftIcon size={20} />
          <Text style={styles.socialLabel}>{t('login.continue_microsoft')}</Text>
        </Pressable>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>{t('login.demo_switch')}</Text>
          <View style={styles.demoRow}>
            <Pressable
              style={styles.demoChip}
              onPress={() => handleDemo('OWNER')}
              disabled={isSubmitting}
            >
              <Ionicons name="flash" size={13} color={semanticTokens.color.brand} />
              <Text style={styles.demoChipText}>Owner</Text>
            </Pressable>
            <Pressable
              style={styles.demoChip}
              onPress={() => handleDemo('MANDOR')}
              disabled={isSubmitting}
            >
              <Ionicons name="flash" size={13} color={semanticTokens.color.brand} />
              <Text style={styles.demoChipText}>Mandor</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {t('login.no_account')}{' '}
            <Text style={styles.footerLink}>{t('login.contact_admin')}</Text>
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 45,
  },
  brandLogo: {
    width: 88,
    height: 58,
  },
  brandTextCol: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandSawit: {
    color: semanticTokens.color.brand,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
  },
  brandEco: {
    color: semanticTokens.color.brand,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
  },
  welcome: {
    marginTop: 36,
    textAlign: 'center',
    color: '#00263D',
    fontSize: 26,
    fontWeight: '800',
  },
  welcomeSub: {
    marginTop: 8,
    textAlign: 'center',
    color: '#3E4E75',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  formContainer: {
    marginTop: 34,
  },
  inputBox: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EAF2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputBoxSpacing: {
    marginTop: 12,
  },
  inputBoxError: {
    borderColor: '#DC2626',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeToggle: {
    padding: 4,
    marginLeft: 6,
  },
  fieldError: {
    marginTop: 4,
    marginLeft: 4,
    color: '#DC2626',
    fontSize: 12,
  },
  rowBetween: {
    marginTop: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C7D2DE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: semanticTokens.color.brand,
    borderColor: semanticTokens.color.brand,
  },
  rememberText: {
    color: '#5E6E8A',
    fontSize: 13,
    fontWeight: '500',
  },
  link: {
    color: '#198052',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    marginBottom: 12,
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: semanticTokens.color.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1EAF4',
  },
  dividerText: {
    color: '#8D9CB5',
    fontSize: 12,
    fontWeight: '500',
  },
  socialButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EAF2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  socialLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  demoContainer: {
    marginTop: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 12,
    color: '#1E293B',
    marginBottom: 8,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E8F5EC',
    borderWidth: 1,
    borderColor: '#C2E7CD',
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: semanticTokens.color.brand,
  },
  footerContainer: {
    marginTop: 8,
    marginBottom: 40,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignSelf: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '500',
  },
  footerLink: {
    color: semanticTokens.color.brand,
    fontWeight: '800',
  },
});
