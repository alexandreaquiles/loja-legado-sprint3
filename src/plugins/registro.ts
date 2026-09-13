import { readdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Cada pasta em src/plugins/<nome>/ que exporta `plugin` no index.ts entra na loja.
 * Assim uma issue nova não precisa editar vendure-config.ts (e duas issues em paralelo não brigam por ele).
 */
export function pluginsDaLoja(): any[] {
  const raiz = __dirname;
  return readdirSync(raiz, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .filter((nome) => existsSync(path.join(raiz, nome, 'index.ts')) || existsSync(path.join(raiz, nome, 'index.js')))
    .map((nome) => require(path.join(raiz, nome)).plugin)
    .filter(Boolean);
}
