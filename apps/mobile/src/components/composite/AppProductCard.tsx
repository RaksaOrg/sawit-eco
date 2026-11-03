import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';
import { AppCard } from '../layout/AppCard';
import { AppButton } from '../ui/AppButton';

const t = foundationTokens;
const c = componentTokens;

export function AppProductCard({
  name,
  sku,
  reason,
  estimate,
  warning,
  addToCartLabel,
  onAddToCart,
}: {
  name: string;
  sku: string;
  reason: string;
  estimate: string;
  warning: string;
  addToCartLabel: string;
  onAddToCart: () => void;
}) {
  return (
    <AppCard>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.caption}>{sku}</Text>
      <Text style={styles.body}>{reason}</Text>
      <Text style={styles.body}>{estimate}</Text>
      <Text style={styles.warning}>{warning}</Text>
      <AppButton
        label={addToCartLabel}
        variant="primary"
        icon="cart-outline"
        onPress={onAddToCart}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.title.size,
    fontWeight: t.typography.title.weight,
  },
  caption: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.caption.size,
  },
  body: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.bodyMedium.size,
    marginTop: t.spacing.xs,
  },
  warning: {
    color: semanticTokens.color.warning,
    fontSize: t.typography.caption.size,
    marginVertical: t.spacing.sm,
  },
});
