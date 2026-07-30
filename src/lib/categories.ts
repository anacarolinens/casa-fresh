import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATEGORIES as DEFAULT_CATEGORIES } from '@/constants/theme';

const STORAGE_KEY = '@casafresh/custom-categories';
/** Categorias removidas da app — não devem aparecer no seletor */
const HIDDEN_CATEGORIES = new Set(['outros']);

export { DEFAULT_CATEGORIES };

function isSelectableCategory(name: string) {
  return !HIDDEN_CATEGORIES.has(name.trim().toLowerCase());
}

export function mergeCategories(
  defaults: readonly string[],
  fromProducts: string[],
  custom: string[],
) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of [...defaults, ...fromProducts, ...custom]) {
    const trimmed = name.trim();
    if (!trimmed || !isSelectableCategory(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export async function loadCustomCategories() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0 && isSelectableCategory(item),
    );
    if (cleaned.length !== parsed.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [] as string[];
  }
}

export async function saveCustomCategory(nome: string) {
  const trimmed = nome.trim();
  if (!trimmed) throw new Error('Informe o nome da categoria.');
  if (!isSelectableCategory(trimmed)) {
    throw new Error('Esta categoria não está disponível.');
  }

  const current = await loadCustomCategories();
  const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  const isDefault = DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === trimmed.toLowerCase());

  if (!exists && !isDefault) {
    const next = [...current, trimmed];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  return current;
}
