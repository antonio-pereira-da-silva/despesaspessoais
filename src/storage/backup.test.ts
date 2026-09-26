import { describe, expect, it } from 'vitest';
import { ErroBackup, lerBackup, montarBackup } from './backup';
import type { DadosCompletos } from './repositorio';

const dados: DadosCompletos = {
  categorias: [{ id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false }],
  limites: [{ id: 'l1', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-09' }],
  despesas: [
    {
      id: 'd1',
      valor: 1250,
      categoriaId: 'm',
      data: '2026-09-10',
      criadaEm: '2026-09-10T12:00:00.000Z',
    },
    {
      id: 'd2',
      valor: 300,
      categoriaId: 'm',
      data: '2026-09-11',
      descricao: 'Pão',
      criadaEm: '2026-09-11T12:00:00.000Z',
    },
  ],
};

const texto = (json: unknown) => JSON.stringify(json);

describe('backup', () => {
  it('ida e volta preserva os dados', () => {
    const backup = montarBackup(dados, new Date('2026-09-26T10:00:00Z'));
    expect(backup).toMatchObject({ versao: 1, exportadoEm: '2026-09-26T10:00:00.000Z' });
    expect(lerBackup(texto(backup))).toEqual(backup);
  });

  it.each([
    ['JSON ilegível', '{isso não é json'],
    ['lista em vez de objeto', texto([])],
    ['versão desconhecida', texto({ ...montarBackup(dados), versao: 2 })],
    ['campo ausente', texto({ versao: 1, categorias: [], limites: [] })],
    [
      'despesa de categoria inexistente',
      texto(montarBackup({ ...dados, despesas: [{ ...dados.despesas[0], categoriaId: 'x' }] })),
    ],
    [
      'valor com centavos quebrados',
      texto(montarBackup({ ...dados, despesas: [{ ...dados.despesas[0], valor: 12.5 }] })),
    ],
    [
      'data inválida',
      texto(montarBackup({ ...dados, despesas: [{ ...dados.despesas[0], data: '10/09/2026' }] })),
    ],
    [
      'limite com mês inválido',
      texto(
        montarBackup({ ...dados, limites: [{ ...dados.limites[0], vigenteDesde: '2026-13' }] }),
      ),
    ],
  ])('recusa %s', (_caso, conteudo) => {
    expect(() => lerBackup(conteudo)).toThrow(ErroBackup);
  });
});
