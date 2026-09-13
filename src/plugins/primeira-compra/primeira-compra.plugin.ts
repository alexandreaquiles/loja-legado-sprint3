import { PluginCommonModule, RuntimeVendureConfig, VendurePlugin } from '@vendure/core';
import { primeiraCompra } from './promocoes';

/** Soma a condition primeira_compra às nativas (R6). */
export function configurarPrimeiraCompra(config: RuntimeVendureConfig): RuntimeVendureConfig {
  config.promotionOptions.promotionConditions = [...(config.promotionOptions.promotionConditions ?? []), primeiraCompra];
  return config;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: configurarPrimeiraCompra,
  compatibility: '^3.0.0',
})
export class PrimeiraCompraPlugin {}
