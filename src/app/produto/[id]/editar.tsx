import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useProducts } from '@/contexts/products-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { maskBrDate } from '@/lib/date-mask';
import { pickImageSource } from '@/lib/pick-image';

export default function EditarProdutoScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, editProduct, isLoading } = useProducts();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const scrollRef = useRef<ScrollView>(null);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIES[0]);
  const [quantidade, setQuantidade] = useState('1');
  const [unidade, setUnidade] = useState<string>(UNITS[0]);
  const [local, setLocal] = useState<string>(LOCATIONS[0]);
  const [dataCompra, setDataCompra] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [showUnidade, setShowUnidade] = useState(false);
  const [showLocal, setShowLocal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  const scrollToDates = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    if (!product || hydratedId === product.id) return;
    setNome(product.name);
    setCategoria(product.category || CATEGORIES[0]);
    setQuantidade(String(product.quantity ?? 1));
    setUnidade(product.unit || UNITS[0]);
    setLocal(product.location || LOCATIONS[0]);
    setDataCompra(product.purchaseDate ?? '');
    setDataValidade(product.expiryDate ?? '');
    setImageUri(product.imageUrl ?? null);
    setImageMimeType(null);
    setHydratedId(product.id);
  }, [product, hydratedId]);

  if (isLoading && !product) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top + Spacing.xl }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.xl }]}>
        <Text style={styles.title}>Produto não encontrado</Text>
        <Button label="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const pickImage = () => {
    pickImageSource({
      title: 'Foto do produto',
      canRemove: Boolean(imageUri),
      onPicked: (image) => {
        setImageUri(image.uri);
        setImageMimeType(image.mimeType);
      },
      onRemove: () => {
        setImageUri(null);
        setImageMimeType(null);
      },
    });
  };

  const removeImage = () => {
    setImageUri(null);
    setImageMimeType(null);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do produto.');
      return;
    }

    const qty = Number(quantidade.replace(',', '.'));
    if (Number.isNaN(qty) || qty < 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida.');
      return;
    }

    setIsSaving(true);
    try {
      await editProduct(product.id, {
        name: nome.trim(),
        category: categoria,
        quantity: qty,
        unit: unidade,
        location: local,
        purchaseDate: dataCompra,
        expiryDate: dataValidade,
        imageUri,
        imageMimeType,
      });
      Alert.alert('Salvo', 'Produto atualizado.');
      router.replace(`/produto/${product.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar.';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Editar produto</Text>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xxxl + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
        <Pressable style={styles.photoWrap} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoImage} contentFit="cover" />
          ) : (
            <View style={styles.photo}>
              <Ionicons name="image-outline" size={40} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.photoBtn}>
            <Ionicons name="camera" size={16} color="#FFF" />
          </View>
        </Pressable>
        <Text style={styles.photoHint}>
          {imageUri ? 'Toque para alterar a foto' : 'Toque para adicionar foto'}
        </Text>
        {imageUri ? (
          <Pressable onPress={removeImage} hitSlop={8}>
            <Text style={styles.removePhoto}>Remover foto</Text>
          </Pressable>
        ) : null}

        <Field label="Nome do produto">
          <TextInput
            style={styles.input}
            placeholder="Ex: Leite integral"
            placeholderTextColor={colors.textMuted}
            value={nome}
            onChangeText={setNome}
          />
        </Field>

        <Field label="Categoria">
          <CategoryPicker value={categoria} onChange={setCategoria} />
        </Field>

        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Quantidade">
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
              />
            </Field>
          </View>
          <View style={styles.half}>
            <Field label="Unidade">
              <Pressable style={styles.select} onPress={() => setShowUnidade((v) => !v)}>
                <Text style={styles.selectText}>{unidade}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
              {showUnidade ? (
                <View style={styles.dropdown}>
                  {UNITS.map((item) => (
                    <Pressable
                      key={item}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setUnidade(item);
                        setShowUnidade(false);
                      }}>
                      <Text style={styles.dropdownText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Field>
          </View>
        </View>

        <Field label="Local">
          <Pressable style={styles.select} onPress={() => setShowLocal((v) => !v)}>
            <Text style={styles.selectText}>{local}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>
          {showLocal ? (
            <View style={styles.dropdown}>
              {LOCATIONS.map((item) => (
                <Pressable
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setLocal(item);
                    setShowLocal(false);
                  }}>
                  <Text style={styles.dropdownText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Field>

        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Data de compra">
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                value={dataCompra}
                onChangeText={(text) => setDataCompra(maskBrDate(text))}
                onFocus={scrollToDates}
                keyboardType="number-pad"
                maxLength={10}
              />
            </Field>
          </View>
          <View style={styles.half}>
            <Field label="Data de validade">
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                value={dataValidade}
                onChangeText={(text) => setDataValidade(maskBrDate(text))}
                onFocus={scrollToDates}
                keyboardType="number-pad"
                maxLength={10}
              />
            </Field>
          </View>
        </View>

        <Button label="Salvar alterações" onPress={handleSave} style={styles.save} disabled={isSaving} />
        {isSaving ? <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    centered: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    back: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    title: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    content: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.lg,
    },
    photoWrap: {
      alignSelf: 'center' as const,
      marginBottom: Spacing.xs,
    },
    photo: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    photoImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    photoBtn: {
      position: 'absolute' as const,
      right: 4,
      bottom: 4,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    photoHint: {
      textAlign: 'center' as const,
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    removePhoto: {
      textAlign: 'center' as const,
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.danger,
      marginBottom: Spacing.md,
    },
    field: {
      gap: Spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    select: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    selectText: {
      fontSize: 16,
      color: colors.text,
    },
    dropdown: {
      marginTop: Spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden' as const,
    },
    dropdownItem: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    dropdownText: {
      fontSize: 15,
      color: colors.text,
    },
    row: {
      flexDirection: 'row' as const,
      gap: Spacing.md,
    },
    half: {
      flex: 1,
    },
    save: {
      marginTop: Spacing.md,
    },
  };
}
