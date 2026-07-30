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
  createProduct,
  deleteProduct,
  fetchProducts,
  adjustProductQuantity,
  restockProduct,
  updateProduct,
  type NewProductInput,
} from '@/lib/products';
import { syncHouseholdMemberships } from '@/lib/households';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const hasDataRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setProducts([]);
      hasDataRef.current = false;
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    const showSpinner = !hasDataRef.current;
    if (showSpinner) setIsLoading(true);

    try {
      await syncHouseholdMemberships();
      const data = await fetchProducts();
      setProducts(data);
      hasDataRef.current = true;
    } catch (error) {
      console.warn('Erro ao carregar produtos', error);
      if (!hasDataRef.current) setProducts([]);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [userId]);

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
      setProducts((prev) => [created, ...prev]);
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
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
    [userId],
  );

  const restock = useCallback(
    async (id: string, addQuantity: number) => {
      if (!isSupabaseConfigured || !userId) {
        throw new Error('Faça login para atualizar o estoque.');
      }

      const updated = await restockProduct(id, addQuantity);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
      refresh,
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
