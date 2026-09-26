import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
  await semear({
    categorias: [
      { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false },
      { id: 't', nome: 'Transporte', cor: '#e76f51', arquivada: false },
    ],
    limites: [{ id: 'l', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-01' }],
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('despesa', () => {
  it('lançar despesa atualiza o restante da categoria', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'Nova despesa' }));
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-15');
    await user.type(screen.getByLabelText('Valor'), '120,50');
    await user.click(screen.getByRole('button', { name: 'Mercado' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Sobram R\$\s679,50/)).toBeInTheDocument();
  });

  it('valida valor e categoria', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/despesa/nova';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um valor');
    await user.type(screen.getByLabelText('Valor'), '-3');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um valor');
    await user.clear(screen.getByLabelText('Valor'));
    await user.type(screen.getByLabelText('Valor'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha uma categoria');
  });

  it('a partir de um mês passado, a data padrão é o último dia daquele mês', async () => {
    window.location.hash = '#/despesa/nova?mes=2026-02';
    render(<App />);
    expect(await screen.findByLabelText('Data')).toHaveValue('2026-02-28');
  });

  it('pré-seleciona a categoria vinda do detalhe', async () => {
    window.location.hash = '#/despesa/nova?categoria=t';
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Transporte' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('edita e exclui despesa existente', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await semear({
      categorias: [{ id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false }],
      limites: [{ id: 'l', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-01' }],
      despesas: [
        {
          id: 'd',
          valor: 5000,
          categoriaId: 'm',
          data: '2026-09-10',
          descricao: 'Feira',
          criadaEm: '2026-09-10T12:00:00.000Z',
        },
      ],
    });
    window.location.hash = '#/categoria/m?mes=2026-09';
    render(<App />);
    await user.click(await screen.findByText('Feira'));
    const valor = await screen.findByLabelText('Valor');
    expect(valor).toHaveValue('50,00');
    await user.clear(valor);
    await user.type(valor, '70');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('R$ 70,00', { normalizer: normalizar })).toBeInTheDocument();
    await user.click(screen.getByText('Feira'));
    await user.click(await screen.findByRole('button', { name: 'Excluir despesa' }));
    expect(await screen.findByText(/Nenhuma despesa nesta categoria/)).toBeInTheDocument();
  });

  it('mostra aviso para despesa inexistente', async () => {
    window.location.hash = '#/despesa/nao-existe';
    render(<App />);
    expect(await screen.findByText(/Despesa não encontrada/)).toBeInTheDocument();
  });
});
