import { createContext, useContext, useEffect, useState } from 'react';
import type { Categoria, Despesa, Limite, Mes } from '../domain/tipos';
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
