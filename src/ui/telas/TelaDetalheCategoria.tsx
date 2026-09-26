import { Link, useParams, useSearchParams } from 'react-router';
import { formatarBRL } from '../../domain/dinheiro';
import { formatarDiaMes, nomeDoMes } from '../../domain/mes';
import { limiteVigente, resumoCategoria } from '../../domain/orcamento';
import { BarraProgresso } from '../BarraProgresso';
import { useDados, useDespesasDoMes } from '../dados';
import { mesDaUrl } from '../parametros';
import { textoSituacao } from '../situacao';

export function TelaDetalheCategoria() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const mes = mesDaUrl(params);
  const { categorias, limites } = useDados();
  const despesas = useDespesasDoMes(mes);
  const categoria = categorias.find((c) => c.id === id);

  if (!categoria) {
    return (
      <p className="aviso">
        Categoria não encontrada. <Link to="/">Voltar ao início</Link>
      </p>
    );
  }
  if (!despesas) return <p className="aviso">Carregando…</p>;

  const daCategoria = despesas.filter((d) => d.categoriaId === categoria.id);
  const r = resumoCategoria(
    categoria,
    limiteVigente(limites, categoria.id, mes),
    daCategoria.reduce((soma, d) => soma + d.valor, 0),
  );

  return (
    <>
      <header className="cabecalho">
        <Link to={`/?mes=${mes}`} className="voltar">
          ‹ Voltar
        </Link>
        <h1>{categoria.nome}</h1>
        <p className="subtitulo">{nomeDoMes(mes)}</p>
      </header>
      <section className="cartao" data-status={r.status}>
        <span className="cartao__valores">
          {formatarBRL(r.gasto)}
          {r.limite !== null && ` de ${formatarBRL(r.limite)}`}
        </span>
        <BarraProgresso
          percentual={r.percentual}
          status={r.status}
          rotulo={`Uso do limite de ${categoria.nome}`}
        />
        <span className="cartao__situacao">{textoSituacao(r)}</span>
      </section>
      {daCategoria.length === 0 ? (
        <p className="aviso">Nenhuma despesa nesta categoria em {nomeDoMes(mes)}.</p>
      ) : (
        <ul className="lista-despesas">
          {daCategoria.map((d) => (
            <li key={d.id}>
              <Link to={`/despesa/${d.id}`} className="linha-despesa">
                <span className="linha-despesa__data">{formatarDiaMes(d.data)}</span>
                <span className="linha-despesa__descricao">{d.descricao ?? 'Sem descrição'}</span>
                <span className="linha-despesa__valor">{formatarBRL(d.valor)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={`/despesa/nova?mes=${mes}&categoria=${categoria.id}`}
        className="botao-flutuante"
        aria-label="Nova despesa"
      >
        +
      </Link>
    </>
  );
}
