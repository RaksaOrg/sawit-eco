'use client';

import React from 'react';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Button,
  Card,
  CardHeader,
  Dialog,
  FilterBar,
  FilterGroupItem,
  Icon,
  Input,
  Label,
  MessageStrip,
  ObjectStatus,
  Option,
  Select,
  TextArea,
  Title,
  Text,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';
import { riskStatusInfo } from '@/lib/fiori-status';

export interface Item {
  id: string;
  blokKode: string;
  mandorNama: string;
  risiko: string;
  gejala: string | null;
  diagnosa: string;
  rekomendasi: string;
  fotoUrl: string | null;
  createdAt: string;
}

export interface BlockOption {
  kode: string;
  luasHa: number;
  tahunTanam: number;
}

export interface ProductOption {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  harga: number;
  satuan: string;
  ukuranKemasan: number;
}

interface DiagnosisResult {
  logId: string;
  recommendation: {
    status: 'RECOMMENDED' | 'VALIDATED' | 'PRODUCT_GAP';
    card?: {
      sku: string;
      nama: string;
      alasan: string;
      kuantitas: number;
      satuan: string;
      estimasiTotalHarga: number;
      disclaimer: string;
    };
    product?: ProductOption;
    estimation?: {
      luasHa: number;
      totalKg: number;
      jumlahSak: number;
      ukuranKemasanKg: number;
    };
    gapReason?: string;
    disclaimer?: string;
  };
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };
const asItem = (p: CellProps) => p.cell.row.original as unknown as Item;

