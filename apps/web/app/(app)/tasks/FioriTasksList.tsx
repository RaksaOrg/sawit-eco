'use client';

import React from 'react';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Button,
  Card,
  FilterBar,
  FilterGroupItem,
  Input,
  ObjectStatus,
  Option,
  Select,
  Title,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';
import { priorityStatusInfo, taskStatusInfo } from '@/lib/fiori-status';

export interface Task {
  id: string;
  kodeTugas: string;
  blokKode: string;
  aktivitas: string;
  targetKuantitas: number;
  satuanTarget: string;
  tanggalTarget: string;
  mandorNama: string;
  status: string;
  prioritas: string;
  isOverdue: boolean;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };
const asTask = (p: CellProps) => p.cell.row.original as unknown as Task;

export default function FioriTasksList({
  tasks,
  tenantNama,
}: {
  tasks: Task[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['tasks', 'common']);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('ALL');

  const filtered = tasks.filter((task) => {
    const matchesQuery =
      !query ||
      [task.kodeTugas, task.blokKode, task.aktivitas, task.mandorNama]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesStatus =
      status === 'ALL' || (status === 'OVERDUE' ? task.isOverdue : task.status === status);
    return matchesQuery && matchesStatus;
  });

  const columns = [
    { Header: t('tasks:list.column_task_code'), accessor: 'kodeTugas' },
    { Header: t('common:column.block'), accessor: 'blokKode' },
    { Header: t('common:column.activity'), accessor: 'aktivitas' },
    { Header: t('common:column.mandor'), accessor: 'mandorNama' },
    {
      Header: t('tasks:list.column_target'),
      accessor: 'targetKuantitas',
      Cell: (p: CellProps) => {
        const task = asTask(p);
        return (
          <span>{`${task.targetKuantitas.toLocaleString('id-ID')} ${task.satuanTarget}`}</span>
        );
      },
    },
    { Header: t('tasks:list.column_deadline'), accessor: 'tanggalTarget' },
    {
      Header: t('tasks:list.column_priority'),
      accessor: 'prioritas',
      Cell: (p: CellProps) => {
        const info = priorityStatusInfo(asTask(p).prioritas);
        return <ObjectStatus state={info.state}>{info.label}</ObjectStatus>;
      },
    },
    {
      Header: t('common:column.status'),
      accessor: 'status',
      Cell: (p: CellProps) => {
        const task = asTask(p);
        const info = taskStatusInfo(task.status, task.isOverdue);
        return (
          <ObjectStatus state={info.state} showDefaultIcon>
            {info.label}
          </ObjectStatus>
        );
      },
    },
  ];

  return (
    <FioriPage
      title={t('tasks:list.page_title')}
      subtitle={t('tasks:list.subtitle', { tenant: tenantNama, total: tasks.length })}
      breadcrumb={t('tasks:list.breadcrumb')}
      actions={
        <Button
          design="Emphasized"
          icon={fioriIcons['add']}
          onClick={() => router.push('/tasks/new')}
        >
          {t('common:action.create_task')}
        </Button>
      }
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('tasks:list.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setStatus('ALL');
          }}
          search={
            <Input
              placeholder={t('tasks:list.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="status" label={t('tasks:list.filter_status_label')}>
            <Select
              value={status}
              onChange={(e) => setStatus(e.detail.selectedOption.value ?? 'ALL')}
            >
              <Option value="ALL">{t('common:filter.all_status')}</Option>
              <Option value="ASSIGNED">{t('tasks:list.status_assigned')}</Option>
              <Option value="IN_PROGRESS">{t('tasks:list.status_in_progress')}</Option>
              <Option value="COMPLETED">{t('tasks:list.status_completed')}</Option>
              <Option value="CANCELLED">{t('tasks:list.status_cancelled')}</Option>
              <Option value="OVERDUE">{t('tasks:list.status_overdue')}</Option>
            </Select>
          </FilterGroupItem>
        </FilterBar>
      }
    >
      <Card>
        <div style={{ padding: '1rem' }}>
          {tasks.length === 0 ? (
            <FioriEmptyState
              titleText={t('tasks:list.empty_title')}
              subtitleText={t('tasks:list.empty_subtitle')}
              actionText={t('common:action.create_task')}
              onAction={() => router.push('/tasks/new')}
            />
          ) : (
            <AnalyticalTable
              columns={columns}
              data={filtered}
              filterable
              sortable
              visibleRows={10}
              noDataText={t('tasks:list.no_data')}
              accessibleName={t('tasks:list.table_accessible_name')}
            />
          )}
        </div>
      </Card>
    </FioriPage>
  );
}
