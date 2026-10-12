import { Link, useParams } from 'react-router';
import { resumoDetalheMes } from '../../domain/caixa';
import { formatarBRL } from '../../domain/dinheiro';
import { ehMesValido, formatarDiaMes, nomeDoMes, ultimoDiaDoMes } from '../../domain/mes';
import type { Mes } from '../../domain/tipos';
import { BlocoTotais } from '../BlocoTotais';
import { useDados, useLancamentosDoPeriodo } from '../dados';
import { useVoltar } from '../navegacao';

export function TelaCaixaMes() {
  const { mes } = useParams();
  if (!mes || !ehMesValido(mes)) {
    return (
      <p className="aviso">
        Mês inválido. <Link to="/caixa">Voltar ao caixa</Link>
      </p>
    );
  }
  return <DetalheMes key={mes} mes={mes} />;
}

function DetalheMes({ mes }: { mes: Mes }) {
  const { categorias } = useDados();
  const voltar = useVoltar();
  const lancamentos = useLancamentosDoPeriodo(`${mes}-01`, ultimoDiaDoMes(mes));

  const cabecalho = (
    <header className="cabecalho">
      <button type="button" className="voltar" onClick={() => voltar('/caixa')}>
        ‹ Voltar
      </button>
      <h1>{nomeDoMes(mes)}</h1>
    </header>
  );

  if (!lancamentos) {
    return (
      <>
        {cabecalho}
        <p className="aviso">Carregando…</p>
      </>
    );
  }

  const detalhe = resumoDetalheMes(lancamentos.entradas, lancamentos.despesas, categorias, mes);

  return (
    <>
      {cabecalho}
      <BlocoTotais totais={detalhe.totais} rotulo="Totais do mês" />
      <section aria-labelledby="titulo-entradas">
        <h2 id="titulo-entradas">Entradas</h2>
        {detalhe.entradas.length === 0 ? (
          <p className="aviso">Nenhuma entrada neste mês.</p>
        ) : (
          <ul className="lista-despesas">
            {detalhe.entradas.map((e) => (
              <li key={e.id}>
                <Link to={`/entrada/${e.id}`} className="linha-despesa">
                  <span className="linha-despesa__data">{formatarDiaMes(e.data)}</span>
                  <span className="linha-despesa__descricao">{e.descricao ?? 'Entrada'}</span>
                  <span className="linha-despesa__valor valor-entrada">{formatarBRL(e.valor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to={`/entrada/nova?mes=${mes}`}>+ Entrada</Link>
        </p>
      </section>
      <section aria-labelledby="titulo-saidas">
        <h2 id="titulo-saidas">Saídas</h2>
        {detalhe.saidasPorCategoria.length === 0 ? (
          <p className="aviso">Nenhuma despesa neste mês.</p>
        ) : (
          <ul className="lista-despesas">
            {detalhe.saidasPorCategoria.map((s) => (
              <li key={s.categoriaId}>
                <Link to={`/categoria/${s.categoriaId}?mes=${mes}`} className="linha-despesa">
                  <span className="bolinha" style={{ background: s.cor }} />
                  <span className="linha-despesa__descricao">{s.nome}</span>
                  <span className="linha-despesa__valor">{formatarBRL(s.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
