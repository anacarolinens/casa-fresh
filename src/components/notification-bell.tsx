import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useProducts } from '@/contexts/products-context';
import { useShopping } from '@/contexts/shopping-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { buildNotifications } from '@/lib/notifications';

type Props = {
  style?: object;
};

export function NotificationBell({ style }: Props) {
  const { products } = useProducts();
  const { items } = useShopping();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const count = useMemo(
    () => buildNotifications(products, items).length,
    [products, items],
  );

  return (
    <Pressable
      accessibilityLabel="Notificações"
      onPress={() => router.push('/notificacoes')}
      style={[styles.button, style]}
      hitSlop={8}>
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : String(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    button: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badge: {
      position: 'absolute' as const,
      top: 4,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700' as const,
    },
  };
}
