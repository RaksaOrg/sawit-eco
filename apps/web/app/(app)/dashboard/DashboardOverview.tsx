'use client';

import React from 'react';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardHeader,
  Icon,
  List,
  ListItemStandard,
  SegmentedButton,
  SegmentedButtonItem,
  Text,
} from '@ui5/webcomponents-react';
import { rotasiStatusInfo, type FioriState } from '@/lib/fiori-status';

export interface RotasiRow {
  blokKode: string;
  terakhirPanenLabel: string;
  hariLabel: string;
  status: string;
  label: string;
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  statusLabel: string;
  state: FioriState;
  href: string;
}

export interface DashboardMetrics {
  produksiKg: number | null;
  kgPerHK: number | null;
  haPerHK: number | null;
  hadirHK: number | null;
  blokMelapor: number;
  overdueCount: number;
  dalamRotasiCount: number;
  totalBlok: number;
  tugasAktif: number;
  tugasOverdue: number;
  diagnosaTotal: number;
  diagnosaRisikoTinggi: number;
  modulLearning: number;
  learningCompletionPct: number | null;
  produkAktif: number;
  orderMenunggu: number;
  gmv: number | null;
  productGapOpen: number;
  maxDeviation: number;
  priceAnomaliesCount: number;
  pdpAuditCount: number;
  conversionRatePct: number;
  repeatPurchaseRatePct: number;
  estimatedSavingsIdr: number;
}

export interface ImpactBenchmarkRow {
  commodity: string;
  regionalDistrict: string;
  officialRefPrice: string;
  tengkulakOfferPrice: string;
  marginCut: string;
  savings: string;
}

export interface IntelligenceItem {
  id: string;
  sku: string;
  deviationPercentage: number;
  severity: string;
  reasoning: string;
  detectedAt: string;
}

interface Props {
  tenantName: string;
  lokasi: string | null;
  period: string;
  periodLabel: string;
  metrics: DashboardMetrics;
  intelligence: IntelligenceItem[];
  benchmarks: ImpactBenchmarkRow[];
  rotasi: RotasiRow[];
  attention: AttentionItem[];
}

const numberId = new Intl.NumberFormat('id-ID');

