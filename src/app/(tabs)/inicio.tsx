import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/product-row';
import { NotificationBell } from '@/components/notification-bell';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProducts } from '@/contexts/products-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { getOwnProfile } from '@/lib/households';
import { isSupabaseConfigured } from '@/lib/supabase';

function firstName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { session } = useAuth();
  const { products, summary } = useProducts();
  const [userName, setUserName] = useState<string | null>(
    firstName(session?.user.user_metadata?.nome) ||
      firstName(session?.user.email?.split('@')[0]) ||
      null,
  );

  useEffect(() => {
    const fromMeta =
      firstName(session?.user.user_metadata?.nome) ||
      firstName(session?.user.email?.split('@')[0]) ||
      null;
    setUserName(fromMeta);

    if (!isSupabaseConfigured || !session) return;

    getOwnProfile()
      .then((profile) => {
        const name = firstName(profile?.nome) || fromMeta;
        if (name) setUserName(name);
      })
      .catch(() => {});
  }, [session]);

  const expiring = useMemo(
    () => products.filter((p) => p.status === 'expiring'),
    [products],
  );

  const cards = [
    {
      id: 'total',
      value: String(summary.total),
      label: 'Produtos cadastrados',
      background: colors.surface,
      icon: 'bag-handle' as const,
      iconColor: colors.success,
    },
    {
      id: 'expiring',
      value: String(summary.expiring),
      label: 'Próximos do vencimento',
      background: colors.warningSoft,
      icon: 'time' as const,
      iconColor: colors.warning,
    },
    {
      id: 'expired',
      value: String(summary.expired),
      label: 'Produtos vencidos',
      background: colors.dangerSoft,
      icon: 'warning' as const,
      iconColor: colors.danger,
    },
    {
      id: 'missing',
      value: String(summary.missing),
      label: 'Produtos em falta',
      background: colors.infoSoft,
      icon: 'cart' as const,
      iconColor: colors.info,
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {userName ? `Olá ${userName} 👋` : 'Olá 👋'}
            </Text>
            <Text style={styles.subtitle}>De uma olhada no seu estoque</Text>
          </View>
          <NotificationBell style={styles.bellButton} />
        </View>

        <View style={styles.summaryGrid}>
          {cards.map((item) => (
            <View key={item.id} style={[styles.summaryCard, { backgroundColor: item.background }]}>
              <Ionicons
                name={item.icon}
                size={22}
                color={item.iconColor}
                style={styles.summaryIcon}
              />
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos do vencimento</Text>
          <Pressable onPress={() => router.push('/(tabs)/estoque')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {expiring.map((item) => (
            <ProductRow
              key={item.id}
              product={item}
              onPress={() => router.push(`/produto/${item.id}`)}
            />
          ))}
          {expiring.length === 0 ? (
            <Text style={styles.empty}>Nenhum produto próximo do vencimento.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.xl,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      marginTop: Spacing.xs,
      fontSize: 15,
      color: colors.textSecondary,
    },
    bellButton: {
      padding: Spacing.xs,
    },
    summaryGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: Spacing.md,
      marginBottom: Spacing.xxl,
    },
    summaryCard: {
      width: '47.5%' as const,
      flexGrow: 1,
      minHeight: 110,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      justifyContent: 'flex-end' as const,
    },
    summaryIcon: {
      position: 'absolute' as const,
      top: Spacing.lg,
      right: Spacing.lg,
    },
    summaryValue: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: colors.text,
      lineHeight: 38,
    },
    summaryLabel: {
      marginTop: Spacing.xs,
      fontSize: 13,
      color: colors.textSecondary,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    seeAll: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    list: {
      gap: Spacing.md,
    },
    empty: {
      textAlign: 'center' as const,
      color: colors.textSecondary,
      paddingVertical: Spacing.lg,
    },
  };
}
