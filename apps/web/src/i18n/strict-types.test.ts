import i18n, { handleMissingKey } from './config';

describe('Strict i18n Type Contract & Fallback Verification', () => {
  it('fails loudly when a translation key is missing', () => {
    expect(() => handleMissingKey('login.missing_probe')).toThrow(
      '[i18n] Missing translation key: login.missing_probe',
    );
    const t = i18n.t as (key: string) => string;
    expect(() => t('auth:login.missing_key_probe')).toThrow(
      '[i18n] Missing translation key: login.missing_key_probe',
    );
  });

  it('loads all namespaces without error', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.hasResourceBundle('id', 'auth')).toBe(true);
    expect(i18n.hasResourceBundle('en', 'auth')).toBe(true);
    expect(i18n.hasResourceBundle('id', 'common')).toBe(true);
    expect(i18n.hasResourceBundle('id', 'commerce')).toBe(true);
    expect(i18n.hasResourceBundle('id', 'hris')).toBe(true);
    expect(i18n.hasResourceBundle('id', 'dashboard')).toBe(true);
  });

  it('translates auth namespace keys strictly in both id and en', () => {
    i18n.changeLanguage('id');
    expect(i18n.t('auth:login.card_title')).toBe('Masuk');
    expect(i18n.t('auth:login.email_label')).toBe('Email');
    expect(i18n.t('auth:login.password_label')).toBe('Kata sandi');
    expect(i18n.t('auth:login.submit_button')).toBe('Masuk');
    expect(i18n.t('auth:login.log_on')).toBe('Log On');
    expect(i18n.t('auth:login.language_label')).toBe('Bahasa');
    expect(i18n.t('auth:login.user_placeholder')).toBe('Pengguna');
    expect(i18n.t('auth:login.demo_title')).toBe('Login Cepat Demo');

    i18n.changeLanguage('en');
    expect(i18n.t('auth:login.card_title')).toBe('Sign In');
    expect(i18n.t('auth:login.email_label')).toBe('Email');
    expect(i18n.t('auth:login.password_label')).toBe('Password');
    expect(i18n.t('auth:login.submit_button')).toBe('Sign In');
    expect(i18n.t('auth:login.log_on')).toBe('Log On');
    expect(i18n.t('auth:login.language_label')).toBe('Language');
    expect(i18n.t('auth:login.user_placeholder')).toBe('User');
    expect(i18n.t('auth:login.demo_title')).toBe('Quick Demo Login');
    i18n.changeLanguage('id');
  });

  it('translates common nav keys strictly in both id and en', () => {
    i18n.changeLanguage('id');
    expect(i18n.t('common:nav.dashboard')).toBe('Ringkasan Eksekutif');
    expect(i18n.t('common:nav.tasks')).toBe('Tugas Lapangan');
    expect(i18n.t('common:nav.logout')).toBe('Keluar');

    i18n.changeLanguage('en');
    expect(i18n.t('common:nav.dashboard')).toBe('Executive Summary');
    expect(i18n.t('common:nav.tasks')).toBe('Field Tasks');
    expect(i18n.t('common:nav.logout')).toBe('Sign Out');
    i18n.changeLanguage('id');
  });
});
