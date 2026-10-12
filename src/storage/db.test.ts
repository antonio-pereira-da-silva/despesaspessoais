import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { abrirBanco, NOME_BANCO } from './db';

describe('banco', () => {
  it('migra da versão 1 sem perder despesas e cria o store de entradas', async () => {
    const antigo = await openDB(NOME_BANCO, 1, {
      upgrade(db) {
        db.createObjectStore('categorias', { keyPath: 'id' });
        db.createObjectStore('limites', { keyPath: 'id' }).createIndex(
          'categoriaId',
          'categoriaId',
        );
        const despesas = db.createObjectStore('despesas', { keyPath: 'id' });
        despesas.createIndex('data', 'data');
        despesas.createIndex('categoriaId', 'categoriaId');
      },
    });
    await antigo.put('despesas', {
      id: 'd',
      valor: 100,
      categoriaId: 'm',
      data: '2026-09-01',
      criadaEm: '2026-09-01T10:00:00.000Z',
    });
    antigo.close();

    const db = await abrirBanco();
    expect(db.version).toBe(2);
    expect(await db.getAll('despesas')).toHaveLength(1);
    expect(await db.getAll('entradas')).toEqual([]);
    db.close();
  });
});