export default function DashboardOverview({
  period,
  metrics,
  attention,
  rotasi,
  intelligence,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const router = useRouter();

  const setPeriod = (value: string) => {
    router.push(value === 'today' ? '/dashboard' : `/dashboard?period=${value}`);
  };

  const go = (path: string) => router.push(path);

  return (
    <div className="launchpad-canvas">
      {/* Top action row under header */}
      <div className="launchpad-toolbar">
        <div className="launchpad-toolbar-left">
          <SegmentedButton>
            <SegmentedButtonItem selected={period === 'today'} onClick={() => setPeriod('today')}>
              {t('dashboard:period_today')}
            </SegmentedButtonItem>
            <SegmentedButtonItem selected={period === '7d'} onClick={() => setPeriod('7d')}>
              {t('dashboard:period_7d')}
            </SegmentedButtonItem>
            <SegmentedButtonItem selected={period === '30d'} onClick={() => setPeriod('30d')}>
              {t('dashboard:period_30d')}
            </SegmentedButtonItem>
          </SegmentedButton>
        </div>

        <div className="launchpad-toolbar-right">
          <Button design="Transparent" icon={fioriIcons.add} onClick={() => go('/tasks/new')}>
            {t('common:action.add')}
          </Button>
          <Button design="Transparent" icon={fioriIcons.refresh} onClick={() => router.refresh()}>
            {t('common:action.reload')}
          </Button>
        </div>
      </div>

      {/* Main 2-column Launchpad Grid */}
      <div className="launchpad-grid">
        {/* Left Column: Sections & Tiles & Insights */}
        <div className="launchpad-main">
          {/* Section 1: Operational Pipeline */}
          <section className="launchpad-section">
            <h2 className="launchpad-section-title">{t('common:nav.group_operations')}</h2>

            <div className="launchpad-tiles-row">
              <div
                className="launchpad-tile"
                role="button"
                tabIndex={0}
                onClick={() => go('/tasks')}
              >
                <div className="launchpad-tile-title">{t('dashboard:kpi.tasks.title')}</div>
                <div className="launchpad-tile-value">{metrics.tugasAktif}</div>
                <div className="launchpad-tile-sub">
                  {metrics.tugasOverdue > 0 ? (
                    <span className="launchpad-status-bad">
                      {t('dashboard:kpi.tasks.status_overdue', { total: metrics.tugasOverdue })}
                    </span>
                  ) : (
                    <span>{t('dashboard:kpi.tasks.status_none')}</span>
                  )}
                </div>
              </div>

              <div
                className="launchpad-tile"
                role="button"
                tabIndex={0}
                onClick={() => go('/hris/attendance')}
              >
                <div className="launchpad-tile-title">{t('common:nav.attendance')}</div>
                <div className="launchpad-tile-value">
                  {metrics.hadirHK !== null ? metrics.hadirHK : '—'}
                </div>
                <div className="launchpad-tile-sub">
                  <span>{t('dashboard:launchpad.hk_present')}</span>
                </div>
              </div>

              <div
                className="launchpad-tile"
                role="button"
                tabIndex={0}
                onClick={() => go('/reports')}
              >
                <div className="launchpad-tile-title">{t('dashboard:kpi.production.title')}</div>
                <div className="launchpad-tile-value">
                  {metrics.produksiKg !== null ? numberId.format(metrics.produksiKg) : '—'}
                </div>
                <div className="launchpad-tile-sub">
                  <span>{t('dashboard:launchpad.harvest_kg')}</span>
                </div>
              </div>

              <div
                className="launchpad-tile"
                role="button"
                tabIndex={0}
                onClick={() => go('/commerce/orders')}
              >
                <div className="launchpad-tile-title">{t('common:nav.orders')}</div>
                <div className="launchpad-tile-value">{metrics.orderMenunggu}</div>
                <div className="launchpad-tile-sub">
                  <span className={metrics.orderMenunggu > 0 ? 'launchpad-status-warn' : ''}>
                    {t('dashboard:launchpad.awaiting_approval')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Insights */}
          <section className="launchpad-section">
            <h2 className="launchpad-section-title">{t('dashboard:launchpad.insights')}</h2>

            <div className="launchpad-cards-row">
              {/* Card 1: Approvals / Action items */}
              <Card
                className="launchpad-card"
                header={
                  <CardHeader
                    titleText={t('dashboard:attention_card_title')}
                    subtitleText={t('dashboard:attention_card_subtitle')}
                    avatar={<Icon name={fioriIcons.approvals} />}
                  />
                }
              >
                <div style={{ padding: '0 0.5rem 0.5rem' }}>
                  <List selectionMode="None" noDataText={t('dashboard:attention_empty_title')}>
                    {attention.map((item) => (
                      <ListItemStandard
                        key={item.id}
                        text={item.title}
                        description={item.description}
                        additionalText={item.statusLabel}
                        additionalTextState={item.state}
                        type="Navigation"
                        onClick={() => go(item.href)}
                      />
                    ))}
                  </List>
                </div>
              </Card>

              {/* Card 2: Rotation status */}
              <Card
                className="launchpad-card"
                header={
                  <CardHeader
                    titleText={t('dashboard:rotation_card_title')}
                    subtitleText={t('dashboard:rotation_card_subtitle')}
                    avatar={<Icon name={fioriIcons['table-view']} />}
                  />
                }
              >
                <div style={{ padding: '0 0.5rem 0.5rem' }}>
                  <List selectionMode="None" noDataText={t('dashboard:rotation_no_data')}>
                    {rotasi.slice(0, 5).map((r) => {
                      const info = rotasiStatusInfo(r.status);
                      return (
                        <ListItemStandard
                          key={r.blokKode}
                          text={t('dashboard:launchpad.block_prefix', { code: r.blokKode })}
                          description={t('dashboard:launchpad.harvest_info', {
                            date: r.terakhirPanenLabel,
                            days: r.hariLabel,
                          })}
                          additionalText={info.label}
                          additionalTextState={info.state}
                          type="Inactive"
                        />
                      );
                    })}
                  </List>
                </div>
              </Card>
            </div>
          </section>
        </div>

        {/* Right Column: Quick Access & Side Drawer */}
        <aside className="launchpad-sidebar">
          <section className="launchpad-section">
            <h2 className="launchpad-section-title">{t('dashboard:launchpad.quick_access')}</h2>
            <div className="launchpad-quick-links">
              <button
                type="button"
                className="launchpad-link-item"
                onClick={() => go('/tasks/new')}
              >
                <Icon name={fioriIcons.add} className="launchpad-link-icon" />
                <div className="launchpad-link-text">
                  <strong>{t('dashboard:launchpad.quick.task_title')}</strong>
                  <small>{t('dashboard:launchpad.quick.task_sub')}</small>
                </div>
              </button>

              <button
                type="button"
                className="launchpad-link-item"
                onClick={() => go('/hris/attendance')}
              >
                <Icon name={fioriIcons['employee-approvals']} className="launchpad-link-icon" />
                <div className="launchpad-link-text">
                  <strong>{t('dashboard:launchpad.quick.attendance_title')}</strong>
                  <small>{t('dashboard:launchpad.quick.attendance_sub')}</small>
                </div>
              </button>

              <button type="button" className="launchpad-link-item" onClick={() => go('/agronomy')}>
                <Icon name={fioriIcons.stethoscope} className="launchpad-link-icon" />
                <div className="launchpad-link-text">
                  <strong>{t('dashboard:launchpad.quick.agronomy_title')}</strong>
                  <small>{t('dashboard:launchpad.quick.agronomy_sub')}</small>
                </div>
              </button>

              <button type="button" className="launchpad-link-item" onClick={() => go('/commerce')}>
                <Icon name={fioriIcons.cart} className="launchpad-link-icon" />
                <div className="launchpad-link-text">
                  <strong>{t('dashboard:launchpad.quick.catalog_title')}</strong>
                  <small>{t('dashboard:launchpad.quick.catalog_sub')}</small>
                </div>
              </button>

              <button type="button" className="launchpad-link-item" onClick={() => go('/reports')}>
                <Icon name={fioriIcons['table-view']} className="launchpad-link-icon" />
                <div className="launchpad-link-text">
                  <strong>{t('dashboard:launchpad.quick.reports_title')}</strong>
                  <small>{t('dashboard:launchpad.quick.reports_sub')}</small>
                </div>
              </button>
            </div>
          </section>

          {/* Market Intelligence */}
          {intelligence.length > 0 && (
            <section className="launchpad-section" style={{ marginTop: '1.5rem' }}>
              <h2 className="launchpad-section-title">
                {t('dashboard:launchpad.market_intelligence')}
              </h2>
              <Card className="launchpad-card">
                <div style={{ padding: '0.75rem 1rem' }}>
                  <Text style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {intelligence[0].sku}
                  </Text>
                  <Text style={{ fontSize: '0.8125rem', color: 'var(--sapNegativeColor)' }}>
                    {t('dashboard:launchpad.price_deviation', {
                      value: intelligence[0].deviationPercentage,
                    })}
                  </Text>
                  <Text style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>
                    {intelligence[0].reasoning}
                  </Text>
                </div>
              </Card>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
