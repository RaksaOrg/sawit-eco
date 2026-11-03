import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { TextInput } from 'react-native-paper';
import { foundationTokens } from '../../theme/foundation/tokens';
import { semanticTokens } from '../../theme/semantic/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export type AppTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  placeholder?: string;
  height?: number;
  radius?: number;
  background?: string;
  style?: ViewStyle;
};

export function AppTextField({
  label,
  value,
  onChangeText,
  error,
  multiline,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  editable = true,
  placeholder,
  height,
  radius,
  background,
  style,
}: AppTextFieldProps) {
  return (
    <View style={[{ marginBottom: t.spacing.md }, style]}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        error={Boolean(error)}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        editable={editable}
        placeholder={placeholder}
        style={[
          { minHeight: height ?? c.textField.minHeight },
          radius !== undefined ? { borderRadius: radius } : null,
          background !== undefined ? { backgroundColor: background } : null,
        ]}
      />
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: semanticTokens.color.error,
    fontSize: t.typography.caption.size,
    marginTop: t.spacing['2xs'],
  },
});
