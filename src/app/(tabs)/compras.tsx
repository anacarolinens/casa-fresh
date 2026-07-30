import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/category-picker';
import { Button } from '@/components/ui/button';
import type { ThemeColors } from '@/constants/theme';
import { CATEGORIES, LOCATIONS, Radius, Spacing, UNITS } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProducts } from '@/contexts/products-context';
import { useShopping } from '@/contexts/shopping-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getShoppingSuggestions,
  type Product,
  type ShoppingItem,
} from '@/types/product';

/** Evita repetir o mesmo aviso na sessão atual */
const dismissedSuggestionIds = new Set<string>();
/** Itens da lista já enviados ao estoque nesta sessão */
const stockedShoppingIds = new Set<string>();

function isAlreadyOnList(items: ShoppingItem[], product: Product) {
  return items.some(
    (i) =>
      !i.bought &&
      (i.productId === product.id ||
        i.name.trim().toLowerCase() === product.name.trim().toLowerCase()),
  );
}

function todayBr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function ComprasScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { session } = useAuth();
  const { products, addProduct, restock } = useProducts();
  const { items, addItem, toggleItem } = useShopping();
  const [tab, setTab] = useState<'buy' | 'bought'>('buy');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(null);
  const [dismissedTick, setDismissedTick] = useState(0);

  const [pendingItem, setPendingItem] = useState<ShoppingItem | null>(null);
  const [stockQty, setStockQty] = useState('1');
  const [stockCategory, setStockCategory] = useState<string>(CATEGORIES[0]);
  const [stockLocation, setStockLocation] = useState<string>(LOCATIONS[0]);
  const [stockUnit, setStockUnit] = useState<string>(UNITS[0]);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockedIds, setStockedIds] = useState(() => new Set(stockedShoppingIds));

  const suggestions = useMemo(
    () => getShoppingSuggestions(products, items, dismissedSuggestionIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismissedTick força recálculo após dismiss
    [products, items, dismissedTick],
  );

  const visible = useMemo(
    () => items.filter((item) => (tab === 'buy' ? !item.bought : item.bought)),
    [items, tab],
  );

  const linkedProduct = useMemo(() => {
    if (!pendingItem) return null;
    if (pendingItem.productId) {
      return products.find((p) => p.id === pendingItem.productId) ?? null;
    }
    return (
      products.find(
        (p) => p.name.trim().toLowerCase() === pendingItem.name.trim().toLowerCase(),
      ) ?? null
    );
  }, [pendingItem, products]);

  const openStockModal = (item: ShoppingItem) => {
    const existing =
      (item.productId && products.find((p) => p.id === item.productId)) ||
      products.find((p) => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());

    setPendingItem(item);
    setStockQty('1');
    setStockCategory(existing?.category || CATEGORIES[0]);
    setStockLocation(existing?.location && existing.location !== '—' ? existing.location : LOCATIONS[0]);
    setStockUnit(existing?.unit || UNITS[0]);
  };

  const closeStockModal = () => {
    setPendingItem(null);
    setIsSavingStock(false);
  };

  const handleToggle = async (item: ShoppingItem) => {
    // Desmarcar comprado: só volta para a lista
    if (item.bought) {
      try {
        await toggleItem(item.id, false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar item';
        Alert.alert('Erro', message);
      }
      return;
    }

    openStockModal(item);
  };

  const markBoughtOnly = async () => {
    if (!pendingItem) return;
    setIsSavingStock(true);
    try {
      if (!pendingItem.bought) {
        await toggleItem(pendingItem.id, true);
      }
      closeStockModal();
      setTab('bought');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar item';
      Alert.alert('Erro', message);
      setIsSavingStock(false);
    }
  };

  const addToStockAndMarkBought = async () => {
    if (!pendingItem) return;

    const qty = Number(stockQty.replace(',', '.'));
    if (Number.isNaN(qty) || qty <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida.');
      return;
    }

    if (!linkedProduct && !stockCategory.trim()) {
      Alert.alert('Atenção', 'Selecione uma categoria.');
      return;
    }

    setIsSavingStock(true);
    try {
      if (linkedProduct) {
        await restock(linkedProduct.id, qty);
      } else {
        await addProduct({
          name: pendingItem.name.trim(),
          category: stockCategory.trim(),
          quantity: qty,
          unit: stockUnit,
          location: stockLocation,
          purchaseDate: todayBr(),
        });
      }

      if (!pendingItem.bought) {
        await toggleItem(pendingItem.id, true);
      }

      stockedShoppingIds.add(pendingItem.id);
      setStockedIds(new Set(stockedShoppingIds));

      closeStockModal();
      setTab('bought');
      Alert.alert(
        'Estoque atualizado',
        linkedProduct
          ? `${pendingItem.name}: +${qty} ${linkedProduct.unit}`
          : `${pendingItem.name} foi adicionado ao estoque.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar estoque';
      Alert.alert('Erro', message);
      setIsSavingStock(false);
    }
  };

  const dismissSuggestion = (productId: string) => {
    dismissedSuggestionIds.add(productId);
    setDismissedTick((n) => n + 1);
  };

  const addSuggestionToList = async (product: Product) => {
    if (addingSuggestionId) return;
    setAddingSuggestionId(product.id);
    try {
      if (!isAlreadyOnList(items, product)) {
        await addItem(product.name, product.id);
      }
      dismissedSuggestionIds.add(product.id);
      setDismissedTick((n) => n + 1);
      setTab('buy');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar à lista';
      Alert.alert('Erro', message);
    } finally {
      setAddingSuggestionId(null);
    }
  };

  const addAllSuggestions = async () => {
    if (!suggestions.length || addingSuggestionId) return;
    setAddingSuggestionId('all');
    try {
      const already = new Set(
        items.filter((i) => !i.bought).map((i) => i.name.trim().toLowerCase()),
      );
      for (const suggestion of suggestions) {
        const key = suggestion.product.name.trim().toLowerCase();
        if (!already.has(key) && !items.some((i) => !i.bought && i.productId === suggestion.product.id)) {
          await addItem(suggestion.product.name, suggestion.product.id);
          already.add(key);
        }
        dismissedSuggestionIds.add(suggestion.product.id);
      }
      setDismissedTick((n) => n + 1);
      setTab('buy');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar sugestões';
      Alert.alert('Erro', message);
    } finally {
      setAddingSuggestionId(null);
    }
  };

  const handleAddManual = async () => {
    const name = newItem.trim();
    if (!name) {
      Alert.alert('Atenção', 'Digite o nome do item.');
      return;
    }

    if (!isSupabaseConfigured || !session) {
      Alert.alert('Atenção', 'Faça login para usar a lista de compras.');
      return;
    }

    const already = items.some(
      (i) => !i.bought && i.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (already) {
      Alert.alert('Já está na lista', `"${name}" já está nos itens a comprar.`);
      return;
    }

    setIsAdding(true);
    try {
      const match = products.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
      await addItem(name, match?.id);
      setNewItem('');
      setTab('buy');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar item';
      Alert.alert('Erro', message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Lista de compras</Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Adicionar item (ex: papel toalha)"
            placeholderTextColor={colors.textMuted}
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={handleAddManual}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addBtn, isAdding && styles.addBtnDisabled]}
            onPress={handleAddManual}
            disabled={isAdding}>
            {isAdding ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="add" size={24} color="#FFF" />
            )}
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'buy' && styles.tabActive]}
            onPress={() => setTab('buy')}>
            <Text style={[styles.tabText, tab === 'buy' && styles.tabTextActive]}>
              Itens a comprar
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'bought' && styles.tabActive]}
            onPress={() => setTab('bought')}>
            <Text style={[styles.tabText, tab === 'bought' && styles.tabTextActive]}>Comprados</Text>
          </Pressable>
        </View>

        {tab === 'buy' && suggestions.length > 0 ? (
          <View style={styles.suggestionsBox}>
            <View style={styles.suggestionsHeader}>
              <View style={styles.suggestionsTitleWrap}>
                <Text style={styles.suggestionsTitle}>Sugestões do estoque</Text>
                <Text style={styles.suggestionsHint}>
                  Com base no que acabou ou está a acabar
                </Text>
              </View>
              <Pressable
                onPress={addAllSuggestions}
                disabled={Boolean(addingSuggestionId)}
                hitSlop={8}>
                <Text style={styles.suggestionsAddAll}>
                  {addingSuggestionId === 'all' ? '…' : 'Adicionar todos'}
                </Text>
              </Pressable>
            </View>
            {suggestions.map((suggestion) => (
              <View key={suggestion.product.id} style={styles.suggestionRow}>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName}>{suggestion.product.name}</Text>
                  <Text style={styles.suggestionReason}>{suggestion.label}</Text>
                </View>
                <Pressable
                  style={styles.suggestionAdd}
                  onPress={() => addSuggestionToList(suggestion.product)}
                  disabled={Boolean(addingSuggestionId)}>
                  {addingSuggestionId === suggestion.product.id ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Ionicons name="add" size={18} color={colors.accentDark} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => dismissSuggestion(suggestion.product.id)}
                  hitSlop={8}
                  style={styles.suggestionDismiss}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          {visible.map((item, index) => (
            <View
              key={item.id}
              style={[styles.row, index < visible.length - 1 && styles.rowBorder]}>
              <Pressable onPress={() => handleToggle(item)} style={styles.check}>
                <Ionicons
                  name={item.bought ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={item.bought ? colors.accent : colors.textMuted}
                />
              </Pressable>
              <View style={styles.thumb}>
                <Ionicons name="nutrition-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={[styles.itemName, item.bought && styles.itemBought]}>{item.name}</Text>
              {item.bought && !stockedIds.has(item.id) ? (
                <Pressable
                  onPress={() => openStockModal(item)}
                  style={styles.stockLaterBtn}
                  hitSlop={8}>
                  <Ionicons name="cube-outline" size={16} color={colors.accentDark} />
                  <Text style={styles.stockLaterText}>Estoque</Text>
                </Pressable>
              ) : null}
              {item.bought && stockedIds.has(item.id) ? (
                <View style={styles.stockedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                </View>
              ) : null}
            </View>
          ))}
          {visible.length === 0 ? (
            <Text style={styles.empty}>
              {tab === 'buy' ? 'Nenhum item para comprar.' : 'Nenhum item comprado ainda.'}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={Boolean(pendingItem)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pendingItem?.bought ? `Adicionar ${pendingItem?.name} ao estoque` : `Comprou ${pendingItem?.name}?`}
            </Text>
            <Text style={styles.modalSubtitle}>
              {linkedProduct
                ? `Já existe no estoque (${linkedProduct.quantity} ${linkedProduct.unit}). Quanto quer adicionar?`
                : 'Quer adicionar este item ao estoque agora?'}
            </Text>

            <View style={styles.stockField}>
              <Text style={styles.stockLabel}>Quantidade</Text>
              <TextInput
                style={styles.stockInput}
                keyboardType="decimal-pad"
                value={stockQty}
                onChangeText={setStockQty}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {!linkedProduct ? (
              <ScrollView
                style={styles.stockExtras}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.stockField}>
                  <Text style={styles.stockLabel}>Categoria</Text>
                  <CategoryPicker value={stockCategory} onChange={setStockCategory} />
                </View>
                <View style={styles.stockField}>
                  <Text style={styles.stockLabel}>Unidade</Text>
                  <View style={styles.chipRow}>
                    {UNITS.map((unit) => (
                      <Pressable
                        key={unit}
                        onPress={() => setStockUnit(unit)}
                        style={[styles.miniChip, stockUnit === unit && styles.miniChipActive]}>
                        <Text
                          style={[
                            styles.miniChipText,
                            stockUnit === unit && styles.miniChipTextActive,
                          ]}>
                          {unit}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.stockField}>
                  <Text style={styles.stockLabel}>Local</Text>
                  <View style={styles.chipRow}>
                    {LOCATIONS.map((loc) => (
                      <Pressable
                        key={loc}
                        onPress={() => setStockLocation(loc)}
                        style={[styles.miniChip, stockLocation === loc && styles.miniChipActive]}>
                        <Text
                          style={[
                            styles.miniChipText,
                            stockLocation === loc && styles.miniChipTextActive,
                          ]}>
                          {loc}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : null}

            {isSavingStock ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Button label="Adicionar ao estoque" onPress={addToStockAndMarkBought} />
                {!pendingItem?.bought ? (
                  <Button
                    label="Só marcar como comprado"
                    variant="secondary"
                    onPress={markBoughtOnly}
                  />
                ) : null}
                <Button label="Cancelar" variant="ghost" onPress={closeStockModal} />
              </>
            )}
          </View>
        </View>
      </Modal>
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
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: Spacing.lg,
    },
    addRow: {
      flexDirection: 'row' as const,
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    addInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 15,
      color: colors.text,
    },
    addBtn: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    addBtnDisabled: {
      opacity: 0.6,
    },
    tabs: {
      flexDirection: 'row' as const,
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    tab: {
      flex: 1,
      backgroundColor: colors.input,
      borderRadius: Radius.full,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFF',
    },
    suggestionsBox: {
      backgroundColor: colors.accentSoft,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    suggestionsHeader: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: Spacing.md,
    },
    suggestionsTitleWrap: {
      flex: 1,
      gap: 2,
    },
    suggestionsTitle: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.text,
    },
    suggestionsHint: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    suggestionsAddAll: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.accentDark,
    },
    suggestionRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    suggestionInfo: {
      flex: 1,
      gap: 1,
    },
    suggestionName: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    suggestionReason: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    suggestionAdd: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    suggestionDismiss: {
      padding: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    check: {
      padding: 2,
    },
    thumb: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    itemName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    itemBought: {
      textDecorationLine: 'line-through' as const,
      color: colors.textMuted,
    },
    stockLaterBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
    },
    stockLaterText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: colors.accentDark,
    },
    stockedBadge: {
      padding: 2,
    },
    empty: {
      textAlign: 'center' as const,
      color: colors.textSecondary,
      paddingVertical: Spacing.xxxl,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: Spacing.xl,
    },
    modalCard: {
      width: '100%' as const,
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.xxl,
      alignItems: 'stretch' as const,
      gap: Spacing.md,
    },
    modalThumb: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: Spacing.sm,
      alignSelf: 'center' as const,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.text,
      textAlign: 'center' as const,
    },
    modalSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: Spacing.sm,
    },
    stockField: {
      gap: Spacing.sm,
    },
    stockExtras: {
      maxHeight: 280,
      marginBottom: Spacing.sm,
      gap: Spacing.md,
    },
    stockLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    stockInput: {
      backgroundColor: colors.input,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    chipRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: Spacing.sm,
    },
    miniChip: {
      backgroundColor: colors.input,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    miniChipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    miniChipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    miniChipTextActive: {
      color: colors.accentDark,
      fontWeight: '700' as const,
    },
  };
}
