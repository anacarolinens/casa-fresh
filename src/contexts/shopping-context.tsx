import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/auth-context';
import {
  addShoppingItem,
  fetchShoppingItems,
  toggleShoppingItem,
} from '@/lib/shopping';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { ShoppingItem } from '@/types/product';

type ShoppingContextType = {
  items: ShoppingItem[];
  isLoading: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
  addItem: (nome: string, productId?: string | null) => Promise<ShoppingItem>;
  toggleItem: (id: string, comprado: boolean) => Promise<ShoppingItem>;
};

const ShoppingContext = createContext<ShoppingContextType | null>(null);

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const { session, isLoading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const hasDataRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setItems([]);
      hasDataRef.current = false;
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchShoppingItems();
      setItems(data);
      hasDataRef.current = true;
    } catch (error) {
      console.warn('Erro ao carregar lista de compras', error);
      if (!hasDataRef.current) setItems([]);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const addItem = useCallback(async (nome: string, productId?: string | null) => {
    const created = await addShoppingItem(nome, productId);
    setItems((prev) => [created, ...prev]);
    hasDataRef.current = true;
    return created;
  }, []);

  const toggleItem = useCallback(async (id: string, comprado: boolean) => {
    const updated = await toggleShoppingItem(id, comprado);
    setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      items,
      isLoading,
      isReady,
      refresh,
      addItem,
      toggleItem,
    }),
    [items, isLoading, isReady, refresh, addItem, toggleItem],
  );

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}

export function useShopping() {
  const ctx = useContext(ShoppingContext);
  if (!ctx) {
    throw new Error('useShopping deve ser usado dentro de ShoppingProvider');
  }
  return ctx;
}
