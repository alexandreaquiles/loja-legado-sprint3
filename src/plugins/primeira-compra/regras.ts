// Regra pura: dado o histórico do cliente, é a primeira compra? Sem Vendure.

export type PedidoResumido = { id: string | number; orderPlacedAt?: Date | string | null };

/** R3/R4: primeira compra quando nenhum OUTRO pedido do cliente já foi fechado (orderPlacedAt preenchido). */
export function ehPrimeiraCompra(pedidosDoCliente: PedidoResumido[], idDoPedidoAtual: string | number): boolean {
  return !pedidosDoCliente.some((p) => String(p.id) !== String(idDoPedidoAtual) && !!p.orderPlacedAt);
}
