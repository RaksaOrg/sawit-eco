'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Button,
  Card,
  MessageStrip,
  ObjectStatus,
  Text,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';

export interface ApprovalRow {
  id: string;
  date: string;
  requester: string;
  block: string;
  reason: string;
  total: string;
  totalValue: number;
  status: string;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };

export default function ApprovalInbox({
  tenantName,
  orders,
  approverId,
  approverRole,
}: {
  tenantName: string;
  orders: ApprovalRow[];
  approverId: string;
  approverRole: string;
}) {
  const { t } = useTranslation(['commerce', 'common']);
  const [busyId, setBusyId] = React.useState<string>();
  const [message, setMessage] = React.useState<{ design: 'Positive' | 'Negative'; text: string }>();

  const decide = async (orderId: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(orderId);
    setMessage(undefined);
    try {
      const response = await fetch('/api/commerce/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'decide',
          orderId,
          approverId,
          approverRole,
          decision,
        }),
      });
      if (!response.ok) throw new Error('failed');
      setMessage({
        design: 'Positive',
        text:
          decision === 'APPROVED'
            ? t('commerce:approval.approved_message')
            : t('commerce:approval.rejected_message'),
      });
      window.location.reload();
    } catch {
      setMessage({ design: 'Negative', text: t('commerce:approval.error_message') });
    } finally {
      setBusyId(undefined);
    }
  };

  const columns = [
    { Header: t('commerce:approval.column_date'), accessor: 'date' },
    { Header: t('commerce:approval.column_requester'), accessor: 'requester' },
    { Header: t('commerce:approval.column_block'), accessor: 'block' },
    { Header: t('commerce:approval.column_reason'), accessor: 'reason' },
    { Header: t('commerce:approval.column_total'), accessor: 'total' },
    {
      Header: t('commerce:approval.column_status'),
      accessor: 'status',
      Cell: () => (
        <ObjectStatus state="Critical" showDefaultIcon>
          {t('commerce:approval.pending_label')}
        </ObjectStatus>
      ),
    },
    {
      Header: t('commerce:approval.column_action'),
      accessor: 'id',
      Cell: (p: CellProps) => {
        const row = p.cell.row.original as unknown as ApprovalRow;
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              design="Emphasized"
              disabled={busyId === row.id}
              loading={busyId === row.id}
              onClick={() => decide(row.id, 'APPROVED')}
            >
              {t('commerce:approval.approve_button')}
            </Button>
            <Button
              design="Negative"
              disabled={busyId === row.id}
              onClick={() => decide(row.id, 'REJECTED')}
            >
              {t('commerce:approval.reject_button')}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <FioriPage
      title={t('commerce:approval.page_title')}
      subtitle={t('commerce:approval.subtitle', { tenant: tenantName, total: orders.length })}
      breadcrumb={t('commerce:approval.breadcrumb')}
    >
      {message ? (
        <MessageStrip design={message.design} hideCloseButton>
          {message.text}
        </MessageStrip>
      ) : null}
      <Card style={{ marginTop: '1rem' }}>
        <div style={{ padding: '1rem' }}>
          {orders.length === 0 ? (
            <FioriEmptyState
              titleText={t('commerce:approval.empty_title')}
              subtitleText={t('commerce:approval.empty_subtitle')}
            />
          ) : (
            <>
              <Text style={{ color: 'var(--sapContent_LabelColor)' }}>
                {t('commerce:approval.page_title')}
              </Text>
              <AnalyticalTable
                columns={columns}
                data={orders}
                filterable
                sortable
                visibleRows={10}
                accessibleName={t('commerce:approval.table_accessible_name')}
              />
            </>
          )}
        </div>
      </Card>
    </FioriPage>
  );
}
