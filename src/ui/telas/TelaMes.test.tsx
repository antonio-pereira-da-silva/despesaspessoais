import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };
const despesa = (id: string, valor: number, data: string) => ({
  id,
  valor,
  categoriaId: 'm',
  data,
  criadaEm: `${data}T12:00:00.000Z`,
});

describe('tela do mês', () => {
  it('convida a criar categorias quando não há nenhuma', async () => {
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Crie suas categorias' })).toBeInTheDocument();
  });

  it('mostra gasto, restante e alerta de atenção', async () => {
    await semear({
      categorias: [mercado],
      limites: [{ id: 'l', categoriaId: 'm', valor: 10000, vigenteDesde: '2026-01' }],
      despesas: [despesa('a', 8500, '2026-09-10')],
    });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument();
    expect(await screen.findByText(/Sobram R\$\s15,00/)).toBeInTheDocument();
    expect(screen.getByText('Mercado').closest('[data-status]')).toHaveAttribute(
      'data-status',
      'atencao',
    );
    expect(screen.getByText(/^Gasto/)).toHaveTextContent('Gasto R$ 85,00 de R$ 100,00');
  });

  it('mostra estouro em vermelho', async () => {
    await semear({
      categorias: [mercado],
      limites: [{ id: 'l', categoriaId: 'm', valor: 10000, vigenteDesde: '2026-01' }],
      despesas: [despesa('a', 12000, '2026-09-10')],
    });
    render(<App />);
    expect(await screen.findByText(/Estourou R\$\s20,00/)).toBeInTheDocument();
    expect(screen.getByText('Mercado').closest('[data-status]')).toHaveAttribute(
      'data-status',
      'estourado',
    );
  });

  it('não lembra de backup quando as despesas são recentes', async () => {
    await semear({ categorias: [mercado], despesas: [despesa('a', 1000, '2026-09-10')] });
    render(<App />);
    expect(await screen.findByText(/^Gasto/)).toBeInTheDocument();
    expect(screen.queryByText(/não salva um backup/)).not.toBeInTheDocument();
  });

  it('lembra de backup quando há despesas antigas sem backup', async () => {
    await semear({
      categorias: [mercado],
      despesas: [despesa('a', 1000, '2026-07-01'), despesa('b', 1000, '2026-09-10')],
    });
    render(<App />);
    expect(await screen.findByText(/não salva um backup/)).toBeInTheDocument();
  });

  it('navega para o mês anterior e abre o detalhe da categoria', async () => {
    const user = userEvent.setup();
    await semear({
      categorias: [mercado],
      despesas: [despesa('a', 4000, '2026-08-31'), despesa('b', 999, '2026-09-01')],
    });
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByRole('heading', { name: 'agosto de 2026' })).toBeInTheDocument();
    expect(await screen.findByText(/^Gasto/)).toHaveTextContent('Gasto R$ 40,00');
    await user.click(screen.getByText('Mercado'));
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeInTheDocument();
    expect(screen.getByText('31/08')).toBeInTheDocument();
    expect(screen.queryByText('01/09')).not.toBeInTheDocument();
  });
});
