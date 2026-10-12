import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };
const despesa = {
  id: 'd',
  valor: 30000,
  categoriaId: 'm',
  data: '2026-09-10',
  criadaEm: '2026-09-10T12:00:00.000Z',
};
const entrada = {
  id: 'e',
  valor: 100000,
  data: '2026-09-05',
  descricao: 'Freela',
  criadaEm: '2026-09-05T08:00:00.000Z',
};

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
  await semear({ categorias: [mercado], despesas: [despesa] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('entrada', () => {
  it('lançar entrada atualiza entradas e saldo do mês', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText(/^Entradas/)).toHaveTextContent(
      'Entradas R$ 0,00 · Saldo -R$ 300,00',
      { normalizeWhitespace: true },
    );
    await user.click(screen.getByRole('link', { name: '+ Entrada' }));
    expect(await screen.findByRole('heading', { name: 'Nova entrada' })).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-15');
    await user.type(screen.getByLabelText('Valor'), '5000');
    await user.type(screen.getByLabelText('Descrição (opcional)'), 'Salário');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/^Entradas/)).toHaveTextContent(
      'Entradas R$ 5.000,00 · Saldo R$ 4.700,00',
      { normalizeWhitespace: true },
    );
  });

  it('valida o valor', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/entrada/nova';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um valor');
  });

  it('a partir de um mês passado, a data padrão é o último dia daquele mês', async () => {
    window.location.hash = '#/entrada/nova?mes=2026-02';
    render(<App />);
    expect(await screen.findByLabelText('Data')).toHaveValue('2026-02-28');
  });

  it('edita entrada existente', async () => {
    const user = userEvent.setup();
    await semear({ entradas: [entrada] });
    window.location.hash = '#/entrada/e';
    render(<App />);
    const valor = await screen.findByLabelText('Valor');
    expect(valor).toHaveValue('1000,00');
    await user.clear(valor);
    await user.type(valor, '1500');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/^Entradas/)).toHaveTextContent('Entradas R$ 1.500,00', {
      normalizeWhitespace: true,
    });
  });

  it('exclui entrada existente', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await semear({ entradas: [entrada] });
    window.location.hash = '#/entrada/e';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Excluir entrada' }));
    expect(await screen.findByText(/^Entradas/)).toHaveTextContent('Entradas R$ 0,00', {
      normalizeWhitespace: true,
    });
  });

  it('avisa quando não consegue excluir e permite tentar de novo', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await semear({ entradas: [entrada] });
    const apagar = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(() => {
      throw new Error('armazenamento indisponível');
    });
    window.location.hash = '#/entrada/e';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Excluir entrada' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir');
    expect(screen.getByRole('button', { name: 'Excluir entrada' })).toBeEnabled();
    apagar.mockRestore();
  });

  it('mostra aviso para entrada inexistente', async () => {
    window.location.hash = '#/entrada/nao-existe';
    render(<App />);
    expect(await screen.findByText(/Entrada não encontrada/)).toBeInTheDocument();
  });
});
