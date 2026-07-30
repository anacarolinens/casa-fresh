import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getPrimaryHouseholdId,
  seedHouseholdCache,
  syncHouseholdMemberships,
} from '@/lib/households';
import { fetchProducts } from '@/lib/products';
import { fetchShoppingItems } from '@/lib/shopping';
import type { Product, ShoppingItem } from '@/types/product';

export type BootstrapData = {
  userId: string;
  householdId: string | null;
  products: Product[];
  items: ShoppingItem[];
};

const DISK_KEY_PREFIX = '@casafresh/bootstrap:';

let cached: BootstrapData | null = null;
let inflight: Promise<BootstrapData> | null = null;
let inflightUserId: string | null = null;
let diskUserId: string | null = null;

function diskKey(userId: string) {
  return `${DISK_KEY_PREFIX}${userId}`;
}

function persistToDisk(data: BootstrapData) {
  diskUserId = data.userId;
  AsyncStorage.setItem(diskKey(data.userId), JSON.stringify(data)).catch(() => {});
}

export function getCachedBootstrap(userId?: string | null) {
  if (!userId || !cached || cached.userId !== userId) return null;
  return cached;
}

export function clearBootstrapCache() {
  cached = null;
  inflight = null;
  inflightUserId = null;
  if (diskUserId) {
    AsyncStorage.removeItem(diskKey(diskUserId)).catch(() => {});
    diskUserId = null;
  }
}

export function setBootstrapProducts(products: Product[]) {
  if (!cached) return;
  cached = { ...cached, products };
  persistToDisk(cached);
}

export function setBootstrapItems(items: ShoppingItem[]) {
  if (!cached) return;
  cached = { ...cached, items };
  persistToDisk(cached);
}

/**
 * Lê o último bootstrap deste utilizador do disco para mostrar a UI já com dados.
 * Também repõe o household em memória para acelerar o próximo fetch.
 */
export async function hydrateBootstrapFromDisk(userId: string) {
  if (!userId) return null;
  if (cached?.userId === userId) return cached;

  try {
    const raw = await AsyncStorage.getItem(diskKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BootstrapData;
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.products)) {
      return null;
    }
    const data: BootstrapData = {
      userId,
      householdId: parsed.householdId ?? null,
      products: parsed.products,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
    cached = data;
    diskUserId = userId;
    if (data.householdId) {
      seedHouseholdCache(userId, data.householdId);
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Carrega dados iniciais uma vez por utilizador:
 * sync de convites → householdId → produtos + compras em paralelo.
 * Chamadas concorrentes partilham a mesma Promise.
 */
export async function bootstrapAppData(userId: string, options?: { force?: boolean }) {
  if (!userId) {
    return {
      userId: '',
      householdId: null,
      products: [] as Product[],
      items: [] as ShoppingItem[],
    };
  }

  if (!options?.force && cached?.userId === userId) {
    return cached;
  }

  if (inflight && inflightUserId === userId) {
    return inflight;
  }

  const run = (async (): Promise<BootstrapData> => {
    const knownHousehold =
      cached?.userId === userId ? cached.householdId : null;
    if (knownHousehold) {
      seedHouseholdCache(userId, knownHousehold);
    }

    await syncHouseholdMemberships(userId);
    const householdId = await getPrimaryHouseholdId(userId);

    const [products, items] = await Promise.all([
      fetchProducts(householdId),
      fetchShoppingItems(householdId),
    ]);

    const data: BootstrapData = { userId, householdId, products, items };
    cached = data;
    persistToDisk(data);
    return data;
  })();

  inflight = run;
  inflightUserId = userId;

  try {
    return await run;
  } finally {
    if (inflight === run) {
      inflight = null;
      inflightUserId = null;
    }
  }
}
