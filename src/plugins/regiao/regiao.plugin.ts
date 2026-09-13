import { PluginCommonModule, RuntimeVendureConfig, VendurePlugin } from '@vendure/core';
import { regiaoDaEntrega } from './promocoes';

/** Soma a condition regiao_da_entrega às nativas (R6). */
export function configurarRegiao(config: RuntimeVendureConfig): RuntimeVendureConfig {
  config.promotionOptions.promotionConditions = [...(config.promotionOptions.promotionConditions ?? []), regiaoDaEntrega];
  return config;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: configurarRegiao,
  compatibility: '^3.0.0',
})
export class RegiaoPlugin {}
