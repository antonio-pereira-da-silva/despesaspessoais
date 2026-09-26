# Controle de Despesas Pessoais — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA offline para seguir um orçamento mensal com limite por categoria, com histórico de meses, alertas visuais e backup em JSON.

**Architecture:** Três camadas em `src/`: `domain/` (regras puras: dinheiro, meses, orçamento), `storage/` (IndexedDB via `idb`, backup) e `ui/` (React + `react-router` com `HashRouter`). A UI lê categorias/limites de um contexto (`useDados`) e despesas por mês (`useDespesasDoMes`); toda escrita chama `aposAlterar()` para recarregar.

**Tech Stack:** Vite, React, TypeScript, `react-router` v7, `idb`, `vite-plugin-pwa`, Vitest, Testing Library, `fake-indexeddb`, ESLint, Prettier.

**Spec:** `docs/superpowers/specs/2026-09-26-controle-despesas-design.md`

## Global Constraints

- Valores monetários sempre em centavos inteiros (`Centavos`); nunca `float` no armazenamento.
- Mês é string `"AAAA-MM"`; data é string `"AAAA-MM-DD"` (data local, não UTC).
- Alertas: `ok` < 80%; `atencao` ≥ 80% e ≤ 100%; `estourado` > 100%; `sem-limite` se limite nulo/zero.
- Alterar limite vale a partir do mês atual; meses passados não mudam.
- Interface em pt-BR, moeda R$.
- Sem servidor: dados só no IndexedDB do aparelho; backup JSON `versao: 1`.
- `npm run lint`, `npm test` e `npm run build` devem passar ao fim de cada tarefa.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Valores digitados em formatos variados (`1.234,56`, `R$ 10`, `10.5`, `0`, `-5`, `abc`) — aceitar os válidos, recusar os demais com mensagem (teste na Tarefa 2).
2. Limite alterado no meio do histórico — setembro mantém o limite antigo depois de mudar em outubro (testes nas Tarefas 3 e 4).
3. Backup corrompido, de versão desconhecida ou com categoria inexistente — erro claro e nenhum dado alterado (testes nas Tarefas 5 e 9).
4. Despesa lançada a partir de um mês passado — data padrão é o último dia daquele mês, não hoje (teste na Tarefa 8).
5. Virada de ano na navegação (dezembro ↔ janeiro) e despesas no dia 31 (testes nas Tarefas 2 e 4).

---

### Task 1: Estrutura do projeto

**Files:**
- Create (via template): `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`
- Create: `.prettierrc.json`, `.prettierignore`, `src/test/setup.ts`, `public/favicon.svg`
- Delete: `src/App.css`, `src/assets/`, `public/vite.svg`

**Interfaces:**
- Produces: scripts `npm run dev|build|lint|format|test`; setup de testes que, antes de cada teste, troca `indexedDB` por um banco vazio, limpa `localStorage` e `location.hash`.

- [ ] **Step 1: Gerar o template em pasta temporária e copiar para a raiz**

```bash
cd <scratchpad>
npm create vite@latest vite-tmp -- --template react-ts --no-interactive
cp -r vite-tmp/. <repo>/
cd <repo>
rm -rf src/App.css src/assets public/vite.svg
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install
npm install react-router idb
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb prettier eslint-config-prettier
```

- [ ] **Step 3: Configurar Vitest em `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Criar `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 5: Prettier + ESLint**

`.prettierrc.json`:
```json
{ "singleQuote": true, "printWidth": 100 }
```
`.prettierignore`:
```
dist
dev-dist
docs
package-lock.json
```
Em `eslint.config.js`: acrescentar `dev-dist` ao `globalIgnores` e `eslintConfigPrettier` (de `eslint-config-prettier/flat`) como último item da configuração.

Scripts em `package.json`:
```json
"lint": "eslint . && prettier --check .",
"format": "prettier --write .",
"test": "vitest run --passWithNoTests",
"test:watch": "vitest"
```
Acrescentar `dev-dist` ao `.gitignore`.

- [ ] **Step 6: `index.html`, favicon e App mínimo**

`index.html`: `lang="pt-BR"`, `<title>Despesas Pessoais</title>`, `<meta name="theme-color" content="#1f7a5c">`, `<link rel="icon" type="image/svg+xml" href="./favicon.svg">`.

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1f7a5c"/>
  <rect x="14" y="36" width="8" height="14" rx="2" fill="#fff"/>
  <rect x="28" y="26" width="8" height="24" rx="2" fill="#fff"/>
  <rect x="42" y="16" width="8" height="34" rx="2" fill="#f4c95d"/>
</svg>
```
`src/App.tsx`: `export default function App() { return <h1>Despesas Pessoais</h1>; }`; `src/index.css` vazio.

- [ ] **Step 7: Verificar**

Run: `npm run format && npm run lint && npm test && npm run build`
Expected: tudo termina com código 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: estrutura do projeto (Vite, React, TS, Vitest, ESLint, Prettier)"
```

---

### Task 2: Domínio — tipos, dinheiro, meses, ids, categorias

**Files:**
- Create: `src/domain/tipos.ts`, `src/domain/dinheiro.ts`, `src/domain/mes.ts`, `src/domain/id.ts`, `src/domain/categorias.ts`
- Test: `src/domain/dinheiro.test.ts`, `src/domain/mes.test.ts`, `src/domain/categorias.test.ts`

**Interfaces:**
- Produces:
  - tipos `Mes`, `Centavos`, `Categoria`, `Limite`, `Despesa`, `StatusAlerta`, `ResumoCategoria`, `ResumoMes`
  - `formatarBRL(valor: Centavos): string`, `valorParaCampo(valor: Centavos): string`, `parseValor(texto: string): Centavos | null`
  - `hojeISO(agora?: Date): string`, `mesAtual(agora?: Date): Mes`, `mesDe(data: string): Mes`, `ehMesValido(t: string): boolean`, `ehDataValida(t: string): boolean`, `mesAnterior(m: Mes): Mes`, `proximoMes(m: Mes): Mes`, `nomeDoMes(m: Mes): string`, `ultimoDiaDoMes(m: Mes): string`, `formatarDiaMes(data: string): string`, `formatarDataCompleta(iso: string): string`
  - `novoId(): string`
  - `CORES: string[]`, `SUGESTOES: string[]`, `mesmoNome(a: string, b: string): boolean`

- [ ] **Step 1: Escrever os testes**

`src/domain/dinheiro.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatarBRL, parseValor, valorParaCampo } from './dinheiro';

const normalizar = (s: string) => s.replace(/\s/g, ' ');

describe('formatarBRL', () => {
  it('formata centavos em reais', () => {
    expect(normalizar(formatarBRL(123456))).toBe('R$ 1.234,56');
    expect(normalizar(formatarBRL(5))).toBe('R$ 0,05');
    expect(normalizar(formatarBRL(0))).toBe('R$ 0,00');
  });
});

describe('valorParaCampo', () => {
  it('gera texto editável sem símbolo', () => {
    expect(valorParaCampo(123456)).toBe('1234,56');
    expect(valorParaCampo(80000)).toBe('800,00');
  });
});

describe('parseValor', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,34', 1234],
    ['12.34', 1234],
    ['10.5', 1050],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['R$ 10', 1000],
    [' 0,01 ', 1],
  ])('aceita %s', (texto, esperado) => {
    expect(parseValor(texto)).toBe(esperado);
  });

  it.each(['', '0', '0,00', '-5', 'abc', '12,345', '1,2,3', '12..3', '1.23.4'])(
    'recusa %s',
    (texto) => {
      expect(parseValor(texto)).toBeNull();
    },
  );
});
```

`src/domain/mes.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  ehDataValida,
  ehMesValido,
  formatarDiaMes,
  hojeISO,
  mesAnterior,
  mesAtual,
  mesDe,
  nomeDoMes,
  proximoMes,
  ultimoDiaDoMes,
} from './mes';

describe('mes', () => {
  it('usa a data local', () => {
    const agora = new Date(2026, 8, 5, 23, 30);
    expect(hojeISO(agora)).toBe('2026-09-05');
    expect(mesAtual(agora)).toBe('2026-09');
  });

  it('extrai o mês de uma data', () => {
    expect(mesDe('2026-12-31')).toBe('2026-12');
  });

  it('navega entre meses atravessando o ano', () => {
    expect(mesAnterior('2026-01')).toBe('2025-12');
    expect(proximoMes('2026-12')).toBe('2027-01');
    expect(proximoMes('2026-09')).toBe('2026-10');
  });

  it('nomeia o mês em português', () => {
    expect(nomeDoMes('2026-03')).toBe('março de 2026');
  });

  it('calcula o último dia do mês', () => {
    expect(ultimoDiaDoMes('2026-02')).toBe('2026-02-28');
    expect(ultimoDiaDoMes('2028-02')).toBe('2028-02-29');
    expect(ultimoDiaDoMes('2026-08')).toBe('2026-08-31');
  });

  it('valida formatos', () => {
    expect(ehMesValido('2026-09')).toBe(true);
    expect(ehMesValido('2026-13')).toBe(false);
    expect(ehMesValido('setembro')).toBe(false);
    expect(ehDataValida('2026-09-30')).toBe(true);
    expect(ehDataValida('')).toBe(false);
  });

  it('formata dia/mês', () => {
    expect(formatarDiaMes('2026-09-07')).toBe('07/09');
  });
});
```

`src/domain/categorias.test.ts`:
```ts
import { expect, it } from 'vitest';
import { mesmoNome } from './categorias';

it('compara nomes ignorando maiúsculas e espaços', () => {
  expect(mesmoNome(' Mercado ', 'mercado')).toBe(true);
  expect(mesmoNome('Saúde', 'SAÚDE')).toBe(true);
  expect(mesmoNome('Lazer', 'Transporte')).toBe(false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — módulos `./dinheiro`, `./mes`, `./categorias` não existem.

- [ ] **Step 3: Implementar**

`src/domain/tipos.ts`:
```ts
/** Mês no formato "AAAA-MM". */
export type Mes = string;
/** Valor em centavos (inteiro). */
export type Centavos = number;

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  arquivada: boolean;
}

