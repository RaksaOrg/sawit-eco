'use client';

import React from 'react';
import Image from 'next/image';
import logo from '@/public/logo.png';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, MessageStrip, Option, Select } from '@ui5/webcomponents-react';
import FioriBgWave from '@/components/fiori/FioriBgWave';

export interface TenantInfo {
  id: string;
  nama: string;
  email: string;
  lokasi: string | null;
}

export interface LoginFormProps {
  hasError: boolean;
  tenants: TenantInfo[];
}

export default function LoginForm({ hasError, tenants }: LoginFormProps) {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [demoLoadingId, setDemoLoadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState(hasError);
  const [demoFailed, setDemoFailed] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const emailInvalid = touched && !/^\S+@\S+\.\S+$/.test(email.trim());
  const passwordInvalid = touched && password.length === 0;
  const language = i18n.language.startsWith('en') ? 'en' : 'id';
  const busy = submitting || demoLoadingId !== null;

  const openDashboard = () => {
    router.push('/dashboard');
    router.refresh();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(false);
    setDemoFailed(false);
    if (emailInvalid || passwordInvalid || !email || !password) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);
      const res = await fetch('/api/auth/login', { method: 'POST', body: formData });
      if (res.ok) {
        openDashboard();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (tenant: TenantInfo) => {
    setError(false);
    setDemoFailed(false);
    setDemoLoadingId(tenant.id);
    try {
      const formData = new FormData();
      formData.set('email', tenant.email);
      formData.set('password', 'owner123');
      const res = await fetch('/api/auth/login', { method: 'POST', body: formData });
      if (res.ok) {
        openDashboard();
      } else {
        setDemoFailed(true);
      }
    } catch {
      setDemoFailed(true);
    } finally {
      setDemoLoadingId(null);
    }
  };

  return (
    <div className="auth-page">
      <FioriBgWave />
      <header className="auth-header">
        <Image src={logo} alt={t('auth:login.app_title')} className="auth-logo" />
      </header>

      <main className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {(error || demoFailed) && (
            <MessageStrip design="Negative" hideCloseButton>
              {demoFailed ? t('auth:login.demo_error') : t('auth:login.error_invalid')}
            </MessageStrip>
          )}

          <Input
            id="auth-email"
            type="Email"
            placeholder={t('auth:login.user_placeholder')}
            accessibleName={t('auth:login.email_label')}
            value={email}
            valueState={emailInvalid ? 'Negative' : 'None'}
            valueStateMessage={<span>{t('auth:login.email_invalid')}</span>}
            onInput={(e) => setEmail(e.target.value)}
          />

          <Input
            id="auth-password"
            type="Password"
            placeholder={t('auth:login.password_placeholder')}
            accessibleName={t('auth:login.password_label')}
            value={password}
            valueState={passwordInvalid ? 'Negative' : 'None'}
            valueStateMessage={<span>{t('auth:login.password_required')}</span>}
            onInput={(e) => setPassword(e.target.value)}
          />

          <Label for="auth-language">{t('auth:login.language_label')}</Label>
          <Select
            id="auth-language"
            value={language}
            onChange={(e) => i18n.changeLanguage(e.detail.selectedOption.value ?? 'id')}
          >
            <Option value="id">{t('auth:login.language_id')}</Option>
            <Option value="en">{t('auth:login.language_en')}</Option>
          </Select>

          <Button design="Emphasized" type="Submit" loading={submitting} disabled={busy}>
            {t('auth:login.log_on')}
          </Button>

          {tenants.length > 0 && (
            <div className="auth-demo">
              <div className="auth-demo-title">{t('auth:login.demo_title')}</div>
              {tenants.map((tenant) => (
                <Button
                  key={tenant.id}
                  design="Transparent"
                  icon={fioriIcons.building}
                  loading={demoLoadingId === tenant.id}
                  disabled={busy}
                  onClick={() => handleDemoLogin(tenant)}
                >
                  {tenant.nama}
                </Button>
              ))}
            </div>
          )}
        </form>
      </main>

      <footer className="auth-footer">
        {t('auth:login.copyright', {
          year: new Date().getFullYear(),
          app: t('auth:login.app_title'),
        })}
      </footer>
    </div>
  );
}
