import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMobileAppStore } from '../../state/store';
import { createTranslator } from '../../i18n';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';

const tokens = foundationTokens;

export function AppTopHeader({
  center,
  right,
  onAvatarPress,
}: {
  center?: React.ReactNode;
  right?: React.ReactNode;
  onAvatarPress?: () => void;
}) {
  const language = useMobileAppStore((state) => state.language);
  const t = createTranslator(language);

  return (
    <View style={styles.topHeader}>
      <View style={styles.brandGroup}>
        <Image
          source={require('../../../assets/brand-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.brandTextCol}>
          <Text style={styles.brandText}>{t('login.brand1')}</Text>
          <Text style={styles.brandText}>{t('login.brand2')}</Text>
        </View>
      </View>
      {center ? <View style={styles.center}>{center}</View> : null}
      {right ?? (
        <View style={styles.headerActions}>
          <Pressable style={styles.bellButton} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={semanticTokens.color.brand} />
          </Pressable>
          <Pressable style={styles.avatarButton} hitSlop={8} onPress={onAvatarPress}>
            <Ionicons name="person" size={17} color={semanticTokens.color.surface} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  logo: { width: 32, height: 32 },
  brandTextCol: { justifyContent: 'center' },
  brandText: {
    color: semanticTokens.color.brand,
    fontSize: tokens.typography.labelLarge.size,
    lineHeight: tokens.typography.labelLarge.lineHeight,
    fontWeight: '800',
  },
  center: { flex: 1, alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    backgroundColor: semanticTokens.badge.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    backgroundColor: semanticTokens.color.pdp,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
