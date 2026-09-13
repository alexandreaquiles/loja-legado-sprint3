import { CuponsPlugin } from './cupons.plugin';

export * from './regras';
export * from './promocoes';
export * from './cupons.plugin';

/** Registro automático (ver src/plugins/registro.ts). */
export const plugin = CuponsPlugin;
