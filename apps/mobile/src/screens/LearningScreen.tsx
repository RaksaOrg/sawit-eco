import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppLoadingState,
  AppScreen,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { LearningModule, useLearningModules } from '../core/api/hooks';

const tTokens = foundationTokens;
const DOWNLOAD_KEY = 'sawit_learning_downloads';

export function LearningScreen({
  navigation,
}: {
  navigation?: { navigate: (screen: string, params?: unknown) => void };
}) {
  const language = useMobileAppStore((s) => s.language);
  const t = createTranslator(language);
  const { data: modules, isLoading, refetch } = useLearningModules();
  const [downloaded, setDownloaded] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DOWNLOAD_KEY)
      .then((raw) => (raw ? JSON.parse(raw) : {}))
      .then(setDownloaded)
      .catch(() => setDownloaded({}));
  }, []);

  const saveDownloads = async (map: Record<string, string>) => {
    setDownloaded(map);
    await AsyncStorage.setItem(DOWNLOAD_KEY, JSON.stringify(map));
  };

  const downloadModule = async (module: LearningModule) => {
    setDownloadingId(module.id);
    try {
      const target = `${FileSystem.documentDirectory}lesson-${module.id}.txt`;
      const body = `${module.judul}\n\n${module.deskripsi}\n\n${module.konten}`;
      await FileSystem.writeAsStringAsync(target, body, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await saveDownloads({ ...downloaded, [module.id]: target });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AppScreen showTopHeader onTopHeaderAvatarPress={() => navigation?.navigate('Profile')}>
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>{t('learning.title')}</Text>
        <Text style={styles.mainSubtitle}>
          Tingkatkan pengetahuan dan kompetensi Anda melalui materi pembelajaran yang tersedia.
        </Text>
      </View>

      {isLoading ? (
        <AppLoadingState label={t('common.loading')} />
      ) : !modules || modules.length === 0 ? (
        <AppEmptyState
          title={t('common.empty')}
          subtitle={t('learning.empty_sub')}
          actionLabel={t('common.retry')}
          onAction={refetch}
        />
      ) : (
        modules.map((module) => {
          const isDownloaded = Boolean(downloaded[module.id]);
          const levelName = module.durasiMenit > 3 ? 'Level Menengah' : 'Level Dasar';

          return (
            <AppCard key={module.id} style={styles.moduleCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.thumbBox}>
                  <View style={styles.thumbInner}>
                    <Ionicons
                      name={module.kategori === 'K3' ? 'shield-checkmark' : 'leaf'}
                      size={32}
                      color={
                        module.kategori === 'K3'
                          ? semanticTokens.color.warning
                          : semanticTokens.color.brand
                      }
                    />
                  </View>
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.moduleTitle} numberOfLines={2}>
                    {module.judul}
                  </Text>

                  <View style={styles.badgeRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>• {module.kategori}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={semanticTokens.color.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {module.durasiMenit} {t('common.unit_minute')}
                    </Text>
                    <Text style={styles.metaDivider}>|</Text>
                    <Ionicons
                      name="stats-chart"
                      size={12}
                      color={semanticTokens.color.textSecondary}
                    />
                    <Text style={styles.metaText}>{levelName}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.moduleDesc} numberOfLines={2}>
                {module.deskripsi}
              </Text>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.outlineButton, isDownloaded && styles.outlineButtonActive]}
                  onPress={() => downloadModule(module)}
                  disabled={downloadingId === module.id}
                >
                  <Ionicons
                    name={isDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                    size={16}
                    color={isDownloaded ? semanticTokens.color.success : semanticTokens.color.pdp}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.outlineButtonText,
                      isDownloaded && { color: semanticTokens.color.success },
                    ]}
                  >
                    {isDownloaded ? t('learning.downloaded') : t('learning.download')}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() =>
                    navigation?.navigate('LearningDetail', {
                      module,
                      localUri: downloaded[module.id],
                    })
                  }
                >
                  <Text style={styles.primaryButtonText}>{t('learning.start')}</Text>
                </Pressable>
              </View>
            </AppCard>
          );
        })
      )}
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
  moduleCard: {
    padding: tTokens.spacing.md,
    borderRadius: tTokens.radius.lg,
    marginBottom: tTokens.spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tTokens.spacing.md,
  },
  thumbBox: {
    width: 86,
    height: 86,
    borderRadius: tTokens.radius.md,
    backgroundColor: '#EDF5FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCE8F6',
  },
  thumbInner: {
    width: 54,
    height: 54,
    borderRadius: tTokens.radius.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: tTokens.typography.title.size,
    fontWeight: tTokens.typography.title.weight,
    lineHeight: tTokens.typography.title.lineHeight,
    color: semanticTokens.color.textPrimary,
  },
  badgeRow: {
    marginTop: tTokens.spacing.xs,
    flexDirection: 'row',
  },
  categoryBadge: {
    backgroundColor: semanticTokens.badge.info.background,
    paddingHorizontal: tTokens.spacing.xs,
    paddingVertical: tTokens.spacing['2xs'],
    borderRadius: tTokens.radius.xs,
  },
  categoryBadgeText: {
    fontSize: tTokens.typography.caption.size,
    fontWeight: '700',
    color: semanticTokens.color.info,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: tTokens.spacing.xs,
  },
  metaText: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.textSecondary,
    fontWeight: '500',
  },
  metaDivider: {
    fontSize: tTokens.typography.caption.size,
    color: semanticTokens.color.borderStrong,
    marginHorizontal: 2,
  },
  moduleDesc: {
    fontSize: tTokens.typography.bodyMedium.size,
    color: semanticTokens.color.textSecondary,
    marginTop: tTokens.spacing.sm,
    lineHeight: tTokens.typography.bodyMedium.lineHeight,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tTokens.spacing.sm,
    marginTop: tTokens.spacing.md,
  },
  outlineButton: {
    flex: 1,
    height: 42,
    borderRadius: tTokens.radius.md,
    borderWidth: 1,
    borderColor: '#D7DCF8',
    backgroundColor: semanticTokens.color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tTokens.spacing.sm,
  },
  outlineButtonActive: {
    borderColor: semanticTokens.color.success,
    backgroundColor: semanticTokens.badge.success.background,
  },
  outlineButtonText: {
    fontSize: tTokens.typography.labelSmall.size,
    fontWeight: '700',
    color: semanticTokens.color.pdp,
  },
  primaryButton: {
    flex: 1,
    height: 42,
    borderRadius: tTokens.radius.md,
    backgroundColor: semanticTokens.color.pdp,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tTokens.spacing.sm,
  },
  primaryButtonText: {
    fontSize: tTokens.typography.labelSmall.size,
    fontWeight: '700',
    color: semanticTokens.color.surface,
  },
});
