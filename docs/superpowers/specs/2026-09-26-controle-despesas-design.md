# Controle de Despesas Pessoais — Design

Data: 2026-09-26

## Objetivo

Aplicativo pessoal, usado principalmente no celular, para seguir um orçamento
mensal com limite por categoria. Critério de sucesso: registrar uma despesa em
menos de 10 segundos e ver imediatamente quanto sobra em cada categoria no mês.

### Decisões do usuário
- Usuário único, uso principal no celular.
- Orçamento com limite mensal por categoria.
- Dados ficam no aparelho, offline, com exportação/importação de backup.
- Primeira versão inclui histórico de meses anteriores e alertas visuais.
- Plataforma: PWA (app web instalável).

### Suposições confirmadas
- Despesa tem valor, categoria, data e descrição opcional.
- Limites se repetem todo mês; alterar um limite vale do mês atual em diante,
  sem alterar meses passados.
- Alertas: amarelo a partir de 80% do limite, vermelho acima de 100%.
- Moeda R$, interface em português (pt-BR).

### Fora do escopo (v1)
Receitas/saldo, despesas recorrentes automáticas, múltiplos usuários,
sincronização em nuvem, gráficos, publicação/deploy (feito à parte, com
confirmação do usuário).

## Stack

- React + TypeScript + Vite
- `vite-plugin-pwa` (service worker, manifest, funcionamento offline)
- `idb` para IndexedDB
- `react-router` v7 com `HashRouter` (funciona em hospedagem estática)
- Vitest + Testing Library + `fake-indexeddb` para testes
- ESLint + Prettier
- CSS simples (CSS Modules ou um arquivo global), mobile-first; sem biblioteca
  de UI

## Arquitetura

```
src/
  domain/    regras puras (sem navegador, sem banco)
  storage/   acesso ao IndexedDB e backup
  ui/        telas e componentes React
```

Regra de dependência: `ui` → `storage` e `domain`; `storage` → `domain`
(tipos); `domain` não depende de nada.

### domain/
- `dinheiro.ts`: valores em centavos (inteiros). `formatarBRL(centavos)`,
  `parseValor("12,34") → 1234` (aceita vírgula ou ponto; rejeita negativos,
  zero e texto inválido).
- `mes.ts`: chave de mês `"AAAA-MM"`. `mesDe(data)`, `mesAnterior`,
  `proximoMes`, `nomeDoMes("2026-09") → "setembro de 2026"`.
- `orcamento.ts`:
  - `limiteVigente(limites, categoriaId, mes)`: o registro com maior
    `vigenteDesde <= mes`; `null` se não houver.
  - `statusAlerta(gasto, limite)`: `"ok"` (<80%), `"atencao"` (≥80% e ≤100%),
    `"estourado"` (>100%), `"sem-limite"` (limite nulo ou zero).
  - `resumoDoMes(categorias, limites, despesas, mes)`: para cada categoria
    visível no mês, `{categoria, limite, gasto, restante, percentual, status}`,
    mais totais do mês.
- `tipos.ts`: tipos de dados (abaixo).

### Modelo de dados
- `Categoria`: `id` (string UUID), `nome`, `cor` (hex), `arquivada` (bool).
- `Limite`: `id`, `categoriaId`, `valor` (centavos), `vigenteDesde` (mês).
  Definir limite para o mês M cria/substitui o registro com
  `vigenteDesde = M`. Meses anteriores continuam usando registros antigos.
- `Despesa`: `id`, `valor` (centavos, > 0), `categoriaId`, `data`
  (`"AAAA-MM-DD"`), `descricao?`, `criadaEm` (ISO timestamp).

Categoria arquivada: não aparece para novos lançamentos nem no mês atual, mas
aparece no histórico dos meses em que teve despesas. Excluir categoria só é
permitido se ela não tiver despesas; caso contrário, oferece arquivar.

