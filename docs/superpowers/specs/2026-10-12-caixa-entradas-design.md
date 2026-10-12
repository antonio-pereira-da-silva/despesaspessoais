# Entradas e Relatório de Caixa — Design

Data: 2026-10-12

## Objetivo

Registrar entradas de dinheiro (salário, freelas, reembolsos) e ver um
relatório tipo caixa — entradas, saídas e saldo — por mês e por período livre,
com totais.

### Decisões do usuário
- Entradas são lançadas uma a uma no app (valor, data, descrição).
- Entradas **não** têm categoria.
- Relatório com dois modos: "Por mês" (resumo mensal) e "Por período"
  (extrato por datas livres).

### Fora do escopo
Gráficos, exportar relatório (PDF/CSV), saldo inicial/bancário, categorias de
entrada, entradas recorrentes.

## Modelo de dados

```ts
interface Entrada {
  id: string;
  valor: Centavos;   // > 0
  data: string;      // "AAAA-MM-DD"
  descricao?: string;
  criadaEm: string;  // ISO timestamp
}
```

Despesas continuam sendo as "saídas"; nada muda no tipo `Despesa`.

## Armazenamento

- `db.ts`: banco passa para a versão 2. O `upgrade` usa `oldVersion`:
  - `< 1`: cria `categorias`, `limites`, `despesas` (como hoje).
  - `< 2`: cria store `entradas` (`keyPath: 'id'`, índice `data`).
  Dados existentes não são tocados.
- `repositorio.ts` ganha:
  - `listarEntradasDoPeriodo(inicio, fim)` e
    `listarDespesasDoPeriodo(inicio, fim)` — faixa inclusiva por índice `data`.
  - `obterEntrada`, `salvarEntrada`, `excluirEntrada`.
  - `exportarTudo` / `substituirTudo` incluem `entradas` (mesma transação).
  - `DadosCompletos` ganha `entradas: Entrada[]`.

## Backup

- `montarBackup` passa a gerar `versao: 2` com a lista `entradas`.
- `validarBackup` aceita `versao` 1 ou 2:
  - versão 1: `entradas = []`;
  - versão 2: valida cada entrada (id, valor inteiro ≥ 1, data válida,
    criadaEm, descrição opcional string) com a mesma mensagem de erro no
    padrão atual ("Backup inválido: entrada N está incorreta.").
  - outra versão: "Versão de backup não suportada."

## Domínio — `src/domain/caixa.ts`

Funções puras, sem navegador:

- `resumoPorMes(entradas, despesas, deMes, ateMes)` →
  `{ meses: LinhaMes[], totais: { entradas, saidas, saldo } }`, onde
  `LinhaMes = { mes, entradas, saidas, saldo, acumulado }`. Inclui todos os
  meses do intervalo, mesmo os sem lançamentos (zeros). `acumulado` começa em
  0 no primeiro mês do intervalo. Se `deMes > ateMes`, os dois são trocados.
- `extratoDoPeriodo(entradas, despesas, categorias, inicio, fim)` →
  `{ linhas: LinhaExtrato[], totais }`, onde
  `LinhaExtrato = { tipo: 'entrada' | 'saida', id, data, descricao, valor, saldo }`.
  Ordem: data crescente, depois `criadaEm` crescente. `descricao` da saída é a
  descrição da despesa ou, se vazia, o nome da categoria; da entrada é a
  descrição ou "Entrada". `saldo` é o saldo corrente desde o início do
  período (começa em 0). Lançamentos fora de `[inicio, fim]` são ignorados.
- `resumoDetalheMes(entradas, despesas, categorias, mes)` →
  entradas do mês (lista), saídas agrupadas por categoria (nome, cor, total,
  ordenadas por total decrescente) e totais.

## Interface

### Navegação
`NavInferior` ganha o item **📊 Caixa** (`/caixa`), entre "Mês" e
"Categorias".

### Tela do Mês (alteração)
Abaixo do total gasto, uma linha: *Entradas R$ X · Saldo R$ Y* (saldo
negativo em vermelho) e link **+ Entrada** (`/entrada/nova?mes=…`). O botão
flutuante continua sendo "Nova despesa".

### `TelaEntrada` (`/entrada/nova`, `/entrada/:id`)
Mesmo padrão de `TelaDespesa`: campos valor, data, descrição; validação com
`parseValor`/`ehDataValida`; data padrão = hoje no mês atual, senão último dia
do mês da URL; botão excluir (com confirmação) na edição; ao salvar, volta.

### `TelaCaixa` (`/caixa`)
Duas abas no topo, guardadas na URL (`?modo=mes|periodo`), para o voltar
funcionar.

**Por mês** (`?modo=mes&de=AAAA-MM&ate=AAAA-MM`)
- Seletores de mês inicial e final (`<input type="month">`). Padrão: 5 meses
  antes do atual até o atual.
- Tabela: Mês | Entradas | Saídas | Saldo | Acumulado; valores negativos em
  vermelho; linha final "Total" com entradas, saídas e saldo do período.
- Cada mês é um link para `/caixa/mes/AAAA-MM` (detalhe).

**Por período** (`?modo=periodo&inicio=AAAA-MM-DD&fim=AAAA-MM-DD`)
- Seletores de data inicial e final. Padrão: dia 1 do mês atual até hoje.
- Extrato: data, descrição, valor (+ verde entrada / − saída), saldo
  corrente. Tocar abre `/entrada/:id` ou `/despesa/:id`.
- Rodapé: Total de entradas, Total de saídas, Saldo do período.
- Sem lançamentos: "Nenhum lançamento neste período."

### `TelaCaixaMes` (`/caixa/mes/:mes`)
Cabeçalho com nome do mês e voltar. Seções: Entradas (lista, cada uma
editável), Saídas por categoria (bolinha de cor, nome, total), e totais
(entradas, saídas, saldo).

Em telas estreitas a tabela usa fonte menor e valores alinhados à direita;
sem rolagem horizontal da página.

### Dados na UI
`dados.ts` ganha `useLancamentosDoPeriodo(inicio, fim)` que retorna
`{ entradas, despesas } | null`, recarregando quando `versao` muda (mesmo
padrão de `useDespesasDoMes`).

## Testes

- `caixa.test.ts`: meses vazios no intervalo, acumulado, intervalo invertido,
  ordem e saldo corrente do extrato, limites inclusivos de datas, descrição
  padrão, agrupamento por categoria.
- `repositorio.test.ts`: CRUD de entradas, busca por período, exportar e
  substituir incluindo entradas.
- `backup.test.ts`: versão 2 completa, versão 1 importada com `entradas = []`,
  entrada inválida rejeitada.
- `db`: abrir banco criado na versão 1 (com despesas) migra para 2 sem perder
  dados.
- Telas: `TelaEntrada` (criar, editar, excluir), `TelaCaixa` (troca de aba,
  totais exibidos, link do mês), linha de entradas/saldo na `TelaMes`.
