# SEO e Deploy na VPS - Tickets

> Versão sanitizada para publicação. Domínio, porta e caminhos são exemplos,
> não dados de uma instalação real.

Spec: `.specs/features/seo-deploy/spec.md`
ADRs: AD-059, AD-060 em `.specs/STATE.md`

Duas frentes independentes, sem dependência técnica entre si:
- SEO: T1 → T2 → T3
- Deploy: T4 (sem bloqueio)

---

# T1 — Meta tags, favicon, robots.txt e sitemap.xml

**Status:** done

**Blocked by:** nada — pode começar imediatamente

**What to build**

`index.html` ganha um `<head>` completo: `<title>` descritivo em pt-BR de
tom educacional (não linguagem de SaaS), `<meta name="description">`,
`<link rel="canonical" href="https://example.com/">`, bloco
Open Graph (`og:title`, `og:description`, `og:type=website`, `og:url`,
`og:locale=pt_BR` — `og:image` fica com um caminho reservado
`/og-image.png`, resolvido de fato no T2), Twitter Card
(`summary_large_image`), JSON-LD `<script type="application/ld+json">` com
`@type: WebApplication` e `applicationCategory: EducationalApplication`, e
`<link rel="icon" type="image/svg+xml" href="/favicon.svg">` (o asset já
existe em `public/favicon.svg`, hoje não referenciado por nenhum HTML).

`public/robots.txt` novo: sem nenhum `Disallow`, liberando todos os
user-agents (busca e IA — inclusive bots de treinamento como `GPTBot` e
`CCBot`, não só os de resposta em tempo real), com uma linha `Sitemap:`
apontando para `/sitemap.xml`.

`public/sitemap.xml` novo: uma única `<url>` com
`https://example.com/`, já que a SPA não tem rotas.

Nenhuma mudança em `src/`.

**Acceptance criteria**

- [x] `index.html` tem `<title>` descritivo, `meta[name=description]`,
      `link[rel=canonical]` apontando para
      `https://example.com/`
- [x] `index.html` tem `og:title`, `og:description`, `og:type`, `og:url`,
      `og:image` (caminho `/og-image.png`), `og:locale`, e Twitter Card
      `summary_large_image`
- [x] `index.html` tem um `<script type="application/ld+json">` válido com
      `@type: WebApplication`
- [x] `index.html` referencia `public/favicon.svg` via
      `link[rel=icon]`
- [x] `public/robots.txt` não tem nenhum `Disallow` e tem uma linha
      `Sitemap:` apontando para `/sitemap.xml`
- [x] `public/sitemap.xml` é XML válido com a única URL do site
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde (229/229),
      e2e verde (12/12)

---

# T2 — Imagem de compartilhamento (og-image) via screenshot real

**Status:** done

**Blocked by:** T1

**What to build**

Um script de captura (reaproveitando o padrão de
`.specs/features/ui-redesign/shot.mjs`: sobe/usa o Vite local, navega até a
página, tira o screenshot via Playwright) que gera `public/og-image.png`
(1200x630) a partir de um estado real do simulador em execução, com o título
do app sobreposto na imagem. O script vive em
`.specs/features/seo-deploy/` (mesma convenção do `shot.mjs`), não é parte do
build nem roda em CI — é executado uma vez para gerar o PNG, que aí sim é
commitado em `public/`.

O `og:image`/Twitter `image` em `index.html` (reservado no T1) passa a
apontar para o arquivo real gerado.

**Acceptance criteria**

- [x] `public/og-image.png` existe, 1200x630, mostra o simulador em execução
      com o título sobreposto
- [x] O script de captura está documentado (como rodar, dependências) em
      `.specs/features/seo-deploy/`
- [x] `og:image` e a imagem do Twitter Card em `index.html` apontam para
      `/og-image.png` (já apontavam desde o T1, que reservou o caminho)
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde (229/229)

---

# T3 — Caso e2e de SEO

**Status:** done

**Blocked by:** T1, T2

**What to build**

Um caso Playwright novo (`e2e/seo.spec.ts`), mesmo padrão de
`e2e/help.spec.ts`: `page.goto("/")` e asserções sobre o DOM real servido
pelo `webServer` do Vite. Cobre `title`, `meta[name=description]`,
`link[rel=canonical]`, presença de `og:title`/`og:image`, `link[rel=icon]`
apontando para `/favicon.svg`, e que `/robots.txt` e `/sitemap.xml`
respondem 200 com o conteúdo esperado (via `page.request.get`, sem precisar
navegar até eles). Só comportamento externo observável — não testa como o
meta tag foi montado internamente.

