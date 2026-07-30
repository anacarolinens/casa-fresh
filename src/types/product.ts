export type ProductStatus = 'ok' | 'expiring' | 'expired' | 'missing';

export type Product = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  category: string;
  purchaseDate?: string;
  expiryDate?: string;
  daysLeft?: number | null;
  status: ProductStatus;
  imageUrl?: string | null;
};

export type ShoppingItem = {
  id: string;
  name: string;
  bought: boolean;
  productId?: string | null;
};

export function statusLabel(product: Product) {
  if (product.status === 'missing') return 'Em falta';
  if (product.status === 'expired') return 'Vencido';
  if (product.daysLeft === 0) return 'Vence hoje';
  if (product.daysLeft === 1) return 'Vence amanhã';
  if (product.daysLeft != null && product.daysLeft > 1) {
    return `${product.daysLeft} dias restantes`;
  }
  return '';
}

export function daysBadge(product: Product) {
  if (product.status === 'expired') return { text: 'Vencido', tone: 'danger' as const };
  if (product.status === 'missing') return { text: 'Em falta', tone: 'warning' as const };
  if (product.daysLeft == null) return null;
  if (product.daysLeft <= 1) {
    return { text: `${product.daysLeft} dia`, tone: 'warning' as const };
  }
  return { text: `${product.daysLeft} dias`, tone: 'success' as const };
}

export function getStockSummary(products: Product[]) {
  return {
    total: products.length,
    expiring: products.filter((p) => p.status === 'expiring').length,
    expired: products.filter((p) => p.status === 'expired').length,
    missing: products.filter((p) => p.status === 'missing' || p.quantity <= 0).length,
  };
}

/** Produtos a consumir primeiro: vencidos e a vencer, ordenados por urgência. */
export function getEatFirstProducts(products: Product[], limit = 8) {
  return products
    .filter((p) => p.status === 'expired' || p.status === 'expiring')
    .sort((a, b) => {
      const da = a.daysLeft ?? 9999;
      const db = b.daysLeft ?? 9999;
      return da - db || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export type ShoppingSuggestion = {
  product: Product;
  reason: 'missing' | 'low' | 'expiring';
  label: string;
};

/** Sugestões para a lista de compras com base no estoque. */
export function getShoppingSuggestions(
  products: Product[],
  shoppingItems: ShoppingItem[],
  dismissedIds?: Set<string>,
): ShoppingSuggestion[] {
  const suggestions: ShoppingSuggestion[] = [];

  for (const product of products) {
    if (dismissedIds?.has(product.id)) continue;
    if (
      shoppingItems.some(
        (i) =>
          !i.bought &&
          (i.productId === product.id ||
            i.name.trim().toLowerCase() === product.name.trim().toLowerCase()),
      )
    ) {
      continue;
    }

    if (product.status === 'missing' || product.quantity <= 0) {
      suggestions.push({ product, reason: 'missing', label: 'Em falta' });
      continue;
    }

    if (product.quantity > 0 && product.quantity <= 1) {
      suggestions.push({ product, reason: 'low', label: 'Quase acabando' });
      continue;
    }

    if (product.status === 'expiring' && (product.daysLeft ?? 99) <= 3) {
      suggestions.push({ product, reason: 'expiring', label: 'A vencer — repor?' });
    }
  }

  const order = { missing: 0, low: 1, expiring: 2 } as const;
  return suggestions
    .sort(
      (a, b) =>
        order[a.reason] - order[b.reason] || a.product.name.localeCompare(b.product.name),
    )
    .slice(0, 10);
}