### storage/
- `db.ts`: abre o banco `despesas-pessoais` (versão 1) com stores
  `categorias`, `limites` (índice `categoriaId`) e `despesas` (índices `data`
  e `categoriaId`; as despesas do mês são buscadas pelo intervalo de datas
  `AAAA-MM-01` a `AAAA-MM-31`).
- `repositorio.ts`: `listarCategorias`, `salvarCategoria`, `excluirCategoria`,
  `listarLimites`, `definirLimite(categoriaId, valor, mes)`,
  `listarDespesasDoMes(mes)`, `salvarDespesa`, `excluirDespesa`.
- `backup.ts`: `exportarBackup() → { versao: 1, exportadoEm, categorias,
  limites, despesas }`; `validarBackup(json)` verifica estrutura e tipos;
  `importarBackup(dados)` substitui tudo em uma única transação.
- Na inicialização, chama `navigator.storage.persist()` para reduzir o risco
  de o navegador apagar os dados.

## Telas e fluxo

Navegação inferior com três abas: **Mês**, **Categorias**, **Ajustes**.

1. **Mês (início)**
   - Cabeçalho com `‹ setembro de 2026 ›` para navegar entre meses (histórico).
   - Resumo: total gasto × soma dos limites.
   - Lista de categorias com barra de progresso colorida (verde/amarelo/
     vermelho), "R$ gasto de R$ limite" e "sobram R$ X" ou "estourou R$ X".
   - Botão flutuante **+** para nova despesa (sempre visível).
   - Tocar numa categoria abre o detalhe.
2. **Nova/editar despesa**
   - Campo de valor com teclado numérico e foco automático.
   - Categorias como botões (chips) coloridos; um toque seleciona.
   - Data (padrão: hoje; ao lançar a partir de um mês passado, padrão é o
     último dia desse mês) e descrição opcional.
   - Salvar volta à tela anterior. Editar permite também excluir (com
     confirmação).
3. **Detalhe da categoria no mês**
   - Mesmo resumo da barra, lista de despesas (data, descrição, valor);
     tocar abre edição.
4. **Categorias**
   - Lista com nome, cor e limite atual. Criar/editar: nome, cor, limite
     mensal (vale a partir do mês atual). Arquivar/excluir conforme regra acima.
   - Se não houver categorias, mostra sugestões para criar com um toque
     (Mercado, Transporte, Moradia, Lazer, Saúde).
5. **Ajustes**
   - Exportar backup: baixa `despesas-backup-AAAA-MM-DD.json`.
   - Importar backup: escolhe arquivo, valida, mostra resumo (n categorias,
     n despesas) e pede confirmação antes de substituir.
   - Mostra data do último backup exportado; se passar de 30 dias, a tela
     Mês exibe um lembrete discreto.

## Tratamento de erros

- IndexedDB indisponível (ex.: navegação privada restrita): tela de erro
  explicando o problema; o app não tenta funcionar sem armazenamento.
- Valor inválido no formulário: mensagem junto ao campo; não salva.
- Backup inválido ou de versão desconhecida: mensagem de erro; nenhum dado é
  alterado (validação antes da transação).
- Falha ao salvar: mensagem de erro no próprio formulário, que mantém o que
  foi digitado.

## Testes

- `domain/`: testes unitários cobrindo formatação/parse de valores, cálculo
  de meses, `limiteVigente` (mudança de limite no meio do histórico),
  `statusAlerta` nos limites 80%/100%, `resumoDoMes` com categoria arquivada.
- `storage/`: testes com `fake-indexeddb` para CRUD, `definirLimite` e
  exportar → importar (ida e volta idêntica), importação inválida sem efeito.
- `ui/`: testes com Testing Library para os fluxos principais: lançar
  despesa e ver o restante atualizado; navegar para mês anterior; alerta
  amarelo/vermelho.
- `npm run lint`, `npm run test` e `npm run build` devem passar.
