import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Categoria, Despesa, Entrada, Limite } from '../domain/tipos';

interface EsquemaDespesas extends DBSchema {
  categorias: { key: string; value: Categoria };
  limites: { key: string; value: Limite; indexes: { categoriaId: string } };
  despesas: { key: string; value: Despesa; indexes: { data: string; categoriaId: string } };
  entradas: { key: string; value: Entrada; indexes: { data: string } };
}

export type BancoDespesas = IDBPDatabase<EsquemaDespesas>;

export const NOME_BANCO = 'despesas-pessoais';

export function abrirBanco(): Promise<BancoDespesas> {
  return openDB<EsquemaDespesas>(NOME_BANCO, 2, {
    upgrade(db, versaoAntiga) {
      if (versaoAntiga < 1) {
        db.createObjectStore('categorias', { keyPath: 'id' });
        const limites = db.createObjectStore('limites', { keyPath: 'id' });
        limites.createIndex('categoriaId', 'categoriaId');
        const despesas = db.createObjectStore('despesas', { keyPath: 'id' });
        despesas.createIndex('data', 'data');
        despesas.createIndex('categoriaId', 'categoriaId');
      }
      if (versaoAntiga < 2) {
        const entradas = db.createObjectStore('entradas', { keyPath: 'id' });
        entradas.createIndex('data', 'data');
      }
    },
    blocking() {
      // Outra aba precisa atualizar o banco: recarrega esta para usar a versão nova.
      location.reload();
    },
  });
}
