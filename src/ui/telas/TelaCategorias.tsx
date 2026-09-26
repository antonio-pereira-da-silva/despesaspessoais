import { Link } from 'react-router';
import { CORES, SUGESTOES, mesmoNome } from '../../domain/categorias';
import { formatarBRL } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { mesAtual } from '../../domain/mes';
import { limiteVigente } from '../../domain/orcamento';
import type { Categoria } from '../../domain/tipos';
import { useDados } from '../dados';

export function TelaCategorias() {
  const { repo, categorias, limites, aposAlterar } = useDados();
  const mes = mesAtual();
  const ordenadas = [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const ativas = ordenadas.filter((c) => !c.arquivada);
  const arquivadas = ordenadas.filter((c) => c.arquivada);
  const sugestoes = SUGESTOES.filter((nome) => !categorias.some((c) => mesmoNome(c.nome, nome)));

  async function criarSugestao(nome: string) {
    await repo.salvarCategoria({
      id: novoId(),
      nome,
      cor: CORES[categorias.length % CORES.length],
      arquivada: false,
    });
    await aposAlterar();
  }

  const item = (c: Categoria) => {
    const limite = limiteVigente(limites, c.id, mes);
    return (
      <li key={c.id}>
        <Link to={`/categorias/${c.id}`} className="item-categoria">
          <span className="bolinha" style={{ background: c.cor }} />
          <span className="item-categoria__nome">{c.nome}</span>
          <span className="item-categoria__limite">
            {limite ? `${formatarBRL(limite)}/mês` : 'Sem limite'}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <header className="cabecalho">
        <h1>Categorias</h1>
      </header>
      {ativas.length > 0 && <ul className="lista-categorias">{ativas.map(item)}</ul>}
      <p>
        <Link to="/categorias/nova" className="botao botao--primario">
          Nova categoria
        </Link>
      </p>
      {sugestoes.length > 0 && (
        <section className="secao">
          <h2>Sugestões</h2>
          <div className="sugestoes">
            {sugestoes.map((nome) => (
              <button key={nome} type="button" className="chip" onClick={() => criarSugestao(nome)}>
                + {nome}
              </button>
            ))}
          </div>
        </section>
      )}
      {arquivadas.length > 0 && (
        <>
          <h2>Arquivadas</h2>
          <ul className="lista-categorias">{arquivadas.map(item)}</ul>
        </>
      )}
    </>
  );
}
