import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Checkbox } from 'react-native-paper';

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

export function CommerceScreen({
  navigation,
}: {
  navigation?: { navigate: (screen: string, params?: unknown) => void };
}) {
  const language = useMobileAppStore((s) => s.language);
  const session = useMobileAppStore((s) => s.session);
  const cart = useMobileAppStore((s) => s.cart);
  const addToCart = useMobileAppStore((s) => s.addToCart);
  const clearCart = useMobileAppStore((s) => s.clearCart);
  const t = createTranslator(language);

  const { data: products, isLoading, refetch } = useCatalog();
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  const totalCart = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!session?.userId || cart.length === 0 || !acknowledged) return;
    setIsSubmitting(true);
    setOrderNotice(null);
    try {
      await apiRequest('/api/commerce/orders', {
        method: 'POST',
        body: JSON.stringify({
          action: 'mobile-checkout',
          userId: session.userId,
          estimateAcknowledged: true,
          items: cart.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            blockCode: it.blockCode,
            recommendationId: it.recommendationId,
            recommendationReason: it.reason,
          })),
        }),
      });
      clearCart();
      setOrderNotice(t('commerce.orderSubmitted'));
    } catch (err) {
      setOrderNotice(err instanceof Error ? err.message : t('commerce.order_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      showTopHeader
      topHeaderRight={
        <View style={styles.headerRightActions}>
          <Pressable style={styles.bellButton} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={semanticTokens.color.brand} />
          </Pressable>
          <View style={styles.cartBtnWrapper}>
            <Pressable style={styles.cartButton} hitSlop={8}>
              <Ionicons name="cart-outline" size={20} color={semanticTokens.color.textPrimary} />
              {totalCartCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <Pressable
            style={styles.avatarButton}
            hitSlop={8}
            onPress={() => navigation?.navigate('Profile')}
          >
            <Ionicons name="person" size={17} color={semanticTokens.color.surface} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>{t('commerce.title')}</Text>
        <Text style={styles.mainSubtitle}>
          Temukan produk terbaik untuk mendukung produktivitas pertanian Anda.
        </Text>
      </View>

      {orderNotice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{orderNotice}</Text>
        </View>
      ) : null}

      {cart.length > 0 ? (
        <AppCard style={styles.cartCard}>
          <Text style={styles.cartTitle}>{t('commerce.cart')}</Text>
          {cart.map((item: CartItem) => (
            <View key={item.productId} style={styles.cartItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName}>
                  {item.name} ({item.sku})
                </Text>
                <Text style={styles.cartItemMeta}>
                  {t('attendance.blockLabel')} {item.blockCode} · {item.quantity}{' '}
                  {t('commerce.unit_sack')}
                </Text>
              </View>
              <Text style={styles.cartItemPrice}>
                Rp {(item.price * item.quantity).toLocaleString('id-ID')}
              </Text>
            </View>
          ))}
          <View style={styles.cartDivider} />
          <View style={styles.cartItem}>
            <Text style={styles.cartTotalLabel}>{t('commerce.cart_total')}</Text>
            <Text style={styles.cartTotalValue}>Rp {totalCart.toLocaleString('id-ID')}</Text>
          </View>

          <View style={styles.ackRow}>
            <Checkbox
              status={acknowledged ? 'checked' : 'unchecked'}
              onPress={() => setAcknowledged(!acknowledged)}
              color={semanticTokens.color.brand}
            />
            <Text style={styles.ackText}>{t('commerce.acknowledge')}</Text>
          </View>

          <AppButton
            label={t('commerce.checkout')}
            variant="primary"
            onPress={handleCheckout}
            disabled={!acknowledged}
            loading={isSubmitting}
            fullWidth
            height={46}
            radius={tTokens.radius.md}
            style={{ backgroundColor: semanticTokens.color.pdp }}
          />
        </AppCard>
      ) : null}

      <AppCard style={styles.recomCard}>
        <View style={styles.recomBadge}>
          <Ionicons name="sparkles" size={13} color={semanticTokens.color.pdp} />
          <Text style={styles.recomBadgeText}>{t('commerce.agronomy_recommendation')}</Text>
        </View>

        <Text style={styles.productName}>{t('commerce.productName')}</Text>
        <Text style={styles.productSku}>FERT-KCL-25</Text>

        <Text style={styles.recomReason}>{t('commerce.reason')}</Text>
        <Text style={styles.recomEstimate}>{t('commerce.estimate')}</Text>

        <View style={styles.warningBox}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={semanticTokens.color.brand}
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>{t('commerce.warning')}</Text>
        </View>

        <Pressable
          style={styles.recomButton}
          onPress={() => {
            const prod = products?.find((p) => p.sku === 'FERT-KCL-25') || products?.[0];
            if (prod) {
              addToCart({
                productId: prod.id,
                name: prod.nama,
                sku: prod.sku,
                price: prod.harga,
                quantity: 12,
                blockCode: 'B2',
                reason: 'Defisiensi Kalium Blok B2',
              });
            }
          }}
        >
          <Ionicons name="cart" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.recomButtonText}>{t('commerce.addToCart')}</Text>
        </Pressable>
      </AppCard>

      <View style={styles.catalogSection}>
        <Text style={styles.sectionHeader}>{t('commerce.catalog_title')}</Text>

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
          products.map((p: CatalogProduct) => (
            <AppCard key={p.id} style={styles.productCard}>
              <View style={styles.productTopRow}>
                <View style={styles.productThumb}>
                  <Ionicons name="cube-outline" size={28} color={semanticTokens.color.brand} />
                </View>

                <View style={styles.productInfoCol}>
                  <View style={styles.titlePriceRow}>
                    <Text style={styles.catalogProductName}>{p.nama}</Text>
                    <Text style={styles.catalogPrice}>Rp {p.harga.toLocaleString('id-ID')}</Text>
                  </View>
                  <Text style={styles.catalogMeta}>
                    {p.sku} • {p.kategori} • {t('commerce.stock')} {p.stok}
                  </Text>
                </View>
              </View>

              <View style={styles.productBottomRow}>
                <Pressable
                  style={styles.addCartOutlineBtn}
                  onPress={() => {
                    addToCart({
                      productId: p.id,
                      name: p.nama,
                      sku: p.sku,
                      price: p.harga,
                      quantity: 1,
                      blockCode: 'B2',
                    });
                  }}
                >
                  <Ionicons
                    name="cart-outline"
                    size={16}
                    color={semanticTokens.color.pdp}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.addCartOutlineText}>{t('commerce.addToCart')}</Text>
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
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: tTokens.radius.full,
    backgroundColor: semanticTokens.color.pdp,
    alignItems: 'center',
    justifyContent: 'center',
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
  notice: {
    padding: tTokens.spacing.sm,
    backgroundColor: semanticTokens.color.success,
    borderRadius: tTokens.radius.sm,
    marginBottom: tTokens.spacing.md,
  },
  noticeText: {
    color: semanticTokens.color.surface,
    fontSize: tTokens.typography.labelSmall.size,
  },
  cartCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    borderWidth: 1,
    borderColor: semanticTokens.color.pdp,
    marginBottom: tTokens.spacing.md,
  },
  cartTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    marginBottom: tTokens.spacing.xs,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: tTokens.spacing.xs,
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
  cartItemPrice: {
    color: semanticTokens.color.textPrimary,
    fontSize: tTokens.typography.bodyMedium.size,
    fontWeight: '600',
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
    marginVertical: tTokens.spacing.xs,
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
    backgroundColor: '#F3FAF6',
    borderWidth: 1,
    borderColor: '#CDEBD7',
    borderRadius: tTokens.radius.sm,
    padding: tTokens.spacing.sm,
    marginBottom: tTokens.spacing.md,
  },
  warningIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
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
    backgroundColor: '#F3FAF6',
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
    borderColor: '#D7DCF8',
    backgroundColor: semanticTokens.color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tTokens.spacing.md,
  },
  addCartOutlineText: {
    fontSize: tTokens.typography.caption.size,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
});
