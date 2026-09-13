import { describe, it, expect } from 'vitest';
import { LanguageCode, Order, Promotion, RequestContext, RuntimeVendureConfig, customerGroup } from '@vendure/core';
import { primeiraCompra, configurarPrimeiraCompra, ehPrimeiraCompra } from '../src/plugins/primeira-compra';

const ctx = {} as RequestContext;
const promo = {} as Promotion;
// OrderService falso: devolve os pedidos que o teste quiser.
const comHistorico = (items: Array<{ id: number; orderPlacedAt: Date | null }>) =>
  primeiraCompra.init({ get: () => ({ findByCustomerId: async () => ({ items, totalItems: items.length }) }) } as any);
const pedido = (id: number, customer?: { id: number }) => ({ id, customer }) as unknown as Order;
const checa = (order: Order) => primeiraCompra.check(ctx, order, [], promo);

describe('primeira_compra (LOJA-3)', () => {
  it('R2 visitante (sem customer) devolve false', async () => {
    comHistorico([]);
    expect(await checa(pedido(10))).toBe(false);
  });
  it('R4 cliente sem nenhum pedido fechado devolve true', async () => {
    comHistorico([]);
    expect(await checa(pedido(10, { id: 1 }))).toBe(true);
  });
  it('R4 cliente com um pedido fechado devolve false', async () => {
    comHistorico([{ id: 7, orderPlacedAt: new Date('2026-09-01') }]);
    expect(await checa(pedido(10, { id: 1 }))).toBe(false);
  });
  it('R3 ignora o pedido atual e pedidos ainda abertos', async () => {
    comHistorico([{ id: 10, orderPlacedAt: null }, { id: 11, orderPlacedAt: null }]);
    expect(await checa(pedido(10, { id: 1 }))).toBe(true);
    expect(ehPrimeiraCompra([{ id: 10, orderPlacedAt: '2026-09-01' }], 10)).toBe(true);
  });
  it('R6 soma à lista nativa e tem description em pt_BR e en', () => {
    const config = { promotionOptions: { promotionConditions: [customerGroup] } } as unknown as RuntimeVendureConfig;
    const codes = configurarPrimeiraCompra(config).promotionOptions.promotionConditions!.map((c) => c.code);
    expect(codes).toEqual(['customer_group', 'primeira_compra']);
    expect(primeiraCompra.description.map((d) => d.languageCode)).toEqual(expect.arrayContaining([LanguageCode.pt_BR, LanguageCode.en]));
  });
});
