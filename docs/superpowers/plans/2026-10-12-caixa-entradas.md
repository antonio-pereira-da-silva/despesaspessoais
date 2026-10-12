# Entradas e Relatório de Caixa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lançar entradas de dinheiro e ver um relatório de caixa (entradas, saídas, saldo) por mês e por período livre, com totais.

**Architecture:** Novo tipo `Entrada` guardado num store `entradas` (IndexedDB versão 2) e incluído no backup (versão 2, aceitando a 1). Cálculos de caixa em funções puras em `src/domain/caixa.ts`. Telas novas `TelaEntrada`, `TelaCaixa` (abas "Por mês"/"Por período") e `TelaCaixaMes`, mais uma linha de entradas/saldo na `TelaMes`.

**Tech Stack:** React 19 + TypeScript, react-router v8 (`HashRouter`), `idb`, Vitest + Testing Library + fake-indexeddb, oxlint + Prettier.

**Spec:** `docs/superpowers/specs/2026-10-12-caixa-entradas-design.md`

## Global Constraints

- Valores sempre em centavos inteiros (`Centavos`); formatação só com `formatarBRL`.
- Datas `"AAAA-MM-DD"`, meses `"AAAA-MM"`; comparações por string.
- Interface e textos em pt-BR; nomes de código em português, como o resto do projeto.
- `domain/` não importa nada de `storage/` nem `ui/`.
- Mobile-first: sem rolagem horizontal da página (tabela larga rola dentro do próprio contêiner).
- Comandos: `npm test`, `npm run lint`, `npm run build` — os três precisam passar no fim.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Banco existente com dados (versão 1)** — ao abrir a versão nova, despesas, categorias e limites continuam lá e o store `entradas` passa a existir (teste de migração na Task 2).
2. **Intervalo invertido** (data/mês inicial depois do final, via URL ou seletor) — não pode quebrar o `IDBKeyRange` nem a tela; os extremos são trocados (Tasks 1 e 2).
3. **Campo de data/mês apagado no seletor** (valor `''`) — ignorado; o relatório continua com o último valor válido (Task 5).
4. **Backup antigo (versão 1)** — importa sem erro, com `entradas = []` (Task 3).
5. **Despesa de categoria que não existe mais na lista** (ex.: dados importados inconsistentes) — extrato e detalhe mostram "Despesa"/"Sem categoria" em vez de quebrar (Task 1).

---

### Task 1: Domínio — tipo `Entrada` e cálculos de caixa

**Files:**
- Modify: `src/domain/tipos.ts`
- Modify: `src/domain/mes.ts`, `src/domain/mes.test.ts`
- Create: `src/domain/caixa.ts`, `src/domain/caixa.test.ts`

**Interfaces:**
- Produces:
  - `interface Entrada { id: string; valor: Centavos; data: string; descricao?: string; criadaEm: string }` em `tipos.ts`
  - `nomeCurtoDoMes(mes: Mes): string` → `"set/26"`; `formatarDataCurta(data: string): string` → `"10/09/26"` em `mes.ts`
  - Em `caixa.ts`: `Totais`, `LinhaMes`, `ResumoCaixa`, `LinhaExtrato`, `Extrato`, `SaidaPorCategoria`, `DetalheMes`, `mesesDoIntervalo(de, ate): Mes[]`, `resumoPorMes(entradas, despesas, de, ate): ResumoCaixa`, `extratoDoPeriodo(entradas, despesas, categorias, inicio, fim): Extrato`, `resumoDetalheMes(entradas, despesas, categorias, mes): DetalheMes`

- [ ] **Step 1: Adicionar o tipo `Entrada`** ao fim de `src/domain/tipos.ts`, logo após `Despesa`:

```ts
export interface Entrada {
  id: string;
  valor: Centavos;
  /** Data no formato "AAAA-MM-DD". */
  data: string;
  descricao?: string;
  criadaEm: string;
}
```

- [ ] **Step 2: Escrever testes falhando para os helpers de `mes.ts`** — em `src/domain/mes.test.ts`, incluir `formatarDataCurta` e `nomeCurtoDoMes` no import e adicionar dentro do `describe('mes', …)`:

```ts
  it('formata mês e data curtos', () => {
    expect(nomeCurtoDoMes('2026-09')).toBe('set/26');
    expect(nomeCurtoDoMes('2027-01')).toBe('jan/27');
    expect(formatarDataCurta('2026-09-05')).toBe('05/09/26');
  });
```

- [ ] **Step 3: Escrever testes falhando de `caixa.ts`** — criar `src/domain/caixa.test.ts`:

```ts
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
      [ent('e1', 500000, '2026-07-05'), ent('e2', 100000, '2026-09-20'), ent('fora', 1, '2026-10-01')],
      [desp('d1', 120000, '2026-07-10'), desp('d2', 30000, '2026-08-31'), desp('fora', 1, '2026-06-30')],
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
      { tipo: 'saida', id: 'd1', data: '2026-09-01', descricao: 'Feira', valor: 2000, saldo: -2000 },
      { tipo: 'entrada', id: 'e1', data: '2026-09-02', descricao: 'Salário', valor: 10000, saldo: 8000 },
      { tipo: 'saida', id: 'd2', data: '2026-09-02', descricao: 'Mercado', valor: 3000, saldo: 5000 },
    ]);
    expect(x.totais).toEqual({ entradas: 10000, saidas: 5000, saldo: 5000 });
  });

  it('inclui os dias das pontas e ignora o resto', () => {
    const x = extratoDoPeriodo(
      [ent('a', 1, '2026-08-31'), ent('b', 1, '2026-09-01'), ent('c', 1, '2026-09-10'), ent('d', 1, '2026-09-11')],
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
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run src/domain`
Expected: FAIL — `nomeCurtoDoMes`/`formatarDataCurta` não exportados e `./caixa` não encontrado.

- [ ] **Step 5: Implementar os helpers em `src/domain/mes.ts`** (adicionar ao fim):

