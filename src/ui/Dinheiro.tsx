import { formatarBRL } from '../domain/dinheiro';
import type { Centavos } from '../domain/tipos';

/** Valor em reais; negativo aparece em vermelho. */
export function Dinheiro({ valor }: { valor: Centavos }) {
  return <span className={valor < 0 ? 'valor-negativo' : undefined}>{formatarBRL(valor)}</span>;
}
