import { describe, expect, it } from 'vitest';
import { extratoDoPeriodo, mesesDoIntervalo, resumoDetalheMes, resumoPorMes } from './caixa';
import type { Categoria, Despesa, Entrada } from './tipos';

const mercado: Categoria = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };
const lazer: Categoria = { id: 'l', nome: 'Lazer', cor: '#e76f51', arquivada: true };

const ent = (id: string, valor: number, data: string, descricao?: string): Entrada => ({
  id,
  valor,
  data,
  descricao,
  criadaEm: `${data}T08:00:00.000Z`,
});
const desp = (
  id: string,
  valor: number,
  data: string,
  categoriaId = 'm',
  descricao?: string,
  hora = '10',
): Despesa => ({ id, valor, data, categoriaId, descricao, criadaEm: `${data}T${hora}:00:00.000Z` });

describe('mesesDoIntervalo', () => {
  it('lista os meses de ponta a ponta, atravessando o ano', () => {
    expect(mesesDoIntervalo('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('troca os extremos quando invertidos', () => {
    expect(mesesDoIntervalo('2026-03', '2026-01')).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});

describe('resumoPorMes', () => {
  it('soma por mês, inclui meses vazios e acumula o saldo', () => {
    const r = resumoPorMes(
      [
        ent('e1', 500000, '2026-07-05'),
        ent('e2', 100000, '2026-09-20'),
        ent('fora', 1, '2026-10-01'),
      ],
      [
        desp('d1', 120000, '2026-07-10'),
        desp('d2', 30000, '2026-08-31'),
        desp('fora', 1, '2026-06-30'),
      ],
      '2026-07',
      '2026-09',
    );
    expect(r.meses).toEqual([
      { mes: '2026-07', entradas: 500000, saidas: 120000, saldo: 380000, acumulado: 380000 },
      { mes: '2026-08', entradas: 0, saidas: 30000, saldo: -30000, acumulado: 350000 },
      { mes: '2026-09', entradas: 100000, saidas: 0, saldo: 100000, acumulado: 450000 },
    ]);
    expect(r.totais).toEqual({ entradas: 600000, saidas: 150000, saldo: 450000 });
  });
});

describe('extratoDoPeriodo', () => {
  it('ordena por data e hora de criação, com saldo corrente e totais', () => {
    const x = extratoDoPeriodo(
      [ent('e1', 10000, '2026-09-02', 'Salário')],
      [
        desp('d2', 3000, '2026-09-02', 'm', undefined, '12'),
        desp('d1', 2000, '2026-09-01', 'm', 'Feira'),
      ],
      [mercado],
      '2026-09-01',
      '2026-09-30',
    );
    expect(x.linhas).toEqual([
      {
        tipo: 'saida',
        id: 'd1',
        data: '2026-09-01',
        descricao: 'Feira',
        valor: 2000,
        saldo: -2000,
      },
      {
        tipo: 'entrada',
        id: 'e1',
        data: '2026-09-02',
        descricao: 'Salário',
        valor: 10000,
        saldo: 8000,
      },
      {
        tipo: 'saida',
        id: 'd2',
        data: '2026-09-02',
        descricao: 'Mercado',
        valor: 3000,
        saldo: 5000,
      },
    ]);
    expect(x.totais).toEqual({ entradas: 10000, saidas: 5000, saldo: 5000 });
  });

  it('inclui os dias das pontas e ignora o resto', () => {
    const x = extratoDoPeriodo(
      [
        ent('a', 1, '2026-08-31'),
        ent('b', 1, '2026-09-01'),
        ent('c', 1, '2026-09-10'),
        ent('d', 1, '2026-09-11'),
      ],
      [],
      [],
      '2026-09-01',
      '2026-09-10',
    );
    expect(x.linhas.map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('aceita período invertido', () => {
    const x = extratoDoPeriodo([ent('b', 1, '2026-09-05')], [], [], '2026-09-10', '2026-09-01');
    expect(x.linhas.map((l) => l.id)).toEqual(['b']);
  });

  it('usa textos padrão quando falta descrição ou categoria', () => {
    const x = extratoDoPeriodo(
      [ent('e', 1, '2026-09-01')],
      [desp('d', 1, '2026-09-02', 'sumiu')],
      [],
      '2026-09-01',
      '2026-09-30',
    );
    expect(x.linhas.map((l) => l.descricao)).toEqual(['Entrada', 'Despesa']);
  });
});

describe('resumoDetalheMes', () => {
  it('lista entradas do mês e agrupa saídas por categoria, maior total primeiro', () => {
    const r = resumoDetalheMes(
      [ent('e2', 200, '2026-09-20'), ent('e1', 100, '2026-09-01'), ent('fora', 1, '2026-08-01')],
      [
        desp('d1', 1000, '2026-09-03', 'm'),
        desp('d2', 500, '2026-09-04', 'm'),
        desp('d3', 3000, '2026-09-05', 'l'),
        desp('d4', 70, '2026-09-06', 'sumiu'),
        desp('fora', 9, '2026-10-01', 'm'),
      ],
      [mercado, lazer],
      '2026-09',
    );
    expect(r.entradas.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(r.saidasPorCategoria).toEqual([
      { categoriaId: 'l', nome: 'Lazer', cor: '#e76f51', total: 3000 },
      { categoriaId: 'm', nome: 'Mercado', cor: '#2a9d8f', total: 1500 },
      { categoriaId: 'sumiu', nome: 'Sem categoria', cor: '#9aa6a0', total: 70 },
    ]);
    expect(r.totais).toEqual({ entradas: 300, saidas: 4570, saldo: -4270 });
  });
});
