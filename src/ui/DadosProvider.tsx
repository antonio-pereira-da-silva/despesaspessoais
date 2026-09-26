import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Categoria, Limite } from '../domain/tipos';
import type { Repositorio } from '../storage/repositorio';
import { ContextoDados } from './dados';

interface Carregado {
  categorias: Categoria[];
  limites: Limite[];
  versao: number;
}

export function DadosProvider({ repo, children }: { repo: Repositorio; children: ReactNode }) {
  const [carregado, setCarregado] = useState<Carregado | null>(null);

  const buscar = useCallback(
    () => Promise.all([repo.listarCategorias(), repo.listarLimites()]),
    [repo],
  );

  const recarregar = useCallback(async () => {
    const [categorias, limites] = await buscar();
    setCarregado((atual) => ({ categorias, limites, versao: (atual?.versao ?? 0) + 1 }));
  }, [buscar]);

  useEffect(() => {
    let ativo = true;
    void buscar().then(([categorias, limites]) => {
      if (ativo) setCarregado({ categorias, limites, versao: 1 });
    });
    return () => {
      ativo = false;
    };
  }, [buscar]);

  const valor = useMemo(
    () => carregado && { repo, ...carregado, aposAlterar: recarregar },
    [carregado, repo, recarregar],
  );

  if (!valor) return <p className="aviso">Carregando…</p>;
  return <ContextoDados.Provider value={valor}>{children}</ContextoDados.Provider>;
}
