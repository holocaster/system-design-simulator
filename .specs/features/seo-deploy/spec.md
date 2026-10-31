---
status: ready-for-agent
---

# SEO e deploy na VPS

> Versão sanitizada para publicação. Domínio, porta e caminhos abaixo são
> exemplos; configure-os para a instalação de destino.

## Problem Statement

O Simulador de System Design é uma SPA React/Vite 100% client-side, sem
backend e sem rotas. Hoje o `index.html` só tem um `<title>` genérico, sem
meta description, sem Open Graph, sem `robots.txt`, sem `sitemap.xml` e sem
favicon vinculado (existe um `public/favicon.svg` de scaffold que nenhum HTML
referencia) — buscadores e crawlers de IA não têm como entender do que se
trata a página nem indexá-la de forma útil, e compartilhar o link em redes
sociais não gera um card decente. Além disso, não existe nenhum artefato de
deploy: sem `nginx.conf` e sem script para publicar o build numa VPS, colocar
o app no ar hoje seria um processo manual e não repetível.

## Solution

Duas frentes dentro da mesma feature:

1. **SEO** — meta tags completas em `index.html` (title, description,
   canonical, Open Graph, Twitter Card, JSON-LD `WebApplication`), favicon
   vinculado, `robots.txt` liberando todos os crawlers, `sitemap.xml` com a
   única URL do site, e uma imagem `og-image` gerada a partir de um
   screenshot real do simulador rodando.
2. **Deploy na VPS** — `nginx.conf` servindo os assets estáticos do build com
    fallback de SPA, TLS com certificado configurado na instalação, e um
   script de deploy pull-based que roda dentro do repo clonado na própria VPS
   (`git pull` → build → symlink de release → reload do nginx).

## User Stories

1. Como usuário do Google, ao pesquisar por termos como "simulador de system
   design" ou "aprender arquitetura de sistemas", quero ver um título e uma
   descrição claros no resultado de busca, para decidir se vale clicar.
2. Como usuário de um assistente de IA (ChatGPT, Perplexity, Claude), quero
   que o assistente consiga encontrar, entender e citar o simulador como
   recurso educacional, para descobri-lo através de uma conversa, não só de
   busca tradicional.
3. Como usuário que recebe o link do simulador pelo WhatsApp/LinkedIn/Twitter,
   quero ver um card de compartilhamento com título, descrição e uma imagem
   real da ferramenta, para entender do que se trata antes de clicar.
4. Como usuário com a aba do simulador aberta entre várias outras, quero
   reconhecer a aba pelo favicon, para achá-la rapidamente.
5. Como mecanismo de busca ou crawler de IA, quero um `robots.txt` explícito
   permitindo o rastreamento (inclusive de bots de treinamento como
   `GPTBot`/`CCBot`), para não haver ambiguidade sobre a política do site.
6. Como mecanismo de busca, quero um `sitemap.xml` apontando para a URL
   canônica do site, para confirmar a URL preferida de indexação.
7. Como responsável pela operação, quero um `nginx.conf` pronto para
   um domínio configurável, para servir o build estático com TLS,
   headers de segurança, fallback de SPA e cache de assets versionados sem
   precisar desenhar a configuração do zero.
8. Como responsável pela operação, quero um script de deploy que faça
   `git pull`, instale dependências, builde e troque a release em produção
   com um único comando rodado na VPS, para publicar uma nova versão de forma
   repetível e sem passos manuais esquecíveis.
9. Como responsável pela operação, quero que o script valide a config do
   nginx (`nginx -t`) antes de recarregar, para uma release quebrada não
   derrubar o site no ar.
10. Como desenvolvedor lendo o repo depois, quero as decisões de infra (porta,
    caminho do certificado, política de crawlers) registradas como ADR, para
    entender por que a config é assim sem precisar perguntar.

## Implementation Decisions

### SEO (`index.html`, `public/`)

- `index.html` ganha: `<title>` descritivo em pt-BR voltado ao objetivo
  educacional (não linguagem de produto SaaS); `<meta name="description">`;
  `<link rel="canonical" href="https://example.com/">`;
  Open Graph (`og:title`, `og:description`, `og:type=website`,
  `og:url`, `og:image`, `og:locale=pt_BR`); Twitter Card
  (`summary_large_image`); JSON-LD `<script type="application/ld+json">` com
  `@type: WebApplication`, `applicationCategory: EducationalApplication`.
- `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` adicionado —
  o asset já existe em `public/favicon.svg` mas hoje não é referenciado por
  nenhum HTML.
- `public/robots.txt`: sem nenhum `Disallow`, liberando todos os user-agents
  (busca e IA — Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot,
  ChatGPT-User, CCBot, Google-Extended incluídos), com `Sitemap:` apontando
  para `sitemap.xml`. Decisão registrada em AD-059.
- `public/sitemap.xml`: uma única `<url>` com `https://example.com/`,
  já que a SPA não tem rotas.
