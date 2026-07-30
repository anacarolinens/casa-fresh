import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useProducts } from '@/contexts/products-context';
import { useShopping } from '@/contexts/shopping-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { buildNotifications, type AppNotification } from '@/lib/notifications';

function typeMeta(colors: ThemeColors): Record<
  AppNotification['type'],
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }
> {
  return {
    expired: {
      icon: 'warning',
      color: colors.danger,
      bg: colors.dangerSoft,
      label: 'Vencido',
    },
    expiring: {
      icon: 'time',
      color: colors.warning,
      bg: colors.warningSoft,
      label: 'A vencer',
    },
    missing: {
      icon: 'cart',
      color: colors.info,
      bg: colors.infoSoft,
      label: 'Em falta',
    },
    shopping: {
      icon: 'list',
      color: colors.accentDark,
      bg: colors.accentSoft,
      label: 'Compras',
    },
  };
}

export default function NotificacoesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { products } = useProducts();
  const { items } = useShopping();
  const metaByType = useMemo(() => typeMeta(colors), [colors]);

  const notifications = useMemo(
    () => buildNotifications(products, items),
    [products, items],
  );

  const onPress = (item: AppNotification) => {
    if (item.type === 'shopping') {
      router.push('/(tabs)/compras');
      return;
    }
    if (item.productId) {
      router.push(`/produto/${item.productId}`);
      return;
    }
    router.push('/(tabs)/estoque');
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
      ]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Alertas</Text>
        <View style={styles.back} />
      </View>

      <Text style={styles.subtitle}>
        {notifications.length === 0
          ? 'Nada urgente no momento.'
          : `${notifications.length} alerta${notifications.length > 1 ? 's' : ''} da sua casa`}
      </Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {notifications.map((item) => {
          const meta = metaByType[item.type];
          return (
            <Pressable
              key={item.id}
              onPress={() => onPress(item)}
              style={[styles.card, { backgroundColor: meta.bg }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.badge, { color: meta.color }]}>{meta.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage}>{item.message}</Text>
              </View>
            </Pressable>
          );
        })}

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Sem alertas. Quando houver produtos vencidos, a vencer ou em falta, eles aparecem aqui.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: Spacing.xl,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.md,
    },
    back: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    title: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: Spacing.lg,
    },
    list: {
      gap: Spacing.md,
      paddingBottom: Spacing.xxxl,
    },
    card: {
      flexDirection: 'row' as const,
      gap: Spacing.md,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'flex-start' as const,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardTop: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    badge: {
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    cardMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    empty: {
      alignItems: 'center' as const,
      gap: Spacing.md,
      paddingVertical: Spacing.xxxl,
      paddingHorizontal: Spacing.xl,
    },
    emptyText: {
      textAlign: 'center' as const,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  };
}
