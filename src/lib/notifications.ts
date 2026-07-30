import type { Product, ShoppingItem } from '@/types/product';
import { statusLabel } from '@/types/product';

export type AppNotification = {
  id: string;
  type: 'expired' | 'expiring' | 'missing' | 'shopping';
  title: string;
  message: string;
  productId?: string;
  priority: number;
};

export function buildNotifications(
  products: Product[],
  shoppingItems: ShoppingItem[] = [],
): AppNotification[] {
  const alerts: AppNotification[] = [];

  for (const product of products) {
    if (product.status === 'expired') {
      alerts.push({
        id: `expired-${product.id}`,
        type: 'expired',
        title: `${product.name} vencido`,
        message: product.expiryDate
          ? `Venceu em ${product.expiryDate}. Remova ou confira o produto.`
          : 'Este produto está vencido.',
        productId: product.id,
        priority: 1,
      });
      continue;
    }

    if (product.status === 'expiring') {
      const when = statusLabel(product) || 'Próximo do vencimento';
      alerts.push({
        id: `expiring-${product.id}`,
        type: 'expiring',
        title: `${product.name} a vencer`,
        message: when,
        productId: product.id,
        priority: 2,
      });
      continue;
    }

    if (product.status === 'missing' || product.quantity <= 0) {
      alerts.push({
        id: `missing-${product.id}`,
        type: 'missing',
        title: `${product.name} em falta`,
        message: 'Quantidade zerada. Adicione à lista de compras se precisar.',
        productId: product.id,
        priority: 3,
      });
    }
  }

  const toBuy = shoppingItems.filter((i) => !i.bought);
  if (toBuy.length > 0) {
    alerts.push({
      id: 'shopping-pending',
      type: 'shopping',
      title: 'Lista de compras',
      message:
        toBuy.length === 1
          ? `1 item para comprar: ${toBuy[0].name}`
          : `${toBuy.length} itens para comprar`,
      priority: 4,
    });
  }

  return alerts.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}
