'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Card,
  FilterBar,
  FilterGroupItem,
  Input,
  Option,
  Select,
  Title,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';

export interface Report {
  id: string;
  tanggal: string;
  blokKode: string;
  mandorNama: string;
  aktivitas: string;
  hadir: number;
  produksiKg: number;
  produktivitas: string;
}

export default function FioriReportTable({
  reports,
  tenantNama,
}: {
  reports: Report[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['hris', 'common']);
  const [query, setQuery] = React.useState('');
  const [aktivitas, setAktivitas] = React.useState('ALL');
  const aktivitasOptions = Array.from(new Set(reports.map((r) => r.aktivitas)));

  const filtered = reports.filter((r) => {
    const matchesQuery =
      !query ||
      [r.blokKode, r.mandorNama, r.aktivitas].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (aktivitas === 'ALL' || r.aktivitas === aktivitas);
  });

  const columns = [
    { Header: t('common:column.date'), accessor: 'tanggal' },
    { Header: t('common:column.block'), accessor: 'blokKode' },
    { Header: t('common:column.mandor'), accessor: 'mandorNama' },
    { Header: t('common:column.activity'), accessor: 'aktivitas' },
    { Header: t('hris:rekap.column_present_hk'), accessor: 'hadir' },
    {
      Header: t('common:column.production'),
      accessor: 'produksiKg',
      Cell: ({ cell }: { cell: { row: { original: Record<string, unknown> } } }) => {
        const r = cell.row.original as unknown as Report;
        return (
          <span>
            {t('hris:rekap.production_value', { value: r.produksiKg.toLocaleString('id-ID') })}
          </span>
        );
      },
    },
    { Header: t('hris:rekap.column_productivity'), accessor: 'produktivitas' },
  ];

  return (
    <FioriPage
      title={t('hris:rekap.page_title')}
      subtitle={t('hris:rekap.subtitle', { tenant: tenantNama, total: reports.length })}
      breadcrumb={t('hris:rekap.breadcrumb')}
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('hris:rekap.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setAktivitas('ALL');
          }}
          search={
            <Input
              placeholder={t('hris:rekap.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="aktivitas" label={t('hris:rekap.filter_activity_label')}>
            <Select
              value={aktivitas}
              onChange={(e) => setAktivitas(e.detail.selectedOption.value ?? 'ALL')}
            >
              <Option value="ALL">{t('common:filter.all_activity')}</Option>
              {aktivitasOptions.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Select>
          </FilterGroupItem>
        </FilterBar>
      }
    >
      <Card>
        <div style={{ padding: '1rem' }}>
          {reports.length === 0 ? (
            <FioriEmptyState
              titleText={t('hris:rekap.empty_title')}
              subtitleText={t('hris:rekap.empty_subtitle')}
            />
          ) : (
            <AnalyticalTable
              columns={columns}
              data={filtered}
              filterable
              sortable
              visibleRows={10}
              noDataText={t('hris:rekap.no_data')}
              accessibleName={t('hris:rekap.table_accessible_name')}
            />
          )}
        </div>
      </Card>
    </FioriPage>
  );
}
