'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Card,
  FilterBar,
  FilterGroupItem,
  Input,
  ObjectStatus,
  Title,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';
import type { FioriState } from '@/lib/fiori-status';

export interface Item {
  mandorNama: string;
  jumlahLaporan: number;
  totalHadir: number;
  totalProduksi: string;
  avgKgHK: string;
  avgKgHKValue: number;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };

type SupervisorLabelKey =
  | 'hris:mandor.status_no_data'
  | 'hris:mandor.status_above_target'
  | 'hris:mandor.status_needs_improvement'
  | 'hris:mandor.status_below_target';

function avgInfo(
  value: number,
  laporan: number,
): { state: FioriState; labelKey: SupervisorLabelKey } {
  if (!laporan) return { state: 'None', labelKey: 'hris:mandor.status_no_data' };
  if (value >= 200) return { state: 'Positive', labelKey: 'hris:mandor.status_above_target' };
  if (value >= 150) return { state: 'Critical', labelKey: 'hris:mandor.status_needs_improvement' };
  return { state: 'Negative', labelKey: 'hris:mandor.status_below_target' };
}

export default function FioriSupervisorTable({
  items,
  tenantNama,
}: {
  items: Item[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['hris', 'common']);
  const [query, setQuery] = React.useState('');
  const filtered = items.filter(
    (i) => !query || i.mandorNama.toLowerCase().includes(query.toLowerCase()),
  );

  const columns = [
    { Header: t('common:column.mandor'), accessor: 'mandorNama' },
    { Header: t('hris:mandor.column_reports_count'), accessor: 'jumlahLaporan' },
    { Header: t('hris:mandor.column_total_present'), accessor: 'totalHadir' },
    { Header: t('hris:mandor.column_total_production'), accessor: 'totalProduksi' },
    { Header: t('hris:mandor.column_avg_productivity'), accessor: 'avgKgHK' },
    {
      Header: t('hris:mandor.column_assessment'),
      accessor: 'avgKgHKValue',
      Cell: (p: CellProps) => {
        const item = p.cell.row.original as unknown as Item;
        const info = avgInfo(item.avgKgHKValue, item.jumlahLaporan);
        return (
          <ObjectStatus state={info.state} showDefaultIcon>
            {t(info.labelKey)}
          </ObjectStatus>
        );
      },
    },
  ];

  return (
    <FioriPage
      title={t('hris:mandor.page_title')}
      subtitle={t('hris:mandor.subtitle', { tenant: tenantNama })}
      breadcrumb={t('hris:mandor.breadcrumb')}
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('hris:mandor.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => setQuery('')}
        >
          <FilterGroupItem filterKey="nama" label={t('hris:mandor.filter_name_label')}>
            <Input
              placeholder={t('hris:mandor.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          </FilterGroupItem>
        </FilterBar>
      }
    >
      <Card>
        <div style={{ padding: '1rem' }}>
          {items.length === 0 ? (
            <FioriEmptyState
              titleText={t('hris:mandor.empty_title')}
              subtitleText={t('hris:mandor.empty_subtitle')}
            />
          ) : (
            <AnalyticalTable
              columns={columns}
              data={filtered}
              filterable
              sortable
              visibleRows={10}
              noDataText={t('hris:mandor.no_data')}
              accessibleName={t('hris:mandor.table_accessible_name')}
            />
          )}
        </div>
      </Card>
    </FioriPage>
  );
}
