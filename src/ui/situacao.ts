import { formatarBRL } from '../domain/dinheiro';
import type { ResumoCategoria } from '../domain/tipos';

export function textoSituacao(r: ResumoCategoria): string {
  if (r.restante === null) return 'Sem limite definido';
  if (r.restante >= 0) return `Sobram ${formatarBRL(r.restante)}`;
  return `Estourou ${formatarBRL(-r.restante)}`;
}
