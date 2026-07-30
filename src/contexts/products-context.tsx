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

import { getStockSummary, type Product } from '@/types/product';
import { useAuth } from '@/contexts/auth-context';
import {
  bootstrapAppData,
  getCachedBootstrap,
  hydrateBootstrapFromDisk,
  setBootstrapProducts,
} from '@/lib/bootstrap';
import {
  createProduct,
  deleteProduct,
  adjustProductQuantity,
  restockProduct,
  updateProduct,
  type NewProductInput,
} from '@/lib/products';
import { isSupabaseConfigured } from '@/lib/supabase';

type ProductsContextType = {
  products: Product[];
  isLoading: boolean;
  isReady: boolean;
  summary: ReturnType<typeof getStockSummary>;
  refresh: () => Promise<void>;
  addProduct: (input: NewProductInput) => Promise<Product>;
  editProduct: (id: string, input: NewProductInput) => Promise<Product>;
  restock: (id: string, addQuantity: number) => Promise<Product>;
  adjustQuantity: (id: string, delta: number) => Promise<Product>;
  removeProduct: (id: string) => Promise<void>;
};

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { session, isLoading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = getCachedBootstrap(userId);
    return cached?.products ?? [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    const cached = getCachedBootstrap(userId);
    return !cached;
  });
  const [isReady, setIsReady] = useState(() => Boolean(getCachedBootstrap(userId)));
  const hasDataRef = useRef(Boolean(getCachedBootstrap(userId)));
  const loadGenRef = useRef(0);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (authLoading) return;

    if (!isSupabaseConfigured || !userId) {
      setProducts([]);
      hasDataRef.current = false;
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    const gen = ++loadGenRef.current;

    const memory = getCachedBootstrap(userId);
    if (memory && !options?.force) {
      setProducts(memory.products);
      hasDataRef.current = true;
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    // Disco: mostra produtos já gravados e atualiza em background
    if (!options?.force || !hasDataRef.current) {
      const disk = memory ?? (await hydrateBootstrapFromDisk(userId));
      if (gen !== loadGenRef.current) return;
      if (disk) {
        setProducts(disk.products);
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
      setProducts(data.products);
      hasDataRef.current = true;
    } catch (error) {
      console.warn('Erro ao carregar produtos', error);
      if (!hasDataRef.current) setProducts([]);
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

  const addProduct = useCallback(
    async (input: NewProductInput) => {
      if (!isSupabaseConfigured || !userId) {
        throw new Error('Faça login para adicionar produtos.');
      }

      const created = await createProduct(input);
      setProducts((prev) => {
        const next = [created, ...prev];
        setBootstrapProducts(next);
        return next;
      });
      hasDataRef.current = true;
      return created;
    },
    [userId],
  );

  const editProduct = useCallback(
    async (id: string, input: NewProductInput) => {
      if (!isSupabaseConfigured || !userId) {
        throw new Error('Faça login para editar produtos.');
      }

      const updated = await updateProduct(id, input);
      setProducts((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        setBootstrapProducts(next);
        return next;
      });
      return updated;
    },
    [userId],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured || !userId) {
        throw new Error('Faça login para remover produtos.');
      }

      await deleteProduct(id);
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        setBootstrapProducts(next);
        return next;
      });
    },
    [userId],
  );

  const restock = useCallback(
    async (id: string, addQuantity: number) => {
      if (!isSupabaseConfigured || !userId) {
        throw new Error('Faça login para atualizar o estoque.');
      }

      const updated = await restockProduct(id, addQuantity);
      setProducts((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        setBootstrapProducts(next);
        return next;
      });
      return updated;
    },
    [userId],
  );

  const adjustQuantity = useCallback(
    async (id: string, delta: number) => {
      if (!isSupabaseConfigured || !userId) {
        throw new Error('Faça login para atualizar o estoque.');
      }

      const updated = await adjustProductQuantity(id, delta);
      setProducts((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        setBootstrapProducts(next);
        return next;
      });
      return updated;
    },
    [userId],
  );

  const summary = useMemo(() => getStockSummary(products), [products]);

  const value = useMemo(
    () => ({
      products,
      isLoading,
      isReady,
      summary,
      refresh: () => refresh({ force: true }),
      addProduct,
      editProduct,
      restock,
      adjustQuantity,
      removeProduct,
    }),
    [
      products,
      isLoading,
      isReady,
      summary,
      refresh,
      addProduct,
      editProduct,
      restock,
      adjustQuantity,
      removeProduct,
    ],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error('useProducts deve ser usado dentro de ProductsProvider');
  }
  return ctx;
}
