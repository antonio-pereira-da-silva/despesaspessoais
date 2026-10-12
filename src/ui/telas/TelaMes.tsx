import { Link, useSearchParams } from 'react-router';
import { formatarBRL } from '../../domain/dinheiro';
import { mesAnterior, mesAtual, nomeDoMes, proximoMes, ultimoDiaDoMes } from '../../domain/mes';
import { resumoDoMes } from '../../domain/orcamento';
import { BarraProgresso } from '../BarraProgresso';
import { Dinheiro } from '../Dinheiro';
import { lerUltimoBackup, precisaLembrarBackup } from '../backupLocal';
import { useDados, useDataDaPrimeiraDespesa, useLancamentosDoPeriodo } from '../dados';
import { mesDaUrl } from '../parametros';
import { textoSituacao } from '../situacao';

export function TelaMes() {
  const { categorias, limites } = useDados();
  const [params, setParams] = useSearchParams();
  const mes = mesDaUrl(params);
  const lancamentos = useLancamentosDoPeriodo(`${mes}-01`, ultimoDiaDoMes(mes));
  const primeiraDespesa = useDataDaPrimeiraDespesa();

  const cabecalho = (
    <header className="cabecalho-mes">
      <button
        type="button"
        className="botao-icone"
        aria-label="Mês anterior"
        onClick={() => setParams({ mes: mesAnterior(mes) })}
      >
        ‹
      </button>
      <h1>{nomeDoMes(mes)}</h1>
      <button
        type="button"
        className="botao-icone"
        aria-label="Próximo mês"
        onClick={() => setParams({ mes: proximoMes(mes) })}
      >
        ›
      </button>
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

  const resumo = resumoDoMes(categorias, limites, lancamentos.despesas, mes);
  const totalEntradas = lancamentos.entradas.reduce((soma, e) => soma + e.valor, 0);
  const lembrarBackup =
    mes === mesAtual() && precisaLembrarBackup(lerUltimoBackup(), primeiraDespesa);

  return (
    <>
      {cabecalho}
      {lembrarBackup && (
        <p className="lembrete">
          Faz tempo que você não salva um backup. <Link to="/ajustes">Fazer backup</Link>
        </p>
      )}
      <p className="caixa-mes">
        Entradas <strong>{formatarBRL(totalEntradas)}</strong> · Saldo{' '}
        <strong>
          <Dinheiro valor={totalEntradas - resumo.totalGasto} />
        </strong>{' '}
        <Link to={`/entrada/nova?mes=${mes}`}>+ Entrada</Link>
      </p>
      {resumo.categorias.length === 0 ? (
        <p className="aviso">
          Nenhuma categoria ainda. <Link to="/categorias">Crie suas categorias</Link> para começar.
        </p>
      ) : (
        <>
          <p className="total">
            Gasto <strong>{formatarBRL(resumo.totalGasto)}</strong>
            {resumo.totalLimites > 0 && ` de ${formatarBRL(resumo.totalLimites)}`}
          </p>
          <ul className="lista-cartoes">
            {resumo.categorias.map((r) => (
              <li key={r.categoria.id}>
                <Link
                  to={`/categoria/${r.categoria.id}?mes=${mes}`}
                  className="cartao"
                  data-status={r.status}
                >
                  <span className="cartao__topo">
                    <span className="cartao__titulo">
                      <span className="bolinha" style={{ background: r.categoria.cor }} />
                      {r.categoria.nome}
                    </span>
                    <span className="cartao__valores">
                      {formatarBRL(r.gasto)}
                      {r.limite !== null && ` de ${formatarBRL(r.limite)}`}
                    </span>
                  </span>
                  <BarraProgresso
                    percentual={r.percentual}
                    status={r.status}
                    rotulo={`Uso do limite de ${r.categoria.nome}`}
                  />
                  <span className="cartao__situacao">{textoSituacao(r)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to={`/despesa/nova?mes=${mes}`} className="botao-flutuante" aria-label="Nova despesa">
        +
      </Link>
    </>
  );
}
