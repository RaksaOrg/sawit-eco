import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  tone?: 'brand' | 'success' | 'neutral';
  height?: number;
  radius?: number;
  fullWidth?: boolean;
  textColor?: string;
}

export function AppButton({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  loading,
  icon,
  style,
  tone,
  height,
  radius,
  fullWidth = false,
  textColor,
}: AppButtonProps) {
  const toneBackground =
    tone === 'success' ? semanticTokens.color.success : semanticTokens.color.brand;
  const background =
    variant === 'primary'
      ? toneBackground
      : variant === 'danger'
        ? semanticTokens.color.error
        : variant === 'ghost'
          ? 'transparent'
          : semanticTokens.color.surfaceSubtle;
  const color =
    textColor ??
    (variant === 'primary' || variant === 'danger'
      ? semanticTokens.color.surface
      : semanticTokens.color.textPrimary);
  const borderColor = variant === 'ghost' ? semanticTokens.color.border : background;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.5 : 1,
          ...(height !== undefined ? { height } : {}),
          ...(radius !== undefined ? { borderRadius: radius } : {}),
          ...(fullWidth ? { width: '100%' } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.buttonText, { color }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: c.button.minHeight,
    borderRadius: c.button.radius,
    paddingHorizontal: t.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  buttonText: {
    fontSize: t.typography.labelLarge.size,
    fontWeight: t.typography.labelLarge.weight,
  },
});
