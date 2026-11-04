import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppLoadingState,
  AppScreen,
} from '../components/AppComponents';

import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore, CartItem } from '../state/store';
import { createTranslator } from '../i18n';
import { useCatalog, CatalogProduct } from '../core/api/hooks';
import { apiRequest } from '../core/api/client';

const tTokens = foundationTokens;

type OrderNotice = {
  type: 'success' | 'error';
  message: string;
  orderId?: string;
  totalAmount?: number;
  status?: string;
};

type CheckoutResponse = {
  success?: boolean;
  order?: {
    id?: string;
    status?: string;
    totalAmount?: number;
  };
};

export function CommerceScreen({
  navigation,
}: {
  navigation?: {
    navigate: (screen: string, params?: unknown) => void;
  };
}) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const cart = useMobileAppStore((s) => s.cart);

  const addToCart = useMobileAppStore((s) => s.addToCart);
  const clearCart = useMobileAppStore((s) => s.clearCart);
  const removeFromCart = useMobileAppStore(
    (s) => s.removeFromCart,
  );

  const t = createTranslator(language);

  const {
    data: products,
    isLoading,
    refetch,
  } = useCatalog();

  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNotice, setOrderNotice] = useState<OrderNotice | null>(
    null,
  );

  const totalCart = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const totalCartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Reset acknowledgment when cart becomes empty.
  useEffect(() => {
    if (cart.length === 0) {
      setAcknowledged(false);
    }
  }, [cart.length]);

  // CHECKOUT
  const handleCheckout = async () => {
    if (
      !session?.userId ||
      cart.length === 0 ||
      !acknowledged ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    setOrderNotice(null);

    const idempotencyKey = [
      'checkout',
      session.userId,
      Date.now(),
      ...cart.map((item) => item.productId),
    ].join('-');

    try {
      const response = await apiRequest(
        '/api/commerce/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'mobile-checkout',
            userId: session.userId,
            estimateAcknowledged: true,
            idempotencyKey,
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              blockCode: item.blockCode,
              recommendationId: item.recommendationId,
              recommendationReason: item.reason,
            })),
          }),
        },
      ) as CheckoutResponse;

      const order = response?.order;

      clearCart();
      setAcknowledged(false);

      setOrderNotice({
        type: 'success',
        message: t('commerce.orderSubmitted'),
        orderId: order?.id,
        totalAmount: order?.totalAmount,
        status: order?.status,
      });
    } catch (err) {
      let errorMessage: string = t('commerce.order_failed');

      if (err instanceof Error) {
        const errorCode = err.message;

        const errorMessages: Record<string, string> = {
          OUT_OF_STOCK:
            'Stok tidak mencukupi. Silakan pilih produk lain.',
          PRICE_CHANGED:
            'Harga produk telah berubah. Silakan refresh katalog.',
          INVALID_PRODUCT:
            'Produk yang dipilih tidak valid.',
          UNAUTHORIZED:
            'Sesi kamu telah berakhir. Silakan login kembali.',
          ORDER_ALREADY_EXISTS:
            'Pesanan sudah pernah diproses. Silakan periksa riwayat pesanan.',
          STOCK_VALIDATION_FAILED:
            'Validasi stok gagal. Silakan hubungi admin.',
        };

        errorMessage = errorMessages[errorCode] ?? errorMessage;
      }

      setOrderNotice({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // REMOVE CART ITEM
  const handleRemoveFromCart = (productId: string) => {
    if (isSubmitting) return;

    removeFromCart(productId);
    setOrderNotice(null);
  };

  // ADD PRODUCT TO CART
  const handleAddToCart = (product: CatalogProduct) => {
    if (product.stok <= 0) return;

    setOrderNotice(null);

    addToCart({
      productId: product.id,
      name: product.nama,
      sku: product.sku,
      price: product.harga,
      quantity: 1,
      blockCode: 'B2',
    });
  };

  // ADD AGRONOMY RECOMMENDATION
  const handleAddRecommendation = () => {
    const product =
      products?.find((item) => item.sku === 'FERT-KCL-25') ??
      products?.[0];

    if (!product || product.stok <= 0) return;

    setOrderNotice(null);

    addToCart({
      productId: product.id,
      name: product.nama,
      sku: product.sku,
      price: product.harga,
      quantity: 12,
      blockCode: 'B2',
      reason: 'Defisiensi Kalium Blok B2',
    });
  };

  return (
    <AppScreen>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.brandGroup}>
          <Image
            source={require('../../assets/brand-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.brandTextCol}>
            <Text style={styles.brandSawit}>
              {t('login.brand1')}
            </Text>

            <Text style={styles.brandEco}>
              {t('login.brand2')}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.bellButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={semanticTokens.color.brand}
            />
          </Pressable>

          <View style={styles.cartBtnWrapper}>
            <Pressable
              style={styles.cartButton}
              hitSlop={8}
              onPress={() => navigation?.navigate('Cart')}
              accessibilityRole="button"
              accessibilityLabel="Shopping cart"
              accessibilityState={{
                selected: cart.length > 0,
              }}
            >
              <Ionicons
                name="cart-outline"
                size={20}
                color={semanticTokens.color.textPrimary}
              />

              {totalCartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {totalCartCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* TITLE */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>
          {t('commerce.title')}
        </Text>

        <Text style={styles.mainSubtitle}>
          {t('commerce.subtitle')}
        </Text>
      </View>

      {/* ORDER SUCCESS / ERROR */}
      {orderNotice && (
        <AppCard
          style={[
            styles.noticeCard,
            orderNotice.type === 'success'
              ? styles.successCard
              : styles.errorCard,
          ]}
        >
          <View style={styles.noticeIconWrapper}>
            <Ionicons
              name={
                orderNotice.type === 'success'
                  ? 'checkmark-circle'
                  : 'alert-circle'
              }
              size={48}
              color={
                orderNotice.type === 'success'
                  ? semanticTokens.color.success
                  : semanticTokens.color.error
              }
            />
          </View>

          <Text style={styles.noticeTitle}>
            {orderNotice.type === 'success'
              ? 'Pesanan berhasil dikirim!'
              : 'Checkout gagal'}
          </Text>

          <Text style={styles.noticeMessage}>
            {orderNotice.message}
          </Text>

          {orderNotice.orderId && (
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>
                Nomor pesanan
              </Text>

              <Text style={styles.orderInfoValue}>
                {orderNotice.orderId}
              </Text>
            </View>
          )}

          {orderNotice.totalAmount != null && (
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>
                Total pesanan
              </Text>

              <Text style={styles.orderInfoValue}>
                Rp {orderNotice.totalAmount.toLocaleString('id-ID')}
              </Text>
            </View>
          )}

          {orderNotice.status && (
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>
                Status
              </Text>

              <Text style={styles.orderInfoValue}>
                {orderNotice.status}
              </Text>
            </View>
          )}

          {orderNotice.type === 'success' ? (
            <AppButton
              label="Lihat Pesanan"
              variant="primary"
              onPress={() =>
                navigation?.navigate('OrderHistory')
              }
              fullWidth
              height={46}
              radius={tTokens.radius.md}
            />
          ) : (
            <AppButton
              label="Coba Lagi"
              variant="primary"
              onPress={() => setOrderNotice(null)}
              fullWidth
              height={46}
              radius={tTokens.radius.md}
            />
          )}
        </AppCard>
      )}

      {/* CART / AJUKAN PESANAN */}
      {cart.length > 0 && (
        <AppCard style={styles.cartCard}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>
              {t('commerce.cart')}
            </Text>

            <Text style={styles.cartCount}>
              {totalCartCount} item
            </Text>
          </View>

          {cart.map((item: CartItem) => (
            <View
              key={item.productId}
              style={styles.cartItem}
            >
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>
                  {item.name} ({item.sku})
                </Text>

                <Text style={styles.cartItemMeta}>
                  {t('attendance.blockLabel')} {item.blockCode}
                  {' · '}
                  {item.quantity} {t('commerce.unit_sack')}
                </Text>
              </View>

              <View style={styles.cartItemActions}>
                <Text style={styles.cartItemPrice}>
                  Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                </Text>

                <Pressable
                  style={styles.deleteCartButton}
                  onPress={() =>
                    handleRemoveFromCart(item.productId)
                  }
                  disabled={isSubmitting}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Hapus ${item.name} dari keranjang`}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={semanticTokens.color.error}
                  />
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.cartDivider} />

          {/* TOTAL */}
          <View style={styles.cartItem}>
            <Text style={styles.cartTotalLabel}>
              {t('commerce.cartTotal')}
            </Text>

            <Text style={styles.cartTotalValue}>
              Rp {totalCart.toLocaleString('id-ID')}
            </Text>
          </View>

          {/* ACKNOWLEDGMENT */}
          <View style={styles.ackRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={t('commerce.acknowledge')}
              accessibilityState={{
                checked: acknowledged,
              }}
              onPress={() =>
                setAcknowledged((previous) => !previous)
              }
              style={styles.checkboxPressable}
            >
              <View
                style={[
                  styles.customCheckbox,
                  acknowledged && styles.customCheckboxChecked,
                ]}
              >
                {acknowledged && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color="#FFFFFF"
                  />
                )}
              </View>
            </Pressable>

            <Text style={styles.ackText}>
              {t('commerce.acknowledge')}
            </Text>
          </View>

          {/* CHECKOUT */}
          <AppButton
            label={t('commerce.checkout')}
            variant="primary"
            onPress={handleCheckout}
            disabled={!acknowledged || isSubmitting}
            loading={isSubmitting}
            fullWidth
            height={46}
            radius={tTokens.radius.md}
          />
        </AppCard>
      )}

      {/* AGRONOMY RECOMMENDATION */}
      <AppCard style={styles.recomCard}>
        <View style={styles.recomBadge}>
          <Ionicons
            name="sparkles"
            size={13}
            color={semanticTokens.color.pdp}
          />

          <Text style={styles.recomBadgeText}>
            {t('commerce.agronomy_recommendation')}
          </Text>
        </View>

        <Text style={styles.productName}>
          {t('commerce.productName')}
        </Text>

        <Text style={styles.productSku}>
          FERT-KCL-25
        </Text>

        <Text style={styles.recomReason}>
          {t('commerce.reason')}
        </Text>

        <Text style={styles.recomEstimate}>
          {t('commerce.estimate')}
        </Text>

        <View style={styles.warningBox}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={semanticTokens.color.brand}
            style={styles.warningIcon}
          />

          <Text style={styles.warningText}>
            {t('commerce.warning')}
          </Text>
        </View>

        <Pressable
          style={styles.recomButton}
          onPress={handleAddRecommendation}
          accessibilityRole="button"
        >
          <Ionicons
            name="cart"
            size={18}
            color="#FFFFFF"
            style={{
              marginRight: tTokens.spacing['2xs'],
            }}
          />

          <Text style={styles.recomButtonText}>
            {t('commerce.addToCart')}
          </Text>
        </Pressable>
      </AppCard>

      {/* PRODUCT CATALOG */}
      <View style={styles.catalogSection}>
        <Text style={styles.sectionHeader}>
          {t('commerce.catalog_title')}
        </Text>

        {isLoading ? (
          <AppLoadingState
            label={t('common.loading')}
          />
        ) : !products || products.length === 0 ? (
          <AppEmptyState
            title={t('commerce.empty')}
            subtitle={t('commerce.catalog_empty_sub')}
            actionLabel={t('common.retry')}
            onAction={refetch}
          />
        ) : (
          products.map((product: CatalogProduct) => (
            <AppCard
              key={product.id}
              style={styles.productCard}
            >
              <View style={styles.productTopRow}>
                <View style={styles.productThumb}>
                  <Ionicons
                    name="cube-outline"
                    size={28}
                    color={semanticTokens.color.brand}
                  />
                </View>

                <View style={styles.productInfoCol}>
                  <View style={styles.titlePriceRow}>
                    <Text style={styles.catalogProductName}>
                      {product.nama}
                    </Text>

                    <Text style={styles.catalogPrice}>
                      Rp {product.harga.toLocaleString('id-ID')}
                    </Text>
                  </View>

                  <Text style={styles.catalogMeta}>
                    {product.sku}
                    {' • '}
                    {product.kategori}
                    {' • '}
                    {t('commerce.stock')} {product.stok}
                  </Text>
                </View>
              </View>

              <View style={styles.productBottomRow}>
                <Pressable
                  style={[
                    styles.addCartOutlineBtn,
                    product.stok <= 0 && styles.disabledButton,
                  ]}
                  disabled={product.stok <= 0}
                  onPress={() => handleAddToCart(product)}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="cart-outline"
                    size={16}
                    color={semanticTokens.color.pdp}
                    style={{ marginRight: 6 }}
                  />

                  <Text style={styles.addCartOutlineText}>
                    {product.stok <= 0
                      ? 'Stok Habis'
                      : t('commerce.addToCart')}
                  </Text>
                </Pressable>
              </View>
            </AppCard>
          ))
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tTokens.spacing.sm,
  },

  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.xs,
  },

  logo: {
    width: 32,
    height: 32,
  },

  brandTextCol: {
    justifyContent: 'center',
  },

  brandSawit: {
    color: semanticTokens.color.brand,
    fontSize: tTokens.typography.labelLarge.size,
    lineHeight: tTokens.typography.labelLarge.lineHeight,
    fontWeight: '800',
  },

  brandEco: {
    color: semanticTokens.color.brand,
    fontSize: tTokens.typography.labelLarge.size,
    lineHeight: tTokens.typography.labelLarge.lineHeight,
    fontWeight: '800',
  },

  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.sm,
  },

  bellButton: {
    width: 36,
    height: 36,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.badge.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartBtnWrapper: {
    position: 'relative',
  },

  cartButton: {
    width: 36,
    height: 36,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.color.surface,
    borderWidth: tTokens.borderWidth.hairline,
    borderColor: semanticTokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: semanticTokens.color.error,
    borderRadius: tTokens.radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  cartBadgeText: {
    color: semanticTokens.color.surface,
    fontSize: 10,
    fontWeight: '700',
  },

  titleSection: {
    marginTop: tTokens.spacing.xs,
    marginBottom: tTokens.spacing.md,
  },

  mainTitle: {
    fontSize: tTokens.typography.display.size,
    fontWeight: tTokens.typography.display.weight,
    lineHeight: tTokens.typography.display.lineHeight,
    color: semanticTokens.color.textPrimary,
  },

  mainSubtitle: {
    fontSize: tTokens.typography.labelSmall.size,
    fontWeight: '500',
    color: semanticTokens.color.textSecondary,
    marginTop: tTokens.spacing['2xs'],
    lineHeight: tTokens.typography.labelSmall.lineHeight,
  },

  noticeCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    borderWidth: 1,
    marginBottom: tTokens.spacing.md,
  },

  successCard: {
    borderColor: semanticTokens.color.success,
  },

  errorCard: {
    borderColor: semanticTokens.color.error,
  },

  noticeIconWrapper: {
    alignItems: 'center',
    marginBottom: tTokens.spacing.sm,
  },

  noticeTitle: {
    fontSize: tTokens.typography.title.size,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
    textAlign: 'center',
    marginBottom: tTokens.spacing.xs,
  },

  noticeMessage: {
    fontSize: tTokens.typography.bodyMedium.size,
    lineHeight: tTokens.typography.bodyMedium.lineHeight,
    color: semanticTokens.color.textSecondary,
    textAlign: 'center',
    marginBottom: tTokens.spacing.md,
  },

  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tTokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: semanticTokens.color.border,
  },

  orderInfoLabel: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
  },

  orderInfoValue: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },

  cartCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    borderWidth: 1,
    borderColor: semanticTokens.color.pdp,
    marginBottom: tTokens.spacing.md,
  },

  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tTokens.spacing.xs,
  },

  cartTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
  },

  cartCount: {
    color: semanticTokens.color.textSecondary,
    fontSize: tTokens.typography.caption.size,
  },

  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: tTokens.spacing.xs,
  },

  cartItemInfo: {
    flex: 1,
    marginRight: tTokens.spacing.sm,
  },

  cartItemName: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.bodyLarge.size,
    fontWeight: '600',
  },

  cartItemMeta: {
    color: semanticTokens.color.textSecondary,
    fontSize: tTokens.typography.caption.size,
  },

  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.sm,
  },

  cartItemPrice: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '600',
  },

  deleteCartButton: {
    width: 34,
    height: 34,
    borderRadius: tTokens.radius.sm,
    backgroundColor: semanticTokens.badge.error.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartDivider: {
    height: 1,
    backgroundColor: semanticTokens.color.border,
    marginVertical: tTokens.spacing.xs,
  },

  cartTotalLabel: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.title.size,
    fontWeight: '600',
  },

  cartTotalValue: {
    color: semanticTokens.color.brand,
    fontSize: tTokens.typography.headline.size,
    fontWeight: '700',
  },

  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: tTokens.spacing.sm,
  },

  checkboxPressable: {
    padding: 2,
  },

  customCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: semanticTokens.color.textSecondary,
    backgroundColor: semanticTokens.color.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  customCheckboxChecked: {
    borderColor: semanticTokens.color.brand,
    backgroundColor: semanticTokens.color.brand,
  },

  ackText: {
    flex: 1,
    color: semanticTokens.color.warning,
    fontSize: tTokens.typography.caption.size,
  },

  recomCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    marginBottom: tTokens.spacing.md,
  },

  recomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: semanticTokens.badge.pdp.background,
    paddingHorizontal: tTokens.spacing.sm,
    paddingVertical: tTokens.spacing['2xs'],
    borderRadius: tTokens.radius.xs,
    marginBottom: tTokens.spacing.sm,
  },

  recomBadgeText: {
    fontSize: tTokens.typography.caption.size,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },

  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
  },

  productSku: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    marginTop: 2,
    marginBottom: tTokens.spacing.xs,
  },

  recomReason: {
    fontSize: tTokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
    lineHeight: tTokens.typography.bodyMedium.lineHeight,
  },

  recomEstimate: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '600',
    color: semanticTokens.color.textPrimary,
    marginTop: 2,
    marginBottom: tTokens.spacing.sm,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: semanticTokens.badge.success.background,
    borderWidth: 1,
    borderColor: semanticTokens.color.border,
    borderRadius: tTokens.radius.sm,
    padding: tTokens.spacing.sm,
    marginBottom: tTokens.spacing.md,
  },

  warningIcon: {
    marginRight: tTokens.spacing['2xs'],
    marginTop: 2,
  },

  warningText: {
    flex: 1,
    fontSize: tTokens.typography.caption.size,
    lineHeight: tTokens.typography.caption.lineHeight,
    color: semanticTokens.color.brand,
    fontWeight: '500',
  },

  recomButton: {
    height: 48,
    borderRadius: tTokens.radius.md,
    backgroundColor: semanticTokens.color.pdp,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recomButtonText: {
    fontSize: tTokens.typography.labelLarge.size,
    fontWeight: '700',
    color: semanticTokens.color.surface,
  },

  catalogSection: {
    marginTop: tTokens.spacing.sm,
  },

  sectionHeader: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    marginBottom: tTokens.spacing.sm,
  },

  productCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    marginBottom: tTokens.spacing.sm,
  },

  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  productThumb: {
    width: 60,
    height: 60,
    borderRadius: tTokens.radius.sm,
    backgroundColor: semanticTokens.badge.info.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tTokens.spacing.md,
  },

  productInfoCol: {
    flex: 1,
  },

  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },

  catalogProductName: {
    fontSize: tTokens.typography.labelLarge.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
    flex: 1,
    marginRight: 8,
  },

  catalogPrice: {
    fontSize: tTokens.typography.labelLarge.size,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
  },

  catalogMeta: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    marginTop: 4,
  },

  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: tTokens.spacing.sm,
  },

  addCartOutlineBtn: {
    height: 38,
    borderRadius: tTokens.radius.sm,
    borderWidth: 1,
    borderColor: semanticTokens.color.border,
    backgroundColor: semanticTokens.color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tTokens.spacing.md,
  },

  disabledButton: {
    opacity: 0.45,
  },

  addCartOutlineText: {
    fontSize: tTokens.typography.caption.size,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
});
