import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { parseValor, valorParaCampo } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { ehDataValida, hojeISO, mesAtual, mesDe, ultimoDiaDoMes } from '../../domain/mes';
import type { Entrada } from '../../domain/tipos';
import { useDados } from '../dados';
import { useVoltar } from '../navegacao';
import { mesDaUrl } from '../parametros';

export function TelaEntrada() {
  const { id } = useParams();
  const { repo } = useDados();
  const [carregada, setCarregada] = useState<{ id: string; entrada?: Entrada } | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    void repo.obterEntrada(id).then((entrada) => {
      if (ativo) setCarregada({ id, entrada });
    });
    return () => {
      ativo = false;
    };
  }, [id, repo]);

  if (!id) return <FormEntrada />;
  if (carregada?.id !== id) return <p className="aviso">Carregando…</p>;
  if (!carregada.entrada) {
    return (
      <p className="aviso">
        Entrada não encontrada. <Link to="/">Voltar ao início</Link>
      </p>
    );
  }
  return <FormEntrada key={id} original={carregada.entrada} />;
}

function FormEntrada({ original }: { original?: Entrada }) {
  const { repo, aposAlterar } = useDados();
  const [params] = useSearchParams();
  const voltar = useVoltar();
  const ids = { valor: useId(), data: useId(), descricao: useId() };
  const mes = mesDaUrl(params);

  const [valorTexto, setValorTexto] = useState(original ? valorParaCampo(original.valor) : '');
  const [data, setData] = useState(
    original?.data ?? (mes === mesAtual() ? hojeISO() : ultimoDiaDoMes(mes)),
  );
  const [descricao, setDescricao] = useState(original?.descricao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const destino = `/?mes=${original ? mesDe(original.data) : mes}`;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const valor = parseValor(valorTexto);
    if (valor === null) {
      setErro('Informe um valor maior que zero, como 1500,00.');
      return;
    }
    if (!ehDataValida(data)) {
      setErro('Informe a data.');
      return;
    }
    setSalvando(true);
    try {
      await repo.salvarEntrada({
        id: original?.id ?? novoId(),
        valor,
        data,
        descricao: descricao.trim() || undefined,
        criadaEm: original?.criadaEm ?? new Date().toISOString(),
      });
      await aposAlterar();
      voltar(destino);
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!original || !window.confirm('Excluir esta entrada?')) return;
    await repo.excluirEntrada(original.id);
    await aposAlterar();
    voltar(destino);
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <header className="cabecalho">
        <button type="button" className="voltar" onClick={() => voltar(destino)}>
          ‹ Voltar
        </button>
        <h1>{original ? 'Editar entrada' : 'Nova entrada'}</h1>
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
      <div className="campo">
        <label htmlFor={ids.data}>Data</label>
        <input id={ids.data} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor={ids.descricao}>Descrição (opcional)</label>
        <input
          id={ids.descricao}
          maxLength={80}
          placeholder="Salário, freela, reembolso…"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <button type="submit" className="botao botao--primario" disabled={salvando}>
        Salvar
      </button>
      {original && (
        <button type="button" className="botao botao--perigo" onClick={excluir}>
          Excluir entrada
        </button>
      )}
    </form>
  );
}
