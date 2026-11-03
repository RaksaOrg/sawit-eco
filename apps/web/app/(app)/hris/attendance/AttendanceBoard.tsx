'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Button,
  Card,
  CardHeader,
  DatePicker,
  Dialog,
  Label,
  MessageStrip,
  ObjectStatus,
  Option,
  Select,
  TextArea,
  Title,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';

export interface AttendanceRow {
  id: string;
  employee: string;
  role: string;
  blockCode: string;
  status: string;
  verificationStatus: string;
  source: string;
  hkValue: number;
}

export interface EmployeeOption {
  id: string;
  nama: string;
}

export interface BlockOption {
  kode: string;
  luasHa: number;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };

type AttendanceStatusKey =
  | 'hris:attendance.status_present'
  | 'hris:attendance.status_half_day'
  | 'hris:attendance.status_absent'
  | 'hris:attendance.status_leave';

const STATUS_KEYS: Record<string, AttendanceStatusKey> = {
  PRESENT: 'hris:attendance.status_present',
  HALF_DAY: 'hris:attendance.status_half_day',
  ABSENT: 'hris:attendance.status_absent',
  LEAVE: 'hris:attendance.status_leave',
};

export default function AttendanceBoard({
  tenantNama,
  date,
  records,
  employees,
  blocks,
  summary,
}: {
  tenantNama: string;
  date: string;
  records: AttendanceRow[];
  employees: EmployeeOption[];
  blocks: BlockOption[];
  summary: { present: number; halfDay: number; absent: number; totalHk: number };
}) {
  const { t } = useTranslation(['hris', 'common']);
  const [selectedDate, setSelectedDate] = React.useState(date);
  const [employeeId, setEmployeeId] = React.useState('');
  const [blockCode, setBlockCode] = React.useState('');
  const [status, setStatus] = React.useState('PRESENT');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ design: 'Positive' | 'Negative'; text: string }>();
  const [correcting, setCorrecting] = React.useState<AttendanceRow | null>(null);
  const [correctionReason, setCorrectionReason] = React.useState('');
  const [correctionStatus, setCorrectionStatus] = React.useState('PRESENT');

  const unverifiedCount = records.filter(
    (r) => r.verificationStatus === 'PENDING_VERIFICATION',
  ).length;

  const submitCorrection = async () => {
    if (!correcting || !correctionReason.trim()) {
      setMessage({ design: 'Negative', text: t('common:message.required_fields') });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/hris/attendance', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: correcting.id,
          status: correctionStatus,
          reason: correctionReason,
        }),
      });
      if (!response.ok) throw new Error('failed');
      setCorrecting(null);
      window.location.reload();
    } catch {
      setMessage({ design: 'Negative', text: t('common:message.save_failed') });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!employeeId || !blockCode) {
      setMessage({ design: 'Negative', text: t('common:message.required_fields') });
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch('/api/hris/attendance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: employeeId,
          blockCode,
          workDate: selectedDate,
          status,
          source: 'WEB',
          idempotencyKey: `web-${employeeId}-${blockCode}-${selectedDate}`,
        }),
      });
      if (!response.ok) throw new Error('failed');
      setMessage({ design: 'Positive', text: t('common:message.saved') });
      window.location.reload();
    } catch {
      setMessage({ design: 'Negative', text: t('common:message.save_failed') });
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { Header: t('hris:attendance.column_employee'), accessor: 'employee' },
    { Header: t('hris:attendance.column_role'), accessor: 'role' },
    { Header: t('hris:attendance.column_block'), accessor: 'blockCode' },
    {
      Header: t('hris:attendance.column_status'),
      accessor: 'status',
      Cell: (p: CellProps) => {
        const row = p.cell.row.original as unknown as AttendanceRow;
        const state =
          row.status === 'PRESENT'
            ? 'Positive'
            : row.status === 'HALF_DAY'
              ? 'Critical'
              : 'Negative';
        return (
          <ObjectStatus state={state} showDefaultIcon>
            {t(STATUS_KEYS[row.status] || 'hris:attendance.status_present')}
          </ObjectStatus>
        );
      },
    },
    { Header: t('hris:attendance.column_source'), accessor: 'source' },
    {
      Header: t('hris:attendance.column_hk'),
      accessor: 'hkValue',
      Cell: (p: CellProps) => String((p.cell.row.original as unknown as AttendanceRow).hkValue),
    },
    {
      Header: t('common:column.action'),
      accessor: 'id',
      Cell: (p: CellProps) => {
        const row = p.cell.row.original as unknown as AttendanceRow;
        return (
          <Button
            design="Transparent"
            onClick={() => {
              setCorrecting(row);
              setCorrectionStatus(row.status);
              setCorrectionReason('');
            }}
          >
            {t('hris:attendance.action_correct')}
          </Button>
        );
      },
    },
  ];

  return (
    <FioriPage
      title={t('hris:attendance.page_title')}
      subtitle={t('hris:attendance.subtitle', { tenant: tenantNama, date })}
      breadcrumb={t('hris:attendance.breadcrumb')}
    >
      {unverifiedCount > 0 ? (
        <MessageStrip design="Critical" style={{ marginBottom: '1rem' }} hideCloseButton>
          {t('hris:attendance.geofence_warning', { total: unverifiedCount })}
        </MessageStrip>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <Card header={<CardHeader titleText={t('hris:attendance.summary_present')} />}>
          <div style={{ padding: '1rem', fontSize: '2rem' }}>{summary.present}</div>
        </Card>
        <Card header={<CardHeader titleText={t('hris:attendance.summary_half_day')} />}>
          <div style={{ padding: '1rem', fontSize: '2rem' }}>{summary.halfDay}</div>
        </Card>
        <Card header={<CardHeader titleText={t('hris:attendance.summary_absent')} />}>
          <div style={{ padding: '1rem', fontSize: '2rem' }}>{summary.absent}</div>
        </Card>
        <Card header={<CardHeader titleText={t('hris:attendance.summary_total_hk')} />}>
          <div style={{ padding: '1rem', fontSize: '2rem' }}>{summary.totalHk}</div>
        </Card>
      </div>

      <Card
        style={{ marginTop: '1.5rem' }}
        header={<CardHeader titleText={t('common:action.add')} />}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem',
            alignItems: 'end',
          }}
        >
          <div>
            <Title level="H6">{t('hris:attendance.column_employee')}</Title>
            <Select onChange={(e) => setEmployeeId(e.detail.selectedOption.value || '')}>
              <Option value="">{t('common:filter.all')}</Option>
              {employees.map((employee) => (
                <Option key={employee.id} value={employee.id}>
                  {employee.nama}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <Title level="H6">{t('hris:attendance.column_block')}</Title>
            <Select onChange={(e) => setBlockCode(e.detail.selectedOption.value || '')}>
              <Option value="">{t('common:filter.all')}</Option>
              {blocks.map((block) => (
                <Option key={block.kode} value={block.kode}>
                  {block.kode}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <Title level="H6">{t('hris:attendance.filter_date_label')}</Title>
            <DatePicker value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div>
            <Title level="H6">{t('hris:attendance.column_status')}</Title>
            <Select onChange={(e) => setStatus(e.detail.selectedOption.value || 'PRESENT')}>
              <Option value="PRESENT">{t('hris:attendance.status_present')}</Option>
              <Option value="HALF_DAY">{t('hris:attendance.status_half_day')}</Option>
              <Option value="ABSENT">{t('hris:attendance.status_absent')}</Option>
              <Option value="LEAVE">{t('hris:attendance.status_leave')}</Option>
            </Select>
          </div>
          <Button design="Emphasized" onClick={save} disabled={busy} loading={busy}>
            {t('common:action.save')}
          </Button>
        </div>
        {message ? (
          <div style={{ padding: '0 1rem 1rem' }}>
            <MessageStrip design={message.design} hideCloseButton>
              {message.text}
            </MessageStrip>
          </div>
        ) : null}
      </Card>

      <Card style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '1rem' }}>
          {records.length === 0 ? (
            <FioriEmptyState
              titleText={t('hris:attendance.empty_title')}
              subtitleText={t('hris:attendance.empty_subtitle')}
            />
          ) : (
            <AnalyticalTable
              columns={columns}
              data={records}
              filterable
              sortable
              visibleRows={10}
              noDataText={t('hris:attendance.no_data')}
              accessibleName={t('hris:attendance.table_accessible_name')}
            />
          )}
        </div>
      </Card>
      <Dialog
        open={Boolean(correcting)}
        headerText={t('hris:attendance.action_correct')}
        onClose={() => setCorrecting(null)}
      >
        <div style={{ display: 'grid', gap: '1rem', padding: '1rem', minWidth: '320px' }}>
          <div>
            <Label>{t('hris:attendance.column_status')}</Label>
            <Select
              value={correctionStatus}
              onChange={(e) => setCorrectionStatus(e.detail.selectedOption.value || 'PRESENT')}
            >
              <Option value="PRESENT">{t('hris:attendance.status_present')}</Option>
              <Option value="HALF_DAY">{t('hris:attendance.status_half_day')}</Option>
              <Option value="ABSENT">{t('hris:attendance.status_absent')}</Option>
              <Option value="LEAVE">{t('hris:attendance.status_leave')}</Option>
            </Select>
          </div>
          <div>
            <Label required>{t('hris:attendance.correction_reason')}</Label>
            <TextArea
              value={correctionReason}
              onInput={(e) => setCorrectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button design="Transparent" onClick={() => setCorrecting(null)}>
              {t('common:button.cancel')}
            </Button>
            <Button design="Emphasized" onClick={submitCorrection} loading={busy}>
              {t('common:button.save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </FioriPage>
  );
}
