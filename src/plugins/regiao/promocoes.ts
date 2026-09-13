import { LanguageCode, PromotionCondition } from '@vendure/core';
import { entregaNaRegiao } from './regras';

/**
 * Condition: vale quando o estado do endereço de entrega está na lista (R1-R4).
 * O frete grátis em si é a action nativa free_shipping, combinada no dashboard.
 */
export const regiaoDaEntrega = new PromotionCondition({
  code: 'regiao_da_entrega',
  description: [
    { languageCode: LanguageCode.pt_BR, value: 'Se a entrega é para um dos estados: { estados }' },
    { languageCode: LanguageCode.en, value: 'If the shipping address is in one of the states: { estados }' },
  ],
  args: {
    estados: { type: 'string', defaultValue: 'SP,RJ,MG,ES,PR,SC,RS', label: [{ languageCode: LanguageCode.pt_BR, value: 'Siglas separadas por vírgula' }] },
  },
  check(ctx, order, args) {
    return entregaNaRegiao(order.shippingAddress?.province, args.estados);
  },
});
