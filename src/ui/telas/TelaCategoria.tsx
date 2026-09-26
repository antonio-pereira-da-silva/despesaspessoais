import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CORES, mesmoNome } from '../../domain/categorias';
import { parseValor, valorParaCampo } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { mesAtual, nomeDoMes } from '../../domain/mes';
import { limiteVigente } from '../../domain/orcamento';
import { useDados } from '../dados';

export function TelaCategoria() {
  const { id } = useParams();
  const { repo, categorias, limites, aposAlterar } = useDados();
  const navigate = useNavigate();
  const ids = { nome: useId(), limite: useId() };
  const mes = mesAtual();
  const existente = id ? categorias.find((c) => c.id === id) : undefined;
  const limiteAtual = existente ? limiteVigente(limites, existente.id, mes) : null;

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [cor, setCor] = useState(existente?.cor ?? CORES[categorias.length % CORES.length]);
  const [limiteTexto, setLimiteTexto] = useState(limiteAtual ? valorParaCampo(limiteAtual) : '');
  const [erro, setErro] = useState<string | null>(null);

  if (id && !existente) {
    return (
      <p className="aviso">
        Categoria não encontrada. <Link to="/categorias">Voltar</Link>
      </p>
    );
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro('Informe o nome da categoria.');
      return;
    }
    if (categorias.some((c) => c.id !== existente?.id && mesmoNome(c.nome, nomeLimpo))) {
      setErro('Já existe uma categoria com esse nome.');
      return;
    }
    const novoLimite = limiteTexto.trim() === '' ? 0 : parseValor(limiteTexto);
    if (novoLimite === null) {
      setErro('Limite inválido. Use um valor como 800 ou 800,00.');
      return;
    }
    const categoria = {
      id: existente?.id ?? novoId(),
      nome: nomeLimpo,
      cor,
      arquivada: existente?.arquivada ?? false,
    };
    try {
      await repo.salvarCategoria(categoria);
      if (novoLimite !== (limiteAtual ?? 0))
        await repo.definirLimite(categoria.id, novoLimite, mes);
      await aposAlterar();
      void navigate('/categorias');
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    }
  }

  async function alternarArquivada() {
    if (!existente) return;
    await repo.salvarCategoria({ ...existente, arquivada: !existente.arquivada });
    await aposAlterar();
    void navigate('/categorias');
  }

  async function excluir() {
    if (!existente || !window.confirm(`Excluir a categoria "${existente.nome}"?`)) return;
    if (!(await repo.excluirCategoria(existente.id))) {
      setErro('Esta categoria tem despesas e não pode ser excluída. Arquive-a para escondê-la.');
      return;
    }
    await aposAlterar();
    void navigate('/categorias');
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <header className="cabecalho">
        <Link to="/categorias" className="voltar">
          ‹ Categorias
        </Link>
        <h1>{existente ? 'Editar categoria' : 'Nova categoria'}</h1>
      </header>
      <div className="campo">
        <label htmlFor={ids.nome}>Nome</label>
        <input
          id={ids.nome}
          value={nome}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <fieldset className="campo">
        <legend>Cor</legend>
        <div className="cores">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              className="cor"
              style={{ background: c }}
              aria-label={`Cor ${c}`}
              aria-pressed={c === cor}
              onClick={() => setCor(c)}
            />
          ))}
        </div>
      </fieldset>
      <div className="campo">
        <label htmlFor={ids.limite}>Limite mensal</label>
        <input
          id={ids.limite}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ex.: 800,00"
          value={limiteTexto}
          onChange={(e) => setLimiteTexto(e.target.value)}
        />
        <small>Vale a partir de {nomeDoMes(mes)}. Deixe vazio para não ter limite.</small>
      </div>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <button type="submit" className="botao botao--primario">
        Salvar
      </button>
      {existente && (
        <div className="acoes">
          <button type="button" className="botao" onClick={alternarArquivada}>
            {existente.arquivada ? 'Reativar' : 'Arquivar'}
          </button>
          <button type="button" className="botao botao--perigo" onClick={excluir}>
            Excluir
          </button>
        </div>
      )}
    </form>
  );
}
