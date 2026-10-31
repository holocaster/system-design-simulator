# Política de segurança

## Escopo e versões

A análise de relatos se concentra no código mais recente da branch `main`.
Se estiver usando uma cópia antiga, verifique se o problema ainda ocorre na
versão atual. Não há compromisso de prazo de resposta ou de correção.

Esta política cobre o simulador e seus arquivos neste repositório. Não autoriza
testes em serviços de terceiros nem em instalações alheias.

## Reportar uma vulnerabilidade

**Não publique detalhes de exploração, credenciais ou dados pessoais em issues
ou pull requests.**

1. Abra a [área de segurança do repositório](https://github.com/holocaster/system-design-simulator/security).
2. Se a opção **Report a vulnerability** estiver disponível, use-a para enviar
   um relato privado.
3. Se essa opção não aparecer, o canal privado não está habilitado. Abra uma
   [issue](https://github.com/holocaster/system-design-simulator/issues/new)
   apenas solicitando um canal privado de segurança, **sem descrever a falha,
   o impacto, os passos de reprodução ou incluir anexos**. Aguarde a definição
   do canal antes de compartilhar essas informações.

No canal privado, inclua a versão ou commit afetado, passos mínimos para
reproduzir, impacto observado e navegador/versão quando relevante. Use dados
fictícios e remova segredos de exemplos, screenshots e logs.

Falhas de interface sem impacto de segurança e sugestões de funcionalidades
devem seguir o [guia de contribuição](CONTRIBUTING.md).

## Chaves e dados no navegador

- A simulação não exige chave de API. A avaliação por IA é opcional.
- A chave do OpenRouter fica no `localStorage` do navegador e é enviada ao
  OpenRouter para autenticar a avaliação. O armazenamento não é criptografado
  pela aplicação e pode ser acessado por scripts executados na mesma origem.
- Não use chaves compartilhadas ou sem limites de gasto em ambientes de teste
  ou dispositivos compartilhados. Se uma chave for exposta, revogue-a no
  provedor; apagar um arquivo ou uma issue não elimina a exposição.
- Ao solicitar uma avaliação, a arquitetura, o enunciado, a carga e as métricas
  são enviados ao OpenRouter e processados conforme o provedor/modelo escolhido.
  Não envie informações confidenciais ou dados de produção.
- Designs e avaliações salvos ou exportados podem conter o texto que você
  forneceu. Revise o conteúdo antes de compartilhar arquivos JSON.
- Não versione chaves, arquivos de ambiente ou configurações reais de servidores.
  Os artefatos de deploy do projeto são exemplos e não substituem uma revisão
  de segurança da instalação.
