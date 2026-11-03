'use client';

import React from 'react';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Button,
  Card,
  Dialog,
  FilterBar,
  FilterGroupItem,
  Input,
  Label,
  MessageStrip,
  Option,
  Select,
  Title,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';

export interface EmployeeRow {
  id: string;
  name: string;
  whatsappNumber: string;
  role: string;
  team: string;
}

export default function EmployeesList({
  tenantNama,
  employees,
}: {
  tenantNama: string;
  employees: EmployeeRow[];
}) {
  const { t } = useTranslation(['hris', 'common']);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [role, setRole] = React.useState('ALL');
  const [toastMessage, setToastMessage] = React.useState<{
    text: string;
    design: 'Positive' | 'Negative';
  } | null>(null);

  // Add Employee Dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [nama, setNama] = React.useState('');
  const [waNumber, setWaNumber] = React.useState('');
  const [employeeRole, setEmployeeRole] = React.useState('MANDOR');
  const [teamName, setTeamName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleCreateEmployee = async () => {
    if (!nama.trim() || !waNumber.trim()) {
      setToastMessage({ text: t('common:message.required_fields'), design: 'Negative' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/hris/employees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          waNumber: waNumber.trim(),
          role: employeeRole,
          teamName: teamName.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || t('hris:employees.add_error'));
      }

      setToastMessage({
        text: String(t('hris:employees.add_success')),
        design: 'Positive' as const,
      });
      setDialogOpen(false);
      setNama('');
      setWaNumber('');
      setTeamName('');
      router.refresh();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : t('hris:employees.add_error'),
        design: 'Negative',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = employees.filter((e) => {
    const matchesQuery =
      !query ||
      [e.name, e.whatsappNumber, e.team].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (role === 'ALL' || e.role === role);
  });

  const columns = [
    { Header: t('hris:employees.column_name'), accessor: 'name' },
    { Header: t('hris:employees.column_wa'), accessor: 'whatsappNumber' },
    { Header: t('hris:employees.column_role'), accessor: 'role' },
    { Header: t('hris:employees.column_team'), accessor: 'team' },
  ];

  return (
    <FioriPage
      title={t('hris:employees.page_title')}
      subtitle={t('hris:employees.subtitle', { tenant: tenantNama, total: employees.length })}
      breadcrumb={t('hris:employees.breadcrumb')}
      actions={
        <Button design="Emphasized" icon={fioriIcons['add']} onClick={() => setDialogOpen(true)}>
          {t('hris:employees.add_employee')}
        </Button>
      }
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('hris:employees.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setRole('ALL');
          }}
          search={
            <Input
              placeholder={t('hris:employees.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="role" label={t('hris:employees.column_role')}>
            <Select onChange={(e) => setRole(e.detail.selectedOption.value || 'ALL')}>
              <Option value="ALL">{t('common:filter.all')}</Option>
              <Option value="OWNER">{t('hris:employees.role_owner')}</Option>
              <Option value="MANAGER">{t('hris:employees.role_manager')}</Option>
              <Option value="AGRONOM">{t('hris:employees.role_agronom')}</Option>
              <Option value="ADMIN_COMMERCE">{t('hris:employees.role_admin_commerce')}</Option>
              <Option value="MANDOR">{t('hris:employees.role_mandor')}</Option>
              <Option value="PEKERJA">{t('hris:employees.role_pekerja')}</Option>
            </Select>
          </FilterGroupItem>
        </FilterBar>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {toastMessage && (
          <MessageStrip design={toastMessage.design} onClose={() => setToastMessage(null)}>
            {toastMessage.text}
          </MessageStrip>
        )}

        <Card>
          <div style={{ padding: '1rem' }}>
            {employees.length === 0 ? (
              <FioriEmptyState
                titleText={String(t('hris:employees.empty_title'))}
                subtitleText={String(t('hris:employees.empty_subtitle'))}
                actionText={String(t('hris:employees.add_employee'))}
                onAction={() => setDialogOpen(true)}
              />
            ) : (
              <AnalyticalTable
                columns={columns}
                data={filtered}
                filterable
                sortable
                visibleRows={10}
                accessibleName={t('hris:employees.table_accessible_name')}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Dialog Tambah Karyawan */}
      <Dialog
        open={dialogOpen}
        headerText={t('hris:employees.add_employee')}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              width: '100%',
              padding: '0.5rem',
            }}
          >
            <Button design="Transparent" onClick={() => setDialogOpen(false)}>
              {t('common:action.cancel')}
            </Button>
            <Button
              design="Emphasized"
              loading={submitting}
              disabled={submitting}
              onClick={handleCreateEmployee}
            >
              {t('common:action.save')}
            </Button>
          </div>
        }
      >
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minWidth: '400px',
            maxWidth: '520px',
          }}
        >
          <div>
            <Label required>{t('hris:employees.column_name')}</Label>
            <Input
              value={nama}
              style={{ width: '100%' }}
              placeholder="Contoh: Budi Santoso"
              onInput={(e) => setNama(e.target.value)}
            />
          </div>

          <div>
            <Label required>{t('hris:employees.column_wa')}</Label>
            <Input
              value={waNumber}
              style={{ width: '100%' }}
              placeholder="Contoh: 08123456789 atau 628123456789"
              onInput={(e) => setWaNumber(e.target.value)}
            />
          </div>

          <div>
            <Label required>{t('hris:employees.column_role')}</Label>
            <Select
              style={{ width: '100%' }}
              onChange={(e) => setEmployeeRole(e.detail.selectedOption.value || 'MANDOR')}
            >
              <Option value="MANDOR" selected={employeeRole === 'MANDOR'}>
                {t('hris:employees.role_mandor')}
              </Option>
              <Option value="PEKERJA" selected={employeeRole === 'PEKERJA'}>
                {t('hris:employees.role_pekerja')}
              </Option>
              <Option value="AGRONOM" selected={employeeRole === 'AGRONOM'}>
                {t('hris:employees.role_agronom')}
              </Option>
              <Option value="ADMIN_COMMERCE" selected={employeeRole === 'ADMIN_COMMERCE'}>
                {t('hris:employees.role_admin_commerce')}
              </Option>
              <Option value="MANAGER" selected={employeeRole === 'MANAGER'}>
                {t('hris:employees.role_manager')}
              </Option>
              <Option value="OWNER" selected={employeeRole === 'OWNER'}>
                {t('hris:employees.role_owner')}
              </Option>
            </Select>
          </div>

          <div>
            <Label>{t('hris:employees.team_label')}</Label>
            <Input
              value={teamName}
              style={{ width: '100%' }}
              placeholder="Contoh: Tim Panen Blok A"
              onInput={(e) => setTeamName(e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </FioriPage>
  );
}
