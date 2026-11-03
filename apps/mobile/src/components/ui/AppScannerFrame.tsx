import React from 'react';
import { StyleSheet, View } from 'react-native';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export function AppScannerFrame({
  size = c.scanner.size,
  children,
}: {
  size?: number;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.scanner, { width: size, height: size }]}>
      {children}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scanner: {
    borderRadius: t.radius.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: semanticTokens.color.brand,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: t.borderWidth.heavy,
    borderLeftWidth: t.borderWidth.heavy,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: t.borderWidth.heavy,
    borderRightWidth: t.borderWidth.heavy,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: t.borderWidth.heavy,
    borderLeftWidth: t.borderWidth.heavy,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: t.borderWidth.heavy,
    borderRightWidth: t.borderWidth.heavy,
  },
});
