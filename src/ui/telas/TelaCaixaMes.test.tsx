import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

const normalizar = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

beforeEach(async () => {
  await semear({
    categorias: [
      { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false },
      { id: 'l', nome: 'Lazer', cor: '#e76f51', arquivada: false },
    ],
    despesas: [
      {
        id: 'd1',
        valor: 30000,
        categoriaId: 'm',
        data: '2026-09-03',
        criadaEm: '2026-09-03T12:00:00.000Z',
      },
      {
        id: 'd2',
        valor: 5000,
        categoriaId: 'l',
        data: '2026-09-04',
        criadaEm: '2026-09-04T12:00:00.000Z',
      },
    ],
    entradas: [
      {
        id: 'e1',
        valor: 100000,
        data: '2026-09-01',
        descricao: 'Salário',
        criadaEm: '2026-09-01T08:00:00.000Z',
      },
    ],
  });
});

describe('detalhe do mês no caixa', () => {
  it('mostra entradas, saídas por categoria e totais', async () => {
    window.location.hash = '#/caixa/mes/2026-09';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument();
    const entradas = await screen.findByRole('region', { name: 'Entradas' });
    expect(within(entradas).getByRole('link', { name: /Salário/ })).toHaveAttribute(
      'href',
      '#/entrada/e1',
    );
    const saidas = within(screen.getByRole('region', { name: 'Saídas' })).getAllByRole('listitem');
    expect(saidas.map((i) => normalizar(i.textContent))).toEqual([
      'MercadoR$ 300,00',
      'LazerR$ 50,00',
    ]);
    expect(normalizar(screen.getByLabelText('Totais do mês').textContent)).toBe(
      'EntradasR$ 1.000,00SaídasR$ 350,00SaldoR$ 650,00',
    );
  });

  it('avisa quando o mês não tem entradas', async () => {
    window.location.hash = '#/caixa/mes/2026-08';
    render(<App />);
    expect(await screen.findByText('Nenhuma entrada neste mês.')).toBeInTheDocument();
  });

  it('recusa mês inválido', async () => {
    window.location.hash = '#/caixa/mes/2026-13';
    render(<App />);
    expect(await screen.findByText(/Mês inválido/)).toBeInTheDocument();
  });
});
