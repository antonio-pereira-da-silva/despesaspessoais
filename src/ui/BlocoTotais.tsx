import type { Totais } from '../domain/caixa';
import { formatarBRL } from '../domain/dinheiro';
import { Dinheiro } from './Dinheiro';

/** Entradas, saídas e saldo lado a lado. */
export function BlocoTotais({ totais, rotulo }: { totais: Totais; rotulo: string }) {
  return (
    <dl className="totais" aria-label={rotulo}>
      <div>
        <dt>Entradas</dt>
        <dd>{formatarBRL(totais.entradas)}</dd>
      </div>
      <div>
        <dt>Saídas</dt>
        <dd>{formatarBRL(totais.saidas)}</dd>
      </div>
      <div>
        <dt>Saldo</dt>
        <dd>
          <Dinheiro valor={totais.saldo} />
        </dd>
      </div>
    </dl>
  );
}
