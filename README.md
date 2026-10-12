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

## Publicação na VPS do SGAF

Além do GitHub Pages, o app é publicado em **https://despesas.pbrasilautomotiva.com.br**, servido
pelo Caddy do SGAF (os arquivos ficam em `/opt/sgaf/caddy-extra/despesas/`). Um timer do systemd
confere o ramo `master` a cada 2 minutos e, se houver versão nova, gera o build com Docker
(`deploy/deploy.sh`).

Instalação (uma vez só, como root na VPS):

```bash
git clone https://github.com/antonio-pereira-da-silva/despesaspessoais.git /opt/despesas
cp /opt/despesas/deploy/despesas.caddy /opt/sgaf/caddy-extra/
sh /opt/despesas/deploy/deploy.sh
docker compose -f /opt/sgaf/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
cp /opt/despesas/deploy/despesas-atualizar.* /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now despesas-atualizar.timer
```

O DNS precisa de um registro **A** `despesas` apontando para o IP da VPS. Os dados ficam no
navegador e são separados por endereço: para trocar de endereço, exporte o backup no antigo e
importe no novo.
