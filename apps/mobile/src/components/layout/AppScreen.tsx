import React from 'react';
import { View, ViewStyle } from 'react-native';
import { AppShell } from '../AppShell';

export function AppScreen({
  children,
  scroll = true,
  style,
  backgroundSource,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  backgroundSource?: React.ComponentProps<typeof AppShell>['backgroundSource'];
}) {
  return (
    <AppShell
      scroll={scroll}
      showHeader={false}
      screenStyle={style}
      backgroundSource={backgroundSource}
    >
      {children}
    </AppShell>
  );
}
