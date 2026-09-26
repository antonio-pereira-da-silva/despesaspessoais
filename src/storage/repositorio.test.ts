import { beforeEach, describe, expect, it } from 'vitest';
import type { Categoria, Despesa } from '../domain/tipos';
import { abrirBanco } from './db';
import { criarRepositorio, type Repositorio } from './repositorio';

const mercado: Categoria = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };
const desp = (id: string, data: string, categoriaId = 'm'): Despesa => ({
  id,
  valor: 1000,
  categoriaId,
  data,
  criadaEm: `${data}T10:00:00.000Z`,
});

let repo: Repositorio;

beforeEach(async () => {
  repo = criarRepositorio(await abrirBanco());
});

describe('repositório', () => {
  it('salva e lista categorias', async () => {
    await repo.salvarCategoria(mercado);
    expect(await repo.listarCategorias()).toEqual([mercado]);
  });

  it('lista só as despesas do mês, da mais recente para a mais antiga', async () => {
    await repo.salvarCategoria(mercado);
    for (const d of [
      desp('a', '2026-08-31'),
      desp('b', '2026-09-01'),
      desp('c', '2026-09-30'),
      desp('d', '2026-10-01'),
      desp('e', '2026-12-31'),
    ]) {
      await repo.salvarDespesa(d);
    }
    expect((await repo.listarDespesasDoMes('2026-09')).map((d) => d.id)).toEqual(['c', 'b']);
    expect((await repo.listarDespesasDoMes('2026-12')).map((d) => d.id)).toEqual(['e']);
  });

  it('informa a data da despesa mais antiga', async () => {
    expect(await repo.dataDaPrimeiraDespesa()).toBeNull();
    await repo.salvarDespesa(desp('b', '2026-09-01'));
    await repo.salvarDespesa(desp('a', '2026-07-15'));
    expect(await repo.dataDaPrimeiraDespesa()).toBe('2026-07-15');
  });

  it('obtém, altera e exclui despesa', async () => {
    await repo.salvarDespesa(desp('a', '2026-09-10'));
    await repo.salvarDespesa({ ...desp('a', '2026-09-10'), valor: 2500 });
    expect((await repo.obterDespesa('a'))?.valor).toBe(2500);
    await repo.excluirDespesa('a');
    expect(await repo.obterDespesa('a')).toBeUndefined();
  });

  it('definirLimite substitui no mesmo mês e cria novo registro em outro mês', async () => {
    await repo.definirLimite('m', 80000, '2026-09');
    await repo.definirLimite('m', 90000, '2026-09');
    await repo.definirLimite('m', 100000, '2026-10');
    const limites = await repo.listarLimites();
    expect(limites).toHaveLength(2);
    expect(limites.find((l) => l.vigenteDesde === '2026-09')?.valor).toBe(90000);
    expect(limites.find((l) => l.vigenteDesde === '2026-10')?.valor).toBe(100000);
  });

  it('não exclui categoria com despesas', async () => {
    await repo.salvarCategoria(mercado);
    await repo.salvarDespesa(desp('a', '2026-09-10'));
    expect(await repo.excluirCategoria('m')).toBe(false);
    expect(await repo.listarCategorias()).toHaveLength(1);
  });

  it('exclui categoria sem despesas junto com seus limites', async () => {
    await repo.salvarCategoria(mercado);
    await repo.definirLimite('m', 80000, '2026-09');
    expect(await repo.excluirCategoria('m')).toBe(true);
    expect(await repo.listarCategorias()).toEqual([]);
    expect(await repo.listarLimites()).toEqual([]);
  });

  it('substituirTudo troca todos os dados e exportarTudo devolve o mesmo conteúdo', async () => {
    await repo.salvarCategoria({ ...mercado, id: 'velha', nome: 'Velha' });
    const dados = {
      categorias: [mercado],
      limites: [{ id: 'l1', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-09' }],
      despesas: [desp('b', '2026-09-02'), desp('a', '2026-09-01')],
    };
    await repo.substituirTudo(dados);
    expect(await repo.exportarTudo()).toEqual(dados);
  });
});
