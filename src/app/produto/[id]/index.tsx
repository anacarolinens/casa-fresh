import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useProducts } from '@/contexts/products-context';
import { useShopping } from '@/contexts/shopping-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { confirmDiscardExpired } from '@/lib/discard-product';
import { statusLabel } from '@/types/product';

export default function ProdutoDetalheScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, removeProduct, adjustQuantity } = useProducts();
  const { addItem } = useShopping();
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

  const handleUseOne = () => changeQuantity(-1);

  const handleFinish = () => {
    if (product.quantity <= 0) return;
    Alert.alert('Acabei', `Marcar "${product.name}" como acabado (quantidade 0)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Acabei',
        style: 'destructive',
        onPress: () => changeQuantity(-product.quantity),
      },
    ]);
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

  const handleDiscard = () => {
    if (isRemoving) return;
    confirmDiscardExpired(product, {
      remove: async () => {
        setIsRemoving(true);
        try {
          await removeProduct(product.id);
        } finally {
          setIsRemoving(false);
        }
      },
      addToShopping: () => addItem(product.name),
      onDone: () => router.replace('/(tabs)/estoque'),
    });
  };

  const isExpired = product.status === 'expired';

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

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <View style={styles.photo}>
            <Ionicons name="nutrition-outline" size={48} color={colors.textMuted} />
          </View>
        )}

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.location}>{product.location}</Text>

        {isExpired ? (
          <View style={styles.expiredBanner}>
            <Ionicons name="warning" size={18} color={colors.danger} />
            <View style={styles.expiredBannerText}>
              <Text style={styles.expiredTitle}>Produto vencido</Text>
              <Text style={styles.expiredSubtitle}>
                Descarte do estoque e, se quiser, reponha na lista de compras.
              </Text>
            </View>
          </View>
        ) : null}

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

        {isExpired ? null : (
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickBtn, product.quantity <= 0 && styles.qtyBtnDisabled]}
              onPress={handleUseOne}
              disabled={isAdjusting || product.quantity <= 0}>
              <Ionicons name="remove-circle-outline" size={20} color={colors.accentDark} />
              <Text style={styles.quickBtnText}>Usei 1</Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickBtn,
                styles.quickBtnDanger,
                product.quantity <= 0 && styles.qtyBtnDisabled,
              ]}
              onPress={handleFinish}
              disabled={isAdjusting || product.quantity <= 0}>
              <Ionicons name="checkmark-done-outline" size={20} color={colors.danger} />
              <Text style={[styles.quickBtnText, styles.quickBtnTextDanger]}>Acabei</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.grid}>
          <View style={[styles.infoCard, isExpired ? styles.infoDanger : styles.infoHighlight]}>
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
      </ScrollView>

      <View style={styles.footer}>
        {isRemoving ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            {isExpired ? (
              <Button label="Descartar" variant="danger" onPress={handleDiscard} />
            ) : null}
            <Button
              label="Editar produto"
              onPress={() => router.push(`/produto/${product.id}/editar`)}
            />
            {!isExpired ? (
              <Button label="Remover produto" variant="danger" onPress={handleRemove} />
            ) : null}
          </>
        )}
      </View>
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
    flex: {
      flex: 1,
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
      alignItems: 'center' as const,
      gap: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    footer: {
      gap: Spacing.md,
      paddingTop: Spacing.md,
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
    expiredBanner: {
      width: '100%' as const,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: Spacing.md,
      backgroundColor: colors.dangerSoft,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
    },
    expiredBannerText: {
      flex: 1,
      gap: 4,
    },
    expiredTitle: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.danger,
    },
    expiredSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
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
    quickActions: {
      width: '100%' as const,
      flexDirection: 'row' as const,
      gap: Spacing.md,
    },
    quickBtn: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: Spacing.sm,
      backgroundColor: colors.accentSoft,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
    },
    quickBtnDanger: {
      backgroundColor: colors.dangerSoft,
    },
    quickBtnText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.accentDark,
    },
    quickBtnTextDanger: {
      color: colors.danger,
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
    infoDanger: {
      backgroundColor: colors.dangerSoft,
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
  };
}
