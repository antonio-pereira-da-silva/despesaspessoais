import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
  window.location.hash = '#/categorias';
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };

describe('categorias', () => {
  it('cria categoria com limite e mostra na lista', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'Nova categoria' }));
    await user.type(screen.getByLabelText('Nome'), 'Farmácia');
    await user.type(screen.getByLabelText('Limite mensal'), '150');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Farmácia')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s150,00\/mês/)).toBeInTheDocument();
  });

  it('cria categoria sugerida com um toque', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: '+ Mercado' }));
    expect(await screen.findByRole('link', { name: /Mercado/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Mercado' })).not.toBeInTheDocument();
  });

  it('recusa nome repetido e limite inválido', async () => {
    const user = userEvent.setup();
    await semear({ categorias: [mercado] });
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'Nova categoria' }));
    await user.type(screen.getByLabelText('Nome'), ' mercado ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria');
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Pets');
    await user.type(screen.getByLabelText('Limite mensal'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Limite inválido');
  });

  it('alterar o limite não muda meses anteriores', async () => {
    const user = userEvent.setup();
    await semear({
      categorias: [mercado],
      limites: [{ id: 'l', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-01' }],
    });
    render(<App />);
    await user.click(await screen.findByRole('link', { name: /Mercado/ }));
    const campo = screen.getByLabelText('Limite mensal');
    expect(campo).toHaveValue('800,00');
    await user.clear(campo);
    await user.type(campo, '1000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/R\$\s1\.000,00\/mês/)).toBeInTheDocument();
    window.location.hash = '#/?mes=2026-08';
    expect(await screen.findByRole('heading', { name: 'agosto de 2026' })).toBeInTheDocument();
    expect(await screen.findByText(/^Gasto/)).toHaveTextContent('de R$ 800,00');
  });

  it('bloqueia excluir categoria com despesas e permite arquivar', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await semear({
      categorias: [mercado],
      despesas: [
        {
          id: 'd',
          valor: 100,
          categoriaId: 'm',
          data: '2026-09-01',
          criadaEm: '2026-09-01T00:00:00Z',
        },
      ],
    });
    render(<App />);
    await user.click(await screen.findByRole('link', { name: /Mercado/ }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tem despesas');
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));
    expect(await screen.findByRole('heading', { name: 'Arquivadas' })).toBeInTheDocument();
  });
});
