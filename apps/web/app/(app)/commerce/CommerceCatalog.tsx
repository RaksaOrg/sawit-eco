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
  CheckBox,
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
  Title,
  Text,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';
import type { FioriState } from '@/lib/fiori-status';

export interface ProductItem {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  harga: number;
  satuan: string;
  stok: number;
  isActive: boolean;
}

export interface BlockOption {
  kode: string;
  luasHa: number;
}

export interface GapItem {
  id: string;
  targetSku: string;
  alasan: string;
  status: string;
  createdAt: string;
}

interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  kategori: string;
  harga: number;
  satuan: string;
  kuantitas: number;
  subtotal: number;
  blokKode: string;
}

interface CartData {
  id: string | null;
  items: CartItemData[];
  total: number;
  count: number;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };
const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

type StockLabelKey =
  | 'commerce:list.stock_inactive'
  | 'commerce:list.stock_out'
  | 'commerce:list.stock_low'
  | 'commerce:list.stock_available';

function stockInfo(p: ProductItem): { state: FioriState; labelKey: StockLabelKey } {
  if (!p.isActive) return { state: 'None', labelKey: 'commerce:list.stock_inactive' };
  if (p.stok <= 0) return { state: 'Negative', labelKey: 'commerce:list.stock_out' };
  if (p.stok < 10) return { state: 'Critical', labelKey: 'commerce:list.stock_low' };
  return { state: 'Positive', labelKey: 'commerce:list.stock_available' };
}

