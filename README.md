# Despesas Pessoais

App (PWA) para seguir um orçamento mensal com limite por categoria. Funciona offline no
celular e guarda os dados só no próprio aparelho.

- Limite mensal por categoria, com barra verde / amarela (≥ 80%) / vermelha (> 100%)
- Histórico dos meses anteriores
- Backup: exportar e importar um arquivo JSON em **Ajustes**

## Desenvolvimento

```bash
npm install
npm run dev       # servidor local
npm test          # testes (Vitest)
npm run lint      # oxlint + Prettier
npm run build     # gera dist/
npm run preview   # serve o build para testar o modo offline
```

## Usar no celular

1. Publique a pasta `dist/` num endereço **HTTPS** (ex.: GitHub Pages, Netlify). O modo
   offline e a instalação só funcionam em HTTPS.
2. Abra o endereço no Chrome (Android) ou Safari (iPhone) e escolha **Adicionar à tela
   inicial**.

Os dados ficam no navegador do aparelho. Limpar os dados do site apaga as despesas, então
exporte um backup de vez em quando (o app lembra se faz mais de 30 dias).