export default function FioriAgronomyList({
  items,
  blocks = [],
  products = [],
  tenantNama,
}: {
  items: Item[];
  blocks?: BlockOption[];
  products?: ProductOption[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['agronomy', 'common', 'commerce']);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [risiko, setRisiko] = React.useState('ALL');

  // Dialog State for New Diagnosis
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedBlock, setSelectedBlock] = React.useState(blocks[0]?.kode || '');
  const [symptoms, setSymptoms] = React.useState('');
  const [selectedSku, setSelectedSku] = React.useState(products[0]?.sku || '');
  const [dosage, setDosage] = React.useState('150');
  const [submitting, setSubmitting] = React.useState(false);
  const [diagnosisResult, setDiagnosisResult] = React.useState<DiagnosisResult | null>(null);
  const [cartBusy, setCartBusy] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{
    text: string;
    design: 'Positive' | 'Negative';
  } | null>(null);

  // Detail Dialog State
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);

  const activeBlock = blocks.find((b) => b.kode === selectedBlock) || blocks[0];
  const luasHa = activeBlock?.luasHa || 1;
  const estimatedNeedKg = Math.round(Number(dosage || 0) * luasHa);

  const filtered = items.filter((i) => {
    const matchesQuery =
      !query ||
      [i.blokKode, i.mandorNama, i.diagnosa, i.gejala || '']
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase());
    return matchesQuery && (risiko === 'ALL' || i.risiko.toUpperCase() === risiko);
  });

  const handleRunDiagnosis = async () => {
    if (!symptoms.trim()) {
      setToastMessage({ text: t('common:message.required_fields'), design: 'Negative' });
      return;
    }
    setSubmitting(true);
    setDiagnosisResult(null);
    try {
      const skuToSend = selectedSku || products[0]?.sku || 'GAP_PRODUCT_UNKNOWN';
      const blockToSend = selectedBlock || blocks[0]?.kode || 'A1';
      const res = await fetch('/api/agronomy/diagnose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          blockCode: blockToSend,
          symptoms: symptoms.trim(),
          targetSku: skuToSend,
          dosageKgPerHa: Number(dosage) || 150,
          disclaimer: t('agronomy:card.disclaimer'),
          reason: `Rekomendasi pemupukan/perawatan blok ${blockToSend} dengan dosis ${dosage} Kg/Ha.`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal menjalankan diagnosa');
      }
      setDiagnosisResult(json.data);
      router.refresh();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : 'Error diagnosa',
        design: 'Negative',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = async () => {
    const rec = diagnosisResult?.recommendation;
    if (!rec) return;

    const card = rec.card;
    const sku = card?.sku || rec.product?.sku;
    const targetProduct = products.find((p) => p.sku === sku) || rec.product;
    if (!targetProduct) return;

    const quantity = card?.kuantitas || rec.estimation?.jumlahSak || 1;
    const reason = card?.alasan || `Rekomendasi pemupukan/perawatan blok ${selectedBlock || 'A1'}`;

    setCartBusy(true);
    try {
      const res = await fetch('/api/commerce/flow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'add-to-cart',
          productId: targetProduct.id,
          quantity,
          blockCode: selectedBlock || blocks[0]?.kode || 'A1',
          recommendationId: diagnosisResult?.logId || '',
          recommendationReason: reason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal tambah ke keranjang');
      }
      setToastMessage({
        text: String(t('agronomy:diagnose.added_to_cart_success')),
        design: 'Positive',
      });
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : 'Gagal tambah ke keranjang',
        design: 'Negative',
      });
    } finally {
      setCartBusy(false);
    }
  };

  const columns = [
    { Header: t('common:column.date'), accessor: 'createdAt' },
    { Header: t('common:column.block'), accessor: 'blokKode' },
    { Header: t('common:column.mandor'), accessor: 'mandorNama' },
    {
      Header: t('agronomy:list.risk_label'),
      accessor: 'risiko',
      Cell: (p: CellProps) => {
        const info = riskStatusInfo(asItem(p).risiko);
        return (
          <ObjectStatus state={info.state} showDefaultIcon>
            {info.label}
          </ObjectStatus>
        );
      },
    },
    { Header: t('agronomy:list.column_symptoms'), accessor: 'gejala' },
    { Header: t('agronomy:list.column_diagnosis'), accessor: 'diagnosa' },
    {
      Header: t('agronomy:list.column_follow_up'),
      accessor: 'id',
      Cell: (p: CellProps) => {
        const item = asItem(p);
        return (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button
              design="Transparent"
              icon={fioriIcons['inspect']}
              tooltip={t('agronomy:diagnose.diagnosis_details')}
              onClick={() => setSelectedItem(item)}
            />
            <Button
              design="Transparent"
              icon={fioriIcons['add-activity']}
              onClick={() =>
                router.push(
                  `/tasks/new?agronomyLogId=${item.id}&blockCode=${encodeURIComponent(item.blokKode)}&activity=${encodeURIComponent('Perawatan Lapangan')}&notes=${encodeURIComponent(item.diagnosa.slice(0, 120))}`,
                )
              }
            >
              {t('common:action.create_task')}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <FioriPage
      title={t('agronomy:list.page_title')}
      subtitle={t('agronomy:list.subtitle', { tenant: tenantNama, total: items.length })}
      breadcrumb={t('agronomy:list.breadcrumb')}
      actions={
        <Button
          design="Emphasized"
          icon={fioriIcons['stethoscope']}
          onClick={() => {
            setDiagnosisResult(null);
            setSymptoms('');
            if (!selectedSku && products.length > 0) {
              setSelectedSku(products[0].sku);
            }
            if (!selectedBlock && blocks.length > 0) {
              setSelectedBlock(blocks[0].kode);
            }
            setDialogOpen(true);
          }}
        >
          {t('agronomy:diagnose.action_new_diagnosis')}
        </Button>
      }
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('agronomy:list.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setRisiko('ALL');
          }}
          search={
            <Input
              placeholder={t('agronomy:list.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="risiko" label={t('agronomy:list.filter_risk_label')}>
            <Select
              value={risiko}
              onChange={(e) => setRisiko(e.detail.selectedOption.value ?? 'ALL')}
            >
              <Option value="ALL">{t('common:filter.all_risk')}</Option>
              <Option value="RENDAH">{t('agronomy:list.risk_low')}</Option>
              <Option value="SEDANG">{t('agronomy:list.risk_medium')}</Option>
              <Option value="TINGGI">{t('agronomy:list.risk_high')}</Option>
              <Option value="KRITIS">{t('agronomy:list.risk_critical')}</Option>
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
            {items.length === 0 ? (
              <FioriEmptyState
                titleText={String(t('agronomy:list.empty_title'))}
                subtitleText={String(t('agronomy:list.empty_subtitle'))}
                actionText={String(t('agronomy:diagnose.action_new_diagnosis'))}
                onAction={() => {
                  setDiagnosisResult(null);
                  setSymptoms('');
                  if (!selectedSku && products.length > 0) {
                    setSelectedSku(products[0].sku);
                  }
                  if (!selectedBlock && blocks.length > 0) {
                    setSelectedBlock(blocks[0].kode);
                  }
                  setDialogOpen(true);
                }}
              />
            ) : (
              <AnalyticalTable
                columns={columns}
                data={filtered.map((i) => ({ ...i, gejala: i.gejala || '—' }))}
                filterable
                sortable
                visibleRows={10}
                noDataText={t('agronomy:list.no_data')}
                accessibleName={t('agronomy:list.table_accessible_name')}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Dialog Diagnosa Baru */}
      <Dialog
        open={dialogOpen}
        headerText={t('agronomy:diagnose.title')}
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
            {!diagnosisResult && (
              <Button
                design="Emphasized"
                loading={submitting}
                disabled={submitting}
                onClick={handleRunDiagnosis}
              >
                {t('agronomy:diagnose.run_diagnosis_btn')}
              </Button>
            )}
          </div>
        }
      >
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minWidth: '460px',
            maxWidth: '600px',
          }}
        >
          {!diagnosisResult ? (
            <>
              <div>
                <Label required>{t('agronomy:diagnose.select_block')}</Label>
                <Select
                  style={{ width: '100%' }}
                  onChange={(e) => setSelectedBlock(e.detail.selectedOption.value || '')}
                >
                  {blocks.map((b) => (
                    <Option key={b.kode} value={b.kode} selected={selectedBlock === b.kode}>
                      {`Blok ${b.kode} (${b.luasHa} Ha - Tanam ${b.tahunTanam})`}
                    </Option>
                  ))}
                  {blocks.length === 0 && (
                    <Option value="A1">{t('agronomy:diagnose.default_block_fallback')}</Option>
                  )}
                </Select>
              </div>

              <div>
                <Label required>{t('agronomy:diagnose.symptoms_label')}</Label>
                <TextArea
                  style={{ width: '100%' }}
                  rows={3}
                  placeholder={String(t('agronomy:diagnose.symptoms_placeholder'))}
                  value={symptoms}
                  onInput={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div>
                <Label required>{t('agronomy:diagnose.select_product')}</Label>
                <Select
                  style={{ width: '100%' }}
                  onChange={(e) => setSelectedSku(e.detail.selectedOption.value || '')}
                >
                  {products.map((p) => (
                    <Option key={p.sku} value={p.sku} selected={selectedSku === p.sku}>
                      {`${p.nama} (${p.sku}) - Rp ${p.harga.toLocaleString('id-ID')}/${p.satuan}`}
                    </Option>
                  ))}
                  <Option value="GAP_PRODUCT_UNKNOWN">
                    {t('agronomy:diagnose.unlisted_product')}
                  </Option>
                </Select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <Label>{t('agronomy:diagnose.dosage_label')}</Label>
                  <Input
                    type="Number"
                    value={dosage}
                    style={{ width: '100%' }}
                    onInput={(e) => setDosage(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>{t('agronomy:card.est_block')}</Label>
                  <div style={{ padding: '0.625rem 0', fontWeight: 600 }}>
                    {`${estimatedNeedKg.toLocaleString('id-ID')} Kg (${luasHa} Ha)`}
                  </div>
                </div>
              </div>

              <MessageStrip design="Information" hideCloseButton>
                {t('agronomy:card.disclaimer')}
              </MessageStrip>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(diagnosisResult.recommendation.status === 'RECOMMENDED' ||
                diagnosisResult.recommendation.status === 'VALIDATED') &&
              (diagnosisResult.recommendation.card ||
                (diagnosisResult.recommendation.product &&
                  diagnosisResult.recommendation.estimation)) ? (
                (() => {
                  const rec = diagnosisResult.recommendation;
                  const prod = rec.product;
                  const est = rec.estimation;
                  const card = rec.card || {
                    sku: prod?.sku || '',
                    nama: prod?.nama || '',
                    alasan: `Rekomendasi pemupukan/perawatan blok ${selectedBlock || 'A1'} dengan dosis ${dosage} Kg/Ha.`,
                    kuantitas: est?.jumlahSak || 1,
                    satuan: prod?.satuan || 'Sak',
                    estimasiTotalHarga: (est?.jumlahSak || 1) * (prod?.harga || 0),
                    disclaimer: rec.disclaimer || t('agronomy:card.disclaimer'),
                  };
                  return (
                    <Card
                      header={
                        <CardHeader
                          titleText={t('agronomy:card.product_rec')}
                          subtitleText={card.nama}
                          avatar={<Icon name={fioriIcons['lead']} />}
                          additionalText={card.sku}
                        />
                      }
                    >
                      <div
                        style={{
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <Text style={{ fontWeight: 600, display: 'block' }}>
                            {t('agronomy:card.reason')}:
                          </Text>
                          <Text>{card.alasan}</Text>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0',
                            borderTop: '1px solid var(--sapList_BorderColor)',
                          }}
                        >
                          <span>{t('agronomy:card.est_block')}:</span>
                          <strong>{`${card.kuantitas.toLocaleString('id-ID')} ${card.satuan}`}</strong>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0',
                          }}
                        >
                          <span>{t('agronomy:card.est_cost')}:</span>
                          <strong style={{ color: 'var(--sapPositiveColor)' }}>
                            {`Rp ${card.estimasiTotalHarga.toLocaleString('id-ID')}`}
                          </strong>
                        </div>

                        <MessageStrip design="Critical" hideCloseButton>
                          {card.disclaimer}
                        </MessageStrip>

                        <Button
                          design="Emphasized"
                          icon={fioriIcons['cart']}
                          loading={cartBusy}
                          disabled={cartBusy}
                          onClick={handleAddToCart}
                          style={{ marginTop: '0.5rem' }}
                        >
                          {t('agronomy:card.add_to_cart')}
                        </Button>
                      </div>
                    </Card>
                  );
                })()
              ) : (
                <MessageStrip design="Negative" hideCloseButton>
                  <strong>{t('agronomy:gap.banner_title')}</strong>
                  <div>{t('agronomy:gap.desc')}</div>
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {diagnosisResult.recommendation.gapReason || t('agronomy:gap.unregistered_sku')}
                  </div>
                </MessageStrip>
              )}

              <Button
                design="Transparent"
                icon={fioriIcons['refresh']}
                onClick={() => setDiagnosisResult(null)}
              >
                {t('agronomy:diagnose.another_diagnosis')}
              </Button>
            </div>
          )}
        </div>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(selectedItem)}
        headerText={t('agronomy:diagnose.diagnosis_details')}
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
            <Button design="Transparent" onClick={() => setSelectedItem(null)}>
              {t('common:action.close')}
            </Button>
            {selectedItem && (
              <Button
                design="Emphasized"
                icon={fioriIcons['add-activity']}
                onClick={() => {
                  const it = selectedItem;
                  setSelectedItem(null);
                  router.push(
                    `/tasks/new?agronomyLogId=${it.id}&blockCode=${encodeURIComponent(it.blokKode)}&activity=${encodeURIComponent('Perawatan Lapangan')}&notes=${encodeURIComponent(it.diagnosa.slice(0, 120))}`,
                  );
                }}
              >
                {t('common:action.create_task')}
              </Button>
            )}
          </div>
        }
      >
        {selectedItem && (
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minWidth: '400px',
              maxWidth: '550px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level="H5">{`Blok ${selectedItem.blokKode}`}</Title>
              <ObjectStatus state={riskStatusInfo(selectedItem.risiko).state} showDefaultIcon>
                {riskStatusInfo(selectedItem.risiko).label}
              </ObjectStatus>
            </div>

            {selectedItem.fotoUrl && (
              <div style={{ textAlign: 'center', borderRadius: '4px', overflow: 'hidden' }}>
                <img
                  src={selectedItem.fotoUrl}
                  alt="Foto Gejala"
                  style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'cover' }}
                />
              </div>
            )}

            <div>
              <Label>{t('agronomy:list.column_symptoms')}:</Label>
              <Text style={{ display: 'block', marginTop: '0.25rem' }}>
                {selectedItem.gejala || '—'}
              </Text>
            </div>

            <div>
              <Label>{t('agronomy:list.column_diagnosis')}:</Label>
              <Text style={{ display: 'block', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                {selectedItem.diagnosa}
              </Text>
            </div>

            <div>
              <Label>{t('agronomy:diagnose.action_immediate')}:</Label>
              <Text style={{ display: 'block', marginTop: '0.25rem' }}>
                {selectedItem.rekomendasi}
              </Text>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--sapContent_LabelColor)' }}>
              {`Dilaporkan oleh: ${selectedItem.mandorNama} · ${selectedItem.createdAt}`}
            </div>
          </div>
        )}
      </Dialog>
    </FioriPage>
  );
}