export interface Limite {
  id: string;
  categoriaId: string;
  valor: Centavos;
  vigenteDesde: Mes;
}

export interface Despesa {
  id: string;
  valor: Centavos;
  categoriaId: string;
  /** Data no formato "AAAA-MM-DD". */
  data: string;
  descricao?: string;
  criadaEm: string;
}

export type StatusAlerta = 'ok' | 'atencao' | 'estourado' | 'sem-limite';

export interface ResumoCategoria {
  categoria: Categoria;
  limite: Centavos | null;
  gasto: Centavos;
  restante: Centavos | null;
  percentual: number | null;
  status: StatusAlerta;
}

export interface ResumoMes {
  mes: Mes;
  categorias: ResumoCategoria[];
  totalGasto: Centavos;
  totalLimites: Centavos;
}
```

`src/domain/dinheiro.ts`:
```ts
import type { Centavos } from './tipos';

const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarBRL(valor: Centavos): string {
  return formatador.format(valor / 100);
}

/** Texto para preencher um campo: 1234 → "12,34". */
export function valorParaCampo(valor: Centavos): string {
  return (valor / 100).toFixed(2).replace('.', ',');
}

/** Converte o texto digitado em centavos; null se inválido ou não positivo. */
export function parseValor(texto: string): Centavos | null {
  let s = texto.replace(/R\$/g, '').replace(/\s/g, '');
  if (s.includes(',')) {
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!partes) return null;
  const centavos = Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
  return centavos > 0 && Number.isSafeInteger(centavos) ? centavos : null;
}
```

`src/domain/mes.ts`:
```ts
import type { Mes } from './tipos';

const NOMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function partes(mes: Mes): [number, number] {
  const [ano, numero] = mes.split('-').map(Number);
  return [ano, numero];
}

const montar = (ano: number, numero: number): Mes => `${ano}-${doisDigitos(numero)}`;

