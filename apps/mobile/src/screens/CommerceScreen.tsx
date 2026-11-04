import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

type CartResponse = {
  id?: string;
  items?: any[];
  cart?: any[];
  item?: any;
  total?: number;
  count?: number;
  data?: {
    id?: string;
    items?: any[];
    cart?: any[];
    item?: any;
    total?: number;
    count?: number;
  };
};

type AddedProduct = {
  name: string;
  sku: string;
  price: number;
  quantity: number;
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

  const t = createTranslator(language);

  const {
    data: products,
    isLoading,
    refetch,
  } = useCatalog();

  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState<OrderNotice | null>(null);

  const [addedProduct, setAddedProduct] = useState<AddedProduct | null>(null);
  const [showCartSuccess, setShowCartSuccess] = useState(false);

  // Mapping productId -> backend cartItemId
  const [cartItemIds, setCartItemIds] = useState<Record<string, string>>({});

  const money = (value: number) =>
    `Rp ${(Number(value) || 0).toLocaleString('id-ID')}`;

  // FETCH CART
  const fetchCartFromBackend = async () => {
    try {
      const response = await apiRequest<CartResponse>(
        '/api/commerce/cart',
      );

      // Support both direct response and wrapped API response.
      const payload: any = response?.data ?? response;

      const backendCart = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.cart)
          ? payload.cart
          : [];

      const nextCartItemIds: Record<string, string> = {};

      const normalizedCart = backendCart
        .map((item: any) => {
          const cartItemId = item.id;
          const productId = item.productId;

          if (
            typeof cartItemId !== 'string' ||
            typeof productId !== 'string' ||
            !productId
          ) {
            return null;
          }

          nextCartItemIds[productId] = cartItemId;

          return {
            productId,
            name: item.productName ?? item.name ?? '',
            sku: item.sku ?? '',
            price: Number(item.harga ?? item.price ?? 0),
            quantity: Number(item.kuantitas ?? item.quantity ?? 1),
            blockCode: item.blokKode ?? item.blockCode ?? 'B2',
            recommendationId: item.recommendationId,
            reason:
              item.alasanRekomendasi ??
              item.recommendationReason ??
              item.reason,
          };
        })
        .filter(Boolean) as CartItem[];

      setCartItemIds(nextCartItemIds);

      clearCart();
      normalizedCart.forEach((item) => addToCart(item));
    } catch (err) {
      console.error('[CART] Failed to fetch:', err);
    }
  };

  useEffect(() => {
    if (session?.userId) {
      fetchCartFromBackend();
    } else {
      clearCart();
      setCartItemIds({});
    }
  }, [session?.userId]);

  // CART TOTAL
  const totalCart = (cart ?? []).reduce(
    (sum, item) =>
      sum +
      (Number(item?.price) || 0) *
        (Number(item?.quantity) || 0),
    0,
  );

  const totalCartCount = (cart ?? []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0),
    0,
  );

  useEffect(() => {
    if (cart.length === 0) {
      setAcknowledged(false);
    }
  }, [cart.length]);

  // CART SUCCESS
  const showSuccess = (product: AddedProduct) => {
    setAddedProduct(product);
    setShowCartSuccess(true);
  };

  const closeSuccess = () => {
    setShowCartSuccess(false);
    setAddedProduct(null);
  };

  // ADD PRODUCT TO CART
  const handleAddToCart = async (
    product: CatalogProduct,
    quantity = 1,
    reason?: string,
  ) => {
    if (
      product.stok <= 0 ||
      !session?.userId ||
      loadingProductId ||
      isSubmitting
    ) {
      return;
    }

    setLoadingProductId(product.id);
    setOrderNotice(null);

    try {
      await apiRequest<CartResponse>(
        '/api/commerce/cart',
        {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            quantity,
            blockCode: 'B2',
            recommendationId: null,
            recommendationReason: reason ?? null,
          }),
        },
      );

      // Backend is the source of truth.
      // Refresh to retrieve the actual cart item ID and quantity.
      await fetchCartFromBackend();

      showSuccess({
        name: product.nama ?? '',
        sku: product.sku ?? '',
        price: Number(product.harga) || 0,
        quantity,
      });
    } catch (err) {
      console.error('[CART] Add failed:', err);

      setOrderNotice({
        type: 'error',
        message: t('cart.add_failed'),
      });
    } finally {
      setLoadingProductId(null);
    }
  };

  // AGRONOMY RECOMMENDATION
  const handleAddRecommendation = async () => {
    const product =
      products?.find((item) => item.sku === 'FERT-KCL-25') ??
      products?.[0];

    if (!product || product.stok <= 0) {
      return;
    }

    await handleAddToCart(
      product,
      12,
      'Defisiensi Kalium Blok B2 (FERT-KCL-25)',
    );
  };

  // REMOVE CART ITEM
  const handleRemoveFromCart = async (productId: string) => {
    if (isSubmitting || loadingProductId) return;

    const cartItemId = cartItemIds[productId];

    if (!cartItemId) {
      console.error(
        '[CART] cartItemId not found for product:',
        productId,
      );

      setOrderNotice({
        type: 'error',
        message: t('cart.remove_failed'),
      });

      await fetchCartFromBackend();
      return;
    }

    try {
      await apiRequest(
        `/api/commerce/cart?itemId=${encodeURIComponent(cartItemId)}`,
        {
          method: 'DELETE',
        },
      );

      await fetchCartFromBackend();
      setOrderNotice(null);
    } catch (err) {
      console.error('[CART] Remove failed:', err);

      setOrderNotice({
        type: 'error',
        message: t('cart.remove_failed'),
      });
    }
  };

  // CHECKOUT
  const handleCheckout = async () => {
    if (
      !session?.userId ||
      cart.length === 0 ||
      !acknowledged ||
      isSubmitting ||
      loadingProductId
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
      const response = (await apiRequest(
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
      )) as CheckoutResponse;

      const order = response?.order;

      clearCart();
      setCartItemIds({});
      setAcknowledged(false);

      setOrderNotice({
        type: 'success',
        message: t('commerce.orderSubmitted'),
        orderId: order?.id,
        totalAmount: order?.totalAmount,
        status: order?.status,
      });
    } catch (err) {
      const errorCode =
        err instanceof Error ? err.message : '';

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

      setOrderNotice({
        type: 'error',
        message:
          errorMessages[errorCode] ??
          t('commerce.order_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      showTopHeader
      onTopHeaderAvatarPress={() =>
        navigation?.navigate('Profile')
      }
      topHeaderRight={
        <View style={styles.cartBtnWrapper}>
          <Pressable
            style={styles.cartButton}
            hitSlop={8}
            onPress={() => navigation?.navigate('Cart')}
            accessibilityRole="button"
            accessibilityLabel="Shopping cart"
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
      }
    >
      {/* ADD TO CART SUCCESS MODAL */}
      <Modal
        visible={showCartSuccess}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeSuccess}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSuccess}
          />

          <View style={styles.successSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.successIcon}>
              <Ionicons
                name="checkmark"
                size={32}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.successTitle}>
              Berhasil ditambahkan!
            </Text>

            <Text style={styles.successSubtitle}>
              Produk sudah masuk ke keranjang belanja kamu.
            </Text>

            {addedProduct && (
              <View style={styles.addedProductCard}>
                <View style={styles.addedProductIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={28}
                    color={semanticTokens.color.brand}
                  />
                </View>

                <View style={styles.addedProductInfo}>
                  <Text
                    style={styles.addedProductName}
                    numberOfLines={2}
                  >
                    {addedProduct.name}
                  </Text>

                  <Text style={styles.addedProductSku}>
                    {addedProduct.sku}
                  </Text>

                  <Text style={styles.addedProductQuantity}>
                    {addedProduct.quantity} item
                  </Text>
                </View>

                <Text style={styles.addedProductPrice}>
                  {money(
                    addedProduct.price *
                      addedProduct.quantity,
                  )}
                </Text>
              </View>
            )}

            <View style={styles.successCartSummary}>
              <View>
                <Text style={styles.summaryLabel}>
                  Total item di keranjang
                </Text>

                <Text style={styles.summaryValue}>
                  {totalCartCount} item
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.summaryLabel}>
                  Total belanja
                </Text>

                <Text style={styles.summaryValue}>
                  {money(totalCart)}
                </Text>
              </View>
            </View>

            <AppButton
              label="Lihat Keranjang"
              variant="primary"
              onPress={() => {
                closeSuccess();
                navigation?.navigate('Cart');
              }}
              fullWidth
              height={48}
              radius={tTokens.radius.md}
            />

            <Pressable
              style={styles.continueButton}
              onPress={closeSuccess}
            >
              <Text style={styles.continueButtonText}>
                Lanjut Belanja
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TITLE */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>
          {t('commerce.title')}
        </Text>

        <Text style={styles.mainSubtitle}>
          {t('commerce.subtitle')}
        </Text>
      </View>

      {/* ORDER NOTICE */}
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
              size={42}
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
              : 'Terjadi kesalahan'}
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
                {money(orderNotice.totalAmount)}
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

          <AppButton
            label={
              orderNotice.type === 'success'
                ? 'Lihat Pesanan'
                : 'Tutup'
            }
            variant="primary"
            onPress={() => {
              if (orderNotice.type === 'success') {
                navigation?.navigate('OrderHistory');
              }

              setOrderNotice(null);
            }}
            fullWidth
            height={46}
            radius={tTokens.radius.md}
          />
        </AppCard>
      )}

      {/* CART */}
      {cart.length > 0 && (
        <AppCard style={styles.cartCard}>
          <View style={styles.cartHeader}>
            <View>
              <Text style={styles.cartTitle}>
                {t('commerce.cart')}
              </Text>

              <Text style={styles.cartCount}>
                {totalCartCount} item dalam keranjang
              </Text>
            </View>

            <Ionicons
              name="bag-check-outline"
              size={25}
              color={semanticTokens.color.pdp}
            />
          </View>

          {cart.filter(Boolean).map((item: CartItem) => (
            <View
              key={cartItemIds[item.productId] ?? item.productId}
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
                  {money(item.price * item.quantity)}
                </Text>

                <Pressable
                  style={styles.deleteCartButton}
                  onPress={() =>
                    handleRemoveFromCart(item.productId)
                  }
                  disabled={
                    isSubmitting ||
                    loadingProductId !== null
                  }
                  hitSlop={8}
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

          <View style={styles.cartItem}>
            <Text style={styles.cartTotalLabel}>
              {t('commerce.cartTotal')}
            </Text>

            <Text style={styles.cartTotalValue}>
              {money(totalCart)}
            </Text>
          </View>

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
                  acknowledged &&
                    styles.customCheckboxChecked,
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

          <AppButton
            label={t('commerce.checkout')}
            variant="primary"
            onPress={handleCheckout}
            disabled={
              !acknowledged ||
              isSubmitting ||
              loadingProductId !== null
            }
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
          style={[
            styles.recomButton,
            loadingProductId !== null &&
              styles.loadingButton,
          ]}
          onPress={handleAddRecommendation}
          disabled={
            loadingProductId !== null || isSubmitting
          }
        >
          {loadingProductId !== null ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
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
            </>
          )}
        </Pressable>
      </AppCard>

      {/* PRODUCT CATALOG */}
      <View style={styles.catalogSection}>
        <Text style={styles.sectionHeader}>
          {t('commerce.catalog_title')}
        </Text>

        {isLoading ? (
          <AppLoadingState label={t('common.loading')} />
        ) : !products || products.length === 0 ? (
          <AppEmptyState
            title={t('commerce.empty')}
            subtitle={t('commerce.catalog_empty_sub')}
            actionLabel={t('common.retry')}
            onAction={refetch}
          />
        ) : (
          products.map((product: CatalogProduct) => {
            const isAdding =
              loadingProductId === product.id;

            return (
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
                        {money(product.harga)}
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
                      (product.stok <= 0 ||
                        loadingProductId !== null) &&
                        styles.disabledButton,
                      isAdding && styles.addingButton,
                    ]}
                    disabled={
                      product.stok <= 0 ||
                      loadingProductId !== null ||
                      isSubmitting
                    }
                    onPress={() => handleAddToCart(product)}
                    accessibilityRole="button"
                  >
                    {isAdding ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={semanticTokens.color.pdp}
                        />

                        <Text style={styles.addCartOutlineText}>
                          Menambahkan...
                        </Text>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </Pressable>
                </View>
              </AppCard>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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

  // SUCCESS MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },

  successSheet: {
    backgroundColor: semanticTokens.color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: tTokens.spacing.lg,
    paddingTop: tTokens.spacing.sm,
    paddingBottom: 32,
  },

  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 10,
    backgroundColor: semanticTokens.color.border,
    alignSelf: 'center',
    marginBottom: tTokens.spacing.lg,
  },

  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: semanticTokens.color.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: tTokens.spacing.md,
  },

  successTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
    textAlign: 'center',
  },

  successSubtitle: {
    fontSize: tTokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: tTokens.spacing.lg,
  },

  addedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tTokens.spacing.md,
    borderWidth: 1,
    borderColor: semanticTokens.color.border,
    borderRadius: tTokens.radius.md,
    gap: tTokens.spacing.sm,
  },

  addedProductIcon: {
    width: 50,
    height: 50,
    borderRadius: tTokens.radius.sm,
    backgroundColor: semanticTokens.badge.info.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addedProductInfo: {
    flex: 1,
  },

  addedProductName: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },

  addedProductSku: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    marginTop: 2,
  },

  addedProductQuantity: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.brand,
    marginTop: 4,
    fontWeight: '600',
  },

  addedProductPrice: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '700',
    color: semanticTokens.color.textPrimary,
  },

  successCartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tTokens.spacing.md,
    marginBottom: tTokens.spacing.sm,
  },

  summaryLabel: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
  },

  summaryValue: {
    fontSize: tTokens.typography.bodyLarge.size,
    fontWeight: '800',
    color: semanticTokens.color.textPrimary,
    marginTop: 4,
  },

  continueButton: {
    alignItems: 'center',
    paddingVertical: tTokens.spacing.md,
  },

  continueButtonText: {
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '700',
    color: semanticTokens.color.brand,
  },

  // NOTICE
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
    marginBottom: tTokens.spacing.md,
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

  // CART
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
    marginBottom: tTokens.spacing.md,
  },

  cartTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
  },

  cartCount: {
    color: semanticTokens.color.textSecondary,
    fontSize: tTokens.typography.caption.size,
    marginTop: 3,
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

  // RECOMMENDATION
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

  loadingButton: {
    opacity: 0.65,
  },

  // CATALOG
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
    gap: 6,
  },

  addingButton: {
    borderColor: semanticTokens.color.pdp,
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
