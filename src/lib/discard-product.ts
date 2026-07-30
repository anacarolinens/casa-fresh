import { Alert } from 'react-native';

import type { Product } from '@/types/product';

type DiscardOptions = {
  remove: () => Promise<void>;
  addToShopping?: () => Promise<void>;
  onDone?: () => void;
};

/**
 * Confirma descarte de produto vencido e oferece repor na lista de compras.
 */
export function confirmDiscardExpired(product: Product, options: DiscardOptions) {
  Alert.alert(
    'Descartar produto',
    `"${product.name}" está vencido. Remover do estoque?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await options.remove();

              if (!options.addToShopping) {
                options.onDone?.();
                return;
              }

              Alert.alert(
                'Produto descartado',
                'Quer adicionar à lista de compras para repor?',
                [
                  {
                    text: 'Não',
                    style: 'cancel',
                    onPress: () => options.onDone?.(),
                  },
                  {
                    text: 'Sim, adicionar',
                    onPress: () => {
                      void (async () => {
                        try {
                          await options.addToShopping?.();
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : 'Erro ao adicionar à lista';
                          Alert.alert('Erro', message);
                        } finally {
                          options.onDone?.();
                        }
                      })();
                    },
                  },
                ],
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erro ao descartar';
              Alert.alert('Erro', message);
            }
          })();
        },
      },
    ],
  );
}
