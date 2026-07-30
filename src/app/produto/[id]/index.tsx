import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useProducts } from '@/contexts/products-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { statusLabel } from '@/types/product';

export default function ProdutoDetalheScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, removeProduct, adjustQuantity } = useProducts();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.xl }]}>
        <Text style={styles.headerTitle}>Produto não encontrado</Text>
        <Button label="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const alert = statusLabel(product);

  const changeQuantity = async (delta: number) => {
    if (isAdjusting) return;
    if (delta < 0 && product.quantity <= 0) return;

    setIsAdjusting(true);
    try {
      await adjustQuantity(product.id, delta);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar quantidade';
      Alert.alert('Erro', message);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('Remover produto', `Tem certeza que deseja remover "${product.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setIsRemoving(true);
          try {
            await removeProduct(product.id);
            router.replace('/(tabs)/estoque');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao remover';
            Alert.alert('Erro', message);
          } finally {
            setIsRemoving(false);
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalhes do produto</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.content}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <View style={styles.photo}>
            <Ionicons name="nutrition-outline" size={48} color={colors.textMuted} />
          </View>
        )}

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.location}>{product.location}</Text>

        <View style={styles.qtyBox}>
          <Text style={styles.qtyLabel}>Quantidade no estoque</Text>
          <View style={styles.qtyRow}>
            <Pressable
              onPress={() => changeQuantity(-1)}
              disabled={isAdjusting || product.quantity <= 0}
              style={[styles.qtyBtn, product.quantity <= 0 && styles.qtyBtnDisabled]}>
              <Ionicons name="remove" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.qtyValueWrap}>
              {isAdjusting ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.qtyValue}>
                  {product.quantity} {product.unit}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => changeQuantity(1)}
              disabled={isAdjusting}
              style={styles.qtyBtn}>
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
          </View>
          <Text style={styles.qtyHint}>Use − para consumir sem editar o produto</Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.infoCard, styles.infoHighlight]}>
            <Text style={styles.infoLabel}>Vence em</Text>
            <Text style={styles.infoValue}>
              {product.daysLeft != null && product.daysLeft >= 0
                ? `${product.daysLeft} dias`
                : product.status === 'expired'
                  ? 'Vencido'
                  : '—'}
            </Text>
            {product.expiryDate ? <Text style={styles.infoSub}>{product.expiryDate}</Text> : null}
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Comprado em</Text>
            <Text style={styles.infoValue}>{product.purchaseDate ?? '—'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{alert || 'Ok'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push(`/produto/${product.id}/editar`)}>
            <Text style={styles.link}>Editar produto</Text>
          </Pressable>
          <Pressable onPress={handleRemove} disabled={isRemoving}>
            <Text style={[styles.link, styles.linkDanger]}>Remover produto</Text>
          </Pressable>
        </View>
      </View>

      {isRemoving ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Button
          label="Editar produto"
          onPress={() => router.push(`/produto/${product.id}/editar`)}
        />
      )}
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
      marginBottom: Spacing.xl,
    },
    back: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    content: {
      flex: 1,
      alignItems: 'center' as const,
      gap: Spacing.md,
    },
    photo: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: Spacing.sm,
    },
    photoImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.input,
      marginBottom: Spacing.sm,
    },
    name: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    location: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    qtyBox: {
      width: '100%' as const,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'center' as const,
      gap: Spacing.md,
    },
    qtyLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    qtyRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.lg,
    },
    qtyBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    qtyBtnDisabled: {
      opacity: 0.4,
    },
    qtyValueWrap: {
      minWidth: 100,
      alignItems: 'center' as const,
    },
    qtyValue: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.text,
    },
    qtyHint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center' as const,
    },
    grid: {
      width: '100%' as const,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: Spacing.md,
    },
    infoCard: {
      width: '47%' as const,
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: 4,
    },
    infoHighlight: {
      backgroundColor: colors.warningSoft,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    infoSub: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row' as const,
      gap: Spacing.xxl,
      marginTop: Spacing.lg,
    },
    link: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.accent,
    },
    linkDanger: {
      color: colors.danger,
    },
  };
}