```ts
export function nomeCurtoDoMes(mes: Mes): string {
  const [ano, numero] = partes(mes);
  return `${NOMES[numero - 1].slice(0, 3)}/${doisDigitos(ano % 100)}`;
}

export function formatarDataCurta(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(2, 4)}`;
}
```

- [ ] **Step 6: Implementar `src/domain/caixa.ts`**

```ts
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
    ...entradas.filter((e) => noPeriodo(e.data)).map((e) => ({
      tipo: 'entrada' as const,
      id: e.id,
      data: e.data,
      criadaEm: e.criadaEm,
      descricao: e.descricao || 'Entrada',
      valor: e.valor,
    })),
    ...despesas.filter((d) => noPeriodo(d.data)).map((d) => ({
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
    totais: totais(somar(doMes), saidasPorCategoria.reduce((soma, s) => soma + s.total, 0)),
  };
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/domain`
Expected: PASS (todos).

- [ ] **Step 8: Formatar e commitar**

```bash
npx prettier --write src/domain
git add src/domain
git commit -m "feat(domain): entradas e cálculos de caixa por mês e por período

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Armazenamento — store `entradas` (banco v2) e repositório

**Files:**
- Modify: `src/storage/db.ts`
- Modify: `src/storage/repositorio.ts`, `src/storage/repositorio.test.ts`
- Create: `src/storage/db.test.ts`
- Modify: `src/test/semear.ts`

**Interfaces:**
- Consumes: `Entrada` (Task 1).
- Produces:
  - `DadosCompletos` passa a ter `entradas: Entrada[]`.
  - Repositório: `listarDespesasDoPeriodo(inicio: string, fim: string): Promise<Despesa[]>`, `listarEntradasDoPeriodo(inicio: string, fim: string): Promise<Entrada[]>` (ambos da mais recente para a mais antiga; extremos invertidos são trocados), `obterEntrada(id): Promise<Entrada | undefined>`, `salvarEntrada(entrada): Promise<void>`, `excluirEntrada(id): Promise<void>`.
  - `semear` aceita `entradas`.

- [ ] **Step 1: Escrever o teste de migração** — criar `src/storage/db.test.ts`:

```ts
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { abrirBanco, NOME_BANCO } from './db';

describe('banco', () => {
  it('migra da versão 1 sem perder despesas e cria o store de entradas', async () => {
    const antigo = await openDB(NOME_BANCO, 1, {
      upgrade(db) {
        db.createObjectStore('categorias', { keyPath: 'id' });
        db.createObjectStore('limites', { keyPath: 'id' }).createIndex('categoriaId', 'categoriaId');
        const despesas = db.createObjectStore('despesas', { keyPath: 'id' });
        despesas.createIndex('data', 'data');
        despesas.createIndex('categoriaId', 'categoriaId');
      },
    });
    await antigo.put('despesas', {
      id: 'd',
      valor: 100,
      categoriaId: 'm',
      data: '2026-09-01',
      criadaEm: '2026-09-01T10:00:00.000Z',
    });
    antigo.close();

    const db = await abrirBanco();
    expect(db.version).toBe(2);
    expect(await db.getAll('despesas')).toHaveLength(1);
    expect(await db.getAll('entradas')).toEqual([]);
    db.close();
  });
});
```

- [ ] **Step 2: Escrever testes falhando do repositório** — em `src/storage/repositorio.test.ts`, importar `Entrada` junto dos tipos, adicionar após `desp`:

```ts
const ent = (id: string, data: string): Entrada => ({
  id,
  valor: 500000,
  data,
  criadaEm: `${data}T08:00:00.000Z`,
});
```

e, dentro do `describe`, os testes:

```ts
  it('obtém, altera e exclui entrada', async () => {
    await repo.salvarEntrada(ent('e', '2026-09-05'));
    await repo.salvarEntrada({ ...ent('e', '2026-09-05'), descricao: 'Salário' });
    expect((await repo.obterEntrada('e'))?.descricao).toBe('Salário');
    await repo.excluirEntrada('e');
    expect(await repo.obterEntrada('e')).toBeUndefined();
  });

  it('lista entradas e despesas do período, inclusive nas pontas, mesmo invertido', async () => {
    for (const e of [ent('a', '2026-08-31'), ent('b', '2026-09-01'), ent('c', '2026-09-10')]) {
      await repo.salvarEntrada(e);
    }
    for (const d of [desp('x', '2026-09-10'), desp('y', '2026-09-11')]) {
      await repo.salvarDespesa(d);
    }
    expect((await repo.listarEntradasDoPeriodo('2026-09-01', '2026-09-10')).map((e) => e.id)).toEqual(
      ['c', 'b'],
    );
    expect((await repo.listarEntradasDoPeriodo('2026-09-10', '2026-09-01')).map((e) => e.id)).toEqual(
      ['c', 'b'],
    );
    expect((await repo.listarDespesasDoPeriodo('2026-09-01', '2026-09-10')).map((d) => d.id)).toEqual(
      ['x'],
    );
  });
```

e no teste existente `substituirTudo troca todos os dados…`, incluir `entradas: [ent('e', '2026-09-05')],` no objeto `dados`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/storage`
Expected: FAIL — `db.version` é 1, `salvarEntrada` não existe.

- [ ] **Step 4: Atualizar `src/storage/db.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Categoria, Despesa, Entrada, Limite } from '../domain/tipos';

interface EsquemaDespesas extends DBSchema {
  categorias: { key: string; value: Categoria };
  limites: { key: string; value: Limite; indexes: { categoriaId: string } };
  despesas: { key: string; value: Despesa; indexes: { data: string; categoriaId: string } };
  entradas: { key: string; value: Entrada; indexes: { data: string } };
}

export type BancoDespesas = IDBPDatabase<EsquemaDespesas>;

export const NOME_BANCO = 'despesas-pessoais';

export function abrirBanco(): Promise<BancoDespesas> {
  return openDB<EsquemaDespesas>(NOME_BANCO, 2, {
    upgrade(db, versaoAntiga) {
      if (versaoAntiga < 1) {
        db.createObjectStore('categorias', { keyPath: 'id' });
        const limites = db.createObjectStore('limites', { keyPath: 'id' });
        limites.createIndex('categoriaId', 'categoriaId');
        const despesas = db.createObjectStore('despesas', { keyPath: 'id' });
        despesas.createIndex('data', 'data');
        despesas.createIndex('categoriaId', 'categoriaId');
      }
      if (versaoAntiga < 2) {
        const entradas = db.createObjectStore('entradas', { keyPath: 'id' });
        entradas.createIndex('data', 'data');
      }
    },
    blocking() {
      // Outra aba precisa atualizar o banco: recarrega esta para usar a versão nova.
      location.reload();
    },
  });
}
```

- [ ] **Step 5: Atualizar `src/storage/repositorio.ts`**

Trocar o import de tipos para incluir `Entrada`, e:

```ts
export interface DadosCompletos {
  categorias: Categoria[];
  limites: Limite[];
  despesas: Despesa[];
  entradas: Entrada[];
}

const TODAS = ['categorias', 'limites', 'despesas', 'entradas'] as const;

/** Da mais recente para a mais antiga. */
function ordenarPorData<T extends { data: string; criadaEm: string }>(itens: T[]): T[] {
  return itens.sort((a, b) => b.data.localeCompare(a.data) || b.criadaEm.localeCompare(a.criadaEm));
}

/** Faixa inclusiva de datas; extremos invertidos são trocados. */
function faixa(inicio: string, fim: string): IDBKeyRange {
  return inicio <= fim ? IDBKeyRange.bound(inicio, fim) : IDBKeyRange.bound(fim, inicio);
}
```

Renomear todos os usos de `ordenarDespesas` para `ordenarPorData`. Trocar `listarDespesasDoMes` e acrescentar os métodos de período e de entradas:

```ts
    async listarDespesasDoMes(mes: Mes): Promise<Despesa[]> {
      return ordenarPorData(await db.getAllFromIndex('despesas', 'data', faixa(`${mes}-01`, `${mes}-31`)));
    },

    async listarDespesasDoPeriodo(inicio: string, fim: string): Promise<Despesa[]> {
      return ordenarPorData(await db.getAllFromIndex('despesas', 'data', faixa(inicio, fim)));
    },

    async listarEntradasDoPeriodo(inicio: string, fim: string): Promise<Entrada[]> {
      return ordenarPorData(await db.getAllFromIndex('entradas', 'data', faixa(inicio, fim)));
    },

    obterEntrada(id: string): Promise<Entrada | undefined> {
      return db.get('entradas', id);
    },

    async salvarEntrada(entrada: Entrada): Promise<void> {
      await db.put('entradas', entrada);
    },

    async excluirEntrada(id: string): Promise<void> {
      await db.delete('entradas', id);
    },
```

Em `exportarTudo`, ler também `tx.objectStore('entradas').getAll()` e devolver `entradas: ordenarPorData(entradas)`. Em `substituirTudo`, limpar e gravar o store `entradas` como os outros (`...dados.entradas.map((e) => entradas.put(e))`).

Em `excluirCategoria`, a transação usa `TODAS`, que agora inclui `entradas` — está correto (só amplia o escopo).

- [ ] **Step 6: Atualizar `src/test/semear.ts`** — adicionar `entradas: dados.entradas ?? [],` no objeto passado a `substituirTudo`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/storage`
Expected: PASS. (`backup.test.ts` pode falhar no tipo, não em runtime; é tratado na Task 3.)

- [ ] **Step 8: Formatar e commitar**

```bash
npx prettier --write src/storage src/test
git add src/storage src/test
git commit -m "feat(storage): store de entradas (banco v2) e busca por período

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Backup versão 2 com entradas

**Files:**
- Modify: `src/storage/backup.ts`, `src/storage/backup.test.ts`
- Modify: `src/ui/telas/TelaAjustes.tsx`, `src/ui/telas/TelaAjustes.test.tsx`

**Interfaces:**
- Consumes: `DadosCompletos` com `entradas` (Task 2).
- Produces: `DadosBackup` com `versao: 2`; `validarBackup` aceita 1 e 2.

- [ ] **Step 1: Atualizar testes** — em `src/storage/backup.test.ts`:
  - acrescentar ao objeto `dados`:
    ```ts
      entradas: [
        { id: 'e1', valor: 500000, data: '2026-09-05', descricao: 'Salário', criadaEm: '2026-09-05T08:00:00.000Z' },
      ],
    ```
  - no teste "ida e volta", esperar `versao: 2`;
  - no caso `'versão desconhecida'`, usar `versao: 3`;
  - adicionar casos ao `it.each`:
    ```ts
    [
      'entrada com valor zero',
      texto(montarBackup({ ...dados, entradas: [{ ...dados.entradas[0], valor: 0 }] })),
    ],
    [
      'entrada com data inválida',
      texto(montarBackup({ ...dados, entradas: [{ ...dados.entradas[0], data: '2026-9-5' }] })),
    ],
    ['versão 2 sem entradas', texto({ ...montarBackup(dados), entradas: undefined })],
    ```
  - adicionar teste:
    ```ts
  it('aceita backup da versão 1, sem entradas', () => {
    const antigo: Record<string, unknown> = { ...montarBackup(dados), versao: 1 };
    delete antigo.entradas;
    const lido = lerBackup(texto(antigo));
    expect(lido.versao).toBe(2);
    expect(lido.entradas).toEqual([]);
    expect(lido.despesas).toHaveLength(2);
  });
    ```

Em `src/ui/telas/TelaAjustes.test.tsx`:
  - exportação: esperar `versao: 2`;
  - importação: acrescentar `entradas: []` ao `montarBackup({...})` e trocar o texto esperado por `/1 categoria, 0 despesas e 0 entradas/`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/storage/backup.test.ts src/ui/telas/TelaAjustes.test.tsx`
Expected: FAIL (versão 1 gerada; entradas não validadas; texto antigo).

- [ ] **Step 3: Atualizar `src/storage/backup.ts`**

- Importar `Entrada`.
- `export interface DadosBackup extends DadosCompletos { versao: 2; exportadoEm: string; }`
- `montarBackup` devolve `{ versao: 2, … }`.
- Em `validarBackup`, trocar a checagem de versão:

```ts
  if (json.versao !== 1 && json.versao !== 2) {
    throw new ErroBackup('Versão de backup não suportada.');
  }
```

- Depois de `despesas`, validar entradas (na versão 1 não existem):

```ts
  const entradas =
    json.versao === 1
      ? []
      : lista(json, 'entradas').map((e, i): Entrada => {
          if (
            !ehTexto(e.id) ||
            !ehInteiro(e.valor, 1) ||
            !ehTexto(e.data) ||
            !ehDataValida(e.data) ||
            !ehTexto(e.criadaEm) ||
            (e.descricao !== undefined && typeof e.descricao !== 'string')
          ) {
            throw new ErroBackup(`Backup inválido: entrada ${i + 1} está incorreta.`);
          }
          const entrada: Entrada = { id: e.id, valor: e.valor, data: e.data, criadaEm: e.criadaEm };
          if (typeof e.descricao === 'string') entrada.descricao = e.descricao;
          return entrada;
        });
```

- Retorno: `return { versao: 2, exportadoEm, categorias, limites, despesas, entradas };`

- [ ] **Step 4: Texto de confirmação em `TelaAjustes.tsx`** (linhas ~121-123):

```tsx
              Substituir todos os dados por este backup com{' '}
              {plural(pendente.categorias.length, 'categoria', 'categorias')},{' '}
              {plural(pendente.despesas.length, 'despesa', 'despesas')} e{' '}
              {plural(pendente.entradas.length, 'entrada', 'entradas')}?
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS (suíte inteira).

- [ ] **Step 6: Commitar**

```bash
npx prettier --write src/storage src/ui/telas/TelaAjustes.tsx src/ui/telas/TelaAjustes.test.tsx
git add src/storage src/ui/telas/TelaAjustes.tsx src/ui/telas/TelaAjustes.test.tsx
git commit -m "feat(backup): versão 2 com entradas, mantendo leitura da versão 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Lançar entradas e ver entradas/saldo na tela do mês

**Files:**
- Modify: `src/ui/dados.ts`
- Create: `src/ui/Dinheiro.tsx`
- Create: `src/ui/telas/TelaEntrada.tsx`, `src/ui/telas/TelaEntrada.test.tsx`
- Modify: `src/ui/telas/TelaMes.tsx`, `src/ui/telas/TelaMes.test.tsx`
- Modify: `src/ui/App.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: repositório da Task 2; `Entrada`.
- Produces:
  - `useLancamentosDoPeriodo(inicio: string, fim: string): Lancamentos | null` com `interface Lancamentos { entradas: Entrada[]; despesas: Despesa[] }` em `dados.ts`.
  - `<Dinheiro valor={centavos} />` — `formatarBRL` com classe `valor-negativo` quando < 0.
  - Rotas `/entrada/nova` (aceita `?mes=`) e `/entrada/:id`.

- [ ] **Step 1: Testes falhando** — criar `src/ui/telas/TelaEntrada.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
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
      { id: 'd', valor: 30000, categoriaId: 'm', data: '2026-09-10', criadaEm: '2026-09-10T12:00:00.000Z' },
    ],
  });
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
    await semear({
      entradas: [{ id: 'e', valor: 100000, data: '2026-09-05', descricao: 'Freela', criadaEm: '2026-09-05T08:00:00.000Z' }],
    });
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
    await semear({
      entradas: [{ id: 'e', valor: 100000, data: '2026-09-05', criadaEm: '2026-09-05T08:00:00.000Z' }],
    });
    window.location.hash = '#/entrada/e';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Excluir entrada' }));
    expect(await screen.findByText(/^Entradas/)).toHaveTextContent('Entradas R$ 0,00', {
      normalizeWhitespace: true,
    });
  });

  it('mostra aviso para entrada inexistente', async () => {
    window.location.hash = '#/entrada/nao-existe';
    render(<App />);
    expect(await screen.findByText(/Entrada não encontrada/)).toBeInTheDocument();
  });
});
```

Nota: `formatarBRL(-30000)` em pt-BR produz `-R$ 300,00` com espaço não separável; `normalizeWhitespace` o trata como espaço comum. Se o Node gerar outro formato para negativos, ajustar a string esperada ao que `formatarBRL` devolve, não o contrário.

Em `src/ui/telas/TelaMes.test.tsx`, adicionar:

```tsx
  it('mostra saldo negativo em vermelho', async () => {
    await semear({ categorias: [mercado], despesas: [despesa('a', 1000, '2026-09-10')] });
    render(<App />);
    const linha = await screen.findByText(/^Entradas/);
    expect(linha.querySelector('.valor-negativo')).toHaveTextContent(/R\$\s10,00/);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/telas/TelaEntrada.test.tsx src/ui/telas/TelaMes.test.tsx`
Expected: FAIL — não há linha "Entradas" nem rota `/entrada`.

- [ ] **Step 3: Hook em `src/ui/dados.ts`** — importar `Entrada` nos tipos e adicionar:

```ts
export interface Lancamentos {
  entradas: Entrada[];
  despesas: Despesa[];
}

/** Entradas e despesas entre as datas (inclusive); null enquanto carrega. */
export function useLancamentosDoPeriodo(inicio: string, fim: string): Lancamentos | null {
  const { repo, versao } = useDados();
  const chave = `${inicio}#${fim}#${versao}`;
  const [carregado, setCarregado] = useState<{ chave: string; dados: Lancamentos } | null>(null);
  useEffect(() => {
    let ativo = true;
    void Promise.all([
      repo.listarEntradasDoPeriodo(inicio, fim),
      repo.listarDespesasDoPeriodo(inicio, fim),
    ]).then(([entradas, despesas]) => {
      if (ativo) setCarregado({ chave, dados: { entradas, despesas } });
    });
    return () => {
      ativo = false;
    };
  }, [repo, inicio, fim, chave]);
  return carregado?.chave === chave ? carregado.dados : null;
}
```

- [ ] **Step 4: Criar `src/ui/Dinheiro.tsx`**

```tsx
import { formatarBRL } from '../domain/dinheiro';
import type { Centavos } from '../domain/tipos';

/** Valor em reais; negativo aparece em vermelho. */
export function Dinheiro({ valor }: { valor: Centavos }) {
  return <span className={valor < 0 ? 'valor-negativo' : undefined}>{formatarBRL(valor)}</span>;
}
```

- [ ] **Step 5: Criar `src/ui/telas/TelaEntrada.tsx`**

```tsx
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { parseValor, valorParaCampo } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { ehDataValida, hojeISO, mesAtual, mesDe, ultimoDiaDoMes } from '../../domain/mes';
import type { Entrada } from '../../domain/tipos';
import { useDados } from '../dados';
import { useVoltar } from '../navegacao';
import { mesDaUrl } from '../parametros';

export function TelaEntrada() {
  const { id } = useParams();
  const { repo } = useDados();
  const [carregada, setCarregada] = useState<{ id: string; entrada?: Entrada } | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    void repo.obterEntrada(id).then((entrada) => {
      if (ativo) setCarregada({ id, entrada });
    });
    return () => {
      ativo = false;
    };
  }, [id, repo]);

  if (!id) return <FormEntrada />;
  if (carregada?.id !== id) return <p className="aviso">Carregando…</p>;
  if (!carregada.entrada) {
    return (
      <p className="aviso">
        Entrada não encontrada. <Link to="/">Voltar ao início</Link>
      </p>
    );
  }
  return <FormEntrada key={id} original={carregada.entrada} />;
}

