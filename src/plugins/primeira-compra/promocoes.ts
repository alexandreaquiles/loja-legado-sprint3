import { Injector, LanguageCode, OrderService, PromotionCondition } from '@vendure/core';
import { ehPrimeiraCompra } from './regras';

let orderService: OrderService;

/**
 * Condition: vale só para quem nunca fechou um pedido (R1-R4).
 * O OrderService chega pelo init(injector); nos testes, um injector falso.
 */
export const primeiraCompra = new PromotionCondition({
  code: 'primeira_compra',
  description: [
    { languageCode: LanguageCode.pt_BR, value: 'Se é a primeira compra do cliente' },
    { languageCode: LanguageCode.en, value: 'If this is the customer’s first order' },
  ],
  args: {},
  init(injector: Injector) {
    orderService = injector.get(OrderService);
  },
  async check(ctx, order) {
    if (!order.customer) return false; // R2: visitante
    const { items } = await orderService.findByCustomerId(ctx, order.customer.id, { take: 50 });
    return ehPrimeiraCompra(items, order.id);
  },
});
