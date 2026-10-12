import { mesDe, proximoMes } from './mes';
import type { Categoria, Centavos, Despesa, Entrada, Mes } from './tipos';

export interface Totais {
  entradas: Centavos;
  saidas: Centavos;
  saldo: Centavos;
}

export interface LinhaMes extends Totais {
  mes: Mes;
  /** Saldo somado desde o primeiro mês do intervalo. */
  acumulado: Centavos;
}

export interface ResumoCaixa {
  meses: LinhaMes[];
  totais: Totais;
}

export interface LinhaExtrato {
  tipo: 'entrada' | 'saida';
  id: string;
  data: string;
  descricao: string;
  valor: Centavos;
  /** Saldo corrente desde o início do período. */
  saldo: Centavos;
}

export interface Extrato {
  linhas: LinhaExtrato[];
  totais: Totais;
}

export interface SaidaPorCategoria {
  categoriaId: string;
  nome: string;
  cor: string;
  total: Centavos;
}

export interface DetalheMes {
  entradas: Entrada[];
  saidasPorCategoria: SaidaPorCategoria[];
  totais: Totais;
}

const COR_SEM_CATEGORIA = '#9aa6a0';

const totais = (entradas: Centavos, saidas: Centavos): Totais => ({
  entradas,
  saidas,
  saldo: entradas - saidas,
});

const somar = (itens: { valor: Centavos }[]) => itens.reduce((soma, i) => soma + i.valor, 0);

function emOrdem<T extends string>(a: T, b: T): [T, T] {
  return a <= b ? [a, b] : [b, a];
}

/** Meses de `de` a `ate`, inclusive; extremos invertidos são trocados. */
export function mesesDoIntervalo(de: Mes, ate: Mes): Mes[] {
  const [inicio, fim] = emOrdem(de, ate);
  const meses: Mes[] = [];
  for (let mes = inicio; mes <= fim; mes = proximoMes(mes)) meses.push(mes);
  return meses;
}

export function resumoPorMes(
  entradas: Entrada[],
  despesas: Despesa[],
  de: Mes,
  ate: Mes,
): ResumoCaixa {
  const porMes = new Map(mesesDoIntervalo(de, ate).map((mes) => [mes, { e: 0, s: 0 }]));
  for (const entrada of entradas) {
    const soma = porMes.get(mesDe(entrada.data));
    if (soma) soma.e += entrada.valor;
  }
  for (const despesa of despesas) {
    const soma = porMes.get(mesDe(despesa.data));
    if (soma) soma.s += despesa.valor;
  }
  let acumulado = 0;
  const meses: LinhaMes[] = [];
  for (const [mes, { e, s }] of porMes) {
    acumulado += e - s;
    meses.push({ mes, ...totais(e, s), acumulado });
  }
  return {
    meses,
    totais: totais(
      meses.reduce((soma, l) => soma + l.entradas, 0),
      meses.reduce((soma, l) => soma + l.saidas, 0),
    ),
  };
}

export function extratoDoPeriodo(
  entradas: Entrada[],
  despesas: Despesa[],
  categorias: Categoria[],
  inicio: string,
  fim: string,
): Extrato {
  const [de, ate] = emOrdem(inicio, fim);
  const noPeriodo = (data: string) => data >= de && data <= ate;
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const lancamentos = [
    ...entradas
      .filter((e) => noPeriodo(e.data))
      .map((e) => ({
        tipo: 'entrada' as const,
        id: e.id,
        data: e.data,
        criadaEm: e.criadaEm,
        descricao: e.descricao || 'Entrada',
        valor: e.valor,
      })),
    ...despesas
      .filter((d) => noPeriodo(d.data))
      .map((d) => ({
        tipo: 'saida' as const,
        id: d.id,
        data: d.data,
        criadaEm: d.criadaEm,
        descricao: d.descricao || nomes.get(d.categoriaId) || 'Despesa',
        valor: d.valor,
      })),
  ].sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm.localeCompare(b.criadaEm));

  let saldo = 0;
  const linhas = lancamentos.map((l): LinhaExtrato => {
    saldo += l.tipo === 'entrada' ? l.valor : -l.valor;
    return { tipo: l.tipo, id: l.id, data: l.data, descricao: l.descricao, valor: l.valor, saldo };
  });
  const somaDo = (tipo: LinhaExtrato['tipo']) => somar(linhas.filter((l) => l.tipo === tipo));
  return { linhas, totais: totais(somaDo('entrada'), somaDo('saida')) };
}

export function resumoDetalheMes(
  entradas: Entrada[],
  despesas: Despesa[],
  categorias: Categoria[],
  mes: Mes,
): DetalheMes {
  const doMes = entradas
    .filter((e) => mesDe(e.data) === mes)
    .sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm.localeCompare(b.criadaEm));
  const porCategoria = new Map<string, Centavos>();
  for (const despesa of despesas) {
    if (mesDe(despesa.data) !== mes) continue;
    porCategoria.set(
      despesa.categoriaId,
      (porCategoria.get(despesa.categoriaId) ?? 0) + despesa.valor,
    );
  }
  const saidasPorCategoria = [...porCategoria]
    .map(([categoriaId, total]): SaidaPorCategoria => {
      const categoria = categorias.find((c) => c.id === categoriaId);
      return {
        categoriaId,
        nome: categoria?.nome ?? 'Sem categoria',
        cor: categoria?.cor ?? COR_SEM_CATEGORIA,
        total,
      };
    })
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    entradas: doMes,
    saidasPorCategoria,
    totais: totais(
      somar(doMes),
      saidasPorCategoria.reduce((soma, s) => soma + s.total, 0),
    ),
  };
}
