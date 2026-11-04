import React, { useEffect, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppScreen,
} from '../components/AppComponents';

import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore, CartItem } from '../state/store';
import { createTranslator } from '../i18n';
import { useSubmitOrder } from '../core/api/hooks';
import { apiRequest } from '../core/api/client';

type OrderNotice = {
  type: 'success' | 'error';
  message: string;
  orderId?: string;
  totalAmount?: number;
};

type CartScreenProps = {
  navigation?: {
    navigate: (screen: string) => void;
  };
};

type BackendCartItem = {
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
  recommendationId: string | null;
  alasanRekomendasi: string | null;
};

type BackendCartResponse = {
  id: string;
  items: BackendCartItem[];
  total: number;
  count: number;
};

type CartRow = CartItem & {
  cartItemId: string;
};

const tokens = foundationTokens;

const formatCurrency = (amount: number) =>
  `Rp ${(Number(amount) || 0).toLocaleString('id-ID')}`;

export function CartScreen({ navigation }: CartScreenProps) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const cart = useMobileAppStore((s) => s.cart);
  const addToCart = useMobileAppStore((s) => s.addToCart);
  const clearCart = useMobileAppStore((s) => s.clearCart);
  const removeFromCart = useMobileAppStore((s) => s.removeFromCart);

  const submitOrderMutation = useSubmitOrder();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [orderNotice, setOrderNotice] =
    useState<OrderNotice | null>(null);

  const t = createTranslator(language);

  // CART FETCH
  const fetchCartFromBackend = useCallback(async () => {
    try {
      const response = await apiRequest<BackendCartResponse>(
        '/api/commerce/cart',
      );

      console.log(
        '[CART BACKEND RESPONSE]',
        JSON.stringify(response, null, 2),
      );

      const backendItems = Array.isArray(response?.items)
        ? response.items
        : [];

      const normalizedCart: CartRow[] = backendItems
        .filter(
          (item) =>
            item != null &&
            typeof item.id === 'string' &&
            typeof item.productId === 'string' &&
            item.productId.length > 0,
        )
        .map((item) => ({
          cartItemId: item.id,
          productId: item.productId,
          name: item.productName ?? '',
          sku: item.sku ?? '',
          price: Number(item.harga) || 0,
          quantity: Number(item.kuantitas) || 0,
          blockCode: item.blokKode ?? 'B2',
          recommendationId: item.recommendationId ?? undefined,
          reason: item.alasanRekomendasi ?? undefined,
        }));

      // Replace local cart with backend snapshot.
      clearCart();

      normalizedCart.forEach((item) => {
        addToCart(item);
      });

      // Keep only selections that still exist.
      const validIds = normalizedCart.map(
        (item) => item.cartItemId,
      );

      setSelectedIds((current) =>
        current.filter((id) => validIds.includes(id)),
      );

      return normalizedCart;
    } catch (err) {
      console.error('[CART] Failed to fetch:', err);
      throw err;
    }
  }, [addToCart, clearCart]);

  // INITIAL FETCH
  useEffect(() => {
    if (session?.userId) {
      void fetchCartFromBackend().catch(() => {});
    }
  }, [session?.userId, fetchCartFromBackend]);

  // VALID CART
  const validCart = (cart ?? []).filter(
    (item): item is CartRow =>
      item != null &&
      typeof item.productId === 'string' &&
      item.productId.length > 0 &&
      typeof (item as CartRow).cartItemId === 'string',
  );

  const getCartRowId = (item: CartRow) =>
    item.cartItemId;

  const selectedItems = validCart.filter((item) =>
    selectedIds.includes(getCartRowId(item)),
  );

  const getSafeNumber = (value: unknown, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const selectedTotal = selectedItems.reduce(
    (sum, item) =>
      sum +
      getSafeNumber(item.price) *
        getSafeNumber(item.quantity),
    0,
  );

  const selectedQuantity = selectedItems.reduce(
    (sum, item) =>
      sum + getSafeNumber(item.quantity),
    0,
  );

  const isAllSelected =
    validCart.length > 0 &&
    selectedItems.length === validCart.length;

  const isDeleting = deletingIds.length > 0;

  // SELECTION
  const toggleItem = (cartRowId: string) => {
    if (isSubmitting || isDeleting) return;

    setSelectedIds((current) =>
      current.includes(cartRowId)
        ? current.filter((id) => id !== cartRowId)
        : [...current, cartRowId],
    );
  };

  const toggleSelectAll = () => {
    if (isSubmitting || isDeleting) return;

    setSelectedIds(
      isAllSelected
        ? []
        : validCart.map(getCartRowId),
    );
  };

  // DELETE CART ITEM
  const handleDeleteCartItem = async (item: CartRow) => {
    const cartItemId = item.cartItemId;

    if (
      !cartItemId ||
      deletingIds.includes(cartItemId) ||
      isSubmitting
    ) {
      return;
    }

    setDeletingIds((current) => [...current, cartItemId]);
    setOrderNotice(null);

    try {
      console.log('[CART DELETE] Request:', {
        itemId: cartItemId,
        productId: item.productId,
      });

      // 1. Delete actual cart row from backend.
      await apiRequest(
        `/api/commerce/cart?itemId=${encodeURIComponent(cartItemId)}`,
        {
          method: 'DELETE',
        },
      );

      console.log('[CART DELETE] Backend success:', cartItemId);

      // 2. Refresh backend snapshot.
      // This also removes the deleted item from Zustand.
      await fetchCartFromBackend();

      // 3. Remove selection for deleted row.
      setSelectedIds((current) =>
        current.filter((id) => id !== cartItemId),
      );

      setOrderNotice(null);
    } catch (error) {
      console.error('[CART DELETE FAILED]', error);

      setOrderNotice({
        type: 'error',
        message: 'Gagal menghapus produk dari keranjang. Silakan coba lagi.',
      });

      // Do not remove item from Zustand when backend delete fails.
    } finally {
      setDeletingIds((current) =>
        current.filter((id) => id !== cartItemId),
      );
    }
  };

  // CHECKOUT
  const handleCheckout = async () => {
    if (
      selectedItems.length === 0 ||
      !session?.userId ||
      isSubmitting ||
      isDeleting
    ) {
      return;
    }

    const checkoutItems = [...selectedItems];
    const checkoutTotal = selectedTotal;

    setIsSubmitting(true);
    setOrderNotice(null);

    try {
      const response = await submitOrderMutation.mutateAsync({
        userId: session.userId,
        estimateAcknowledged: true,
        idempotencyKey: `checkout-${session.userId}-${Date.now()}`,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          quantity: getSafeNumber(item.quantity),
          blockCode: item.blockCode,
          recommendationReason: item.reason,
        })),
      });

      const order = response?.order;

      // Checkout success must not be reported as failed
      // just because refreshing cart fails.
      try {
        await fetchCartFromBackend();
      } catch (refreshError) {
        console.error(
          '[CART] Refresh after checkout failed:',
          refreshError,
        );
      }

      setSelectedIds([]);

      setOrderNotice({
        type: 'success',
        message:
          order?.status === 'APPROVED'
            ? 'Pesanan berhasil dikirim!'
            : 'Pesanan berhasil dibuat, menunggu persetujuan!',
        orderId: order?.id,
        totalAmount: order?.totalHarga ?? checkoutTotal,
      });
    } catch (error) {
      console.error('[CHECKOUT FAILED]', error);

      setOrderNotice({
        type: 'error',
        message: 'Terjadi kesalahan saat checkout',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen>
      {/* ORDER NOTICE */}
      {orderNotice && (
        <View
          style={[
            styles.noticeCard,
            orderNotice.type === 'success'
              ? styles.successCard
              : styles.errorCard,
          ]}
        >
          <Ionicons
            name={
              orderNotice.type === 'success'
                ? 'checkmark-circle'
                : 'alert-circle'
            }
            size={40}
            color={
              orderNotice.type === 'success'
                ? semanticTokens.color.success
                : semanticTokens.color.error
            }
          />

          <Text style={styles.noticeTitle}>
            {orderNotice.type === 'success'
              ? 'Pesanan Berhasil!'
              : 'Checkout / Cart Gagal'}
          </Text>

          <Text style={styles.noticeMessage}>
            {orderNotice.message}
          </Text>

          {orderNotice.orderId && (
            <View style={styles.infoRow}>
              <Text style={styles.metaText}>
                Nomor pesanan
              </Text>

              <Text style={styles.infoValue}>
                {orderNotice.orderId}
              </Text>
            </View>
          )}

          {orderNotice.totalAmount != null && (
            <View style={styles.infoRow}>
              <Text style={styles.metaText}>
                Total pesanan
              </Text>

              <Text style={styles.infoValue}>
                {formatCurrency(orderNotice.totalAmount)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('commerce.cart.title')}
        </Text>

        <Text style={styles.itemCount}>
          {validCart.length} produk
        </Text>
      </View>

      {validCart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppEmptyState
            icon="cart-outline"
            title="Keranjang Kosong"
            subtitle="Belum ada produk yang dipilih dari tab Pengadaan"
          />
        </View>
      ) : (
        <>
          {/* SELECT ALL */}
          <View style={styles.selectionHeader}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={toggleSelectAll}
              disabled={isSubmitting || isDeleting}
            >
              <Ionicons
                name={
                  isAllSelected
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={21}
                color={
                  isAllSelected
                    ? semanticTokens.color.brand
                    : semanticTokens.color.textSecondary
                }
              />

              <Text style={styles.selectAllText}>
                Pilih Semua
              </Text>
            </TouchableOpacity>

            <Text style={styles.selectedCount}>
              {selectedItems.length} dipilih
            </Text>
          </View>

          {/* CART ITEMS */}
          <View style={styles.cartItems}>
            {validCart.map((item) => {
              const cartRowId = getCartRowId(item);
              const isSelected = selectedIds.includes(cartRowId);
              const itemPrice = getSafeNumber(item.price);
              const itemQuantity = getSafeNumber(item.quantity);
              const itemDeleting = deletingIds.includes(cartRowId);

              return (
                <AppCard
                  key={cartRowId}
                  style={styles.cartCard}
                >
                  <View style={styles.itemRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleItem(cartRowId)}
                      disabled={isSubmitting || isDeleting}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: isSelected,
                      }}
                      accessibilityLabel={`Pilih ${item.name}`}
                    >
                      <Ionicons
                        name={
                          isSelected
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={23}
                        color={
                          isSelected
                            ? semanticTokens.color.brand
                            : semanticTokens.color.textSecondary
                        }
                      />
                    </TouchableOpacity>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>
                        {item.name}
                      </Text>

                      <Text style={styles.metaText}>
                        {item.sku}
                      </Text>

                      {!!item.blockCode && (
                        <Text style={styles.metaText}>
                          Blok: {item.blockCode}
                        </Text>
                      )}

                      {!!item.reason && (
                        <Text style={styles.metaText}>
                          {item.reason}
                        </Text>
                      )}

                      <View style={styles.itemFooter}>
                        <Text style={styles.quantity}>
                          {itemQuantity} × {formatCurrency(itemPrice)}
                        </Text>

                        <Text style={styles.itemPrice}>
                          {formatCurrency(itemPrice * itemQuantity)}
                        </Text>
                      </View>
                    </View>

                    {/* DELETE */}
                    <TouchableOpacity
                      style={[
                        styles.deleteButton,
                        itemDeleting && styles.deleteButtonLoading,
                      ]}
                      onPress={() => handleDeleteCartItem(item)}
                      disabled={
                        isSubmitting ||
                        isDeleting
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus ${item.name}`}
                    >
                      {itemDeleting ? (
                        <ActivityIndicator
                          size="small"
                          color={semanticTokens.color.error}
                        />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color={semanticTokens.color.error}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </AppCard>
              );
            })}
          </View>

          {/* CHECKOUT SUMMARY */}
          {selectedItems.length > 0 && (
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {selectedQuantity} item dipilih
                </Text>

                <Text style={styles.summaryTotal}>
                  {formatCurrency(selectedTotal)}
                </Text>
              </View>

              <AppButton
                label="Checkout Sekarang"
                variant="primary"
                fullWidth
                onPress={handleCheckout}
                disabled={
                  !session?.userId ||
                  isSubmitting ||
                  isDeleting
                }
                loading={isSubmitting}
              />
            </View>
          )}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: semanticTokens.color.border,
  },

  title: {
    fontSize: tokens.typography.title.size,
    fontWeight: tokens.typography.title.weight,
    color: semanticTokens.color.textPrimary,
  },

  itemCount: {
    fontSize: tokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },

  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },

  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },

  selectAllText: {
    fontSize: tokens.typography.bodyMedium.size,
    fontWeight: '600',
    color: semanticTokens.color.textPrimary,
  },

  selectedCount: {
    fontSize: tokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
  },

  cartItems: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
  },

  cartCard: {
    marginBottom: tokens.spacing.md,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  checkbox: {
    paddingTop: tokens.spacing['2xs'],
    paddingRight: tokens.spacing.sm,
  },

  itemInfo: {
    flex: 1,
  },

  itemName: {
    fontSize: tokens.typography.bodyMedium.size,
    fontWeight: '600',
    color: semanticTokens.color.textPrimary,
  },

  metaText: {
    fontSize: tokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    marginTop: tokens.spacing['2xs'],
  },

  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: tokens.borderWidth.default,
    borderTopColor: semanticTokens.color.border,
  },

  quantity: {
    fontSize: tokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
  },

  itemPrice: {
    fontSize: tokens.typography.bodyMedium.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },

  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    backgroundColor: semanticTokens.badge.error.background,
  },

  deleteButtonLoading: {
    opacity: 0.65,
  },

  summary: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderTopWidth: tokens.borderWidth.default,
    borderTopColor: semanticTokens.color.border,
    gap: tokens.spacing.md,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryLabel: {
    fontSize: tokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
  },

  summaryTotal: {
    fontSize: tokens.typography.title.size,
    fontWeight: '700',
    color: semanticTokens.color.brand,
  },

  noticeCard: {
    margin: tokens.spacing.md,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: tokens.borderWidth.default,
    gap: tokens.spacing.sm,
  },

  successCard: {
    backgroundColor: semanticTokens.badge.success.background,
    borderColor: semanticTokens.color.success,
  },

  errorCard: {
    backgroundColor: semanticTokens.badge.error.background,
    borderColor: semanticTokens.color.error,
  },

  noticeTitle: {
    fontSize: tokens.typography.labelLarge.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },

  noticeMessage: {
    fontSize: tokens.typography.bodyMedium.size,
    lineHeight: tokens.typography.bodyMedium.lineHeight,
    color: semanticTokens.color.textSecondary,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing['2xs'],
  },

  infoValue: {
    fontSize: tokens.typography.bodyMedium.size,
    fontWeight: '600',
    color: semanticTokens.color.textPrimary,
  },
});