# loja-legado · Projeto prático da Sprint 3

Conecta+ #11 · Engenharia de Software com IA · **Do board ao PR: spec como issue, skill como workflow, agentes em paralelo**

Este é o repositório do projeto prático da Sprint 3. A loja (Vendure 3.7, SQLite) continua de onde a Sprint 2 parou: o plugin `cupons` da LOJA-1, o harness (`CLAUDE.md` com `AGENTS.md`, hooks, deny do `.env`, statusline, subagente `revisor-codigo`) e o servidor MCP `revisor`, já enxuto. Agora o trabalho vem de um board de issues: um servidor MCP local em `tools/board-mcp/` (um «Linear de bolso», sem conta nem rede). A spec vive na issue, não no código. A skill `/plan-issue` começa na versão 1 do curso, e você a evolui até ela mover o estado da issue, recusar spec vaga e checar tipos antes de dizer pronto. Duas issues sem arquivos em comum rodam em paralelo, em worktrees. As tarefas estão no board do Trello; na aula ao vivo o professor resolve as tarefas essenciais neste mesmo repositório.

| | |
|---|---|
| Board do projeto (Trello) | https://trello.com/b/WCP19qe8 |
| Curso base na Alura | [Engenharia de software na era da IA: planejamento, automações e entrega em escala com agentes de IA](https://cursos.alura.com.br/course/ia-planejamento-automacoes-entrega-escala) (8h estimadas) |
| Lançamento | segunda, 19/10/2026 |
| Aula ao vivo | quinta, 29/10/2026, 9h–10h |
| Entrega do Desafio | sexta, 30/10/2026, por pull request neste repositório |

## Preparar o ambiente

Você precisa de Node.js 22.12 ou mais novo, git e [Claude Code](https://code.claude.com) 2.1.270 ou mais novo (`claude update`), com conta Claude Pro ou chave de API. Não precisa de Docker nem de banco de dados: a loja usa SQLite.

```bash
git clone https://github.com/alexandreaquiles/loja-legado-sprint3.git
cd loja-legado-sprint3
npm install          # ~2 minutos e ~800 MB: o Vendure inteiro vem em node_modules
npm run setup        # branches locais, .env (segredos falsos), vendure.sqlite, board e npm install em tools/revisor-mcp
npm test             # 15 testes verdes, em poucos segundos
npm run smoke:board  # sobe o MCP do board num arquivo temporário e testa claim, bloqueio, sobreposição e lock, sem LLM
node tools/board-mcp/cli.js   # o board no terminal: 7 issues
npm run conferir     # confere os cards 00 a 04: no começo só o 00 fica todo ✔
claude               # abre o agente; aceite confiar na pasta
```

Os servidores `board` e `revisor` já vêm aprovados em `.claude/settings.json` (`enabledMcpjsonServers`), mas o Claude Code só aplica essa aprovação **depois que você confia na pasta** no primeiro `claude`. Pela documentação, um worktree herda a confiança do checkout principal (não testado numa sessão interativa).

## O board

- O estado vive em `.git/board/issues.json`, fora das branches: todos os worktrees enxergam o mesmo board, como um Linear de verdade. `node tools/board-mcp/cli.js reset` volta ao seed (`tools/board-mcp/data/issues.seed.json`).
- `node tools/board-mcp/cli.js show LOJA-2` mostra a issue; `node tools/board-mcp/cli.js mover LOJA-2 done` muda o estado depois do merge; `node tools/board-mcp/cli.js spec LOJA-3 arquivo.json` grava uma spec a partir de um JSON (`-` lê do stdin).
- O servidor recusa o que o time não aceita, com uma mensagem que diz o que fazer: pegar uma issue que já está `in_progress` («LOJA-2 já está in_progress desde…»), mover uma issue bloqueada, transição inválida (`done` é final) e colocar em `in_progress` uma issue cujos `files` se sobrepõem aos de outra em `in_progress`. Duas sessões escrevendo ao mesmo tempo não perdem escrita (lock em arquivo e gravação atômica).

| issue | estado no seed | observação |
|---|---|---|
| LOJA-1 | done | o plugin `cupons` (Sprint 1) |
| LOJA-2 | todo, high | frete grátis por região; cria `src/plugins/compartilhado/uf.ts` |
| LOJA-3 | backlog, medium | primeira compra: só o contexto da PO; a spec é o card 02 |
| LOJA-4 | todo, medium | bloqueada pela LOJA-3 |
| LOJA-5 | todo, urgent | vaga de propósito (Intermediária) |
| LOJA-6 | todo, medium | bloqueada pela LOJA-2 |
| LOJA-7 | todo, high | livre, mas toca `src/plugins/compartilhado/uf.ts`, como a LOJA-2: não roda em paralelo com ela |

## Worktrees

`claude -w loja-2` cria o worktree em `.claude/worktrees/loja-2/`, na branch **`worktree-loja-2`** (o Claude Code sempre prefixa `worktree-`; uma `/` no nome vira `+`). Neste repositório, `.claude/settings.json` define `"worktree": { "baseRef": "head" }`: o worktree parte do seu `HEAD` local, então **faça commit** da skill e do `CLAUDE.md` antes de abrir os worktrees (o padrão do Claude Code seria partir de `origin/main`). O `.worktreeinclude` copia `.env`, `vendure.sqlite` e `tools/revisor-mcp/node_modules`; o `node_modules` da loja é encontrado na raiz (a resolução do Node sobe pastas).

Integrar é trabalho humano: `git merge worktree-loja-2 worktree-loja-3 -m "merge LOJA-2 e LOJA-3"` na `main` (sem `-m`, o git abre o editor), `npm test`, `npx tsc --noEmit`, `node tools/board-mcp/cli.js mover LOJA-2 done`, e limpar com `git worktree remove --force --force .claude/worktrees/loja-2` e `git branch -d worktree-loja-2`. O `claude -w` deixa o worktree *locked*: `remove` e `remove --force` recusam, e o `--force` repetido remove mesmo assim (ou `git worktree unlock .claude/worktrees/loja-2` antes do `remove`).

## As tarefas

Copie o board do Trello para a sua conta e mova os cards. Resumo:

| # | tarefa | etiqueta |
|---|---|---|
| 00 | Preparar o ambiente, rodar o smoke do board e confiar na pasta | Essencial |
| 01 | Sentir o problema: pedir «a próxima issue» sem workflow | Essencial |
| 02 | Spec como issue: completar a LOJA-3 (6 blocos e `files`) e movê-la para `todo` | Essencial |
| 03 | Skill v2: evoluir a `/plan-issue` (estado, Definition of Ready, sobreposição de `files`, gate de tipos) e o `CLAUDE.md` | Essencial |
| 04 | Paralelo: LOJA-2 e LOJA-3 em worktrees, integrar na `main` | Essencial |
| 05 | Intermediária: reescrever a LOJA-5 (em casa; a aula ao vivo não a cobre) | Intermediária |
| 06 | Desafio em 3 níveis, no seu backlog ou no `loja-legado` | Desafio |

Cada card termina com `npm run conferir -- NN`: ✔ feito, ✘ falta, … depende de outro card. É feedback, não nota: nada ali usa LLM nem lê o seu `.env`.

As tarefas essenciais são as que o professor resolve ao vivo na quinta. Tente antes: a aula rende muito mais quando você já esbarrou no problema.

## Branches

- `main`: o estado inicial. Skill `/plan-issue` na versão 1 do curso, `CLAUDE.md` sem regra de workflow, board no seed.
- `gabarito`: a skill v2, o `CLAUDE.md` com o workflow, a LOJA-2 (`src/plugins/regiao/` e `src/plugins/compartilhado/uf.ts`) e a LOJA-3 (`src/plugins/primeira-compra/`) implementadas com testes, a spec de referência da LOJA-3 em `docs/issues/LOJA-3.json` e a da Intermediária em `docs/intermediaria/`. Vale mais espiar depois de tentar: `git show gabarito:<arquivo>`.

## Como entregar o Desafio

Por pull request neste repositório, até a sexta que fecha a sprint. É a única PR que vem para cá: as branches e os merges das tarefas ficam no seu fork ou no seu clone.

1. Faça um fork e, nele, crie a branch `desafio/<seu-usuario>` (já clonou daqui? `gh repo fork --remote` cria o fork e aponta o `origin` para ele).
2. Copie [`entregas/TEMPLATE.md`](entregas/TEMPLATE.md) para `entregas/<seu-usuario>.md` e preencha.
3. Abra a PR para o `main` daqui com o título `[Desafio S3] <seu-usuario> · N1 N2 N3` (só os níveis que fez).

A PR não é mergeada e é pública: nada da sua empresa sem anonimizar. Detalhes no card "Como entregar o Desafio" do Trello.

## Licença

O Vendure é GPLv3. Este repositório de exercício segue a mesma licença.

## Notas do time anterior

Loja no Vendure. Rodar com `npm run dev`. O dashboard é o antigo admin.

Os helpers de `src/misc/` são do relatório do financeiro, não mexer.

Ver com o Fulano antes de mexer no preco.