export function hojeISO(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

export function mesAtual(agora: Date = new Date()): Mes {
  return mesDe(hojeISO(agora));
}

export function mesDe(data: string): Mes {
  return data.slice(0, 7);
}

export function ehMesValido(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

export function ehDataValida(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(texto);
}

export function mesAnterior(mes: Mes): Mes {
  const [ano, numero] = partes(mes);
  return numero === 1 ? montar(ano - 1, 12) : montar(ano, numero - 1);
}

export function proximoMes(mes: Mes): Mes {
  const [ano, numero] = partes(mes);
  return numero === 12 ? montar(ano + 1, 1) : montar(ano, numero + 1);
}

export function nomeDoMes(mes: Mes): string {
  const [ano, numero] = partes(mes);
  return `${NOMES[numero - 1]} de ${ano}`;
}

export function ultimoDiaDoMes(mes: Mes): string {
  const [ano, numero] = partes(mes);
  return `${mes}-${doisDigitos(new Date(ano, numero, 0).getDate())}`;
}

export function formatarDiaMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

export function formatarDataCompleta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}
```

`src/domain/id.ts`:
```ts
/** Id único; usa randomUUID quando disponível (exige contexto seguro). */
export function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
```

`src/domain/categorias.ts`:
```ts
export const CORES = [
  '#2a9d8f',
  '#e76f51',
  '#e9c46a',
  '#457b9d',
  '#8e7dbe',
  '#f4a261',
  '#d62828',
  '#6a994e',
];

export const SUGESTOES = ['Mercado', 'Transporte', 'Moradia', 'Lazer', 'Saúde'];

const normalizar = (nome: string) => nome.trim().toLocaleLowerCase('pt-BR');

export function mesmoNome(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS em todos os testes.

- [ ] **Step 5: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(domain): tipos, dinheiro, meses, ids e categorias"
```

---

### Task 3: Domínio — cálculo do orçamento

**Files:**
- Create: `src/domain/orcamento.ts`
- Test: `src/domain/orcamento.test.ts`

**Interfaces:**
- Consumes: tipos da Tarefa 2, `mesDe`.
- Produces:
  - `limiteVigente(limites: Limite[], categoriaId: string, mes: Mes): Centavos | null`
  - `statusAlerta(gasto: Centavos, limite: Centavos | null): StatusAlerta`
  - `resumoCategoria(categoria: Categoria, limite: Centavos | null, gasto: Centavos): ResumoCategoria`
  - `resumoDoMes(categorias: Categoria[], limites: Limite[], despesas: Despesa[], mes: Mes): ResumoMes`

- [ ] **Step 1: Escrever os testes**

```ts
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
  const limites = [lim('m', 80000, '2026-01'), lim('m', 100000, '2026-10'), lim('t', 30000, '2026-09')];

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
  const categorias = [cat('t', 'Transporte'), cat('m', 'Mercado'), cat('v', 'Viagem', true), cat('a', 'Antiga', true)];
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
    expect(resumo.categorias.map((r) => r.categoria.nome)).toEqual(['Mercado', 'Transporte', 'Viagem']);
    const [mercado, transporte, viagem] = resumo.categorias;
    expect(mercado).toMatchObject({ gasto: 62050, limite: 80000, restante: 17950, status: 'ok' });
    expect(transporte).toMatchObject({ gasto: 35000, restante: -5000, status: 'estourado' });
    expect(viagem).toMatchObject({ gasto: 20000, limite: null, restante: null, status: 'sem-limite' });
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/domain/orcamento.test.ts`
Expected: FAIL — `./orcamento` não existe.

- [ ] **Step 3: Implementar `src/domain/orcamento.ts`**

```ts
import { mesDe } from './mes';
import type {
  Categoria,
  Centavos,
  Despesa,
  Limite,
  Mes,
  ResumoCategoria,
  ResumoMes,
  StatusAlerta,
} from './tipos';

/** Limite do registro mais recente com vigenteDesde <= mes. */
export function limiteVigente(limites: Limite[], categoriaId: string, mes: Mes): Centavos | null {
  let vigente: Limite | null = null;
  for (const limite of limites) {
    if (
      limite.categoriaId === categoriaId &&
      limite.vigenteDesde <= mes &&
      (!vigente || limite.vigenteDesde > vigente.vigenteDesde)
    ) {
      vigente = limite;
    }
  }
  return vigente ? vigente.valor : null;
}

export function statusAlerta(gasto: Centavos, limite: Centavos | null): StatusAlerta {
  if (!limite) return 'sem-limite';
  if (gasto > limite) return 'estourado';
  if (gasto * 5 >= limite * 4) return 'atencao';
  return 'ok';
}

export function resumoCategoria(
  categoria: Categoria,
  limite: Centavos | null,
  gasto: Centavos,
): ResumoCategoria {
  const temLimite = limite !== null && limite > 0;
  return {
    categoria,
    limite: temLimite ? limite : null,
    gasto,
    restante: temLimite ? limite - gasto : null,
    percentual: temLimite ? (gasto / limite) * 100 : null,
    status: statusAlerta(gasto, limite),
  };
}

export function resumoDoMes(
  categorias: Categoria[],
  limites: Limite[],
  despesas: Despesa[],
  mes: Mes,
): ResumoMes {
  const gastos = new Map<string, Centavos>();
  for (const despesa of despesas) {
    if (mesDe(despesa.data) !== mes) continue;
    gastos.set(despesa.categoriaId, (gastos.get(despesa.categoriaId) ?? 0) + despesa.valor);
  }
  const itens = categorias
    .filter((c) => !c.arquivada || gastos.has(c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((c) => resumoCategoria(c, limiteVigente(limites, c.id, mes), gastos.get(c.id) ?? 0));
  return {
    mes,
    categorias: itens,
    totalGasto: itens.reduce((soma, r) => soma + r.gasto, 0),
    totalLimites: itens.reduce((soma, r) => soma + (r.limite ?? 0), 0),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(domain): cálculo do orçamento mensal e alertas"
```

---

### Task 4: Armazenamento — banco e repositório

**Files:**
- Create: `src/storage/db.ts`, `src/storage/repositorio.ts`
- Test: `src/storage/repositorio.test.ts`

**Interfaces:**
- Consumes: tipos, `novoId`.
- Produces:
  - `abrirBanco(): Promise<BancoDespesas>`, `NOME_BANCO`
  - `criarRepositorio(db: BancoDespesas)` → `Repositorio` com:
    `listarCategorias(): Promise<Categoria[]>`, `salvarCategoria(c: Categoria): Promise<void>`,
    `excluirCategoria(id: string): Promise<boolean>` (false = tem despesas, nada excluído),
    `listarLimites(): Promise<Limite[]>`, `definirLimite(categoriaId: string, valor: Centavos, mes: Mes): Promise<void>`,
    `listarDespesasDoMes(mes: Mes): Promise<Despesa[]>` (ordem: data desc, criadaEm desc),
    `obterDespesa(id: string): Promise<Despesa | undefined>`, `salvarDespesa(d: Despesa): Promise<void>`,
    `excluirDespesa(id: string): Promise<void>`,
    `exportarTudo(): Promise<DadosCompletos>`, `substituirTudo(d: DadosCompletos): Promise<void>`
  - `interface DadosCompletos { categorias: Categoria[]; limites: Limite[]; despesas: Despesa[] }`

- [ ] **Step 1: Escrever os testes**

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/storage`
Expected: FAIL — módulos não existem.

- [ ] **Step 3: Implementar**

`src/storage/db.ts`:
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Categoria, Despesa, Limite } from '../domain/tipos';

interface EsquemaDespesas extends DBSchema {
  categorias: { key: string; value: Categoria };
  limites: { key: string; value: Limite; indexes: { categoriaId: string } };
  despesas: { key: string; value: Despesa; indexes: { data: string; categoriaId: string } };
}

export type BancoDespesas = IDBPDatabase<EsquemaDespesas>;

export const NOME_BANCO = 'despesas-pessoais';

export function abrirBanco(): Promise<BancoDespesas> {
  return openDB<EsquemaDespesas>(NOME_BANCO, 1, {
    upgrade(db) {
      db.createObjectStore('categorias', { keyPath: 'id' });
      const limites = db.createObjectStore('limites', { keyPath: 'id' });
      limites.createIndex('categoriaId', 'categoriaId');
      const despesas = db.createObjectStore('despesas', { keyPath: 'id' });
      despesas.createIndex('data', 'data');
      despesas.createIndex('categoriaId', 'categoriaId');
    },
  });
}
```

`src/storage/repositorio.ts`:
```ts
import { novoId } from '../domain/id';
import type { Categoria, Centavos, Despesa, Limite, Mes } from '../domain/tipos';
import type { BancoDespesas } from './db';

export interface DadosCompletos {
  categorias: Categoria[];
  limites: Limite[];
  despesas: Despesa[];
}

const TODAS = ['categorias', 'limites', 'despesas'] as const;

function ordenarDespesas(despesas: Despesa[]): Despesa[] {
  return despesas.sort(
    (a, b) => b.data.localeCompare(a.data) || b.criadaEm.localeCompare(a.criadaEm),
  );
}

export function criarRepositorio(db: BancoDespesas) {
  return {
    listarCategorias(): Promise<Categoria[]> {
      return db.getAll('categorias');
    },

    async salvarCategoria(categoria: Categoria): Promise<void> {
      await db.put('categorias', categoria);
    },

    /** Exclui a categoria e seus limites; retorna false, sem excluir, se ela tiver despesas. */
    async excluirCategoria(id: string): Promise<boolean> {
      const tx = db.transaction(TODAS, 'readwrite');
      const despesas = await tx.objectStore('despesas').index('categoriaId').count(id);
      if (despesas > 0) {
        await tx.done;
        return false;
      }
      const limites = tx.objectStore('limites');
      const chaves = await limites.index('categoriaId').getAllKeys(id);
      await Promise.all([
        ...chaves.map((chave) => limites.delete(chave)),
        tx.objectStore('categorias').delete(id),
      ]);
      await tx.done;
      return true;
    },

    listarLimites(): Promise<Limite[]> {
      return db.getAll('limites');
    },

    /** Define o limite da categoria a partir do mês informado (0 = sem limite). */
    async definirLimite(categoriaId: string, valor: Centavos, mes: Mes): Promise<void> {
      const tx = db.transaction('limites', 'readwrite');
      const existentes = await tx.store.index('categoriaId').getAll(categoriaId);
      const doMes = existentes.find((l) => l.vigenteDesde === mes);
      await tx.store.put({ id: doMes?.id ?? novoId(), categoriaId, valor, vigenteDesde: mes });
      await tx.done;
    },

    async listarDespesasDoMes(mes: Mes): Promise<Despesa[]> {
      const faixa = IDBKeyRange.bound(`${mes}-01`, `${mes}-31`);
      return ordenarDespesas(await db.getAllFromIndex('despesas', 'data', faixa));
    },

    obterDespesa(id: string): Promise<Despesa | undefined> {
      return db.get('despesas', id);
    },

    async salvarDespesa(despesa: Despesa): Promise<void> {
      await db.put('despesas', despesa);
    },

    async excluirDespesa(id: string): Promise<void> {
      await db.delete('despesas', id);
    },

    async exportarTudo(): Promise<DadosCompletos> {
      const tx = db.transaction(TODAS);
      const [categorias, limites, despesas] = await Promise.all([
        tx.objectStore('categorias').getAll(),
        tx.objectStore('limites').getAll(),
        tx.objectStore('despesas').getAll(),
      ]);
      await tx.done;
      return { categorias, limites, despesas: ordenarDespesas(despesas) };
    },

    /** Substitui todos os dados numa única transação (tudo ou nada). */
    async substituirTudo(dados: DadosCompletos): Promise<void> {
      const tx = db.transaction(TODAS, 'readwrite');
      const categorias = tx.objectStore('categorias');
      const limites = tx.objectStore('limites');
      const despesas = tx.objectStore('despesas');
      await Promise.all([categorias.clear(), limites.clear(), despesas.clear()]);
      await Promise.all([
        ...dados.categorias.map((c) => categorias.put(c)),
        ...dados.limites.map((l) => limites.put(l)),
        ...dados.despesas.map((d) => despesas.put(d)),
      ]);
      await tx.done;
    },
  };
}

export type Repositorio = ReturnType<typeof criarRepositorio>;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(storage): banco IndexedDB e repositório"
```

---

### Task 5: Backup — montar e validar

**Files:**
- Create: `src/storage/backup.ts`
- Test: `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: `DadosCompletos`.
- Produces: `interface DadosBackup extends DadosCompletos { versao: 1; exportadoEm: string }`, `class ErroBackup extends Error`, `montarBackup(dados: DadosCompletos, agora?: Date): DadosBackup`, `lerBackup(texto: string): DadosBackup` (lança `ErroBackup`), `validarBackup(json: unknown): DadosBackup` (lança `ErroBackup`).

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from 'vitest';
import { ErroBackup, lerBackup, montarBackup } from './backup';
import type { DadosCompletos } from './repositorio';

const dados: DadosCompletos = {
  categorias: [{ id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false }],
  limites: [{ id: 'l1', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-09' }],
  despesas: [
    { id: 'd1', valor: 1250, categoriaId: 'm', data: '2026-09-10', criadaEm: '2026-09-10T12:00:00.000Z' },
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
      texto(montarBackup({ ...dados, limites: [{ ...dados.limites[0], vigenteDesde: '2026-13' }] })),
    ],
  ])('recusa %s', (_caso, conteudo) => {
    expect(() => lerBackup(conteudo)).toThrow(ErroBackup);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/storage/backup.test.ts`
Expected: FAIL — `./backup` não existe.

- [ ] **Step 3: Implementar `src/storage/backup.ts`**

```ts
import { ehDataValida, ehMesValido } from '../domain/mes';
import type { Categoria, Despesa, Limite } from '../domain/tipos';
import type { DadosCompletos } from './repositorio';

export interface DadosBackup extends DadosCompletos {
  versao: 1;
  exportadoEm: string;
}

export class ErroBackup extends Error {}

type Registro = Record<string, unknown>;

const ehObjeto = (v: unknown): v is Registro =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const ehTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const ehInteiro = (v: unknown, minimo: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= minimo;

function lista(json: Registro, campo: string): Registro[] {
  const valor = json[campo];
  if (!Array.isArray(valor) || !valor.every(ehObjeto)) {
    throw new ErroBackup(`Backup inválido: "${campo}" está ausente ou com formato errado.`);
  }
  return valor;
}

export function montarBackup(dados: DadosCompletos, agora: Date = new Date()): DadosBackup {
  return { versao: 1, exportadoEm: agora.toISOString(), ...dados };
}

export function lerBackup(texto: string): DadosBackup {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new ErroBackup('O arquivo não é um backup válido.');
  }
  return validarBackup(json);
}

export function validarBackup(json: unknown): DadosBackup {
  if (!ehObjeto(json)) throw new ErroBackup('O arquivo não é um backup válido.');
  if (json.versao !== 1) throw new ErroBackup('Versão de backup não suportada.');

  const categorias = lista(json, 'categorias').map((c, i): Categoria => {
    if (!ehTexto(c.id) || !ehTexto(c.nome) || !ehTexto(c.cor) || typeof c.arquivada !== 'boolean') {
      throw new ErroBackup(`Backup inválido: categoria ${i + 1} está incompleta.`);
    }
    return { id: c.id, nome: c.nome, cor: c.cor, arquivada: c.arquivada };
  });
  const ids = new Set(categorias.map((c) => c.id));

  const limites = lista(json, 'limites').map((l, i): Limite => {
    if (
      !ehTexto(l.id) ||
      !ehTexto(l.categoriaId) ||
      !ids.has(l.categoriaId) ||
      !ehInteiro(l.valor, 0) ||
      !ehTexto(l.vigenteDesde) ||
      !ehMesValido(l.vigenteDesde)
    ) {
      throw new ErroBackup(`Backup inválido: limite ${i + 1} está incorreto.`);
    }
    return { id: l.id, categoriaId: l.categoriaId, valor: l.valor, vigenteDesde: l.vigenteDesde };
  });

  const despesas = lista(json, 'despesas').map((d, i): Despesa => {
    if (
      !ehTexto(d.id) ||
      !ehTexto(d.categoriaId) ||
      !ids.has(d.categoriaId) ||
      !ehInteiro(d.valor, 1) ||
      !ehTexto(d.data) ||
      !ehDataValida(d.data) ||
      !ehTexto(d.criadaEm) ||
      (d.descricao !== undefined && typeof d.descricao !== 'string')
    ) {
      throw new ErroBackup(`Backup inválido: despesa ${i + 1} está incorreta.`);
    }
    const despesa: Despesa = {
      id: d.id,
      valor: d.valor,
      categoriaId: d.categoriaId,
      data: d.data,
      criadaEm: d.criadaEm,
    };
    if (typeof d.descricao === 'string') despesa.descricao = d.descricao;
    return despesa;
  });

  const exportadoEm = typeof json.exportadoEm === 'string' ? json.exportadoEm : '';
  return { versao: 1, exportadoEm, categorias, limites, despesas };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(storage): backup em JSON com validação"
```

---

### Task 6: UI base — App, dados, navegação e tela do mês

**Files:**
- Create: `src/ui/App.tsx`, `src/ui/dados.ts`, `src/ui/DadosProvider.tsx`, `src/ui/NavInferior.tsx`, `src/ui/BarraProgresso.tsx`, `src/ui/situacao.ts`, `src/ui/parametros.ts`, `src/ui/navegacao.ts`, `src/ui/backupLocal.ts`, `src/ui/telas/TelaMes.tsx`, `src/ui/telas/TelaDetalheCategoria.tsx`, `src/test/semear.ts`
- Modify: `src/main.tsx`, `src/index.css`
- Delete: `src/App.tsx`
- Test: `src/ui/backupLocal.test.ts`, `src/ui/telas/TelaMes.test.tsx`

**Interfaces:**
- Consumes: domínio e repositório.
- Produces:
  - `useDados(): ValorDados` onde `ValorDados = { repo: Repositorio; categorias: Categoria[]; limites: Limite[]; versao: number; aposAlterar: () => Promise<void> }`
  - `useDespesasDoMes(mes: Mes): Despesa[] | null`
  - `mesDaUrl(params: URLSearchParams): Mes`
  - `useVoltar(): (destinoPadrao: string) => void`
  - `BarraProgresso({ percentual, status, rotulo })`, `textoSituacao(r: ResumoCategoria): string`
  - `lerUltimoBackup(): string | null`, `registrarBackup(agora?: Date): void`, `precisaLembrarBackup(ultimo: string | null, agora?: Date): boolean`
  - `App` com rotas `/`, `/categoria/:id` e `*` → `/` (as tarefas seguintes acrescentam rotas em `App.tsx`).
  - Teste: `semear(dados: Partial<DadosCompletos>): Promise<void>` grava dados antes de renderizar.

- [ ] **Step 1: Escrever os testes**

`src/ui/backupLocal.test.ts`:
```ts
import { expect, it } from 'vitest';
import { lerUltimoBackup, precisaLembrarBackup, registrarBackup } from './backupLocal';

const agora = new Date('2026-09-26T12:00:00Z');

it('lembra quando nunca houve backup ou passou de 30 dias', () => {
  expect(precisaLembrarBackup(null, agora)).toBe(true);
  expect(precisaLembrarBackup('2026-08-26T11:00:00Z', agora)).toBe(true);
  expect(precisaLembrarBackup('2026-09-01T12:00:00Z', agora)).toBe(false);
  expect(precisaLembrarBackup('lixo', agora)).toBe(true);
});

it('guarda a data do último backup', () => {
  expect(lerUltimoBackup()).toBeNull();
  registrarBackup(agora);
  expect(lerUltimoBackup()).toBe('2026-09-26T12:00:00.000Z');
});
```

`src/test/semear.ts`:
```ts
import { abrirBanco } from '../storage/db';
import { criarRepositorio, type DadosCompletos } from '../storage/repositorio';

export async function semear(dados: Partial<DadosCompletos>): Promise<void> {
  const db = await abrirBanco();
  await criarRepositorio(db).substituirTudo({
    categorias: dados.categorias ?? [],
    limites: dados.limites ?? [],
    despesas: dados.despesas ?? [],
  });
  db.close();
}
```

`src/ui/telas/TelaMes.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };
const despesa = (id: string, valor: number, data: string) => ({
  id,
  valor,
  categoriaId: 'm',
  data,
  criadaEm: `${data}T12:00:00.000Z`,
});

describe('tela do mês', () => {
  it('convida a criar categorias quando não há nenhuma', async () => {
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Crie suas categorias' })).toBeInTheDocument();
  });

  it('mostra gasto, restante e alerta de atenção', async () => {
    await semear({
      categorias: [mercado],
      limites: [{ id: 'l', categoriaId: 'm', valor: 10000, vigenteDesde: '2026-01' }],
      despesas: [despesa('a', 8500, '2026-09-10')],
    });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument();
    expect(await screen.findByText(/Sobram R\$\s15,00/)).toBeInTheDocument();
    expect(screen.getByText('Mercado').closest('[data-status]')).toHaveAttribute(
      'data-status',
      'atencao',
    );
    expect(screen.getByText(/^Gasto/)).toHaveTextContent('Gasto R$ 85,00 de R$ 100,00');
  });

  it('mostra estouro em vermelho', async () => {
    await semear({
      categorias: [mercado],
      limites: [{ id: 'l', categoriaId: 'm', valor: 10000, vigenteDesde: '2026-01' }],
      despesas: [despesa('a', 12000, '2026-09-10')],
    });
    render(<App />);
    expect(await screen.findByText(/Estourou R\$\s20,00/)).toBeInTheDocument();
    expect(screen.getByText('Mercado').closest('[data-status]')).toHaveAttribute(
      'data-status',
      'estourado',
    );
  });

  it('navega para o mês anterior e abre o detalhe da categoria', async () => {
    const user = userEvent.setup();
    await semear({
      categorias: [mercado],
      despesas: [despesa('a', 4000, '2026-08-31'), despesa('b', 999, '2026-09-01')],
    });
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByRole('heading', { name: 'agosto de 2026' })).toBeInTheDocument();
    expect(await screen.findByText(/^Gasto/)).toHaveTextContent('Gasto R$ 40,00');
    await user.click(screen.getByText('Mercado'));
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeInTheDocument();
    expect(screen.getByText('31/08')).toBeInTheDocument();
    expect(screen.queryByText('01/09')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/ui`
Expected: FAIL — módulos de UI não existem.

- [ ] **Step 3: Implementar utilitários de UI**

`src/ui/backupLocal.ts`:
```ts
const CHAVE = 'despesas:ultimoBackup';
const DIAS_PARA_LEMBRAR = 30;

export function lerUltimoBackup(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function registrarBackup(agora: Date = new Date()): void {
  try {
    localStorage.setItem(CHAVE, agora.toISOString());
  } catch {
    // Sem localStorage o lembrete apenas continua aparecendo.
  }
}

export function precisaLembrarBackup(ultimo: string | null, agora: Date = new Date()): boolean {
  if (!ultimo) return true;
  const dias = (agora.getTime() - new Date(ultimo).getTime()) / 86_400_000;
  return !(dias <= DIAS_PARA_LEMBRAR);
}
```

`src/ui/dados.ts`:
```ts
import { createContext, useContext, useEffect, useState } from 'react';
import type { Categoria, Despesa, Limite, Mes } from '../domain/tipos';
import type { Repositorio } from '../storage/repositorio';

export interface ValorDados {
  repo: Repositorio;
  categorias: Categoria[];
  limites: Limite[];
  /** Muda a cada alteração; usado para recarregar despesas. */
  versao: number;
  /** Recarrega os dados depois de uma escrita. */
  aposAlterar: () => Promise<void>;
}

export const ContextoDados = createContext<ValorDados | null>(null);

export function useDados(): ValorDados {
  const valor = useContext(ContextoDados);
  if (!valor) throw new Error('useDados usado fora do DadosProvider');
  return valor;
}

export function useDespesasDoMes(mes: Mes): Despesa[] | null {
  const { repo, versao } = useDados();
  const chave = `${mes}#${versao}`;
  const [carregado, setCarregado] = useState<{ chave: string; despesas: Despesa[] } | null>(null);
  useEffect(() => {
    let ativo = true;
    void repo.listarDespesasDoMes(mes).then((despesas) => {
      if (ativo) setCarregado({ chave, despesas });
    });
    return () => {
      ativo = false;
    };
  }, [repo, mes, chave]);
  return carregado?.chave === chave ? carregado.despesas : null;
}
```

`src/ui/DadosProvider.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Categoria, Limite } from '../domain/tipos';
import type { Repositorio } from '../storage/repositorio';
import { ContextoDados } from './dados';

interface Carregado {
  categorias: Categoria[];
  limites: Limite[];
  versao: number;
}

export function DadosProvider({ repo, children }: { repo: Repositorio; children: ReactNode }) {
  const [carregado, setCarregado] = useState<Carregado | null>(null);

  const recarregar = useCallback(async () => {
    const [categorias, limites] = await Promise.all([repo.listarCategorias(), repo.listarLimites()]);
    setCarregado((atual) => ({ categorias, limites, versao: (atual?.versao ?? 0) + 1 }));
  }, [repo]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const valor = useMemo(
    () => carregado && { repo, ...carregado, aposAlterar: recarregar },
    [carregado, repo, recarregar],
  );

  if (!valor) return <p className="aviso">Carregando…</p>;
  return <ContextoDados.Provider value={valor}>{children}</ContextoDados.Provider>;
}
```

`src/ui/parametros.ts`:
```ts
import { ehMesValido, mesAtual } from '../domain/mes';
import type { Mes } from '../domain/tipos';

export function mesDaUrl(params: URLSearchParams): Mes {
  const mes = params.get('mes');
  return mes && ehMesValido(mes) ? mes : mesAtual();
}
```

`src/ui/navegacao.ts`:
```ts
import { useLocation, useNavigate } from 'react-router';

/** Volta para a tela anterior; se o app foi aberto direto nesta tela, vai para o destino padrão. */
export function useVoltar(): (destinoPadrao: string) => void {
  const navigate = useNavigate();
  const location = useLocation();
  return (destinoPadrao) => {
    if (location.key !== 'default') void navigate(-1);
    else void navigate(destinoPadrao, { replace: true });
  };
}
```

`src/ui/situacao.ts`:
```ts
import { formatarBRL } from '../domain/dinheiro';
import type { ResumoCategoria } from '../domain/tipos';

export function textoSituacao(r: ResumoCategoria): string {
  if (r.restante === null) return 'Sem limite definido';
  if (r.restante >= 0) return `Sobram ${formatarBRL(r.restante)}`;
  return `Estourou ${formatarBRL(-r.restante)}`;
}
```

`src/ui/BarraProgresso.tsx`:
```tsx
import type { StatusAlerta } from '../domain/tipos';

interface Props {
  percentual: number | null;
  status: StatusAlerta;
  rotulo: string;
}

export function BarraProgresso({ percentual, status, rotulo }: Props) {
  const valor = Math.round(percentual ?? 0);
  return (
    <div
      className="barra"
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(valor, 100)}
      aria-valuetext={percentual === null ? 'sem limite' : `${valor}% do limite`}
    >
      <div
        className={`barra__preenchimento barra--${status}`}
        style={{ width: `${Math.min(percentual ?? 0, 100)}%` }}
      />
    </div>
  );
}
```

`src/ui/NavInferior.tsx`:
```tsx
import { NavLink } from 'react-router';

const ITENS = [
  { para: '/', rotulo: 'Mês', icone: '📅' },
  { para: '/categorias', rotulo: 'Categorias', icone: '🏷️' },
  { para: '/ajustes', rotulo: 'Ajustes', icone: '⚙️' },
];

export function NavInferior() {
  return (
    <nav className="nav-inferior" aria-label="Principal">
      {ITENS.map((item) => (
        <NavLink key={item.para} to={item.para} end={item.para === '/'} className="nav-inferior__item">
          <span aria-hidden="true">{item.icone}</span>
          {item.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
```
(O nome acessível do link é "Mês", "Categorias" ou "Ajustes" porque o ícone é `aria-hidden`.)

- [ ] **Step 4: Implementar as telas do mês**

`src/ui/telas/TelaMes.tsx`:
```tsx
import { Link, useSearchParams } from 'react-router';
import { formatarBRL } from '../../domain/dinheiro';
import { mesAnterior, mesAtual, nomeDoMes, proximoMes } from '../../domain/mes';
import { resumoDoMes } from '../../domain/orcamento';
import { BarraProgresso } from '../BarraProgresso';
import { lerUltimoBackup, precisaLembrarBackup } from '../backupLocal';
import { useDados, useDespesasDoMes } from '../dados';
import { mesDaUrl } from '../parametros';
import { textoSituacao } from '../situacao';

export function TelaMes() {
  const { categorias, limites } = useDados();
  const [params, setParams] = useSearchParams();
  const mes = mesDaUrl(params);
  const despesas = useDespesasDoMes(mes);

  const cabecalho = (
    <header className="cabecalho-mes">
      <button
        type="button"
        className="botao-icone"
        aria-label="Mês anterior"
        onClick={() => setParams({ mes: mesAnterior(mes) })}
      >
        ‹
      </button>
      <h1>{nomeDoMes(mes)}</h1>
      <button
        type="button"
        className="botao-icone"
        aria-label="Próximo mês"
        onClick={() => setParams({ mes: proximoMes(mes) })}
      >
        ›
      </button>
    </header>
  );

  if (!despesas) {
    return (
      <>
        {cabecalho}
        <p className="aviso">Carregando…</p>
      </>
    );
  }

  const resumo = resumoDoMes(categorias, limites, despesas, mes);
  const lembrarBackup =
    mes === mesAtual() && despesas.length > 0 && precisaLembrarBackup(lerUltimoBackup());

  return (
    <>
      {cabecalho}
      {lembrarBackup && (
        <p className="lembrete">
          Faz tempo que você não salva um backup. <Link to="/ajustes">Fazer backup</Link>
        </p>
      )}
      {resumo.categorias.length === 0 ? (
        <p className="aviso">
          Nenhuma categoria ainda. <Link to="/categorias">Crie suas categorias</Link> para começar.
        </p>
      ) : (
        <>
          <p className="total">
            Gasto <strong>{formatarBRL(resumo.totalGasto)}</strong>
            {resumo.totalLimites > 0 && ` de ${formatarBRL(resumo.totalLimites)}`}
          </p>
          <ul className="lista-cartoes">
            {resumo.categorias.map((r) => (
              <li key={r.categoria.id}>
                <Link
                  to={`/categoria/${r.categoria.id}?mes=${mes}`}
                  className="cartao"
                  data-status={r.status}
                >
                  <span className="cartao__topo">
                    <span className="cartao__titulo">
                      <span className="bolinha" style={{ background: r.categoria.cor }} />
                      {r.categoria.nome}
                    </span>
                    <span className="cartao__valores">
                      {formatarBRL(r.gasto)}
                      {r.limite !== null && ` de ${formatarBRL(r.limite)}`}
                    </span>
                  </span>
                  <BarraProgresso
                    percentual={r.percentual}
                    status={r.status}
                    rotulo={`Uso do limite de ${r.categoria.nome}`}
                  />
                  <span className="cartao__situacao">{textoSituacao(r)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to={`/despesa/nova?mes=${mes}`} className="botao-flutuante" aria-label="Nova despesa">
        +
      </Link>
    </>
  );
}
```

`src/ui/telas/TelaDetalheCategoria.tsx`:
```tsx
import { Link, useParams, useSearchParams } from 'react-router';
import { formatarBRL } from '../../domain/dinheiro';
import { formatarDiaMes, nomeDoMes } from '../../domain/mes';
import { limiteVigente, resumoCategoria } from '../../domain/orcamento';
import { BarraProgresso } from '../BarraProgresso';
import { useDados, useDespesasDoMes } from '../dados';
import { mesDaUrl } from '../parametros';
import { textoSituacao } from '../situacao';

export function TelaDetalheCategoria() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const mes = mesDaUrl(params);
  const { categorias, limites } = useDados();
  const despesas = useDespesasDoMes(mes);
  const categoria = categorias.find((c) => c.id === id);

  if (!categoria) {
    return (
      <p className="aviso">
        Categoria não encontrada. <Link to="/">Voltar ao início</Link>
      </p>
    );
  }
  if (!despesas) return <p className="aviso">Carregando…</p>;

  const daCategoria = despesas.filter((d) => d.categoriaId === categoria.id);
  const r = resumoCategoria(
    categoria,
    limiteVigente(limites, categoria.id, mes),
    daCategoria.reduce((soma, d) => soma + d.valor, 0),
  );

  return (
    <>
      <header className="cabecalho">
        <Link to={`/?mes=${mes}`} className="voltar">
          ‹ Voltar
        </Link>
        <h1>{categoria.nome}</h1>
        <p className="subtitulo">{nomeDoMes(mes)}</p>
      </header>
      <section className="cartao" data-status={r.status}>
        <span className="cartao__valores">
          {formatarBRL(r.gasto)}
          {r.limite !== null && ` de ${formatarBRL(r.limite)}`}
        </span>
        <BarraProgresso
          percentual={r.percentual}
          status={r.status}
          rotulo={`Uso do limite de ${categoria.nome}`}
        />
        <span className="cartao__situacao">{textoSituacao(r)}</span>
      </section>
      {daCategoria.length === 0 ? (
        <p className="aviso">Nenhuma despesa nesta categoria em {nomeDoMes(mes)}.</p>
      ) : (
        <ul className="lista-despesas">
          {daCategoria.map((d) => (
            <li key={d.id}>
              <Link to={`/despesa/${d.id}`} className="linha-despesa">
                <span className="linha-despesa__data">{formatarDiaMes(d.data)}</span>
                <span className="linha-despesa__descricao">{d.descricao ?? 'Sem descrição'}</span>
                <span className="linha-despesa__valor">{formatarBRL(d.valor)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={`/despesa/nova?mes=${mes}&categoria=${categoria.id}`}
        className="botao-flutuante"
        aria-label="Nova despesa"
      >
        +
      </Link>
    </>
  );
}
```

- [ ] **Step 5: App, main e estilos**

`src/ui/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { abrirBanco } from '../storage/db';
import { criarRepositorio, type Repositorio } from '../storage/repositorio';
import { DadosProvider } from './DadosProvider';
import { NavInferior } from './NavInferior';
import { TelaDetalheCategoria } from './telas/TelaDetalheCategoria';
import { TelaMes } from './telas/TelaMes';

type Estado = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'pronto'; repo: Repositorio };

export function App() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    abrirBanco().then(
      (db) => {
        if (ativo) setEstado({ tipo: 'pronto', repo: criarRepositorio(db) });
      },
      () => {
        if (ativo) setEstado({ tipo: 'erro' });
      },
    );
    navigator.storage?.persist?.().catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  if (estado.tipo === 'carregando') return <p className="aviso">Carregando…</p>;
  if (estado.tipo === 'erro') {
    return (
      <main className="conteudo">
        <h1>Não foi possível abrir seus dados</h1>
        <p>
          O app precisa do armazenamento do navegador para guardar suas despesas. Se estiver numa
          janela privada ou anônima, abra o app numa janela normal.
        </p>
      </main>
    );
  }

  return (
    <HashRouter>
      <DadosProvider repo={estado.repo}>
        <main className="conteudo">
          <Routes>
            <Route path="/" element={<TelaMes />} />
            <Route path="/categoria/:id" element={<TelaDetalheCategoria />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <NavInferior />
      </DadosProvider>
    </HashRouter>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```
Apagar `src/App.tsx` do template.

`src/index.css` (estilos de todas as telas; mobile-first, tema claro/escuro):
```css
:root {
  --fundo: #f6f7f5;
  --superficie: #ffffff;
  --texto: #1d2320;
  --texto-suave: #5f6b66;
  --borda: #dfe4e1;
  --primaria: #1f7a5c;
  --primaria-texto: #ffffff;
  --ok: #2e9e6b;
  --atencao: #e0a100;
  --estourado: #d64541;
  --trilho: #e7ebe9;
  --raio: 14px;
  color-scheme: light;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.4;
  color: var(--texto);
  background: var(--fundo);
  -webkit-text-size-adjust: 100%;
}

@media (prefers-color-scheme: dark) {
  :root {
    --fundo: #121614;
    --superficie: #1c211f;
    --texto: #e8ecea;
    --texto-suave: #9aa6a0;
    --borda: #2e3532;
    --primaria: #3fb38a;
    --primaria-texto: #0b1410;
    --ok: #3fb38a;
    --atencao: #f2c14e;
    --estourado: #ef6b67;
    --trilho: #2a302d;
    color-scheme: dark;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--fundo);
}

a {
  color: var(--primaria);
}

h1 {
  font-size: 1.35rem;
  margin: 0;
}

h2 {
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
}

.conteudo {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px 16px calc(96px + env(safe-area-inset-bottom));
}

.aviso,
.subtitulo {
  color: var(--texto-suave);
}

.cabecalho,
.cabecalho-mes {
  margin-bottom: 16px;
}

.cabecalho-mes {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cabecalho-mes h1 {
  text-align: center;
}

.cabecalho .subtitulo {
  margin: 4px 0 0;
}

.voltar {
  display: inline-block;
  margin-bottom: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--primaria);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.botao-icone {
  width: 44px;
  height: 44px;
  border: 1px solid var(--borda);
  border-radius: 50%;
  background: var(--superficie);
  color: var(--texto);
  font-size: 1.4rem;
  cursor: pointer;
}

.total {
  margin: 0 0 12px;
  color: var(--texto-suave);
}

.total strong {
  color: var(--texto);
  font-size: 1.2rem;
}

.lembrete {
  padding: 10px 12px;
  border-radius: var(--raio);
  background: color-mix(in srgb, var(--atencao) 18%, var(--superficie));
}

.lista-cartoes,
.lista-despesas,
.lista-categorias {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.cartao {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  background: var(--superficie);
  color: inherit;
  text-decoration: none;
  margin-bottom: 16px;
}

.lista-cartoes .cartao {
  margin-bottom: 0;
}

.cartao__topo {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.cartao__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.cartao__valores {
  color: var(--texto-suave);
  font-variant-numeric: tabular-nums;
}

.cartao__situacao {
  font-size: 0.9rem;
  color: var(--texto-suave);
}

.cartao[data-status='atencao'] .cartao__situacao {
  color: var(--atencao);
  font-weight: 600;
}

.cartao[data-status='estourado'] .cartao__situacao {
  color: var(--estourado);
  font-weight: 600;
}

.bolinha {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}

.barra {
  height: 8px;
  border-radius: 999px;
  background: var(--trilho);
  overflow: hidden;
}

.barra__preenchimento {
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.barra--ok {
  background: var(--ok);
}

.barra--atencao {
  background: var(--atencao);
}

.barra--estourado {
  background: var(--estourado);
}

.barra--sem-limite {
  background: var(--texto-suave);
}

.linha-despesa,
.item-categoria {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  background: var(--superficie);
  color: inherit;
  text-decoration: none;
}

.linha-despesa__data {
  color: var(--texto-suave);
  font-variant-numeric: tabular-nums;
}

.linha-despesa__descricao,
.item-categoria__nome {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.linha-despesa__valor,
.item-categoria__limite {
  font-variant-numeric: tabular-nums;
  color: var(--texto-suave);
}

.botao-flutuante {
  position: fixed;
  right: max(16px, calc(50% - 264px));
  bottom: calc(84px + env(safe-area-inset-bottom));
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--primaria);
  color: var(--primaria-texto);
  font-size: 2rem;
  text-decoration: none;
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
}

.nav-inferior {
  position: fixed;
  inset: auto 0 0;
  display: flex;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--borda);
  background: var(--superficie);
}

.nav-inferior__item {
  flex: 1;
  max-width: 186px;
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 8px 0 10px;
  color: var(--texto-suave);
  font-size: 0.8rem;
  text-decoration: none;
}

.nav-inferior__item.active {
  color: var(--primaria);
  font-weight: 600;
}

.formulario {
  display: grid;
  gap: 16px;
}

.campo {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.campo label,
.campo legend {
  font-weight: 600;
  padding: 0;
  margin-bottom: 6px;
}

.campo small {
  color: var(--texto-suave);
}

input:not([type='file']) {
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--borda);
  border-radius: 10px;
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  font-size: 1rem;
}

.campo-valor {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
}

.campo-valor input {
  font-size: 1.6rem;
  font-weight: 600;
}

.chips,
.cores,
.sugestoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  min-height: 40px;
  padding: 8px 14px;
  border: 2px solid var(--cor-chip, var(--borda));
  border-radius: 999px;
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  background: var(--cor-chip, var(--primaria));
  color: #fff;
  font-weight: 600;
}

.cor {
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-radius: 50%;
  cursor: pointer;
}

.cor[aria-pressed='true'] {
  border-color: var(--texto);
}

.botao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 10px 18px;
  border: 1px solid var(--borda);
  border-radius: 12px;
  background: var(--superficie);
  color: var(--texto);
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.botao--primario {
  border-color: var(--primaria);
  background: var(--primaria);
  color: var(--primaria-texto);
}

.botao--perigo {
  border-color: var(--estourado);
  color: var(--estourado);
}

.botao:disabled {
  opacity: 0.6;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.secao {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  background: var(--superficie);
}

.secao p {
  margin: 0 0 12px;
}

.erro {
  margin: 0;
  color: var(--estourado);
  font-weight: 600;
}

.sucesso {
  margin: 0;
  color: var(--ok);
  font-weight: 600;
}

.confirmacao {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--estourado) 10%, var(--superficie));
}

.oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Lint, build e commit**

```bash
npm run format && npm run lint && npm run build
git add -A
git commit -m "feat(ui): app base, navegação e tela do mês com alertas"
```

---

### Task 7: Telas de categorias

**Files:**
- Create: `src/ui/telas/TelaCategorias.tsx`, `src/ui/telas/TelaCategoria.tsx`
- Modify: `src/ui/App.tsx` (rotas)
- Test: `src/ui/telas/TelaCategorias.test.tsx`

**Interfaces:**
- Consumes: `useDados`, `limiteVigente`, `CORES`, `SUGESTOES`, `mesmoNome`, `parseValor`, `valorParaCampo`, `novoId`, `mesAtual`, `nomeDoMes`.
- Produces: rotas `/categorias`, `/categorias/nova`, `/categorias/:id`.

- [ ] **Step 1: Escrever os testes**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../../test/semear';
import { App } from '../App';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12));
  window.location.hash = '#/categorias';
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };

describe('categorias', () => {
  it('cria categoria com limite e mostra na lista', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'Nova categoria' }));
    await user.type(screen.getByLabelText('Nome'), 'Farmácia');
    await user.type(screen.getByLabelText('Limite mensal'), '150');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Farmácia')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s150,00\/mês/)).toBeInTheDocument();
  });

  it('cria categoria sugerida com um toque', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: '+ Mercado' }));
    expect(await screen.findByRole('link', { name: /Mercado/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Mercado' })).not.toBeInTheDocument();
  });

  it('recusa nome repetido e limite inválido', async () => {
    const user = userEvent.setup();
    await semear({ categorias: [mercado] });
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'Nova categoria' }));
    await user.type(screen.getByLabelText('Nome'), ' mercado ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria');
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Pets');
    await user.type(screen.getByLabelText('Limite mensal'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Limite inválido');
  });

  it('alterar o limite não muda meses anteriores', async () => {
    const user = userEvent.setup();
    await semear({
      categorias: [mercado],
      limites: [{ id: 'l', categoriaId: 'm', valor: 80000, vigenteDesde: '2026-01' }],
    });
    render(<App />);
    await user.click(await screen.findByRole('link', { name: /Mercado/ }));
    const campo = screen.getByLabelText('Limite mensal');
    expect(campo).toHaveValue('800,00');
    await user.clear(campo);
    await user.type(campo, '1000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/R\$\s1\.000,00\/mês/)).toBeInTheDocument();
    window.location.hash = '#/?mes=2026-08';
    expect(await screen.findByRole('heading', { name: 'agosto de 2026' })).toBeInTheDocument();
    expect(screen.getByText(/^Gasto/)).toHaveTextContent('de R$ 800,00');
  });

  it('bloqueia excluir categoria com despesas e permite arquivar', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await semear({
      categorias: [mercado],
      despesas: [
        { id: 'd', valor: 100, categoriaId: 'm', data: '2026-09-01', criadaEm: '2026-09-01T00:00:00Z' },
      ],
    });
    render(<App />);
    await user.click(await screen.findByRole('link', { name: /Mercado/ }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tem despesas');
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));
    expect(await screen.findByRole('heading', { name: 'Arquivadas' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/ui/telas/TelaCategorias.test.tsx`
Expected: FAIL — rota `/categorias` redireciona para o início, link "Nova categoria" não existe.

- [ ] **Step 3: Implementar `src/ui/telas/TelaCategorias.tsx`**

```tsx
import { Link } from 'react-router';
import { CORES, SUGESTOES, mesmoNome } from '../../domain/categorias';
import { formatarBRL } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { mesAtual } from '../../domain/mes';
import { limiteVigente } from '../../domain/orcamento';
import type { Categoria } from '../../domain/tipos';
import { useDados } from '../dados';

export function TelaCategorias() {
  const { repo, categorias, limites, aposAlterar } = useDados();
  const mes = mesAtual();
  const ordenadas = [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const ativas = ordenadas.filter((c) => !c.arquivada);
  const arquivadas = ordenadas.filter((c) => c.arquivada);
  const sugestoes = SUGESTOES.filter((nome) => !categorias.some((c) => mesmoNome(c.nome, nome)));

  async function criarSugestao(nome: string) {
    await repo.salvarCategoria({
      id: novoId(),
      nome,
      cor: CORES[categorias.length % CORES.length],
      arquivada: false,
    });
    await aposAlterar();
  }

  const item = (c: Categoria) => {
    const limite = limiteVigente(limites, c.id, mes);
    return (
      <li key={c.id}>
        <Link to={`/categorias/${c.id}`} className="item-categoria">
          <span className="bolinha" style={{ background: c.cor }} />
          <span className="item-categoria__nome">{c.nome}</span>
          <span className="item-categoria__limite">
            {limite ? `${formatarBRL(limite)}/mês` : 'Sem limite'}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <header className="cabecalho">
        <h1>Categorias</h1>
      </header>
      {ativas.length > 0 && <ul className="lista-categorias">{ativas.map(item)}</ul>}
      <p>
        <Link to="/categorias/nova" className="botao botao--primario">
          Nova categoria
        </Link>
      </p>
      {sugestoes.length > 0 && (
        <section className="secao">
          <h2>Sugestões</h2>
          <div className="sugestoes">
            {sugestoes.map((nome) => (
              <button key={nome} type="button" className="chip" onClick={() => criarSugestao(nome)}>
                + {nome}
              </button>
            ))}
          </div>
        </section>
      )}
      {arquivadas.length > 0 && (
        <>
          <h2>Arquivadas</h2>
          <ul className="lista-categorias">{arquivadas.map(item)}</ul>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 4: Implementar `src/ui/telas/TelaCategoria.tsx`**

```tsx
import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CORES, mesmoNome } from '../../domain/categorias';
import { parseValor, valorParaCampo } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { mesAtual, nomeDoMes } from '../../domain/mes';
import { limiteVigente } from '../../domain/orcamento';
import { useDados } from '../dados';

export function TelaCategoria() {
  const { id } = useParams();
  const { repo, categorias, limites, aposAlterar } = useDados();
  const navigate = useNavigate();
  const ids = { nome: useId(), limite: useId() };
  const mes = mesAtual();
  const existente = id ? categorias.find((c) => c.id === id) : undefined;
  const limiteAtual = existente ? limiteVigente(limites, existente.id, mes) : null;

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [cor, setCor] = useState(existente?.cor ?? CORES[categorias.length % CORES.length]);
  const [limiteTexto, setLimiteTexto] = useState(limiteAtual ? valorParaCampo(limiteAtual) : '');
  const [erro, setErro] = useState<string | null>(null);

  if (id && !existente) {
    return (
      <p className="aviso">
        Categoria não encontrada. <Link to="/categorias">Voltar</Link>
      </p>
    );
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro('Informe o nome da categoria.');
      return;
    }
    if (categorias.some((c) => c.id !== existente?.id && mesmoNome(c.nome, nomeLimpo))) {
      setErro('Já existe uma categoria com esse nome.');
      return;
    }
    const novoLimite = limiteTexto.trim() === '' ? 0 : parseValor(limiteTexto);
    if (novoLimite === null) {
      setErro('Limite inválido. Use um valor como 800 ou 800,00.');
      return;
    }
    const categoria = {
      id: existente?.id ?? novoId(),
      nome: nomeLimpo,
      cor,
      arquivada: existente?.arquivada ?? false,
    };
    try {
      await repo.salvarCategoria(categoria);
      if (novoLimite !== (limiteAtual ?? 0)) await repo.definirLimite(categoria.id, novoLimite, mes);
      await aposAlterar();
      void navigate('/categorias');
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    }
  }

  async function alternarArquivada() {
    if (!existente) return;
    await repo.salvarCategoria({ ...existente, arquivada: !existente.arquivada });
    await aposAlterar();
    void navigate('/categorias');
  }

  async function excluir() {
    if (!existente || !window.confirm(`Excluir a categoria "${existente.nome}"?`)) return;
    if (!(await repo.excluirCategoria(existente.id))) {
      setErro('Esta categoria tem despesas e não pode ser excluída. Arquive-a para escondê-la.');
      return;
    }
    await aposAlterar();
    void navigate('/categorias');
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <header className="cabecalho">
        <Link to="/categorias" className="voltar">
          ‹ Categorias
        </Link>
        <h1>{existente ? 'Editar categoria' : 'Nova categoria'}</h1>
      </header>
      <div className="campo">
        <label htmlFor={ids.nome}>Nome</label>
        <input
          id={ids.nome}
          value={nome}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <fieldset className="campo">
        <legend>Cor</legend>
        <div className="cores">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              className="cor"
              style={{ background: c }}
              aria-label={`Cor ${c}`}
              aria-pressed={c === cor}
              onClick={() => setCor(c)}
            />
          ))}
        </div>
      </fieldset>
      <div className="campo">
        <label htmlFor={ids.limite}>Limite mensal</label>
        <input
          id={ids.limite}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ex.: 800,00"
          value={limiteTexto}
          onChange={(e) => setLimiteTexto(e.target.value)}
        />
        <small>Vale a partir de {nomeDoMes(mes)}. Deixe vazio para não ter limite.</small>
      </div>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <button type="submit" className="botao botao--primario">
        Salvar
      </button>
      {existente && (
        <div className="acoes">
          <button type="button" className="botao" onClick={alternarArquivada}>
            {existente.arquivada ? 'Reativar' : 'Arquivar'}
          </button>
          <button type="button" className="botao botao--perigo" onClick={excluir}>
            Excluir
          </button>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Rotas em `src/ui/App.tsx`**

Importar as duas telas e acrescentar antes da rota `*`:
```tsx
<Route path="/categorias" element={<TelaCategorias />} />
<Route path="/categorias/nova" element={<TelaCategoria />} />
<Route path="/categorias/:id" element={<TelaCategoria />} />
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(ui): telas de categorias com limite, sugestões, arquivar e excluir"
```

---

### Task 8: Lançar, editar e excluir despesa

**Files:**
- Create: `src/ui/telas/TelaDespesa.tsx`
- Modify: `src/ui/App.tsx` (rotas)
- Test: `src/ui/telas/TelaDespesa.test.tsx`

**Interfaces:**
- Consumes: `useDados`, `useVoltar`, `mesDaUrl`, `parseValor`, `valorParaCampo`, `novoId`, `hojeISO`, `mesAtual`, `mesDe`, `ultimoDiaDoMes`, `ehDataValida`, `repo.obterDespesa/salvarDespesa/excluirDespesa`.
- Produces: rotas `/despesa/nova` (params `mes`, `categoria`) e `/despesa/:id`.

- [ ] **Step 1: Escrever os testes**

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
    expect(await screen.findByText('R$ 70,00', { normalizer: (s) => s.replace(/\s/g, ' ') })).toBeInTheDocument();
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/ui/telas/TelaDespesa.test.tsx`
Expected: FAIL — campo "Valor" não encontrado (rota não existe).

- [ ] **Step 3: Implementar `src/ui/telas/TelaDespesa.tsx`**

```tsx
import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { parseValor, valorParaCampo } from '../../domain/dinheiro';
import { novoId } from '../../domain/id';
import { ehDataValida, hojeISO, mesAtual, mesDe, ultimoDiaDoMes } from '../../domain/mes';
import type { Despesa } from '../../domain/tipos';
import { useDados } from '../dados';
import { useVoltar } from '../navegacao';
import { mesDaUrl } from '../parametros';

export function TelaDespesa() {
  const { id } = useParams();
  const { repo } = useDados();
  const [carregada, setCarregada] = useState<{ id: string; despesa?: Despesa } | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    void repo.obterDespesa(id).then((despesa) => {
      if (ativo) setCarregada({ id, despesa });
    });
    return () => {
      ativo = false;
    };
  }, [id, repo]);

  if (!id) return <FormDespesa />;
  if (carregada?.id !== id) return <p className="aviso">Carregando…</p>;
  if (!carregada.despesa) {
    return (
      <p className="aviso">
        Despesa não encontrada. <Link to="/">Voltar ao início</Link>
      </p>
    );
  }
  return <FormDespesa key={id} original={carregada.despesa} />;
}

function FormDespesa({ original }: { original?: Despesa }) {
  const { repo, categorias, aposAlterar } = useDados();
  const [params] = useSearchParams();
  const voltar = useVoltar();
  const ids = { valor: useId(), data: useId(), descricao: useId() };
  const mes = mesDaUrl(params);

  const [valorTexto, setValorTexto] = useState(original ? valorParaCampo(original.valor) : '');
  const [categoriaId, setCategoriaId] = useState(
    original?.categoriaId ?? params.get('categoria') ?? '',
  );
  const [data, setData] = useState(
    original?.data ?? (mes === mesAtual() ? hojeISO() : ultimoDiaDoMes(mes)),
  );
  const [descricao, setDescricao] = useState(original?.descricao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const opcoes = categorias
    .filter((c) => !c.arquivada || c.id === original?.categoriaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const destino = `/?mes=${original ? mesDe(original.data) : mes}`;

  if (opcoes.length === 0) {
    return (
      <p className="aviso">
        Crie uma categoria antes de lançar despesas.{' '}
        <Link to="/categorias/nova">Criar categoria</Link>
      </p>
    );
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const valor = parseValor(valorTexto);
    if (valor === null) {
      setErro('Informe um valor maior que zero, como 12,50.');
      return;
    }
    if (!opcoes.some((c) => c.id === categoriaId)) {
      setErro('Escolha uma categoria.');
      return;
    }
    if (!ehDataValida(data)) {
      setErro('Informe a data.');
      return;
    }
    setSalvando(true);
    try {
      await repo.salvarDespesa({
        id: original?.id ?? novoId(),
        valor,
        categoriaId,
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
    if (!original || !window.confirm('Excluir esta despesa?')) return;
    await repo.excluirDespesa(original.id);
    await aposAlterar();
    voltar(destino);
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <header className="cabecalho">
        <button type="button" className="voltar" onClick={() => voltar(destino)}>
          ‹ Voltar
        </button>
        <h1>{original ? 'Editar despesa' : 'Nova despesa'}</h1>
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
      <fieldset className="campo">
        <legend>Categoria</legend>
        <div className="chips">
          {opcoes.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={c.id === categoriaId}
              style={{ '--cor-chip': c.cor } as CSSProperties}
              onClick={() => setCategoriaId(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="campo">
        <label htmlFor={ids.data}>Data</label>
        <input id={ids.data} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor={ids.descricao}>Descrição (opcional)</label>
        <input
          id={ids.descricao}
          maxLength={80}
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
          Excluir despesa
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Rotas em `src/ui/App.tsx`**

```tsx
<Route path="/despesa/nova" element={<TelaDespesa />} />
<Route path="/despesa/:id" element={<TelaDespesa />} />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(ui): lançar, editar e excluir despesas"
```

---

### Task 9: Ajustes — exportar e importar backup

**Files:**
- Create: `src/ui/telas/TelaAjustes.tsx`
- Modify: `src/ui/App.tsx` (rota)
- Test: `src/ui/telas/TelaAjustes.test.tsx`

**Interfaces:**
- Consumes: `montarBackup`, `lerBackup`, `ErroBackup`, `DadosBackup`, `repo.exportarTudo/substituirTudo`, `lerUltimoBackup`, `registrarBackup`, `hojeISO`, `formatarDataCompleta`.
- Produces: rota `/ajustes`.

- [ ] **Step 1: Escrever os testes**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { montarBackup } from '../../storage/backup';
import { semear } from '../../test/semear';
import { App } from '../App';

const mercado = { id: 'm', nome: 'Mercado', cor: '#2a9d8f', arquivada: false };

function lerBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.readAsText(blob);
  });
}

beforeEach(async () => {
  window.location.hash = '#/ajustes';
  await semear({ categorias: [mercado] });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ajustes', () => {
  it('exporta um arquivo JSON com os dados e registra a data', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:teste';
    });
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    expect(await screen.findByText('Nenhum backup exportado ainda.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exportar backup' }));
    expect(await screen.findByText('Backup exportado.')).toBeInTheDocument();
    expect(clique).toHaveBeenCalledOnce();
    const conteudo = JSON.parse(await lerBlob(blobs[0]));
    expect(conteudo).toMatchObject({ versao: 1, categorias: [mercado] });
    expect(screen.getByText(/Último backup:/)).toBeInTheDocument();
  });

  it('importa backup válido depois de confirmar', async () => {
    const user = userEvent.setup();
    const backup = montarBackup({
      categorias: [{ id: 'x', nome: 'Lazer', cor: '#e76f51', arquivada: false }],
      limites: [],
      despesas: [],
    });
    render(<App />);
    const arquivo = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    await user.upload(await screen.findByLabelText('Escolher arquivo de backup'), arquivo);
    expect(await screen.findByText(/1 categoria e 0 despesas/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Substituir dados' }));
    expect(await screen.findByText('Backup importado.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Categorias' }));
    expect(await screen.findByText('Lazer')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mercado/ })).not.toBeInTheDocument();
  });

  it('recusa arquivo inválido sem alterar os dados', async () => {
    const user = userEvent.setup();
    render(<App />);
    const arquivo = new File(['{"versao": 7}'], 'backup.json', { type: 'application/json' });
    await user.upload(await screen.findByLabelText('Escolher arquivo de backup'), arquivo);
    expect(await screen.findByRole('alert')).toHaveTextContent('Versão de backup não suportada');
    expect(screen.queryByRole('button', { name: 'Substituir dados' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Categorias' }));
    expect(await screen.findByRole('link', { name: /Mercado/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/ui/telas/TelaAjustes.test.tsx`
Expected: FAIL — rota `/ajustes` não existe.

- [ ] **Step 3: Implementar `src/ui/telas/TelaAjustes.tsx`**

```tsx
import { useId, useState, type ChangeEvent } from 'react';
import { formatarDataCompleta, hojeISO } from '../../domain/mes';
import { ErroBackup, lerBackup, montarBackup, type DadosBackup } from '../../storage/backup';
import { lerUltimoBackup, registrarBackup } from '../backupLocal';
import { useDados } from '../dados';

type Mensagem = { tipo: 'erro' | 'sucesso'; texto: string };

const plural = (n: number, singular: string, pluralTexto: string) =>
  `${n} ${n === 1 ? singular : pluralTexto}`;

function lerArquivo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(arquivo);
  });
}

function baixar(arquivo: File): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TelaAjustes() {
  const { repo, aposAlterar } = useDados();
  const idArquivo = useId();
  const [ultimoBackup, setUltimoBackup] = useState(lerUltimoBackup);
  const [pendente, setPendente] = useState<DadosBackup | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  async function exportar() {
    setMensagem(null);
    try {
      const backup = montarBackup(await repo.exportarTudo());
      baixar(
        new File([JSON.stringify(backup, null, 2)], `despesas-backup-${hojeISO()}.json`, {
          type: 'application/json',
        }),
      );
      registrarBackup();
      setUltimoBackup(lerUltimoBackup());
      setMensagem({ tipo: 'sucesso', texto: 'Backup exportado.' });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível exportar o backup.' });
    }
  }

  async function escolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    setMensagem(null);
    setPendente(null);
    if (!arquivo) return;
    try {
      setPendente(lerBackup(await lerArquivo(arquivo)));
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof ErroBackup ? erro.message : 'Não foi possível ler o arquivo.',
      });
    }
  }

  async function confirmarImportacao() {
    if (!pendente) return;
    try {
      await repo.substituirTudo(pendente);
      await aposAlterar();
      setPendente(null);
      setMensagem({ tipo: 'sucesso', texto: 'Backup importado.' });
    } catch {
      setMensagem({
        tipo: 'erro',
        texto: 'Não foi possível importar. Seus dados não foram alterados.',
      });
    }
  }

  return (
    <>
      <header className="cabecalho">
        <h1>Ajustes</h1>
      </header>
      <section className="secao">
        <h2>Backup</h2>
        <p>
          Seus dados ficam só neste aparelho. Exporte um backup de vez em quando e guarde o arquivo
          num lugar seguro.
        </p>
        <p className="subtitulo">
          {ultimoBackup
            ? `Último backup: ${formatarDataCompleta(ultimoBackup)}`
            : 'Nenhum backup exportado ainda.'}
        </p>
        <button type="button" className="botao botao--primario" onClick={exportar}>
          Exportar backup
        </button>
      </section>
      <section className="secao">
        <h2>Restaurar</h2>
        <p>Importar um backup substitui todos os dados atuais.</p>
        <label htmlFor={idArquivo} className="botao">
          Escolher arquivo de backup
        </label>
        <input
          id={idArquivo}
          type="file"
          accept="application/json,.json"
          className="oculto"
          onChange={escolherArquivo}
        />
        {pendente && (
          <div className="confirmacao">
            <p>
              Substituir todos os dados por este backup com{' '}
              {plural(pendente.categorias.length, 'categoria', 'categorias')} e{' '}
              {plural(pendente.despesas.length, 'despesa', 'despesas')}?
            </p>
            <div className="acoes">
              <button type="button" className="botao botao--perigo" onClick={confirmarImportacao}>
                Substituir dados
              </button>
              <button type="button" className="botao" onClick={() => setPendente(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
      {mensagem && (
        <p role={mensagem.tipo === 'erro' ? 'alert' : 'status'} className={mensagem.tipo}>
          {mensagem.texto}
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 4: Rota em `src/ui/App.tsx`**

```tsx
<Route path="/ajustes" element={<TelaAjustes />} />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Lint e commit**

```bash
npm run format && npm run lint
git add -A
git commit -m "feat(ui): exportar e importar backup"
```

---

### Task 10: PWA instalável e verificação final

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `public/pwa-*.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico` (gerados), `README.md`

**Interfaces:**
- Consumes: `public/favicon.svg`.
- Produces: `dist/` com `manifest.webmanifest` e service worker que funciona offline.

- [ ] **Step 1: Instalar plugin e gerador de ícones**

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
npx pwa-assets-generator --preset minimal-2023 public/favicon.svg
```
Expected: arquivos `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico` em `public/`.

- [ ] **Step 2: Configurar `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Despesas Pessoais',
        short_name: 'Despesas',
        description: 'Orçamento mensal por categoria, offline no seu celular.',
        lang: 'pt-BR',
        theme_color: '#1f7a5c',
        background_color: '#f6f7f5',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```
Em `index.html`, acrescentar `<link rel="apple-touch-icon" href="./apple-touch-icon-180x180.png">`.

- [ ] **Step 3: README**

`README.md` curto: o que é, `npm install`, `npm run dev`, `npm test`, `npm run build`, `npm run preview`; como instalar no celular (abrir a URL publicada no Chrome/Safari → "Adicionar à tela inicial"); lembrete de que os dados ficam no aparelho e o backup está em Ajustes; que a publicação exige HTTPS (ex.: GitHub Pages) para o modo offline funcionar.

- [ ] **Step 4: Verificação completa**

Run: `npm run format && npm run lint && npm test && npm run build`
Expected: tudo com código 0; `dist/manifest.webmanifest` e `dist/sw.js` existem.

- [ ] **Step 5: Teste manual no navegador**

Run: `npm run preview` e abrir a URL. Criar uma categoria com limite, lançar uma despesa, ver o alerta, navegar para o mês anterior, exportar e importar backup; no DevTools → Application, confirmar manifest válido e service worker ativo; recarregar em modo offline e confirmar que o app abre.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: PWA instalável com ícones, manifest e modo offline"
```