export default function CommerceCatalog({
  products,
  blocks = [],
  gaps,
  tenantNama,
}: {
  products: ProductItem[];
  blocks?: BlockOption[];
  gaps: GapItem[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['commerce', 'common']);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [kategori, setKategori] = React.useState('ALL');
  const [toastMessage, setToastMessage] = React.useState<{
    text: string;
    design: 'Positive' | 'Negative';
  } | null>(null);

  // Cart state
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cart, setCart] = React.useState<CartData>({ id: null, items: [], total: 0, count: 0 });
  const [cartLoading, setCartLoading] = React.useState(false);
  const [estimateAcknowledged, setEstimateAcknowledged] = React.useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);

  // Add Item to Cart modal state
  const [selectedProduct, setSelectedProduct] = React.useState<ProductItem | null>(null);
  const [addQty, setAddQty] = React.useState('1');
  const [selectedBlock, setSelectedBlock] = React.useState(blocks[0]?.kode || 'A1');
  const [addBusy, setAddBusy] = React.useState(false);

  const kategoriOptions = Array.from(new Set(products.map((p) => p.kategori)));

  const loadCart = React.useCallback(async () => {
    try {
      setCartLoading(true);
      const res = await fetch('/api/commerce/cart');
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
      }
    } catch {
      // Ignore background cart loading error
    } finally {
      setCartLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    const initialFetch = async () => {
      try {
        const res = await fetch('/api/commerce/cart');
        const json = await res.json();
        if (active && json.success && json.data) {
          setCart(json.data);
        }
      } catch {
        // Ignore background cart loading error
      }
    };
    initialFetch();
    return () => {
      active = false;
    };
  }, []);

  const handleOpenCart = () => {
    loadCart();
    setCartOpen(true);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    const qty = Number(addQty) || 1;
    if (qty <= 0) return;

    setAddBusy(true);
    try {
      const res = await fetch('/api/commerce/cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: qty,
          blockCode: selectedBlock,
          recommendationReason: `Pembelian sarana produksi blok ${selectedBlock}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal tambah ke keranjang');
      }
      setToastMessage({
        text: String(t('commerce:cart.add_success')),
        design: 'Positive' as const,
      });
      setSelectedProduct(null);
      await loadCart();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : 'Gagal tambah ke keranjang',
        design: 'Negative',
      });
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      await fetch(`/api/commerce/cart?itemId=${itemId}`, { method: 'DELETE' });
      await loadCart();
    } catch {
      // Error handling
    }
  };

  const handleCheckout = async () => {
    if (!cart.id || cart.items.length === 0 || !estimateAcknowledged) return;

    setCheckoutSubmitting(true);
    try {
      const res = await fetch('/api/commerce/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          cartId: cart.id,
          estimateAcknowledged: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal checkout');
      }
      setToastMessage({
        text: String(t('commerce:cart.checkout_success')),
        design: 'Positive' as const,
      });
      setCartOpen(false);
      await loadCart();
      router.push('/commerce/orders');
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : 'Gagal checkout',
        design: 'Negative',
      });
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query || [p.sku, p.nama, p.kategori].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (kategori === 'ALL' || p.kategori === kategori);
  });

  const columns = [
    { Header: t('commerce:list.column_sku'), accessor: 'sku' },
    { Header: t('common:column.product'), accessor: 'nama' },
    { Header: t('common:column.category'), accessor: 'kategori' },
    {
      Header: t('common:column.price'),
      accessor: 'harga',
      Cell: (p: CellProps) => {
        const item = p.cell.row.original as unknown as ProductItem;
        return <span>{`${currency.format(item.harga)} / ${item.satuan}`}</span>;
      },
    },
    { Header: t('common:column.stock'), accessor: 'stok' },
    {
      Header: t('common:column.status'),
      accessor: 'isActive',
      Cell: (p: CellProps) => {
        const info = stockInfo(p.cell.row.original as unknown as ProductItem);
        return (
          <ObjectStatus state={info.state} showDefaultIcon>
            {t(info.labelKey)}
          </ObjectStatus>
        );
      },
    },
    {
      Header: t('common:column.action'),
      accessor: 'id',
      Cell: (p: CellProps) => {
        const item = p.cell.row.original as unknown as ProductItem;
        return (
          <Button
            design="Transparent"
            icon={fioriIcons['cart']}
            disabled={!item.isActive || item.stok <= 0}
            onClick={() => {
              setSelectedProduct(item);
              setAddQty('1');
            }}
          >
            {t('commerce:cart.add')}
          </Button>
        );
      },
    },
  ];

  const gapColumns = [
    { Header: t('common:column.date'), accessor: 'createdAt' },
    { Header: t('commerce:list.column_required_sku'), accessor: 'targetSku' },
    { Header: t('commerce:list.column_reason'), accessor: 'alasan' },
    {
      Header: t('common:column.status'),
      accessor: 'status',
      Cell: () => (
        <ObjectStatus state="Critical" showDefaultIcon>
          {t('commerce:list.gap_status')}
        </ObjectStatus>
      ),
    },
  ];

  return (
    <FioriPage
      title={t('commerce:list.page_title')}
      subtitle={t('commerce:list.subtitle', { tenant: tenantNama, total: products.length })}
      breadcrumb={t('commerce:list.breadcrumb')}
      actions={
        <Button design="Emphasized" icon={fioriIcons['cart']} onClick={handleOpenCart}>
          {cart.count > 0
            ? `${t('commerce:cart.open_cart')} (${cart.count})`
            : t('commerce:cart.open_cart')}
        </Button>
      }
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('commerce:list.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setKategori('ALL');
          }}
          search={
            <Input
              placeholder={t('commerce:list.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="kategori" label={t('commerce:list.filter_category_label')}>
            <Select
              value={kategori}
              onChange={(e) => setKategori(e.detail.selectedOption.value ?? 'ALL')}
            >
              <Option value="ALL">{t('common:filter.all_category')}</Option>
              {kategoriOptions.map((k) => (
                <Option key={k} value={k}>
                  {k}
                </Option>
              ))}
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

        {gaps.length > 0 ? (
          <MessageStrip design="Critical" hideCloseButton>
            {t('commerce:list.gaps_open', { total: gaps.length })}
          </MessageStrip>
        ) : null}

        <Card>
          <div style={{ padding: '1rem' }}>
            {products.length === 0 ? (
              <FioriEmptyState
                titleText={t('commerce:list.empty_title')}
                subtitleText={t('commerce:list.empty_subtitle')}
              />
            ) : (
              <AnalyticalTable
                columns={columns}
                data={filtered}
                filterable
                sortable
                visibleRows={10}
                noDataText={t('commerce:list.no_data')}
                accessibleName={t('commerce:list.table_accessible_name')}
              />
            )}
          </div>
        </Card>

        {gaps.length > 0 ? (
          <Card
            header={
              <CardHeader
                titleText={t('commerce:list.gap_card_title')}
                subtitleText={t('commerce:list.gap_card_subtitle')}
                avatar={<Icon name={fioriIcons['alert']} />}
              />
            }
          >
            <div style={{ padding: '0 1rem 1rem' }}>
              <AnalyticalTable
                columns={gapColumns}
                data={gaps}
                sortable
                visibleRows={5}
                noDataText={t('commerce:list.gap_no_data')}
                accessibleName={t('commerce:list.gap_table_accessible_name')}
              />
            </div>
          </Card>
        ) : null}
      </div>

      {/* Dialog Tambah ke Keranjang */}
      <Dialog
        open={Boolean(selectedProduct)}
        headerText={selectedProduct?.nama || t('commerce:cart.add')}
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
            <Button design="Transparent" onClick={() => setSelectedProduct(null)}>
              {t('common:action.cancel')}
            </Button>
            <Button
              design="Emphasized"
              loading={addBusy}
              disabled={addBusy}
              onClick={handleAddToCart}
            >
              {t('commerce:cart.add')}
            </Button>
          </div>
        }
      >
        {selectedProduct && (
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minWidth: '380px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--sapList_BorderColor)',
                paddingBottom: '0.5rem',
              }}
            >
              <span>{t('commerce:list.column_sku')}:</span>
              <strong>{selectedProduct.sku}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('common:column.price')}:</span>
              <strong>{`${currency.format(selectedProduct.harga)} / ${selectedProduct.satuan}`}</strong>
            </div>

            <div>
              <Label required>{t('commerce:cart.target_block')}</Label>
              <Select
                style={{ width: '100%' }}
                onChange={(e) => setSelectedBlock(e.detail.selectedOption.value || 'A1')}
              >
                {blocks.map((b) => (
                  <Option key={b.kode} value={b.kode} selected={selectedBlock === b.kode}>
                    {`Blok ${b.kode} (${b.luasHa} Ha)`}
                  </Option>
                ))}
                {blocks.length === 0 && (
                  <Option value="A1">{t('commerce:cart.default_block')}</Option>
                )}
              </Select>
            </div>

            <div>
              <Label required>{t('commerce:cart.quantity')}</Label>
              <Input
                type="Number"
                value={String(addQty)}
                style={{ width: '100%' }}
                onInput={(e) => setAddQty(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--sapList_BorderColor)',
              }}
            >
              <span>{t('commerce:cart.subtotal')}:</span>
              <strong style={{ color: 'var(--sapPositiveColor)', fontSize: '1.125rem' }}>
                {currency.format((Number(addQty) || 0) * selectedProduct.harga)}
              </strong>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog Keranjang Belanja & Checkout */}
      <Dialog
        open={cartOpen}
        headerText={t('commerce:cart.title')}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0.5rem',
            }}
          >
            <Button design="Transparent" onClick={() => setCartOpen(false)}>
              {t('common:action.close')}
            </Button>
            {cart.items.length > 0 && (
              <Button
                design="Emphasized"
                loading={checkoutSubmitting}
                disabled={checkoutSubmitting || !estimateAcknowledged}
                onClick={handleCheckout}
              >
                {t('commerce:cart.checkout')}
              </Button>
            )}
          </div>
        }
      >
        <div
          style={{
            padding: '1rem',
            minWidth: '500px',
            maxWidth: '650px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {cartLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>{t('commerce:cart.loading')}</div>
          ) : cart.items.length === 0 ? (
            <FioriEmptyState
              titleText={t('commerce:cart.empty')}
              subtitleText={t('commerce:cart.empty_desc')}
            />
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  maxHeight: '350px',
                  overflowY: 'auto',
                }}
              >
                {cart.items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--sapList_Background)',
                      border: '1px solid var(--sapList_BorderColor)',
                    }}
                  >
                    <div>
                      <Text style={{ fontWeight: 600, display: 'block' }}>{it.productName}</Text>
                      <span
                        style={{ fontSize: '0.8125rem', color: 'var(--sapContent_LabelColor)' }}
                      >
                        {`${it.sku} · Blok ${it.blokKode} · ${it.kuantitas} ${it.satuan} @ ${currency.format(it.harga)}`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <strong style={{ color: 'var(--sapPositiveColor)' }}>
                        {currency.format(it.subtotal)}
                      </strong>
                      <Button
                        design="Transparent"
                        icon={fioriIcons['delete']}
                        tooltip="Hapus"
                        onClick={() => handleRemoveCartItem(it.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: '2px solid var(--sapList_BorderColor)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Title level="H4">{t('commerce:cart.total')}:</Title>
                <Title level="H3" style={{ color: 'var(--sapPositiveColor)' }}>
                  {currency.format(cart.total)}
                </Title>
              </div>

              <div style={{ padding: '0.5rem 0' }}>
                <CheckBox
                  text={t('commerce:cart.disclaimer_ack')}
                  checked={estimateAcknowledged}
                  onChange={(e) => setEstimateAcknowledged(e.target.checked)}
                />
              </div>
            </>
          )}
        </div>
      </Dialog>
    </FioriPage>
  );
}
