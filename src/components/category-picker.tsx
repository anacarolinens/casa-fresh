import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useProducts } from '@/contexts/products-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import {
  DEFAULT_CATEGORIES,
  loadCustomCategories,
  mergeCategories,
  saveCustomCategory,
} from '@/lib/categories';

type CategoryPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { products } = useProducts();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadCustomCategories().then(setCustom).catch(() => {});
  }, []);

  const fromProducts = useMemo(
    () => products.map((p) => p.category).filter(Boolean),
    [products],
  );

  const options = useMemo(
    () => mergeCategories(DEFAULT_CATEGORIES, fromProducts, custom),
    [fromProducts, custom],
  );

  const handleSelect = (item: string) => {
    onChange(item);
    setOpen(false);
    setAdding(false);
    setNewName('');
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }

    try {
      const next = await saveCustomCategory(trimmed);
      setCustom(next);
      onChange(trimmed);
      setNewName('');
      setAdding(false);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar categoria';
      Alert.alert('Erro', message);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.select}
        onPress={() => {
          setOpen((v) => !v);
          if (open) setAdding(false);
        }}>
        <Text style={styles.selectText}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.dropdown}>
          {options.map((item) => (
            <Pressable key={item} style={styles.dropdownItem} onPress={() => handleSelect(item)}>
              <Text style={styles.dropdownText}>{item}</Text>
              {item === value ? (
                <Ionicons name="checkmark" size={16} color={colors.accent} />
              ) : null}
            </Pressable>
          ))}

          {adding ? (
            <View style={styles.addBox}>
              <TextInput
                style={styles.addInput}
                placeholder="Ex: Fruteiras"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCapitalize="sentences"
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <View style={styles.addActions}>
                <Pressable
                  onPress={() => {
                    setAdding(false);
                    setNewName('');
                  }}
                  hitSlop={8}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.addConfirm} onPress={handleAdd}>
                  <Text style={styles.addConfirmText}>Criar</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.addItem}
              onPress={() => {
                setAdding(true);
                setNewName('');
              }}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.addItemText}>Nova categoria</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    wrap: {
      gap: Spacing.sm,
    },
    select: {
      backgroundColor: colors.input,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md + 2,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    selectText: {
      fontSize: 16,
      color: colors.text,
    },
    dropdown: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden' as const,
    },
    dropdownItem: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownText: {
      fontSize: 15,
      color: colors.text,
    },
    addItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    addItemText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.accent,
    },
    addBox: {
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    addInput: {
      backgroundColor: colors.input,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      fontSize: 15,
      color: colors.text,
    },
    addActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      gap: Spacing.lg,
    },
    cancelText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600' as const,
    },
    addConfirm: {
      backgroundColor: colors.accent,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    addConfirmText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
  };
}
