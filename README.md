# System Design Simulator

Simulador visual de arquiteturas de software. Monte um fluxo com drag-and-drop,
ajuste a carga e acompanhe capacidade, latência, erros e saúde dos componentes.

## Recursos

- Canvas baseado em React Flow com client, CDN, load balancer, API gateway,
  service, cache, filas, workers, SQL, NoSQL e storage.
- Simulação determinística com mix global de leituras e escritas.
- Réplicas para service, worker, cache e bancos; queda gradual sob sobrecarga e
  recuperação por reinício de atraso fixo. Autoscaling opcional por componente
  (piso, teto e utilização-alvo), independente do ciclo de vida da réplica.
- SQL escala leitura com réplicas, mas mantém uma primária de escrita. NoSQL
  escala escrita por shards e leitura por shards e réplicas.
- Cada design tem identidade própria (nome opcional, salvar/carregar/renomear/
  excluir, aviso de alterações não salvas), exportação/importação JSON e
  avaliação por IA.
- Tema claro/escuro, preferência do navegador.

## Desenvolvimento

Requer Node.js e npm.

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

## Avaliação por IA

Em **Configurar API**, informe uma chave e um model ID do OpenRouter. Ambos ficam
somente no localStorage do navegador e a avaliação recebe o design, as métricas
e a carga atual da simulação.

## Publicação e deploy

Este projeto usa `https://example.com` como domínio de exemplo. Antes de publicar
o site, substitua esse domínio em `index.html`, nos arquivos de `public/` e em
`e2e/seo.spec.ts`. Isso inclui canonical, Open Graph, JSON-LD, sitemap,
`robots.txt` e `llms.txt`.

O arquivo `deploy/nginx/system-design.conf.example` é um modelo: configure
domínio, porta, certificados e diretório de publicação antes de instalá-lo.
Ajuste também os diretórios em `deploy/build-and-run.sh` antes de executá-lo.
Os dados de infraestrutura nas especificações são exemplos, não uma
configuração de produção.

Para não expor seu e-mail no novo histórico Git, configure um nome público e
o e-mail `noreply` fornecido pelo GitHub antes do primeiro commit.

## Verificação

```bash
npm run build
npm run lint
npx vitest run
npm run e2e
```
