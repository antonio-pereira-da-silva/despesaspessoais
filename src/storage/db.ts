import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Categoria, Despesa, Limite } from '../domain/tipos';

interface EsquemaDespesas extends DBSchema {
  categorias: { key: string; value: Categoria };
  limites: { key: string; value: Limite; indexes: { categoriaId: string } };
  despesas: { key: string; value: Despesa; indexes: { data: string; categoriaId: string } };
}

export type BancoDespesas = IDBPDatabase<EsquemaDespesas>;

export const NOME_BANCO = 'despesas-pessoais';

export function abrirBanco(): Promise<BancoDespesas> {
  return openDB<EsquemaDespesas>(NOME_BANCO, 1, {
    upgrade(db) {
      db.createObjectStore('categorias', { keyPath: 'id' });
      const limites = db.createObjectStore('limites', { keyPath: 'id' });
      limites.createIndex('categoriaId', 'categoriaId');
      const despesas = db.createObjectStore('despesas', { keyPath: 'id' });
      despesas.createIndex('data', 'data');
      despesas.createIndex('categoriaId', 'categoriaId');
    },
  });
}