- `public/og-image.png` (1200x630): gerada capturando um screenshot real do
  simulador em execução — reaproveitando o padrão de `shot.mjs` da feature
  `ui-redesign` (sobe o Vite, navega, tira o screenshot) — com o título do
  app sobreposto. Não é um asset desenhado à mão nem um placeholder genérico.
  O script de captura fica documentado (não versionado como parte do build;
  roda uma vez para gerar o PNG, como o `shot.mjs`).
- Nenhuma mudança de código em `src/` — a feature é inteiramente `index.html`
  + `public/`.

### Deploy (nginx.conf + script)

- Novo diretório `deploy/` na raiz do repo, contendo
  `nginx/system-design.conf.example` e o script de deploy.
- Modelo nginx: `listen 443 ssl http2` (e `[::]:443`),
  `server_name example.com`; `ssl_certificate`/`ssl_certificate_key`
  apontando para caminhos de exemplo (`/etc/ssl/example.com/fullchain.pem`
  e `/etc/ssl/example.com/privkey.pem`), a substituir antes da instalação;
  `ssl_protocols TLSv1.2 TLSv1.3`; headers `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`;
  `gzip on` para os tipos textuais (`text/css`, `application/javascript`,
  `application/json`, `image/svg+xml`, etc.).
- `root` aponta para `/var/www/example.com/current` (symlink
  gerenciado pelo script de deploy, não um caminho fixo de build).
  `location /` usa `try_files $uri $uri/ /index.html;` para o fallback de
  SPA. Um `location` separado para extensões de asset versionado
  (`js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2`) aplica `Cache-Control:
  public, immutable` com expiração longa, já que o Vite tem hash no nome de
  saída. `index.html` recebe `Cache-Control: no-cache` explícito no seu
  próprio `location =`, para uma release nova nunca ficar presa atrás de
  cache de borda servindo referências a assets antigos já substituídos.
- Script de deploy (`deploy/build-and-run.sh` ou nome equivalente): roda
  dentro do repo já clonado em `REPO_DIR=/srv/system-design-simulator` na
  própria VPS. Sequência: `git pull` → `npm ci` → `npm run build` → copia
  `dist/` para `releases/<id>` sob `/var/www/example.com/`
  → `nginx -t` → symlink atômico `current` → `nginx` reload
  (`systemctl reload nginx`). `set -euo pipefail` no topo.
  Não faz `rsync`/`scp` de máquina local — é pull-based, decisão registrada
  em AD-060.
- Porta, caminhos dos certificados e diretórios do servidor são parâmetros
  da instalação; os valores versionados são apenas exemplos.

## Testing Decisions

- **SEO**: um caso e2e Playwright novo (`e2e/seo.spec.ts`), seguindo o padrão
  de `e2e/help.spec.ts` (`page.goto("/")`, asserts sobre o DOM real via
  `webServer` do Vite). Cobre: `title` da página; presença e conteúdo de
  `meta[name=description]`; `link[rel=canonical]`; `og:title`/`og:image`
  presentes; `link[rel=icon]` aponta para `/favicon.svg`; requisição direta a
  `/robots.txt` e `/sitemap.xml` responde 200 com o conteúdo esperado
  (via `page.request.get`, sem precisar navegar). Só comportamento externo
  observável (conteúdo servido), não detalhe de implementação de como o meta
  tag foi montado.
- **nginx.conf / script de deploy**: sem teste automatizado — `nginx` e
  `shellcheck` não estão disponíveis neste ambiente de desenvolvimento. A
  validação de sintaxe do nginx já está embutida no próprio script
  (`nginx -t` roda antes do reload e antes de trocar o symlink de release, o
  que também previne publicar uma config quebrada). Validação funcional fica
  manual, feita direto na VPS no primeiro deploy real.
- Nenhum teste unitário novo — não há lógica em `src/engine/` ou `src/store/`
  tocada por esta feature.

## Out of Scope

- CI/CD automatizado (GitHub Actions ou equivalente) disparando o deploy
  sozinho a cada push — o script roda manualmente via SSH por enquanto.
- Provisionamento da VPS em si (instalar nginx, configurar certificados,
  liberar a porta HTTPS no firewall) — o servidor deve estar preparado.
- Google Search Console, submissão manual de sitemap, verificação de
  propriedade de domínio — passos que o usuário executa fora do repo.
- Analytics, tags de rastreamento (GA4, Meta Pixel etc.) — não pedido e fora
  do objetivo educacional declarado.
- Sitemap com múltiplas URLs / rotas — a SPA não tem roteamento hoje; se
  ganhar rotas no futuro, o sitemap precisa ser revisitado.
- Compressão Brotli (só `gzip`) — ganho marginal sobre gzip para o tamanho de
  bundle atual, não justificado neste momento.
- Testes automatizados de configuração de nginx/shell (ex.: rodar `nginx -t`
  em CI) — exigiria instalar nginx no ambiente de CI, desproporcional ao
  tamanho da feature.

## Further Notes

- Decisões de deploy e política de crawlers registradas como AD-059 e
  AD-060 em `.specs/STATE.md`, sem dados de uma infraestrutura pessoal.
- O backlog em `.specs/STATE.md` já continha uma nota datada de 2026-07-22
  antecipando as duas frentes ("SEO e `nginx.conf`"); esta spec fecha esse
  item.
