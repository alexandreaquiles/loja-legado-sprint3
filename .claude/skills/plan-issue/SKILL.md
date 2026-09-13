---
name: plan-issue
description: Planeja e executa uma issue do board de ponta a ponta (obter spec, planejar, implementar, testar, conferir contra a spec) atualizando o estado da issue conforme evolui. Use quando o usuário passar um id de issue (ex.: LOJA-2) ou pedir "a próxima issue não bloqueada".
---

# Planejar e executar uma issue do board

Fluxo do time loja para tirar uma issue do board e entregá-la pronta, testada e conferida contra a spec.
O estado da issue vive no board (MCP `board`), nunca só na sua cabeça.

## 0. Pré-requisitos

- MCP `board` disponível (`mcp__board__*`). Se não estiver, PARE e avise.
- Você está em um worktree ou branch própria? Confira com `git branch --show-current`. Nunca trabalhe direto na `main`.

## 1. Escolher a issue

- Se o usuário passou um id, use-o.
- Se pediu "a próxima": chame `mcp__board__list_issues(state="todo", unblocked_only=true)` e pegue a de maior prioridade.
- Antes de assumir, chame `mcp__board__list_issues(state="in_progress")` e compare o campo `files`: se alguma issue em andamento toca os mesmos arquivos que a sua, NÃO pegue essa; pegue a próxima. Paralelo só entre issues que não se sobrepõem em arquivos.

## 2. Obter e ler a spec

- `mcp__board__get_issue(id)`.
- Extraia: contexto, regras, restrições, stack e padrões, critérios de aceite, verificação, arquivos.
- **Definition of Ready:** se faltar regras, critérios de aceite verificáveis ou verificação, a issue NÃO está pronta. Mova para `blocked` com `mcp__board__update_issue_state` e deixe um comentário (`mcp__board__add_comment`) listando as perguntas que a PO precisa responder. Depois, se o usuário pediu "a próxima", volte ao passo 1 e pegue outra. Nunca invente regras para preencher uma spec vaga.

## 3. Planejar

- Releia o `CLAUDE.md` (convenções: centavos inteiros, action devolve negativo, `pricesIncludeTax`, um plugin por domínio em `src/plugins/<nome>/` com `index.ts` exportando `plugin`, nunca reimplementar o que a `Promotion` nativa faz, sem dependências).
- Crie uma ToDo list com todas as tarefas, incluindo o arquivo de teste pedido nos critérios de aceite.
- Procure um exemplo parecido no código (ex.: `src/plugins/cupons/` e `test/cupom.test.ts`) e nos exemplos oficiais em `node_modules/@vendure/core/dist/config/promotion/` para manter coesão.
- Garanta que o plano não toca arquivos listados nas restrições.

## 4. Marcar como in_progress

- `mcp__board__update_issue_state(id, "in_progress")`. Se o board recusar por bloqueio, volte ao passo 1.

## 5. Implementar

- Respeite a stack, as restrições e o plano. Regras puras em `regras.ts`, objetos do Vendure em `promocoes.ts`, plugin em `<nome>.plugin.ts`, teste em `test/<nome>.test.ts`.
- Atualize a ToDo list conforme avança.

## 6. Testar

- Rode `npm test`. Os hooks do projeto também rodam os testes após cada edição; leia o que eles devolvem.
- Se um teste EXISTENTE quebrar, verifique se foi você. Se sim, **PERGUNTE** antes de mudar o teste: talvez uma regra de negócio não prevista precise ser adicionada. Nunca "conserte" um teste mudando a expectativa para bater com o código novo.

## 7. Conferir contra a spec

- Escreva um checklist com cada regra (R1, R2, ...) e cada critério de aceite e valide um por um, citando arquivo e linha.
- `npm test` verde é obrigatório antes de seguir.

## 8. Marcar como in_review e comentar

- `mcp__board__update_issue_state(id, "in_review")`.
- `mcp__board__add_comment(id, body)` com: resumo do que foi implementado, arquivos tocados, checklist dos critérios marcados, comando para verificar.

## 9. Commit

- Commit em conventional commits pt-BR, ex.: `feat(regiao): frete grátis por região (LOJA-2)`. Inclua o id da issue.
- Não faça merge nem push: a integração é decisão humana (revisar, resolver conflitos, mover para `done`).

## Regras de ouro

- **Nunca pule atualização de estado**: in_progress no início, in_review ao entregar, blocked quando travar.
- **Uma issue por vez** neste worktree.
- **Spec ambígua → pergunte antes de assumir.** Não mova para in_review com dúvida em aberto.
- **Paralelo só sem sobreposição de arquivos.**
