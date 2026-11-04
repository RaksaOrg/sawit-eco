import React from 'react';
import { ViewStyle } from 'react-native';
import { AppShell } from '../AppShell';
import { AppTopHeader } from './AppTopHeader';
import { AppHeader } from './AppHeader';

export function AppScreen({
  children,
  scroll = true,
  style,
  backgroundSource,
  scrollContentStyle,
  showsVerticalScrollIndicator,
  showTopHeader = false,
  topHeaderCenter,
  topHeaderRight,
  onTopHeaderAvatarPress,
  title,
  subtitle,
  onBack,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  backgroundSource?: React.ComponentProps<typeof AppShell>['backgroundSource'];
  scrollContentStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  showTopHeader?: boolean;
  topHeaderCenter?: React.ReactNode;
  topHeaderRight?: React.ReactNode;
  onTopHeaderAvatarPress?: () => void;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <AppShell
      scroll={scroll}
      showHeader={false}
      screenStyle={style}
      backgroundSource={backgroundSource}
      scrollContentStyle={scrollContentStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      topBar={
        showTopHeader ? (
          <AppTopHeader
            center={topHeaderCenter}
            right={topHeaderRight}
            onAvatarPress={onTopHeaderAvatarPress}
          />
        ) : undefined
      }
    >
      {title && <AppHeader title={title} subtitle={subtitle} onBack={onBack} />}
      {children}
    </AppShell>
  );
}
