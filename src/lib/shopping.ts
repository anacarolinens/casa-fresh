import type { ShoppingItem } from '@/types/product';
import { getPrimaryHouseholdId } from '@/lib/households';
import { supabase } from '@/lib/supabase';

type DbShoppingItem = {
  id: string;
  nome: string;
  comprado: boolean;
  product_id: string | null;
};

function mapItem(row: DbShoppingItem): ShoppingItem {
  return {
    id: row.id,
    name: row.nome,
    bought: row.comprado,
    productId: row.product_id,
  };
}

export async function fetchShoppingItems(householdId?: string | null) {
  const hid = householdId === undefined ? await getPrimaryHouseholdId() : householdId;
  if (!hid) return [] as ShoppingItem[];

  const { data, error } = await supabase
    .from('shopping_items')
    .select('id, nome, comprado, product_id')
    .eq('household_id', hid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapItem(row as DbShoppingItem));
}

export async function addShoppingItem(nome: string, productId?: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  const householdId = await getPrimaryHouseholdId();
  if (!householdId) throw new Error('Nenhuma casa encontrada');

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      household_id: householdId,
      created_by: auth.user.id,
      nome: nome.trim(),
      comprado: false,
      product_id: productId ?? null,
    })
    .select('id, nome, comprado, product_id')
    .single();

  if (error) throw error;
  return mapItem(data as DbShoppingItem);
}

export async function toggleShoppingItem(id: string, comprado: boolean) {
  const { data, error } = await supabase
    .from('shopping_items')
    .update({ comprado })
    .eq('id', id)
    .select('id, nome, comprado, product_id')
    .single();

  if (error) throw error;
  return mapItem(data as DbShoppingItem);
}