function FormEntrada({ original }: { original?: Entrada }) {
  const { repo, aposAlterar } = useDados();
  const [params] = useSearchParams();
  const voltar = useVoltar();
  const ids = { valor: useId(), data: useId(), descricao: useId() };
  const mes = mesDaUrl(params);

  const [valorTexto, setValorTexto] = useState(original ? valorParaCampo(original.valor) : '');
  const [data, setData] = useState(
    original?.data ?? (mes === mesAtual() ? hojeISO() : ultimoDiaDoMes(mes)),
  );
  const [descricao, setDescricao] = useState(original?.descricao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const destino = `/?mes=${original ? mesDe(original.data) : mes}`;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const valor = parseValor(valorTexto);
    if (valor === null) {
      setErro('Informe um valor maior que zero, como 1500,00.');
      return;
    }
    if (!ehDataValida(data)) {
      setErro('Informe a data.');
      return;
    }
    setSalvando(true);
    try {
      await repo.salvarEntrada({
        id: original?.id ?? novoId(),
        valor,
        data,
        descricao: descricao.trim() || undefined,
        criadaEm: original?.criadaEm ?? new Date().toISOString(),
      });
      await aposAlterar();
      voltar(destino);
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!original || !window.confirm('Excluir esta entrada?')) return;
    await repo.excluirEntrada(original.id);
    await aposAlterar();
    voltar(destino);
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <header className="cabecalho">
        <button type="button" className="voltar" onClick={() => voltar(destino)}>
          ‹ Voltar
        </button>
        <h1>{original ? 'Editar entrada' : 'Nova entrada'}</h1>
      </header>
      <div className="campo">
        <label htmlFor={ids.valor}>Valor</label>
        <div className="campo-valor">
          <span aria-hidden="true">R$</span>
          <input
            id={ids.valor}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            autoFocus={!original}
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
          />
        </div>
      </div>
      <div className="campo">
        <label htmlFor={ids.data}>Data</label>
        <input id={ids.data} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor={ids.descricao}>Descrição (opcional)</label>
        <input
          id={ids.descricao}
          maxLength={80}
          placeholder="Salário, freela, reembolso…"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <button type="submit" className="botao botao--primario" disabled={salvando}>
        Salvar
      </button>
      {original && (
        <button type="button" className="botao botao--perigo" onClick={excluir}>
          Excluir entrada
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 6: Rotas em `src/ui/App.tsx`** — importar `TelaEntrada` e adicionar, logo após as rotas de despesa:

```tsx
            <Route path="/entrada/nova" element={<TelaEntrada />} />
            <Route path="/entrada/:id" element={<TelaEntrada />} />
```

- [ ] **Step 7: `TelaMes` com entradas e saldo** — em `src/ui/telas/TelaMes.tsx`:
  - imports: trocar `useDespesasDoMes` por `useLancamentosDoPeriodo`; importar `ultimoDiaDoMes` de `../../domain/mes`; importar `Dinheiro` de `../Dinheiro`.
  - substituir `const despesas = useDespesasDoMes(mes);` por:
    ```tsx
  const lancamentos = useLancamentosDoPeriodo(`${mes}-01`, ultimoDiaDoMes(mes));
    ```
  - `if (!despesas)` → `if (!lancamentos)`; `resumoDoMes(categorias, limites, despesas, mes)` → `resumoDoMes(categorias, limites, lancamentos.despesas, mes)`.
  - logo após `const resumo = …`, calcular:
    ```tsx
  const totalEntradas = lancamentos.entradas.reduce((soma, e) => soma + e.valor, 0);
    ```
  - logo depois do bloco `{lembrarBackup && …}`, inserir (fica visível mesmo sem categorias):
    ```tsx
      <p className="caixa-mes">
        Entradas <strong>{formatarBRL(totalEntradas)}</strong> · Saldo{' '}
        <strong>
          <Dinheiro valor={totalEntradas - resumo.totalGasto} />
        </strong>{' '}
        <Link to={`/entrada/nova?mes=${mes}`}>+ Entrada</Link>
      </p>
    ```
  O link "+ Entrada" fica dentro do `<p>`; os testes usam `toHaveTextContent`, que verifica "contém", então a ordem acima (Entradas, Saldo, link) precisa ser mantida.

  `useDespesasDoMes` continua usado por `TelaDetalheCategoria`; não remover.

- [ ] **Step 8: CSS em `src/index.css`** — após o bloco `.total strong`:

```css
.caixa-mes {
  margin: 0 0 12px;
  color: var(--texto-suave);
}

.caixa-mes strong {
  color: var(--texto);
}

.valor-negativo {
  color: var(--estourado);
}

.valor-entrada {
  color: var(--ok);
}
```

(`.caixa-mes strong .valor-negativo` herda a cor certa porque `.valor-negativo` está no `span` interno.)

- [ ] **Step 9: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commitar**

```bash
npx prettier --write src
git add src
git commit -m "feat(ui): lançar entradas e ver entradas e saldo na tela do mês

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tela Caixa — abas "Por mês" e "Por período"

**Files:**
- Modify: `src/ui/parametros.ts`
- Create: `src/ui/telas/TelaCaixa.tsx`, `src/ui/telas/TelaCaixa.test.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/NavInferior.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `resumoPorMes`, `extratoDoPeriodo` (Task 1); `useLancamentosDoPeriodo`, `Dinheiro` (Task 4); `nomeCurtoDoMes`, `formatarDataCurta`, `formatarDiaMes`.
- Produces: rota `/caixa` com `?modo=mes&de=&ate=` ou `?modo=periodo&inicio=&fim=`; link de cada mês para `/caixa/mes/AAAA-MM` (a tela vem na Task 6).

- [ ] **Step 1: Testes falhando** — criar `src/ui/telas/TelaCaixa.test.tsx`:

```tsx
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
      { id: 'd1', valor: 120000, categoriaId: 'm', data: '2026-07-10', criadaEm: '2026-07-10T12:00:00.000Z' },
      { id: 'd2', valor: 30000, categoriaId: 'm', data: '2026-09-03', descricao: 'Feira', criadaEm: '2026-09-03T12:00:00.000Z' },
    ],
    entradas: [
      { id: 'e1', valor: 500000, data: '2026-07-05', descricao: 'Salário', criadaEm: '2026-07-05T08:00:00.000Z' },
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
    expect(normalizar(linhas[6].textContent)).toBe('set/26R$ 1.000,00R$ 300,00R$ 700,00R$ 4.500,00');
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
    expect(normalizar(screen.getByLabelText('Totais do período').textContent)).toBe(
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
```

Notas: no extrato, a data aparece como `dd/mm` quando início e fim estão no mesmo ano, e como `dd/mm/aa` (`formatarDataCurta`) quando não. Os valores BRL usam espaço não separável; `normalizar` converte para espaço comum.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/telas/TelaCaixa.test.tsx`
Expected: FAIL — sem link "Caixa".

- [ ] **Step 3: Parâmetros em `src/ui/parametros.ts`** — adicionar:

```ts
import { ehDataValida, ehMesValido, mesAtual } from '../domain/mes';

/** Mês válido do parâmetro `nome`, ou o padrão. */
export function mesDoParametro(params: URLSearchParams, nome: string, padrao: Mes): Mes {
  const valor = params.get(nome);
  return valor && ehMesValido(valor) ? valor : padrao;
}

/** Data válida do parâmetro `nome`, ou o padrão. */
export function dataDoParametro(params: URLSearchParams, nome: string, padrao: string): string {
  const valor = params.get(nome);
  return valor && ehDataValida(valor) ? valor : padrao;
}
```

(manter `mesDaUrl` como está, ajustando o import único de `../domain/mes`.)

- [ ] **Step 4: Criar `src/ui/telas/TelaCaixa.tsx`**

```tsx
import { useId } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  extratoDoPeriodo,
  resumoPorMes,
  type Extrato,
  type ResumoCaixa,
  type Totais,
} from '../../domain/caixa';
import { formatarBRL } from '../../domain/dinheiro';
import {
  ehDataValida,
  ehMesValido,
  formatarDataCurta,
  formatarDiaMes,
  hojeISO,
  mesAnterior,
  mesAtual,
  nomeCurtoDoMes,
  ultimoDiaDoMes,
} from '../../domain/mes';
import { Dinheiro } from '../Dinheiro';
import { useDados, useLancamentosDoPeriodo } from '../dados';
import { dataDoParametro, mesDoParametro } from '../parametros';

type Modo = 'mes' | 'periodo';

function useParametro() {
  const [params, setParams] = useSearchParams();
  const definir = (mudancas: Record<string, string>) =>
    setParams(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        for (const [chave, valor] of Object.entries(mudancas)) novos.set(chave, valor);
        return novos;
      },
      { replace: true },
    );
  return [params, definir] as const;
}

export function TelaCaixa() {
  const [params, definir] = useParametro();
  const modo: Modo = params.get('modo') === 'periodo' ? 'periodo' : 'mes';

  return (
    <>
      <header className="cabecalho">
        <h1>Caixa</h1>
      </header>
      <div className="chips abas" role="group" aria-label="Tipo de relatório">
        {(
          [
            ['mes', 'Por mês'],
            ['periodo', 'Por período'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            className="chip"
            aria-pressed={modo === valor}
            onClick={() => definir({ modo: valor })}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {modo === 'mes' ? <CaixaPorMes /> : <CaixaPorPeriodo />}
    </>
  );
}

function BlocoTotais({ totais, rotulo }: { totais: Totais; rotulo: string }) {
  return (
    <dl className="totais" aria-label={rotulo}>
      <div>
        <dt>Entradas</dt>
        <dd>{formatarBRL(totais.entradas)}</dd>
      </div>
      <div>
        <dt>Saídas</dt>
        <dd>{formatarBRL(totais.saidas)}</dd>
      </div>
      <div>
        <dt>Saldo</dt>
        <dd>
          <Dinheiro valor={totais.saldo} />
        </dd>
      </div>
    </dl>
  );
}

function seisMesesAtras(): string {
  let mes = mesAtual();
  for (let i = 0; i < 5; i++) mes = mesAnterior(mes);
  return mes;
}

function CaixaPorMes() {
  const [params, definir] = useParametro();
  const ids = { de: useId(), ate: useId() };
  const de = mesDoParametro(params, 'de', seisMesesAtras());
  const ate = mesDoParametro(params, 'ate', mesAtual());
  const [primeiro, ultimo] = de <= ate ? [de, ate] : [ate, de];
  const lancamentos = useLancamentosDoPeriodo(`${primeiro}-01`, ultimoDiaDoMes(ultimo));

  return (
    <>
      <div className="filtros">
        <div className="campo">
          <label htmlFor={ids.de}>De</label>
          <input
            id={ids.de}
            type="month"
            value={de}
            onChange={(e) => {
              if (ehMesValido(e.target.value)) definir({ de: e.target.value });
            }}
          />
        </div>
        <div className="campo">
          <label htmlFor={ids.ate}>Até</label>
          <input
            id={ids.ate}
            type="month"
            value={ate}
            onChange={(e) => {
              if (ehMesValido(e.target.value)) definir({ ate: e.target.value });
            }}
          />
        </div>
      </div>
      {!lancamentos ? (
        <p className="aviso">Carregando…</p>
      ) : (
        <TabelaMeses resumo={resumoPorMes(lancamentos.entradas, lancamentos.despesas, de, ate)} />
      )}
    </>
  );
}

function TabelaMeses({ resumo }: { resumo: ResumoCaixa }) {
  return (
    <div className="tabela-rolagem">
      <table className="tabela-caixa">
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Entradas</th>
            <th scope="col">Saídas</th>
            <th scope="col">Saldo</th>
            <th scope="col">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {resumo.meses.map((l) => (
            <tr key={l.mes}>
              <th scope="row">
                <Link to={`/caixa/mes/${l.mes}`}>{nomeCurtoDoMes(l.mes)}</Link>
              </th>
              <td>{formatarBRL(l.entradas)}</td>
              <td>{formatarBRL(l.saidas)}</td>
              <td>
                <Dinheiro valor={l.saldo} />
              </td>
              <td>
                <Dinheiro valor={l.acumulado} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{formatarBRL(resumo.totais.entradas)}</td>
            <td>{formatarBRL(resumo.totais.saidas)}</td>
            <td>
              <Dinheiro valor={resumo.totais.saldo} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CaixaPorPeriodo() {
  const [params, definir] = useParametro();
  const { categorias } = useDados();
  const ids = { inicio: useId(), fim: useId() };
  const inicio = dataDoParametro(params, 'inicio', `${mesAtual()}-01`);
  const fim = dataDoParametro(params, 'fim', hojeISO());
  const lancamentos = useLancamentosDoPeriodo(inicio, fim);
  const formatarData = inicio.slice(0, 4) === fim.slice(0, 4) ? formatarDiaMes : formatarDataCurta;

  return (
    <>
      <div className="filtros">
        <div className="campo">
          <label htmlFor={ids.inicio}>De</label>
          <input
            id={ids.inicio}
            type="date"
            value={inicio}
            onChange={(e) => {
              if (ehDataValida(e.target.value)) definir({ inicio: e.target.value });
            }}
          />
        </div>
        <div className="campo">
          <label htmlFor={ids.fim}>Até</label>
          <input
            id={ids.fim}
            type="date"
            value={fim}
            onChange={(e) => {
              if (ehDataValida(e.target.value)) definir({ fim: e.target.value });
            }}
          />
        </div>
      </div>
      {!lancamentos ? (
        <p className="aviso">Carregando…</p>
      ) : (
        <ListaExtrato
          extrato={extratoDoPeriodo(
            lancamentos.entradas,
            lancamentos.despesas,
            categorias,
            inicio,
            fim,
          )}
          formatarData={formatarData}
        />
      )}
    </>
  );
}

function ListaExtrato({
  extrato,
  formatarData,
}: {
  extrato: Extrato;
  formatarData: (data: string) => string;
}) {
  return (
    <>
      {extrato.linhas.length === 0 ? (
        <p className="aviso">Nenhum lançamento neste período.</p>
      ) : (
        <ul className="lista-despesas">
          {extrato.linhas.map((l) => (
            <li key={`${l.tipo}-${l.id}`}>
              <Link
                to={l.tipo === 'entrada' ? `/entrada/${l.id}` : `/despesa/${l.id}`}
                className="linha-despesa"
              >
                <span className="linha-despesa__data">{formatarData(l.data)}</span>
                <span className="linha-despesa__descricao">{l.descricao}</span>
                <span className="extrato__valores">
                  <span className={l.tipo === 'entrada' ? 'valor-entrada' : undefined}>
                    {l.tipo === 'entrada' ? '+ ' : '− '}
                    {formatarBRL(l.valor)}
                  </span>
                  <small>
                    Saldo <Dinheiro valor={l.saldo} />
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <BlocoTotais totais={extrato.totais} rotulo="Totais do período" />
    </>
  );
}
```

- [ ] **Step 5: Rota e navegação**
  - `src/ui/App.tsx`: importar `TelaCaixa` e adicionar `<Route path="/caixa" element={<TelaCaixa />} />` antes de `/categorias`.
  - `src/ui/NavInferior.tsx`: inserir entre "Mês" e "Categorias":
    ```ts
  { para: '/caixa', rotulo: 'Caixa', icone: '📊' },
    ```

- [ ] **Step 6: CSS em `src/index.css`** (ao fim, antes de `.oculto`):

```css
.abas {
  margin-bottom: 16px;
}

.filtros {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.tabela-rolagem {
  overflow-x: auto;
  margin-bottom: 16px;
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  background: var(--superficie);
}

.tabela-caixa {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.tabela-caixa th,
.tabela-caixa td {
  padding: 10px 8px;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid var(--borda);
}

.tabela-caixa th[scope='row'],
.tabela-caixa thead th:first-child {
  text-align: left;
}

.tabela-caixa thead th {
  color: var(--texto-suave);
  font-weight: 600;
}

.tabela-caixa tfoot th,
.tabela-caixa tfoot td {
  font-weight: 700;
  border-bottom: 0;
}

.extrato__valores {
  display: grid;
  justify-items: end;
  font-variant-numeric: tabular-nums;
}

.extrato__valores small {
  color: var(--texto-suave);
}

.totais {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0 0 16px;
  padding: 14px;
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  background: var(--superficie);
}

.totais dt {
  color: var(--texto-suave);
  font-size: 0.85rem;
}

.totais dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commitar**

```bash
npx prettier --write src
git add src
git commit -m "feat(ui): relatório de caixa por mês e por período

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Detalhe do mês no caixa

**Files:**
- Create: `src/ui/telas/TelaCaixaMes.tsx`, `src/ui/telas/TelaCaixaMes.test.tsx`
- Modify: `src/ui/App.tsx`

**Interfaces:**
- Consumes: `resumoDetalheMes` (Task 1), `useLancamentosDoPeriodo`, `Dinheiro` (Task 4), `useVoltar`.
- Produces: rota `/caixa/mes/:mes`.

- [ ] **Step 1: Testes falhando** — criar `src/ui/telas/TelaCaixaMes.test.tsx`:

```tsx
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
      { id: 'd1', valor: 30000, categoriaId: 'm', data: '2026-09-03', criadaEm: '2026-09-03T12:00:00.000Z' },
      { id: 'd2', valor: 5000, categoriaId: 'l', data: '2026-09-04', criadaEm: '2026-09-04T12:00:00.000Z' },
    ],
    entradas: [
      { id: 'e1', valor: 100000, data: '2026-09-01', descricao: 'Salário', criadaEm: '2026-09-01T08:00:00.000Z' },
    ],
  });
});

describe('detalhe do mês no caixa', () => {
  it('mostra entradas, saídas por categoria e totais', async () => {
    window.location.hash = '#/caixa/mes/2026-09';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument();
    const entradas = screen.getByRole('region', { name: 'Entradas' });
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/telas/TelaCaixaMes.test.tsx`
Expected: FAIL — a rota cai no `*` e redireciona para `/`.

- [ ] **Step 3: Criar `src/ui/telas/TelaCaixaMes.tsx`**

```tsx
import { Link, useParams } from 'react-router';
import { resumoDetalheMes } from '../../domain/caixa';
import { formatarBRL } from '../../domain/dinheiro';
import { ehMesValido, formatarDiaMes, nomeDoMes, ultimoDiaDoMes } from '../../domain/mes';
import type { Mes } from '../../domain/tipos';
import { Dinheiro } from '../Dinheiro';
import { useDados, useLancamentosDoPeriodo } from '../dados';
import { useVoltar } from '../navegacao';

export function TelaCaixaMes() {
  const { mes } = useParams();
  if (!mes || !ehMesValido(mes)) {
    return (
      <p className="aviso">
        Mês inválido. <Link to="/caixa">Voltar ao caixa</Link>
      </p>
    );
  }
  return <DetalheMes key={mes} mes={mes} />;
}

function DetalheMes({ mes }: { mes: Mes }) {
  const { categorias } = useDados();
  const voltar = useVoltar();
  const lancamentos = useLancamentosDoPeriodo(`${mes}-01`, ultimoDiaDoMes(mes));

  const cabecalho = (
    <header className="cabecalho">
      <button type="button" className="voltar" onClick={() => voltar('/caixa')}>
        ‹ Voltar
      </button>
      <h1>{nomeDoMes(mes)}</h1>
    </header>
  );

  if (!lancamentos) {
    return (
      <>
        {cabecalho}
        <p className="aviso">Carregando…</p>
      </>
    );
  }

  const detalhe = resumoDetalheMes(lancamentos.entradas, lancamentos.despesas, categorias, mes);

  return (
    <>
      {cabecalho}
      <dl className="totais" aria-label="Totais do mês">
        <div>
          <dt>Entradas</dt>
          <dd>{formatarBRL(detalhe.totais.entradas)}</dd>
        </div>
        <div>
          <dt>Saídas</dt>
          <dd>{formatarBRL(detalhe.totais.saidas)}</dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd>
            <Dinheiro valor={detalhe.totais.saldo} />
          </dd>
        </div>
      </dl>
      <section aria-labelledby="titulo-entradas">
        <h2 id="titulo-entradas">Entradas</h2>
        {detalhe.entradas.length === 0 ? (
          <p className="aviso">Nenhuma entrada neste mês.</p>
        ) : (
          <ul className="lista-despesas">
            {detalhe.entradas.map((e) => (
              <li key={e.id}>
                <Link to={`/entrada/${e.id}`} className="linha-despesa">
                  <span className="linha-despesa__data">{formatarDiaMes(e.data)}</span>
                  <span className="linha-despesa__descricao">{e.descricao ?? 'Entrada'}</span>
                  <span className="linha-despesa__valor valor-entrada">{formatarBRL(e.valor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to={`/entrada/nova?mes=${mes}`}>+ Entrada</Link>
        </p>
      </section>
      <section aria-labelledby="titulo-saidas">
        <h2 id="titulo-saidas">Saídas</h2>
        {detalhe.saidasPorCategoria.length === 0 ? (
          <p className="aviso">Nenhuma despesa neste mês.</p>
        ) : (
          <ul className="lista-despesas">
            {detalhe.saidasPorCategoria.map((s) => (
              <li key={s.categoriaId}>
                <Link to={`/categoria/${s.categoriaId}?mes=${mes}`} className="linha-despesa">
                  <span className="bolinha" style={{ background: s.cor }} />
                  <span className="linha-despesa__descricao">{s.nome}</span>
                  <span className="linha-despesa__valor">{formatarBRL(s.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
```

- [ ] **Step 4: Rota** — em `src/ui/App.tsx`, importar `TelaCaixaMes` e adicionar `<Route path="/caixa/mes/:mes" element={<TelaCaixaMes />} />` logo após `/caixa`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commitar**

```bash
npx prettier --write src
git add src
git commit -m "feat(ui): detalhe do mês no relatório de caixa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Verificação final

- [ ] **Step 1:** `npm test` — Expected: todos passam.
- [ ] **Step 2:** `npm run lint` — Expected: sem erros (rodar `npm run format` se o Prettier acusar algo e commitar).
- [ ] **Step 3:** `npm run build` — Expected: `tsc -b` sem erros de tipo e build do Vite ok.
- [ ] **Step 4:** Abrir o app (`npm run dev`) com largura de celular (360px) e conferir: aba Caixa sem rolagem horizontal da página; tabela rola dentro do contêiner; modo escuro legível; lançar entrada e ver o saldo mudar.
- [ ] **Step 5:** Se algo mudou, commitar com `fix:`/`style:`.
