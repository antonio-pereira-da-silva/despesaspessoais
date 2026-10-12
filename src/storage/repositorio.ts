import { novoId } from '../domain/id';
import type { Categoria, Centavos, Despesa, Entrada, Limite, Mes } from '../domain/tipos';
import type { BancoDespesas } from './db';

export interface DadosCompletos {
  categorias: Categoria[];
  limites: Limite[];
  despesas: Despesa[];
  entradas: Entrada[];
}

const TODAS = ['categorias', 'limites', 'despesas', 'entradas'] as const;

/** Da mais recente para a mais antiga. */
function ordenarPorData<T extends { data: string; criadaEm: string }>(itens: T[]): T[] {
  return itens.sort((a, b) => b.data.localeCompare(a.data) || b.criadaEm.localeCompare(a.criadaEm));
}

/** Faixa inclusiva de datas; extremos invertidos são trocados. */
function faixa(inicio: string, fim: string): IDBKeyRange {
  return inicio <= fim ? IDBKeyRange.bound(inicio, fim) : IDBKeyRange.bound(fim, inicio);
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
      return ordenarPorData(
        await db.getAllFromIndex('despesas', 'data', faixa(`${mes}-01`, `${mes}-31`)),
      );
    },

    async listarDespesasDoPeriodo(inicio: string, fim: string): Promise<Despesa[]> {
      return ordenarPorData(await db.getAllFromIndex('despesas', 'data', faixa(inicio, fim)));
    },

    async listarEntradasDoPeriodo(inicio: string, fim: string): Promise<Entrada[]> {
      return ordenarPorData(await db.getAllFromIndex('entradas', 'data', faixa(inicio, fim)));
    },

    obterEntrada(id: string): Promise<Entrada | undefined> {
      return db.get('entradas', id);
    },

    async salvarEntrada(entrada: Entrada): Promise<void> {
      await db.put('entradas', entrada);
    },

    async excluirEntrada(id: string): Promise<void> {
      await db.delete('entradas', id);
    },

    async dataDaPrimeiraDespesa(): Promise<string | null> {
      const cursor = await db.transaction('despesas').store.index('data').openCursor();
      return cursor?.value.data ?? null;
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
      const [categorias, limites, despesas, entradas] = await Promise.all([
        tx.objectStore('categorias').getAll(),
        tx.objectStore('limites').getAll(),
        tx.objectStore('despesas').getAll(),
        tx.objectStore('entradas').getAll(),
      ]);
      await tx.done;
      return {
        categorias,
        limites,
        despesas: ordenarPorData(despesas),
        entradas: ordenarPorData(entradas),
      };
    },

    /** Substitui todos os dados numa única transação (tudo ou nada). */
    async substituirTudo(dados: DadosCompletos): Promise<void> {
      const tx = db.transaction(TODAS, 'readwrite');
      const categorias = tx.objectStore('categorias');
      const limites = tx.objectStore('limites');
      const despesas = tx.objectStore('despesas');
      const entradas = tx.objectStore('entradas');
      await Promise.all([categorias.clear(), limites.clear(), despesas.clear(), entradas.clear()]);
      await Promise.all([
        ...dados.categorias.map((c) => categorias.put(c)),
        ...dados.limites.map((l) => limites.put(l)),
        ...dados.despesas.map((d) => despesas.put(d)),
        ...dados.entradas.map((e) => entradas.put(e)),
      ]);
      await tx.done;
    },
  };
}

export type Repositorio = ReturnType<typeof criarRepositorio>;
