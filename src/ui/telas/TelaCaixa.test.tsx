import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
  await semear({
    categorias: [{ id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false }],
    despesas: [
      {
        id: 'd1',
        valor: 120000,
        categoriaId: 'm',
        data: '2026-07-10',
        criadaEm: '2026-07-10T12:00:00.000Z',
      },
      {
        id: 'd2',
        valor: 30000,
        categoriaId: 'm',
        data: '2026-09-03',
        descricao: 'Feira',
        criadaEm: '2026-09-03T12:00:00.000Z',
      },
    ],
    entradas: [
      {
        id: 'e1',
        valor: 500000,
        data: '2026-07-05',
        descricao: 'Salário',
        criadaEm: '2026-07-05T08:00:00.000Z',
      },
      { id: 'e2', valor: 100000, data: '2026-09-01', criadaEm: '2026-09-01T08:00:00.000Z' },
    ],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

const normalizar = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

describe('caixa', () => {
  it('por mês: últimos 6 meses com saldo acumulado e total', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: /Caixa/ }));
    const tabela = await screen.findByRole('table');
    const linhas = within(tabela).getAllByRole('row');
    // cabeçalho + abr..set (6) + total
    expect(linhas).toHaveLength(8);
    expect(normalizar(linhas[4].textContent)).toBe(
      'jul/26R$ 5.000,00R$ 1.200,00R$ 3.800,00R$ 3.800,00',
    );
    expect(normalizar(linhas[6].textContent)).toBe(
      'set/26R$ 1.000,00R$ 300,00R$ 700,00R$ 4.500,00',
    );
    expect(normalizar(linhas[7].textContent)).toBe('TotalR$ 6.000,00R$ 1.500,00R$ 4.500,00');
  });

  it('por mês: intervalo vem da URL e aceita invertido', async () => {
    window.location.hash = '#/caixa?modo=mes&de=2026-09&ate=2026-08';
    render(<App />);
    const linhas = within(await screen.findByRole('table')).getAllByRole('row');
    expect(linhas).toHaveLength(4);
    expect(within(linhas[1]).getByRole('link', { name: 'ago/26' })).toHaveAttribute(
      'href',
      '#/caixa/mes/2026-08',
    );
  });

  it('por mês: intervalo longo demais mostra só os 120 meses mais recentes, com aviso', async () => {
    window.location.hash = '#/caixa?modo=mes&de=0001-01&ate=2026-09';
    render(<App />);
    const linhas = within(await screen.findByRole('table')).getAllByRole('row');
    expect(linhas).toHaveLength(122);
    expect(screen.getByText(/últimos 120 meses/)).toBeInTheDocument();
  });

  it('por período: extrato com saldo corrente e totais', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/caixa';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Por período' }));
    const itens = await screen.findAllByRole('listitem');
    expect(itens.map((i) => normalizar(i.textContent))).toEqual([
      '01/09Entrada+ R$ 1.000,00Saldo R$ 1.000,00',
      '03/09Feira− R$ 300,00Saldo R$ 700,00',
    ]);
    expect(normalizar(screen.getByRole('region', { name: 'Totais do período' }).textContent)).toBe(
      'EntradasR$ 1.000,00SaídasR$ 300,00SaldoR$ 700,00',
    );
    expect(within(itens[1]).getByRole('link')).toHaveAttribute('href', '#/despesa/d2');
  });

  it('por período: muda as datas e ignora campo apagado', async () => {
    window.location.hash = '#/caixa?modo=periodo';
    render(<App />);
    fireEvent.change(await screen.findByLabelText('De'), { target: { value: '2026-07-01' } });
    expect(await screen.findByText('05/07')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('por período: avisa quando não há lançamentos', async () => {
    window.location.hash = '#/caixa?modo=periodo&inicio=2026-01-01&fim=2026-01-31';
    render(<App />);
    expect(await screen.findByText('Nenhum lançamento neste período.')).toBeInTheDocument();
  });
});
