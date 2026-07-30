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
