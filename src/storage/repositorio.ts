import { novoId } from '../domain/id';
import type { Categoria, Centavos, Despesa, Limite, Mes } from '../domain/tipos';
import type { BancoDespesas } from './db';

export interface DadosCompletos {
  categorias: Categoria[];
  limites: Limite[];
  despesas: Despesa[];
}

const TODAS = ['categorias', 'limites', 'despesas'] as const;

function ordenarDespesas(despesas: Despesa[]): Despesa[] {
  return despesas.sort(
    (a, b) => b.data.localeCompare(a.data) || b.criadaEm.localeCompare(a.criadaEm),
  );
}

export function criarRepositorio(db: BancoDespesas) {
  return {
    listarCategorias(): Promise<Categoria[]> {
      return db.getAll('categorias');
    },

    async salvarCategoria(categoria: Categoria): Promise<void> {
      await db.put('categorias', categoria);
    },

    /** Exclui a categoria e seus limites; retorna false, sem excluir, se ela tiver despesas. */
    async excluirCategoria(id: string): Promise<boolean> {
      const tx = db.transaction(TODAS, 'readwrite');
      const despesas = await tx.objectStore('despesas').index('categoriaId').count(id);
      if (despesas > 0) {
        await tx.done;
        return false;
      }
      const limites = tx.objectStore('limites');
      const chaves = await limites.index('categoriaId').getAllKeys(id);
      await Promise.all([
        ...chaves.map((chave) => limites.delete(chave)),
        tx.objectStore('categorias').delete(id),
      ]);
      await tx.done;
      return true;
    },

    listarLimites(): Promise<Limite[]> {
      return db.getAll('limites');
    },

    /** Define o limite da categoria a partir do mês informado (0 = sem limite). */
    async definirLimite(categoriaId: string, valor: Centavos, mes: Mes): Promise<void> {
      const tx = db.transaction('limites', 'readwrite');
      const existentes = await tx.store.index('categoriaId').getAll(categoriaId);
      const doMes = existentes.find((l) => l.vigenteDesde === mes);
      await tx.store.put({ id: doMes?.id ?? novoId(), categoriaId, valor, vigenteDesde: mes });
      await tx.done;
    },

    async listarDespesasDoMes(mes: Mes): Promise<Despesa[]> {
      const faixa = IDBKeyRange.bound(`${mes}-01`, `${mes}-31`);
      return ordenarDespesas(await db.getAllFromIndex('despesas', 'data', faixa));
    },

    obterDespesa(id: string): Promise<Despesa | undefined> {
      return db.get('despesas', id);
    },

    async salvarDespesa(despesa: Despesa): Promise<void> {
      await db.put('despesas', despesa);
    },

    async excluirDespesa(id: string): Promise<void> {
      await db.delete('despesas', id);
    },

    async exportarTudo(): Promise<DadosCompletos> {
      const tx = db.transaction(TODAS);
      const [categorias, limites, despesas] = await Promise.all([
        tx.objectStore('categorias').getAll(),
        tx.objectStore('limites').getAll(),
        tx.objectStore('despesas').getAll(),
      ]);
      await tx.done;
      return { categorias, limites, despesas: ordenarDespesas(despesas) };
    },

    /** Substitui todos os dados numa única transação (tudo ou nada). */
    async substituirTudo(dados: DadosCompletos): Promise<void> {
      const tx = db.transaction(TODAS, 'readwrite');
      const categorias = tx.objectStore('categorias');
      const limites = tx.objectStore('limites');
      const despesas = tx.objectStore('despesas');
      await Promise.all([categorias.clear(), limites.clear(), despesas.clear()]);
      await Promise.all([
        ...dados.categorias.map((c) => categorias.put(c)),
        ...dados.limites.map((l) => limites.put(l)),
        ...dados.despesas.map((d) => despesas.put(d)),
      ]);
      await tx.done;
    },
  };
}

export type Repositorio = ReturnType<typeof criarRepositorio>;
