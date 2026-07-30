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
  bootstrapAppData,
  getCachedBootstrap,
  hydrateBootstrapFromDisk,
  setBootstrapItems,
} from '@/lib/bootstrap';
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
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    const cached = getCachedBootstrap(userId);
    return cached?.items ?? [];
  });
  const [isLoading, setIsLoading] = useState(() => !getCachedBootstrap(userId));
  const [isReady, setIsReady] = useState(() => Boolean(getCachedBootstrap(userId)));
  const hasDataRef = useRef(Boolean(getCachedBootstrap(userId)));
  const loadGenRef = useRef(0);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (authLoading) return;

    if (!isSupabaseConfigured || !userId) {
      setItems([]);
      hasDataRef.current = false;
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    const gen = ++loadGenRef.current;

    const memory = getCachedBootstrap(userId);
    if (memory && !options?.force) {
      setItems(memory.items);
      hasDataRef.current = true;
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    if (!options?.force || !hasDataRef.current) {
      const disk = memory ?? (await hydrateBootstrapFromDisk(userId));
      if (gen !== loadGenRef.current) return;
      if (disk) {
        setItems(disk.items);
        hasDataRef.current = true;
        setIsLoading(false);
        setIsReady(true);
      }
    }

    const showSpinner = !hasDataRef.current;
    if (showSpinner) setIsLoading(true);

    try {
      const data = await bootstrapAppData(userId, { force: true });
      if (gen !== loadGenRef.current) return;
      setItems(data.items);
      hasDataRef.current = true;
    } catch (error) {
      console.warn('Erro ao carregar lista de compras', error);
      if (!hasDataRef.current) {
        try {
          const fallback = await fetchShoppingItems();
          if (gen !== loadGenRef.current) return;
          setItems(fallback);
          hasDataRef.current = true;
        } catch {
          if (gen === loadGenRef.current) setItems([]);
        }
      }
    } finally {
      if (gen === loadGenRef.current) {
        setIsLoading(false);
        setIsReady(true);
      }
    }
  }, [authLoading, userId]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const addItem = useCallback(async (nome: string, productId?: string | null) => {
    const created = await addShoppingItem(nome, productId);
    setItems((prev) => {
      const next = [created, ...prev];
      setBootstrapItems(next);
      return next;
    });
    hasDataRef.current = true;
    return created;
  }, []);

  const toggleItem = useCallback(async (id: string, comprado: boolean) => {
    const updated = await toggleShoppingItem(id, comprado);
    setItems((prev) => {
      const next = prev.map((row) => (row.id === id ? updated : row));
      setBootstrapItems(next);
      return next;
    });
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      items,
      isLoading,
      isReady,
      refresh: () => refresh({ force: true }),
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
