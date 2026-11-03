'use client';

/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Text, MessageStrip } from '@ui5/webcomponents-react';
import { webTokens } from '@/src/theme/semantic/tokens';

interface ProductRecommendationCardProps {
  productName: string;
  sku: string;
  priceLabel: string;
  packLabel: string;
  reason: string;
  blockNeedsLabel: string;
  onAddToCart: () => void;
  gap?: boolean;
  gapReason?: string;
}

export default function ProductRecommendationCard({
  productName,
  sku,
  priceLabel,
  packLabel,
  reason,
  blockNeedsLabel,
  onAddToCart,
  gap = false,
  gapReason,
}: ProductRecommendationCardProps) {
  const { t } = useTranslation(['agronomy', 'commerce']);

  if (gap) {
    return (
      <Card
        style={{
          border: `1px solid ${webTokens.color.status.warning}`,
          borderRadius: webTokens.radius.md,
          padding: webTokens.spacing.md,
        }}
      >
        <MessageStrip design="Critical" hideCloseButton>
          {t('agronomy:gap.banner_title')}
          {gapReason ? ` - ${gapReason}` : ''}
          {` ${t('agronomy:gap.desc')}`}
        </MessageStrip>
      </Card>
    );
  }

  return (
    <Card
      style={{
        border: `1px solid ${webTokens.color.border.default}`,
        borderRadius: webTokens.radius.md,
        padding: webTokens.spacing.md,
      }}
    >
      <Text style={{ color: webTokens.color.text.primary }}>
        {productName} {sku}
      </Text>
      <Text style={{ color: webTokens.color.text.secondary }}>
        {priceLabel} {packLabel}
      </Text>
      <Text>
        {t('agronomy:card.reason')}
        {': '}
        {reason}
      </Text>
      <Text>
        {t('agronomy:card.est_block')}
        {': '}
        {blockNeedsLabel}
      </Text>
      <MessageStrip design="Information" hideCloseButton>
        {t('agronomy:card.disclaimer')}
      </MessageStrip>
      <Button design="Emphasized" onClick={onAddToCart}>
        {t('commerce:cart.add')}
      </Button>
    </Card>
  );
}
