import { describe, it, expect } from 'vitest';
import { LanguageCode, Order, Promotion, RequestContext, RuntimeVendureConfig, minimumOrderAmount } from '@vendure/core';
import { regiaoDaEntrega, configurarRegiao, entregaNaRegiao, listaDeEstados } from '../src/plugins/regiao';

const ctx = {} as RequestContext;
const promo = {} as Promotion;
const pedido = (province?: string) => ({ shippingAddress: province === undefined ? undefined : { province } }) as unknown as Order;
const checa = (order: Order, estados = 'SP,RJ,MG,ES,PR,SC,RS') => regiaoDaEntrega.check(ctx, order, [{ name: 'estados', value: estados }], promo);

describe('regiao_da_entrega (LOJA-2)', () => {
  it('R3 SP está na lista', async () => {
    expect(await checa(pedido('SP'))).toBe(true);
  });
  it('R3 BA está fora da lista', async () => {
    expect(await checa(pedido('BA'))).toBe(false);
  });
  it('R2 normaliza " sp " e a lista com espaços', async () => {
    expect(await checa(pedido(' sp '), ' sp , rj')).toBe(true);
    expect(listaDeEstados(' sp , rj,,')).toEqual(['SP', 'RJ']);
  });
  it('R4 sem endereço de entrega ou sem province devolve false', async () => {
    expect(await checa(pedido())).toBe(false);
    expect(await checa(pedido(''))).toBe(false);
    expect(entregaNaRegiao(null, 'SP')).toBe(false);
  });
  it('R6 soma à lista nativa e tem description em pt_BR e en', () => {
    const config = { promotionOptions: { promotionConditions: [minimumOrderAmount] } } as unknown as RuntimeVendureConfig;
    const codes = configurarRegiao(config).promotionOptions.promotionConditions!.map((c) => c.code);
    expect(codes).toEqual(['minimum_order_amount', 'regiao_da_entrega']);
    expect(regiaoDaEntrega.description.map((d) => d.languageCode)).toEqual(expect.arrayContaining([LanguageCode.pt_BR, LanguageCode.en]));
  });
});