**Acceptance criteria**

- [x] `e2e/seo.spec.ts` afirma `title`, `meta[name=description]` e
      `link[rel=canonical]` da página
- [x] O caso afirma presença de `og:title` e `og:image`
- [x] O caso afirma `link[rel=icon]` apontando para `/favicon.svg`
- [x] O caso faz uma requisição direta a `/robots.txt` e a `/sitemap.xml` e
      afirma status 200 e conteúdo esperado (sem `Disallow` no robots;
      URL do site no sitemap)
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde (229/229),
      playwright verde (13/13, caso novo incluso)

---

# T4 — nginx.conf e script de deploy pull-based

**Status:** done

**Blocked by:** nada — frente independente, pode começar imediatamente

**What to build**

Novo diretório `deploy/` na raiz do repo:

`deploy/nginx/system-design.conf.example` — `listen 443 ssl http2`
(e `[::]:443`), `server_name example.com`;
`ssl_certificate`/`ssl_certificate_key` apontando para caminhos de exemplo
(`/etc/ssl/example.com/fullchain.pem` e `/etc/ssl/example.com/privkey.pem`),
a substituir antes da instalação; `ssl_protocols TLSv1.2 TLSv1.3`;
headers `X-Content-Type-Options:
nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`; `gzip on` para tipos textuais. `root`
aponta para `/var/www/example.com/current` (symlink
gerenciado pelo script de deploy). `location /` com `try_files $uri $uri/
/index.html;` para fallback de SPA. `location` separado para extensões de
asset versionado (`js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2`) com
`Cache-Control: public, immutable` e expiração longa. `location =
/index.html` com `Cache-Control: no-cache` explícito.

`deploy/build-and-run.sh` — roda dentro do repo já clonado em
`REPO_DIR=/srv/system-design-simulator` na própria VPS: `set -euo pipefail`
no topo; `git pull`; `npm ci`; `npm run build`; copia `dist/` para
`releases/<id>` sob `/var/www/example.com/`; `nginx -t`
antes de qualquer troca; symlink atômico `current` apontando para a nova
release; `systemctl reload nginx`. Sem `rsync`/`scp` de máquina local —
pull-based (AD-060).

Sem teste automatizado (`nginx` e `shellcheck` indisponíveis neste ambiente
de desenvolvimento) — a validação de sintaxe já está embutida no próprio
script (`nginx -t` antes do reload e antes de trocar o symlink).

**Acceptance criteria**

- [x] `deploy/nginx/system-design.conf.example` usa HTTPS na porta 443,
      `server_name example.com` e caminhos de certificado de exemplo
- [x] Config tem os três headers de segurança e `gzip on`
- [x] `root` aponta para `.../current`; `location /` faz fallback de SPA via
      `try_files`
- [x] Assets versionados (extensões de build) recebem cache longo e
      imutável; `index.html` recebe `no-cache` explícito
- [x] `deploy/build-and-run.sh` é executável, usa
      `REPO_DIR=/srv/system-design-simulator`, roda `set -euo pipefail`, e
      segue a sequência: `git pull` → `npm ci` → `npm run build` → copia
      release → `nginx -t` → symlink `current` → reload
- [x] Script falha (não segue adiante) se `nginx -t` falhar (`set -e` +
      chamada direta, sem `||true`)
- [x] Nenhum `rsync`/`scp` de máquina local no script
- [x] `npm run build` do projeto continua verde (o script não altera nada em
      `src/`); `bash -n` confirma sintaxe válida do script (nginx/shellcheck
      indisponíveis neste ambiente, conforme a spec)

**Correções da revisão independente (batch flush):** os três `add_header` de
segurança, declarados só no `server`, não eram herdados pelos dois `location`
que já tinham `add_header` próprio (`= /index.html` e o regex de assets) —
regra de herança do nginx. Passaram a ser repetidos nos três `location`. O
script foi commitado sem bit executável (`core.filemode=false` neste repo
esconde um `chmod +x` local do índice do git); corrigido com
`git update-index --chmod=+x`.
