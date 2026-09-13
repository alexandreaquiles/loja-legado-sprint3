import { PrimeiraCompraPlugin } from './primeira-compra.plugin';

export * from './regras';
export * from './promocoes';
export * from './primeira-compra.plugin';

/** Registro automático (ver src/plugins/registro.ts). */
export const plugin = PrimeiraCompraPlugin;
