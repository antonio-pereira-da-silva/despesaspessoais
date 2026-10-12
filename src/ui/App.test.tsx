import { render, screen } from '@testing-library/react';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { NOME_BANCO } from '../storage/db';
import { App } from './App';

describe('app', () => {
  it('pede para fechar outras abas quando a versão antiga bloqueia a atualização', async () => {
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
    await antigo.put('categorias', { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false });
    render(<App />);
    expect(await screen.findByText(/Feche as outras abas/)).toBeInTheDocument();
    antigo.close();
    expect(await screen.findByRole('link', { name: /Caixa/ })).toBeInTheDocument();
  });
});
