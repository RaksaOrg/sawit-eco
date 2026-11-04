
import React from 'react';
import {
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
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { useSubmitOrder } from '../core/api/hooks';

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

const tokens = foundationTokens;

const formatCurrency = (amount: number) =>
  `Rp ${amount.toLocaleString('id-ID')}`;

export function CartScreen({ navigation }: CartScreenProps) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const cart = useMobileAppStore((s) => s.cart);
  const removeFromCart = useMobileAppStore((s) => s.removeFromCart);

  const submitOrderMutation = useSubmitOrder();

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [orderNotice, setOrderNotice] =
    React.useState<OrderNotice | null>(null);

  const t = createTranslator(language);

  const selectedItems = cart.filter((item) =>
    selectedIds.includes(item.productId),
  );

  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const selectedQuantity = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const isAllSelected =
    cart.length > 0 && selectedItems.length === cart.length;

  const toggleItem = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      isAllSelected ? [] : cart.map((item) => item.productId),
    );
  };

  const handleCheckout = async () => {
    if (
      selectedItems.length === 0 ||
      !session?.userId ||
      isSubmitting
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
          quantity: item.quantity,
          blockCode: item.blockCode,
          recommendationReason: item.reason,
        })),
      });

      const order = response?.order;

      // Remove only successfully checked-out products.
      checkoutItems.forEach((item) => {
        removeFromCart(item.productId);
      });

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
      console.error('Checkout failed:', error);

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
              : 'Checkout Gagal'}
          </Text>

          <Text style={styles.noticeMessage}>
            {orderNotice.message}
          </Text>

          {orderNotice.orderId && (
            <View style={styles.infoRow}>
              <Text style={styles.metaText}>Nomor pesanan</Text>
              <Text style={styles.infoValue}>
                {orderNotice.orderId}
              </Text>
            </View>
          )}

          {orderNotice.totalAmount != null && (
            <View style={styles.infoRow}>
              <Text style={styles.metaText}>Total pesanan</Text>
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
          {cart.length} produk
        </Text>
      </View>

      {cart.length === 0 ? (
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
              disabled={isSubmitting}
            >
              <Ionicons
                name={isAllSelected ? 'checkmark-circle' : 'ellipse-outline'}
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
            {cart.map((item) => {
              const isSelected = selectedIds.includes(item.productId);

              return (
                <AppCard
                  key={item.productId}
                  style={styles.cartCard}
                >
                  <View style={styles.itemRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleItem(item.productId)}
                      disabled={isSubmitting}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Pilih ${item.name}`}
                    >
                      <Ionicons
                        name={
                          isSelected ? 'checkmark-circle' : 'ellipse-outline'
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
                          {item.quantity} × {formatCurrency(item.price)}
                        </Text>

                        <Text style={styles.itemPrice}>
                          {formatCurrency(item.price * item.quantity)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        removeFromCart(item.productId);
                        setSelectedIds((current) =>
                          current.filter((id) => id !== item.productId),
                        );
                      }}
                      disabled={isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus ${item.name}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color={semanticTokens.color.error}
                      />
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
                disabled={!session?.userId || isSubmitting}
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
    paddingLeft: tokens.spacing.sm,
    paddingTop: tokens.spacing['2xs'],
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
