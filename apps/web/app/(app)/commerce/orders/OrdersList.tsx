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
  ObjectStatus,
  Option,
  Select,
  Title,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';
import { orderStatusInfo } from '@/lib/fiori-status';

export interface OrderItem {
  id: string;
  tanggal: string;
  pemohon: string;
  jumlahItem: number;
  blok: string;
  total: string;
  totalValue: number;
  status: string;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };

export default function OrdersList({
  orders,
  tenantNama,
}: {
  orders: OrderItem[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['commerce', 'common']);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('ALL');
  const [toastMessage, setToastMessage] = React.useState<{
    text: string;
    design: 'Positive' | 'Negative';
  } | null>(null);

  // Payment Dialog State
  const [paymentOrder, setPaymentOrder] = React.useState<OrderItem | null>(null);
  const [paymentRef, setPaymentRef] = React.useState('');
  const [submittingPayment, setSubmittingPayment] = React.useState(false);

  const filtered = orders.filter((o) => {
    const matchesQuery =
      !query ||
      [o.pemohon, o.blok, o.tanggal].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'ALL' || o.status === status);
  });

  const handleConfirmPayment = async () => {
    if (!paymentOrder || !paymentRef.trim()) {
      setToastMessage({ text: t('common:message.required_fields'), design: 'Negative' });
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/commerce/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'pay',
          orderId: paymentOrder.id,
          reference: paymentRef.trim(),
          amount: paymentOrder.totalValue,
          proofUrl: '/uploads/receipt.jpg',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || t('commerce:orders.payment_error'));
      }

      setToastMessage({
        text: String(t('commerce:orders.payment_success')),
        design: 'Positive' as const,
      });
      setPaymentOrder(null);
      setPaymentRef('');
      router.refresh();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : t('commerce:orders.payment_error'),
        design: 'Negative',
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const columns = [
    { Header: t('common:column.date'), accessor: 'tanggal' },
    { Header: t('commerce:orders.column_requester'), accessor: 'pemohon' },
    { Header: t('commerce:orders.column_items'), accessor: 'jumlahItem' },
    { Header: t('commerce:orders.column_blocks'), accessor: 'blok' },
    { Header: t('commerce:orders.column_total_value'), accessor: 'total' },
    {
      Header: t('common:column.status'),
      accessor: 'status',
      Cell: (p: CellProps) => {
        const info = orderStatusInfo((p.cell.row.original as unknown as OrderItem).status);
        return (
          <ObjectStatus state={info.state} showDefaultIcon>
            {info.label}
          </ObjectStatus>
        );
      },
    },
    {
      Header: t('common:column.action'),
      accessor: 'id',
      Cell: (p: CellProps) => {
        const row = p.cell.row.original as unknown as OrderItem;
        if (row.status === 'APPROVED') {
          return (
            <Button
              design="Emphasized"
              icon={fioriIcons['money-bills']}
              onClick={() => {
                setPaymentOrder(row);
                setPaymentRef(`TRF-${Date.now().toString().slice(-6)}`);
              }}
            >
              {t('commerce:orders.confirm_payment')}
            </Button>
          );
        }
        return <span style={{ color: 'var(--sapContent_LabelColor)' }}>{'-'}</span>;
      },
    },
  ];

  return (
    <FioriPage
      title={t('commerce:orders.page_title')}
      subtitle={t('commerce:orders.subtitle', { tenant: tenantNama, total: orders.length })}
      breadcrumb={t('commerce:orders.breadcrumb')}
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('commerce:orders.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setStatus('ALL');
          }}
          search={
            <Input
              placeholder={t('commerce:orders.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="status" label={t('commerce:orders.filter_status_label')}>
            <Select
              value={status}
              onChange={(e) => setStatus(e.detail.selectedOption.value ?? 'ALL')}
            >
              <Option value="ALL">{t('common:filter.all_status')}</Option>
              <Option value="SUBMITTED">{t('commerce:orders.status_submitted')}</Option>
              <Option value="APPROVED">{t('commerce:orders.status_approved')}</Option>
              <Option value="PAID">{t('commerce:orders.status_paid')}</Option>
              <Option value="REJECTED">{t('commerce:orders.status_rejected')}</Option>
              <Option value="DELIVERED">{t('commerce:orders.status_delivered')}</Option>
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
            {orders.length === 0 ? (
              <FioriEmptyState
                titleText={t('commerce:orders.empty_title')}
                subtitleText={t('commerce:orders.empty_subtitle')}
              />
            ) : (
              <AnalyticalTable
                columns={columns}
                data={filtered}
                filterable
                sortable
                visibleRows={10}
                noDataText={t('commerce:orders.no_data')}
                accessibleName={t('commerce:orders.table_accessible_name')}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Dialog Konfirmasi Pembayaran */}
      <Dialog
        open={Boolean(paymentOrder)}
        headerText={t('commerce:orders.confirm_payment')}
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
            <Button design="Transparent" onClick={() => setPaymentOrder(null)}>
              {t('common:action.cancel')}
            </Button>
            <Button
              design="Emphasized"
              loading={submittingPayment}
              disabled={submittingPayment}
              onClick={handleConfirmPayment}
            >
              {t('commerce:orders.confirm_payment')}
            </Button>
          </div>
        }
      >
        {paymentOrder && (
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minWidth: '400px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('commerce:orders.column_requester')}:</span>
              <strong>{paymentOrder.pemohon}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('commerce:orders.payment_amount')}:</span>
              <strong style={{ color: 'var(--sapPositiveColor)', fontSize: '1.125rem' }}>
                {paymentOrder.total}
              </strong>
            </div>

            <div>
              <Label required>{t('commerce:orders.payment_ref')}</Label>
              <Input
                value={paymentRef}
                style={{ width: '100%' }}
                placeholder="Contoh: TRF-BCA-928172"
                onInput={(e) => setPaymentRef(e.target.value)}
              />
            </div>
          </div>
        )}
      </Dialog>
    </FioriPage>
  );
}
