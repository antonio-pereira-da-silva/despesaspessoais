import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { parseValor, valorParaCampo } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { ehDataValida, hojeISO, mesAtual, mesDe, ultimoDiaDoMes } from '../../domain/mes';
import type { Despesa } from '../../domain/tipos';
import { useDados } from '../dados';
import { useVoltar } from '../navegacao';
import { mesDaUrl } from '../parametros';

export function TelaDespesa() {
  const { id } = useParams();
  const { repo } = useDados();
  const [carregada, setCarregada] = useState<{ id: string; despesa?: Despesa } | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    void repo.obterDespesa(id).then((despesa) => {
      if (ativo) setCarregada({ id, despesa });
    });
    return () => {
      ativo = false;
    };
  }, [id, repo]);

  if (!id) return <FormDespesa />;
  if (carregada?.id !== id) return <p className="aviso">Carregando…</p>;
  if (!carregada.despesa) {
    return (
      <p className="aviso">
        Despesa não encontrada. <Link to="/">Voltar ao início</Link>
      </p>
    );
  }
  return <FormDespesa key={id} original={carregada.despesa} />;
}

function FormDespesa({ original }: { original?: Despesa }) {
  const { repo, categorias, aposAlterar } = useDados();
  const [params] = useSearchParams();
  const voltar = useVoltar();
  const navigate = useNavigate();
  const ids = { valor: useId(), data: useId(), descricao: useId() };
  const mes = mesDaUrl(params);

  const [valorTexto, setValorTexto] = useState(original ? valorParaCampo(original.valor) : '');
  const [categoriaId, setCategoriaId] = useState(
    original?.categoriaId ?? params.get('categoria') ?? '',
  );
  const [data, setData] = useState(
    original?.data ?? (mes === mesAtual() ? hojeISO() : ultimoDiaDoMes(mes)),
  );
  const [descricao, setDescricao] = useState(original?.descricao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const opcoes = categorias
    .filter((c) => !c.arquivada || c.id === original?.categoriaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const destino = `/?mes=${original ? mesDe(original.data) : mes}`;

  if (opcoes.length === 0) {
    return (
      <p className="aviso">
        Crie uma categoria antes de lançar despesas.{' '}
        <Link to="/categorias/nova">Criar categoria</Link>
      </p>
    );
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const valor = parseValor(valorTexto);
    if (valor === null) {
      setErro('Informe um valor maior que zero, como 12,50.');
      return;
    }
    if (!opcoes.some((c) => c.id === categoriaId)) {
      setErro('Escolha uma categoria.');
      return;
    }
    if (!ehDataValida(data)) {
      setErro('Informe a data.');
      return;
    }
    setSalvando(true);
    try {
      await repo.salvarDespesa({
        id: original?.id ?? novoId(),
        valor,
        categoriaId,
        data,
        descricao: descricao.trim() || undefined,
        criadaEm: original?.criadaEm ?? new Date().toISOString(),
      });
      await aposAlterar();
      const mudouDeLugar =
        original && (mesDe(original.data) !== mesDe(data) || original.categoriaId !== categoriaId);
      if (mudouDeLugar) {
        void navigate(`/categoria/${categoriaId}?mes=${mesDe(data)}`, { replace: true });
      } else {
        voltar(destino);
      }
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!original || !window.confirm('Excluir esta despesa?')) return;
    setExcluindo(true);
    setErro(null);
    try {
      await repo.excluirDespesa(original.id);
      await aposAlterar();
      voltar(destino);
    } catch {
      setErro('Não foi possível excluir. Tente novamente.');
      setExcluindo(false);
    }
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <header className="cabecalho">
        <button type="button" className="voltar" onClick={() => voltar(destino)}>
          ‹ Voltar
        </button>
        <h1>{original ? 'Editar despesa' : 'Nova despesa'}</h1>
      </header>
      <div className="campo">
        <label htmlFor={ids.valor}>Valor</label>
        <div className="campo-valor">
          <span aria-hidden="true">R$</span>
          <input
            id={ids.valor}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            autoFocus={!original}
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
          />
        </div>
      </div>
      <fieldset className="campo">
        <legend>Categoria</legend>
        <div className="chips">
          {opcoes.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={c.id === categoriaId}
              style={{ '--cor-chip': c.cor } as CSSProperties}
              onClick={() => setCategoriaId(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="campo">
        <label htmlFor={ids.data}>Data</label>
        <input id={ids.data} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor={ids.descricao}>Descrição (opcional)</label>
        <input
          id={ids.descricao}
          maxLength={80}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <button type="submit" className="botao botao--primario" disabled={salvando || excluindo}>
        Salvar
      </button>
      {original && (
        <button
          type="button"
          className="botao botao--perigo"
          onClick={excluir}
          disabled={salvando || excluindo}
        >
          Excluir despesa
        </button>
      )}
    </form>
  );
}
