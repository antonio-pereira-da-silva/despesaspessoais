import { createContext, useContext, useEffect, useState } from 'react';
import type { Categoria, Despesa, Entrada, Limite, Mes } from '../domain/tipos';
import type { Repositorio } from '../storage/repositorio';

export interface ValorDados {
  repo: Repositorio;
  categorias: Categoria[];
  limites: Limite[];
  /** Muda a cada alteração; usado para recarregar despesas. */
  versao: number;
  /** Recarrega os dados depois de uma escrita. */
  aposAlterar: () => Promise<void>;
}

export const ContextoDados = createContext<ValorDados | null>(null);

export function useDados(): ValorDados {
  const valor = useContext(ContextoDados);
  if (!valor) throw new Error('useDados usado fora do DadosProvider');
  return valor;
}

export function useDespesasDoMes(mes: Mes): Despesa[] | null {
  const { repo, versao } = useDados();
  const chave = `${mes}#${versao}`;
  const [carregado, setCarregado] = useState<{ chave: string; despesas: Despesa[] } | null>(null);
  useEffect(() => {
    let ativo = true;
    void repo.listarDespesasDoMes(mes).then((despesas) => {
      if (ativo) setCarregado({ chave, despesas });
    });
    return () => {
      ativo = false;
    };
  }, [repo, mes, chave]);
  return carregado?.chave === chave ? carregado.despesas : null;
}

/** Data da despesa mais antiga; null se não houver despesas ou enquanto carrega. */
export function useDataDaPrimeiraDespesa(): string | null {
  const { repo, versao } = useDados();
  const [carregado, setCarregado] = useState<{ versao: number; data: string | null } | null>(null);
  useEffect(() => {
    let ativo = true;
    void repo.dataDaPrimeiraDespesa().then((data) => {
      if (ativo) setCarregado({ versao, data });
    });
    return () => {
      ativo = false;
    };
  }, [repo, versao]);
  return carregado?.versao === versao ? carregado.data : null;
}

export interface Lancamentos {
  entradas: Entrada[];
  despesas: Despesa[];
}

/** Entradas e despesas entre as datas (inclusive); null enquanto carrega. */
export function useLancamentosDoPeriodo(inicio: string, fim: string): Lancamentos | null {
  const { repo, versao } = useDados();
  const chave = `${inicio}#${fim}#${versao}`;
  const [carregado, setCarregado] = useState<{ chave: string; dados: Lancamentos } | null>(null);
  useEffect(() => {
    let ativo = true;
    void Promise.all([
      repo.listarEntradasDoPeriodo(inicio, fim),
      repo.listarDespesasDoPeriodo(inicio, fim),
    ]).then(([entradas, despesas]) => {
      if (ativo) setCarregado({ chave, dados: { entradas, despesas } });
    });
    return () => {
      ativo = false;
    };
  }, [repo, inicio, fim, chave]);
  return carregado?.chave === chave ? carregado.dados : null;
}
