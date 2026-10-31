# Como contribuir

Contribuições de código, documentação, exemplos e relatos de bugs são bem-vindas.
Prefira mudanças pequenas, com um objetivo claro.

## Preparar o ambiente

Siga as instruções de instalação do [README](README.md#executar-localmente).
Para enviar código, crie um fork do repositório e uma branch para sua mudança.

Os comandos de verificação são:

```bash
npm run build
npm run lint
npx vitest run
```

Se a mudança afetar a interface, execute também os testes de ponta a ponta:

```bash
npx playwright install chromium
npm run e2e
```

O Playwright inicia o Vite automaticamente. Garanta que a porta `5173` esteja
livre ou servindo este projeto: a configuração pode reutilizar um servidor
ativo nessa porta. Não use o servidor de outro projeto para validar os testes.

## Reportar bugs e sugerir melhorias

Antes de abrir uma [issue](https://github.com/holocaster/system-design-simulator/issues),
procure por um relato equivalente. Inclua:

- O comportamento esperado e o que aconteceu.
- Os passos mínimos para reproduzir, com navegador e versão quando relevante.
- Um design JSON mínimo ou screenshot, se ajudar a explicar o problema.
- Para sugestões, o problema que a melhoria resolve e um exemplo de uso.

Remova chaves de API, dados pessoais, caminhos locais e informações de produção
de screenshots, logs e arquivos anexados. Para vulnerabilidades, use o fluxo
de [SECURITY.md](SECURITY.md), não uma issue pública com detalhes técnicos.

## Alterar o código

- Preserve a separação entre engine, estado e interface; a engine é TypeScript
  puro e determinístico, sem lógica React.
- Na engine, conserve leituras e escritas separadamente: entrada = sucesso +
  erro. Cache e CDN absorvem somente leituras; capacidade é por réplica.
- Cubra alterações de comportamento com testes observáveis, próximos ao código.
  Testes unitários ficam em `src/**/*.test.ts`; testes de interface, em `e2e/`.
- Ao mudar parâmetros ou formatos de dados, confira catálogo, store,
  importação/exportação e avaliação por IA. Considere os designs já salvos.
- Mantenha o texto da interface em português, com acentuação e acessibilidade.
- Não versione credenciais, configurações pessoais ou dados reais de servidores.
  Use exemplos e não adicione dependências sem necessidade.

As decisões e especificações existentes ficam em [.specs/STATE.md](.specs/STATE.md)
e [.specs/features/](.specs/features/). Consulte-as quando a mudança afetar uma
regra do simulador; correções pequenas e documentação não exigem uma nova spec.

## Enviar um pull request

1. Descreva o problema e como a mudança o resolve; vincule uma issue, se houver.
2. Mantenha alterações não relacionadas fora do PR.
3. Informe quais verificações executou e qualquer limitação conhecida.
4. Inclua screenshots para alterações visuais, sem informações sensíveis.

Mudanças apenas de documentação devem ter links, exemplos e comandos revisados;
não é necessário executar a suíte inteira quando o código não foi alterado.
Trate as pessoas com respeito e discuta o código, não características pessoais.

Ao contribuir, você concorda em disponibilizar sua contribuição sob a
[licença MIT](LICENSE) do projeto, preservando os avisos aplicáveis de terceiros.
