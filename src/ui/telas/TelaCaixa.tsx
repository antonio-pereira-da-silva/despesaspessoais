import { Link, useSearchParams } from 'react-router';
import { extratoDoPeriodo, resumoPorMes, type Extrato, type ResumoCaixa } from '../../domain/caixa';
import { formatarBRL } from '../../domain/dinheiro';
import {
  ehDataValida,
  ehMesValido,
  formatarDataCurta,
  formatarDiaMes,
  hojeISO,
  mesAnterior,
  mesAtual,
  nomeCurtoDoMes,
  ultimoDiaDoMes,
} from '../../domain/mes';
import { BlocoTotais } from '../BlocoTotais';
import { CampoFiltro } from '../CampoFiltro';
import { Dinheiro } from '../Dinheiro';
import { useDados, useLancamentosDoPeriodo } from '../dados';
import { dataDoParametro, mesDoParametro } from '../parametros';

type Modo = 'mes' | 'periodo';

const MODOS: [Modo, string][] = [
  ['mes', 'Por mês'],
  ['periodo', 'Por período'],
];

/** Parâmetros da URL; mudanças substituem a entrada do histórico. */
function useParametros() {
  const [params, setParams] = useSearchParams();
  const definir = (mudancas: Record<string, string>) =>
    setParams(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        for (const [chave, valor] of Object.entries(mudancas)) novos.set(chave, valor);
        return novos;
      },
      { replace: true },
    );
  return [params, definir] as const;
}

export function TelaCaixa() {
  const [params, definir] = useParametros();
  const modo: Modo = params.get('modo') === 'periodo' ? 'periodo' : 'mes';

  return (
    <>
      <header className="cabecalho">
        <h1>Caixa</h1>
      </header>
      <div className="chips abas" role="group" aria-label="Tipo de relatório">
        {MODOS.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            className="chip"
            aria-pressed={modo === valor}
            onClick={() => definir({ modo: valor })}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {modo === 'mes' ? <CaixaPorMes /> : <CaixaPorPeriodo />}
    </>
  );
}

function seisMesesAtras(): string {
  let mes = mesAtual();
  for (let i = 0; i < 5; i++) mes = mesAnterior(mes);
  return mes;
}

function CaixaPorMes() {
  const [params, definir] = useParametros();
  const de = mesDoParametro(params, 'de', seisMesesAtras());
  const ate = mesDoParametro(params, 'ate', mesAtual());
  const [primeiro, ultimo] = de <= ate ? [de, ate] : [ate, de];
  const lancamentos = useLancamentosDoPeriodo(`${primeiro}-01`, ultimoDiaDoMes(ultimo));

  return (
    <>
      <div className="filtros">
        <CampoFiltro
          rotulo="De"
          tipo="month"
          valor={de}
          valido={ehMesValido}
          aoMudar={(v) => definir({ de: v })}
        />
        <CampoFiltro
          rotulo="Até"
          tipo="month"
          valor={ate}
          valido={ehMesValido}
          aoMudar={(v) => definir({ ate: v })}
        />
      </div>
      {!lancamentos ? (
        <p className="aviso">Carregando…</p>
      ) : (
        <TabelaMeses resumo={resumoPorMes(lancamentos.entradas, lancamentos.despesas, de, ate)} />
      )}
    </>
  );
}

function TabelaMeses({ resumo }: { resumo: ResumoCaixa }) {
  return (
    <div className="tabela-rolagem">
      <table className="tabela-caixa">
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Entradas</th>
            <th scope="col">Saídas</th>
            <th scope="col">Saldo</th>
            <th scope="col">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {resumo.meses.map((l) => (
            <tr key={l.mes}>
              <th scope="row">
                <Link to={`/caixa/mes/${l.mes}`}>{nomeCurtoDoMes(l.mes)}</Link>
              </th>
              <td>{formatarBRL(l.entradas)}</td>
              <td>{formatarBRL(l.saidas)}</td>
              <td>
                <Dinheiro valor={l.saldo} />
              </td>
              <td>
                <Dinheiro valor={l.acumulado} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{formatarBRL(resumo.totais.entradas)}</td>
            <td>{formatarBRL(resumo.totais.saidas)}</td>
            <td>
              <Dinheiro valor={resumo.totais.saldo} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CaixaPorPeriodo() {
  const [params, definir] = useParametros();
  const { categorias } = useDados();
  const inicio = dataDoParametro(params, 'inicio', `${mesAtual()}-01`);
  const fim = dataDoParametro(params, 'fim', hojeISO());
  const lancamentos = useLancamentosDoPeriodo(inicio, fim);
  const formatarData = inicio.slice(0, 4) === fim.slice(0, 4) ? formatarDiaMes : formatarDataCurta;

  return (
    <>
      <div className="filtros">
        <CampoFiltro
          rotulo="De"
          tipo="date"
          valor={inicio}
          valido={ehDataValida}
          aoMudar={(v) => definir({ inicio: v })}
        />
        <CampoFiltro
          rotulo="Até"
          tipo="date"
          valor={fim}
          valido={ehDataValida}
          aoMudar={(v) => definir({ fim: v })}
        />
      </div>
      {!lancamentos ? (
        <p className="aviso">Carregando…</p>
      ) : (
        <ListaExtrato
          extrato={extratoDoPeriodo(
            lancamentos.entradas,
            lancamentos.despesas,
            categorias,
            inicio,
            fim,
          )}
          formatarData={formatarData}
        />
      )}
    </>
  );
}

function ListaExtrato({
  extrato,
  formatarData,
}: {
  extrato: Extrato;
  formatarData: (data: string) => string;
}) {
  return (
    <>
      {extrato.linhas.length === 0 ? (
        <p className="aviso">Nenhum lançamento neste período.</p>
      ) : (
        <ul className="lista-despesas">
          {extrato.linhas.map((l) => (
            <li key={`${l.tipo}-${l.id}`}>
              <Link
                to={l.tipo === 'entrada' ? `/entrada/${l.id}` : `/despesa/${l.id}`}
                className="linha-despesa"
              >
                <span className="linha-despesa__data">{formatarData(l.data)}</span>
                <span className="linha-despesa__descricao">{l.descricao}</span>
                <span className="extrato__valores">
                  <span className={l.tipo === 'entrada' ? 'valor-entrada' : undefined}>
                    {l.tipo === 'entrada' ? '+ ' : '− '}
                    {formatarBRL(l.valor)}
                  </span>
                  <small>
                    Saldo <Dinheiro valor={l.saldo} />
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <BlocoTotais totais={extrato.totais} rotulo="Totais do período" />
    </>
  );
}
