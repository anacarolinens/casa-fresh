import type { Product, ProductStatus } from '@/types/product';
import { getPrimaryHouseholdId } from '@/lib/households';
import { supabase } from '@/lib/supabase';
import { uploadProductImage } from '@/lib/storage';

export type NewProductInput = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  purchaseDate?: string;
  expiryDate?: string;
  imageUri?: string | null;
  imageMimeType?: string | null;
};

type DbProduct = {
  id: string;
  nome: string;
  categoria: string | null;
  quantidade: number;
  unidade: string;
  local: string | null;
  data_compra: string | null;
  data_validade: string | null;
  imagem_url: string | null;
};

function parseBrDate(value?: string): string | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function formatBrDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const [yyyy, mm, dd] = iso.slice(0, 10).split('-');
  if (!yyyy || !mm || !dd) return undefined;
  return `${dd}/${mm}/${yyyy}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeDaysLeft(expiryIso?: string | null): number | null {
  if (!expiryIso) return null;
  const expiry = new Date(`${expiryIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return null;
  const diff = expiry.getTime() - startOfToday().getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function computeStatus(quantity: number, daysLeft: number | null): ProductStatus {
  if (quantity <= 0) return 'missing';
  if (daysLeft == null) return 'ok';
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'expiring';
  return 'ok';
}

export function mapDbProduct(row: DbProduct): Product {
  const daysLeft = computeDaysLeft(row.data_validade);
  const quantity = Number(row.quantidade) || 0;
  return {
    id: row.id,
    name: row.nome,
    quantity,
    unit: row.unidade,
    location: row.local || '—',
    category: row.categoria || '',
    purchaseDate: formatBrDate(row.data_compra),
    expiryDate: formatBrDate(row.data_validade),
    daysLeft,
    status: computeStatus(quantity, daysLeft),
    imageUrl: row.imagem_url,
  };
}

export async function fetchProducts(householdId?: string | null) {
  const hid = householdId === undefined ? await getPrimaryHouseholdId() : householdId;
  if (!hid) return [] as Product[];

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, nome, categoria, quantidade, unidade, local, data_compra, data_validade, imagem_url',
    )
    .eq('household_id', hid)
    .order('data_validade', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapDbProduct(row as DbProduct));
}

export async function createProduct(input: NewProductInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  const householdId = await getPrimaryHouseholdId();
  if (!householdId) throw new Error('Nenhuma casa encontrada para este utilizador');

  let imagemUrl: string | null = null;
  if (input.imageUri) {
    imagemUrl = await uploadProductImage(input.imageUri, input.imageMimeType);
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      household_id: householdId,
      created_by: auth.user.id,
      nome: input.name.trim(),
      categoria: input.category,
      quantidade: input.quantity,
      unidade: input.unit,
      local: input.location,
      data_compra: parseBrDate(input.purchaseDate),
      data_validade: parseBrDate(input.expiryDate),
      imagem_url: imagemUrl,
    })
    .select(
      'id, nome, categoria, quantidade, unidade, local, data_compra, data_validade, imagem_url',
    )
    .single();

  if (error) throw error;
  return mapDbProduct(data as DbProduct);
}

export async function updateProduct(id: string, input: NewProductInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  let imagemUrl: string | undefined | null;
  if (input.imageUri == null || input.imageUri === '') {
    imagemUrl = null;
  } else if (!input.imageUri.startsWith('http')) {
    imagemUrl = await uploadProductImage(input.imageUri, input.imageMimeType);
  }

  const payload: Record<string, unknown> = {
    nome: input.name.trim(),
    categoria: input.category,
    quantidade: input.quantity,
    unidade: input.unit,
    local: input.location,
    data_compra: parseBrDate(input.purchaseDate),
    data_validade: parseBrDate(input.expiryDate),
  };

  if (imagemUrl !== undefined) {
    payload.imagem_url = imagemUrl;
  }

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select(
      'id, nome, categoria, quantidade, unidade, local, data_compra, data_validade, imagem_url',
    )
    .single();

  if (error) throw error;
  return mapDbProduct(data as DbProduct);
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

/** Soma ou subtrai quantidade (não fica abaixo de 0). */
export async function adjustProductQuantity(id: string, delta: number) {
  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select(
      'id, nome, categoria, quantidade, unidade, local, data_compra, data_validade, imagem_url',
    )
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const nextQty = Math.max(0, (Number(existing.quantidade) || 0) + delta);

  const { data, error } = await supabase
    .from('products')
    .update({ quantidade: nextQty })
    .eq('id', id)
    .select(
      'id, nome, categoria, quantidade, unidade, local, data_compra, data_validade, imagem_url',
    )
    .single();

  if (error) throw error;
  return mapDbProduct(data as DbProduct);
}

/** Soma quantidade a um produto existente (ex.: após compra). */
export async function restockProduct(id: string, addQuantity: number) {
  return adjustProductQuantity(id, addQuantity);
}
