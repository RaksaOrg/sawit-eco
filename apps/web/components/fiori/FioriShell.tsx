'use client';

import React from 'react';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Avatar, ShellBar, ShellBarItem } from '@ui5/webcomponents-react';

interface FioriShellProps {
  tenantName: string;
  tenantEmail: string;
  notificationCount: number;
  children: React.ReactNode;
}

function initials(name: string) {
  return name
    .replace(/^PT\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export default function FioriShell({
  tenantName,
  tenantEmail,
  notificationCount,
  children,
}: FioriShellProps) {
  const router = useRouter();
  const { t } = useTranslation(['common']);
  const pathname = usePathname() || '/dashboard';

  const spaces = [
    { text: t('common:nav.dashboard'), path: '/dashboard' },
    { text: t('common:nav.group_operations'), path: '/tasks' },
    { text: t('common:nav.attendance'), path: '/hris/attendance' },
    { text: t('common:nav.reports'), path: '/reports' },
    { text: t('common:nav.supervisors'), path: '/supervisors' },
    { text: t('common:nav.agronomy'), path: '/agronomy' },
    { text: t('common:nav.learning'), path: '/learning' },
    { text: t('common:nav.catalog'), path: '/commerce' },
    { text: t('common:nav.orders'), path: '/commerce/orders' },
    { text: t('common:nav.approvals'), path: '/commerce/approvals' },
  ];

  const activePath = [...spaces]
    .sort((a, b) => b.path.length - a.path.length)
    .find((s) => pathname === s.path || pathname.startsWith(`${s.path}/`))?.path;

  const go = (path: string) => router.push(path);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="fiori-shell">
      <header className="fiori-header-group">
        <ShellBar
          primaryTitle="Sawit Ecosystem"
          secondaryTitle={tenantName}
          showNotifications={notificationCount > 0}
          notificationsCount={String(notificationCount)}
          onNotificationsClick={() => go('/dashboard')}
          onLogoClick={() => go('/dashboard')}
          profile={
            <Avatar
              initials={initials(tenantName)}
              colorScheme="Accent6"
              accessibleName={tenantEmail || tenantName}
            />
          }
        >
          <ShellBarItem icon={fioriIcons.search} text={t('common:action.search')} />
          <ShellBarItem
            icon={fioriIcons.log}
            text={t('common:nav.logout')}
            onClick={handleLogout}
          />
        </ShellBar>

        <div className="fiori-anchor-bar">
          <nav className="fiori-anchor-tabs" aria-label={t('common:nav.main')}>
            {spaces.map((space) => (
              <button
                key={space.path}
                type="button"
                className={
                  space.path === activePath
                    ? 'fiori-anchor-tab fiori-anchor-tab--active'
                    : 'fiori-anchor-tab'
                }
                onClick={() => go(space.path)}
              >
                {space.text}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="fiori-body">
        <main className="fiori-content">{children}</main>
      </div>
    </div>
  );
}
