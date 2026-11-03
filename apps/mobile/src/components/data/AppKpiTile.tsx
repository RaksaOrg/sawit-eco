import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export function AppKpiTile({
  label,
  value,
  unit,
  status,
  icon = 'trending-up',
  showChart = true,
}: {
  label: string;
  value: string;
  unit?: string;
  status?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  showChart?: boolean;
}) {
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={semanticTokens.color.success} />
      </View>

      <View style={styles.body}>
        <Text style={styles.caption}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.display}>{value}</Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
        {status ? (
          <View style={styles.statusBadge}>
            <Ionicons name="arrow-up" size={11} color={semanticTokens.color.success} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>

      {showChart ? (
        <View style={styles.chartCol}>
          <View style={[styles.bar, { height: 14 }]} />
          <View style={[styles.bar, { height: 24 }]} />
          <View style={[styles.bar, { height: 34 }]} />
          <View style={[styles.barActive, { height: 46 }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    padding: c.kpiTile.padding,
    borderRadius: c.card.radius,
    backgroundColor: c.kpiTile.background,
    borderWidth: t.borderWidth.hairline,
    borderColor: c.kpiTile.borderColor,
    marginBottom: t.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: t.elevation.level1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: t.radius.full,
    backgroundColor: semanticTokens.badge.success.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: t.spacing.md,
  },
  body: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: t.spacing.xs,
  },
  display: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.display.size,
    fontWeight: t.typography.display.weight,
    lineHeight: t.typography.display.lineHeight,
  },
  unit: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.bodyLarge.size,
    fontWeight: '600',
  },
  caption: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.labelSmall.size,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    backgroundColor: semanticTokens.badge.success.background,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing['2xs'],
    borderRadius: t.radius.xs,
    marginTop: t.spacing['2xs'],
  },
  statusText: {
    color: semanticTokens.color.success,
    fontSize: t.typography.caption.size,
    fontWeight: '700',
  },
  chartCol: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginLeft: t.spacing.sm,
  },
  bar: {
    width: 5,
    borderRadius: 2,
    backgroundColor: semanticTokens.badge.success.background,
  },
  barActive: {
    width: 5,
    borderRadius: 2,
    backgroundColor: semanticTokens.color.success,
  },
});
