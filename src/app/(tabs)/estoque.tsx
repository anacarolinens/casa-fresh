import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/product-row';
import { NotificationBell } from '@/components/notification-bell';
import type { ThemeColors } from '@/constants/theme';
import { LOCATIONS, Radius, Spacing } from '@/constants/theme';
import { useProducts } from '@/contexts/products-context';
import { useShopping } from '@/contexts/shopping-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { confirmDiscardExpired } from '@/lib/discard-product';
import type { Product } from '@/types/product';

const FILTERS = ['Todos', ...LOCATIONS] as const;

export default function EstoqueScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { products: allProducts, isLoading, removeProduct, adjustQuantity } = useProducts();
  const { addItem } = useShopping();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos');
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  const products = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'Todos' || p.location === filter;
      return matchesQuery && matchesFilter;
    });
  }, [allProducts, query, filter]);

  const consumeOne = async (product: Product) => {
    if (consumingId || product.quantity <= 0) return;
    setConsumingId(product.id);
    try {
      await adjustQuantity(product.id, -1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar quantidade';
      Alert.alert('Erro', message);
    } finally {
      setConsumingId(null);
    }
  };

  const discardExpired = (product: Product) => {
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

  const openProductMenu = (product: Product) => {
    const options: {
      text: string;
      style?: 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [
      {
        text: 'Ver detalhes',
        onPress: () => router.push(`/produto/${product.id}`),
      },
      {
        text: 'Editar',
        onPress: () => router.push(`/produto/${product.id}/editar`),
      },
    ];

    if (product.status === 'expired') {
      options.push({
        text: 'Descartar',
        style: 'destructive',
        onPress: () => discardExpired(product),
      });
    } else if (product.quantity > 0) {
      options.push({
        text: 'Usei 1',
        onPress: () => consumeOne(product),
      });
      options.push({
        text: 'Acabei',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Acabei', `Marcar "${product.name}" como acabado?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Acabei',
              style: 'destructive',
              onPress: async () => {
                try {
                  await adjustQuantity(product.id, -product.quantity);
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : 'Erro ao atualizar quantidade';
                  Alert.alert('Erro', message);
                }
              },
            },
          ]);
        },
      });
    }

    options.push({
      text: 'Remover',
      style: 'destructive',
      onPress: () => {
        Alert.alert('Remover produto', `Remover "${product.name}" do estoque?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Remover',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeProduct(product.id);
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Erro ao remover';
                Alert.alert('Erro', message);
              }
            },
          },
        ]);
      },
    });

    options.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(product.name, 'O que deseja fazer?', options);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Estoque</Text>
        <NotificationBell />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produto"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}>
        {FILTERS.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {products.map((item) => (
            <ProductRow
              key={item.id}
              product={item}
              onPress={() => router.push(`/produto/${item.id}`)}
              onMorePress={() => openProductMenu(item)}
              onConsume={() => consumeOne(item)}
              onDiscard={() => discardExpired(item)}
              consumeDisabled={consumingId === item.id}
              discardDisabled={discardingId === item.id}
            />
          ))}
          {products.length === 0 ? (
            <Text style={styles.empty}>Nenhum produto encontrado.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    searchRow: {
      paddingHorizontal: Spacing.xl,
      marginBottom: Spacing.md,
    },
    searchBox: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    chipsScroll: {
      maxHeight: 44,
      marginBottom: Spacing.lg,
    },
    chips: {
      paddingHorizontal: Spacing.xl,
      gap: Spacing.sm,
      alignItems: 'center' as const,
    },
    chip: {
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    chipTextActive: {
      color: colors.accentDark,
      fontWeight: '700' as const,
    },
    list: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.md,
    },
    empty: {
      textAlign: 'center' as const,
      color: colors.textSecondary,
      marginTop: Spacing.xxl,
    },
  };
}
