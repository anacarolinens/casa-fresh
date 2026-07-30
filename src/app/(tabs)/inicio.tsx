import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/product-row';
import { NotificationBell } from '@/components/notification-bell';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProducts } from '@/contexts/products-context';
import { useShopping } from '@/contexts/shopping-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { confirmDiscardExpired } from '@/lib/discard-product';
import { getCachedDisplayName, getOwnProfile } from '@/lib/households';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getEatFirstProducts, type Product } from '@/types/product';
import type { Session } from '@supabase/supabase-js';

function firstName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function resolveFallbackName(session: Session | null) {
  return (
    firstName(session?.user.user_metadata?.nome) ||
    firstName(session?.user.email?.split('@')[0]) ||
    null
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { session } = useAuth();
  const { products, summary, isLoading, isReady, adjustQuantity, removeProduct } = useProducts();
  const { addItem } = useShopping();
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(() => {
    const cached = getCachedDisplayName(session?.user?.id);
    return firstName(cached) || resolveFallbackName(session);
  });

  useFocusEffect(
    useCallback(() => {
      const userId = session?.user?.id ?? null;
      const cached = getCachedDisplayName(userId);
      const fallback = resolveFallbackName(session);

      // Não volta ao metadata antigo se já temos o nome do perfil
      if (cached) {
        setUserName(firstName(cached) || fallback);
      }

      if (!isSupabaseConfigured || !session) {
        if (!cached) setUserName(fallback);
        return;
      }

      let active = true;
      getOwnProfile()
        .then((profile) => {
          if (!active) return;
          const name = firstName(profile?.nome) || firstName(cached) || fallback;
          if (name) setUserName(name);
        })
        .catch(() => {
          if (!active) return;
          if (!cached && fallback) setUserName(fallback);
        });

      return () => {
        active = false;
      };
    }, [session]),
  );

  const eatFirst = useMemo(() => getEatFirstProducts(products, 8), [products]);

  const showSkeleton = isLoading && !isReady;

  const handleConsume = async (id: string) => {
    if (consumingId) return;
    setConsumingId(id);
    try {
      await adjustQuantity(id, -1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar quantidade';
      Alert.alert('Erro', message);
    } finally {
      setConsumingId(null);
    }
  };

  const handleDiscard = (product: Product) => {
    if (discardingId) return;
    confirmDiscardExpired(product, {
      remove: async () => {
        setDiscardingId(product.id);
        try {
          await removeProduct(product.id);
        } finally {
          setDiscardingId(null);
        }
      },
      addToShopping: () => addItem(product.name),
    });
  };

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

        {showSkeleton ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>A carregar o estoque…</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              {cards.map((item) => (
                <View
                  key={item.id}
                  style={[styles.summaryCard, { backgroundColor: item.background }]}>
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
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitle}>Comer primeiro</Text>
                <Text style={styles.sectionHint}>Priorize o que está a vencer</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/estoque')}>
                <Text style={styles.seeAll}>Ver todos</Text>
              </Pressable>
            </View>

            <View style={styles.list}>
              {eatFirst.map((item) => (
                <ProductRow
                  key={item.id}
                  product={item}
                  onPress={() => router.push(`/produto/${item.id}`)}
                  onConsume={() => handleConsume(item.id)}
                  onDiscard={() => handleDiscard(item)}
                  consumeDisabled={consumingId === item.id}
                  discardDisabled={discardingId === item.id}
                />
              ))}
              {eatFirst.length === 0 ? (
                <Text style={styles.empty}>
                  Nada urgente. Quando houver produtos a vencer, aparecem aqui.
                </Text>
              ) : null}
            </View>
          </>
        )}
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
    loadingBlock: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: Spacing.xxxl,
      gap: Spacing.md,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
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
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.lg,
      gap: Spacing.md,
    },
    sectionTitleWrap: {
      flex: 1,
      gap: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    sectionHint: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    seeAll: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
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
