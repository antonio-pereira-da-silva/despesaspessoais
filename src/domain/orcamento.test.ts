import { describe, expect, it } from 'vitest';
import { limiteVigente, resumoDoMes, statusAlerta } from './orcamento';
import type { Categoria, Despesa, Limite } from './tipos';

const cat = (id: string, nome: string, arquivada = false): Categoria => ({
  id,
  nome,
  cor: '#000',
  arquivada,
});
const lim = (categoriaId: string, valor: number, vigenteDesde: string): Limite => ({
  id: `${categoriaId}-${vigenteDesde}`,
  categoriaId,
  valor,
  vigenteDesde,
});
const desp = (categoriaId: string, valor: number, data: string): Despesa => ({
  id: `${categoriaId}-${data}-${valor}`,
  categoriaId,
  valor,
  data,
  criadaEm: `${data}T12:00:00.000Z`,
});

describe('limiteVigente', () => {
  const limites = [
    lim('m', 80000, '2026-01'),
    lim('m', 100000, '2026-10'),
    lim('t', 30000, '2026-09'),
  ];

  it('usa o registro mais recente até o mês', () => {
    expect(limiteVigente(limites, 'm', '2026-09')).toBe(80000);
    expect(limiteVigente(limites, 'm', '2026-10')).toBe(100000);
    expect(limiteVigente(limites, 'm', '2027-03')).toBe(100000);
  });

  it('retorna null antes do primeiro limite ou sem limites', () => {
    expect(limiteVigente(limites, 't', '2026-08')).toBeNull();
    expect(limiteVigente(limites, 'x', '2026-09')).toBeNull();
  });
});

describe('statusAlerta', () => {
  it.each([
    [0, 10000, 'ok'],
    [7999, 10000, 'ok'],
    [8000, 10000, 'atencao'],
    [10000, 10000, 'atencao'],
    [10001, 10000, 'estourado'],
    [500, null, 'sem-limite'],
    [500, 0, 'sem-limite'],
  ] as const)('gasto %i com limite %s → %s', (gasto, limite, esperado) => {
    expect(statusAlerta(gasto, limite)).toBe(esperado);
  });
});

describe('resumoDoMes', () => {
  const categorias = [
    cat('t', 'Transporte'),
    cat('m', 'Mercado'),
    cat('v', 'Viagem', true),
    cat('a', 'Antiga', true),
  ];
  const limites = [lim('m', 80000, '2026-01'), lim('t', 30000, '2026-01')];
  const despesas = [
    desp('m', 12050, '2026-09-01'),
    desp('m', 50000, '2026-09-30'),
    desp('t', 35000, '2026-09-15'),
    desp('v', 20000, '2026-09-10'),
    desp('m', 99999, '2026-08-31'),
  ];

  it('soma o gasto do mês por categoria e ordena por nome', () => {
    const resumo = resumoDoMes(categorias, limites, despesas, '2026-09');
    expect(resumo.categorias.map((r) => r.categoria.nome)).toEqual([
      'Mercado',
      'Transporte',
      'Viagem',
    ]);
    const [mercado, transporte, viagem] = resumo.categorias;
    expect(mercado).toMatchObject({ gasto: 62050, limite: 80000, restante: 17950, status: 'ok' });
    expect(transporte).toMatchObject({ gasto: 35000, restante: -5000, status: 'estourado' });
    expect(viagem).toMatchObject({
      gasto: 20000,
      limite: null,
      restante: null,
      status: 'sem-limite',
    });
    expect(resumo.totalGasto).toBe(117050);
    expect(resumo.totalLimites).toBe(110000);
  });

  it('esconde categoria arquivada sem despesas no mês', () => {
    const resumo = resumoDoMes(categorias, limites, despesas, '2026-09');
    expect(resumo.categorias.some((r) => r.categoria.id === 'a')).toBe(false);
  });

  it('mostra categoria ativa sem despesas com gasto zero', () => {
    const resumo = resumoDoMes(categorias, limites, [], '2026-09');
    expect(resumo.categorias.map((r) => r.categoria.id)).toEqual(['m', 't']);
    expect(resumo.categorias[0]).toMatchObject({ gasto: 0, restante: 80000, percentual: 0 });
  });
});
