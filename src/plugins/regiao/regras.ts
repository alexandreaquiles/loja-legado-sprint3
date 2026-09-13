// Regras puras da região de entrega, sem Vendure.

/** "sp" -> "SP"; " rj " -> "RJ". */
export function normalizarSigla(sigla: string | null | undefined): string {
  return String(sigla ?? '').trim().toUpperCase();
}

/** "SP, rj ,MG" -> ["SP","RJ","MG"] (ignora vazios). */
export function listaDeEstados(estados: string): string[] {
  return estados.split(',').map(normalizarSigla).filter(Boolean);
}

/** R3/R4: a sigla do endereço (normalizada) está na lista? Sem sigla, false. */
export function entregaNaRegiao(siglaDoEndereco: string | null | undefined, estados: string): boolean {
  const sigla = normalizarSigla(siglaDoEndereco);
  return sigla !== '' && listaDeEstados(estados).includes(sigla);
}
