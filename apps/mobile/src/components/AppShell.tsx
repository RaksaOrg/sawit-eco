import React from 'react';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

type ImageSource = React.ComponentProps<typeof Image>['source'];
type StyleValue<T> = T | T[] | undefined;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';

const t = foundationTokens;

export interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  showHeader?: boolean;
  variant?: 'default' | 'brand';
  customHeader?: ReactNode;
  headerRight?: ReactNode;
  topBar?: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  logoSource?: ImageSource;
  backgroundSource?: ImageSource;
  screenStyle?: StyleValue<ViewStyle>;
  contentStyle?: StyleValue<ViewStyle>;
  headerStyle?: StyleValue<ViewStyle>;
  titleStyle?: StyleValue<TextStyle>;
}

export function AppShell({
  children,
  title,
  subtitle,
  onBack,
  showBack = false,
  showHeader = true,
  variant = 'default',
  customHeader,
  headerRight,
  topBar,
  scroll = true,
  edges = ['top', 'bottom'],
  logoSource,
  backgroundSource,
  screenStyle,
  contentStyle,
  headerStyle,
  titleStyle,
}: AppShellProps) {
  const isBrand = variant === 'brand';

  const bodyContent = (
    <View style={[styles.content, backgroundSource ? styles.transparent : null, screenStyle, contentStyle]} accessibilityLabel="screen">
      {children}
    </View>
  );

  return (
    <View style={[styles.screen, backgroundSource ? styles.transparent : null]}>
      {backgroundSource && (
        <View style={styles.backgroundImage} pointerEvents="none">
          <Image
            source={backgroundSource}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </View>
      )}

      <SafeAreaView edges={edges} style={styles.safeArea}>
        {topBar}
        
        {customHeader}

        {showHeader && (
          <View style={[styles.header, headerStyle]}>
          {isBrand ? (
            <View style={styles.brandRow}>
              {logoSource ? (
                <Image source={logoSource} style={styles.brandLogo} resizeMode="contain" />
              ) : null}
              <View style={styles.headerTextCol}>
                {title ? <Text style={[styles.headerTitle, titleStyle]}>{title}</Text> : null}
                {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
              </View>
              {headerRight}
            </View>
          ) : (
            <View style={styles.standardRow}>
              {showBack && onBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="back"
                  onPress={onBack}
                  hitSlop={12}
                  style={styles.backButton}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={semanticTokens.color.textPrimary}
                  />
                </Pressable>
              ) : null}
              <View style={styles.headerTextCol}>
                {title ? <Text style={[styles.headerTitle, titleStyle]}>{title}</Text> : null}
                {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
              </View>
              {headerRight}
            </View>
          )}
        </View>
      )}

      {scroll ? (
        <ScrollView
          style={[styles.scroll, backgroundSource ? styles.transparent : null]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {bodyContent}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{bodyContent}</View>
      )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    backgroundColor: semanticTokens.color.background,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    minHeight: "100%",
    zIndex: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: t.spacing.xl,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: t.spacing.md,
  },
  header: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.xs,
  },
  standardRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  brandRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
  },
  brandLogo: {
    width: 120,
    height: 38,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: t.typography.headline.size,
    fontWeight: t.typography.headline.weight,
  },
  headerSubtitle: {
    color: semanticTokens.color.textSecondary,
    fontSize: t.typography.labelSmall.size,
  },
});
