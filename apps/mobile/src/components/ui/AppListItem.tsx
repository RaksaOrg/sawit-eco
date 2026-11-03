import React from 'react';
import { StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { foundationTokens } from '../../theme/foundation/tokens';
import { componentTokens } from '../../theme/components/tokens';

const t = foundationTokens;
const c = componentTokens;

export function AppListItem({
  title,
  description,
  status,
  onPress,
  icon,
}: {
  title: string;
  description?: string;
  status?: React.ReactNode;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <List.Item
      title={title}
      description={description}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      left={
        icon
          ? (props) => <List.Icon {...props} icon={() => <Ionicons name={icon} size={22} />} />
          : undefined
      }
      right={() => status ?? null}
      style={styles.listItem}
    />
  );
}

const styles = StyleSheet.create({
  listItem: {
    minHeight: c.listItem.minHeight,
    paddingHorizontal: t.spacing.md,
    backgroundColor: c.card.background,
    borderRadius: c.card.radius,
    marginBottom: t.spacing.xs,
    borderWidth: t.borderWidth.hairline,
    borderColor: c.card.borderColor,
  },
});
