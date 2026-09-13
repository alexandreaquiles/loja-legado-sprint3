# loja-legado · Projeto prático da Sprint 3

Conecta+ #11 · Engenharia de Software com IA · **Do board ao PR: spec como issue, skill como workflow, agentes em paralelo**

Este é o repositório do projeto prático da Sprint 3. A loja (Vendure 3.7, SQLite) já tem o harness da Sprint 1 e o plugin `cupons` pronto. Agora o trabalho vem de um board de issues: um servidor MCP local em `tools/board-mcp/` (um «Linear de bolso», sem conta nem rede). A spec vive na issue, não no código. Uma skill, `/plan-issue`, ensina o agente a tirar uma issue do board e entregá-la em uma branch própria; duas issues sem arquivos em comum rodam em paralelo, em worktrees. As tarefas estão no board do Trello; na aula ao vivo o professor resolve as tarefas essenciais neste mesmo repositório.

| | |
|---|---|
| Board do projeto (Trello) | https://trello.com/b/hYwskAe5 |
| Curso base na Alura | [Engenharia de software na era da IA: planejamento, automações e entrega em escala com agentes de IA](https://cursos.alura.com.br/course/ia-planejamento-automacoes-entrega-escala) (8h estimadas) |
| Lançamento | segunda, 19/10/2026 |
| Aula ao vivo | quinta, 29/10/2026, 9h–10h |
| Entrega do Desafio | sexta, 30/10/2026, no Discord da turma |

## Preparar o ambiente

Você precisa de Node.js 22.12 ou mais novo, git e [Claude Code](https://code.claude.com) (com conta Claude Pro ou chave de API). Não precisa de Docker nem de banco de dados: a loja usa SQLite.

```bash
git clone https://github.com/alexandreaquiles/loja-legado-sprint3.git
cd loja-legado-sprint3
npm install       # ~2 minutos e ~800 MB: o Vendure inteiro vem em node_modules
npm run setup     # cria o .env (segredos falsos) e o vendure.sqlite (54 produtos de exemplo)
npm test          # 15 testes verdes, em ~1 segundo
npm run smoke:board   # sobe o MCP do board e chama cada tool, sem LLM
node tools/board-mcp/cli.js   # o board no terminal: 6 issues
npm run dev       # sobe a loja: http://localhost:3000/dashboard (superadmin / superadmin)
claude            # abre o agente; aprove o servidor MCP "board" quando ele perguntar
```

Com a loja no ar: `http://localhost:3000/dashboard` é o admin, `http://localhost:3000/graphiql` tem o Shop API e o Admin API para consultar. Pare com `Ctrl+C`. Se o `better-sqlite3` não compilar na sua máquina, avise no Discord: há um plano B com `sql.js`.

## As tarefas

Copie o board do Trello para a sua conta e mova os cards. Resumo:

| # | tarefa | etiqueta |
|---|---|---|
| 00 | Preparar o ambiente, rodar o smoke do board e aprovar o MCP | Essencial |
| 01 | Sentir o problema: pedir a LOJA-2 «na mão», sem skill nem branch | Essencial |
| 02 | Spec como issue: os 6 blocos, LOJA-2 versus LOJA-5, Definition of Ready | Essencial |
| 03 | Skill `/plan-issue`: o workflow do time como arquivo | Essencial |
| 04 | Paralelo: LOJA-2 e LOJA-3 em worktrees (`claude -w`), integrar na `main` | Essencial |
| 05 | Intermediária: 6 linhas para a LOJA-5 (feito na aula ao vivo) | Intermediária |
| 06 | Desafio: Board Challenge no seu backlog (badges 🧭 🛠️ 🌳 🏆) | Desafio |

As tarefas essenciais são as que o professor resolve ao vivo na quinta. Tente antes: a aula rende muito mais quando você já esbarrou no problema.

## Branches

- `main`: o estado inicial, com o board seedado (LOJA-1 done, LOJA-2 e LOJA-3 prontas, LOJA-5 vaga).
- `gabarito`: LOJA-2 (`src/plugins/regiao/`) e LOJA-3 (`src/plugins/primeira-compra/`) implementadas, com testes. Vale mais espiar depois de tentar.

Worktrees: `claude -w loja-2` cria um worktree dentro de `.claude/worktrees/`; o `node_modules` da raiz é encontrado de lá (resolução do Node sobe pastas), e `.env` e `vendure.sqlite` são copiados pelo `.worktreeinclude`.

## Como entregar o Desafio

Poste no Discord da turma até a sexta que fecha a sprint, com o template do card "Como entregar" no Trello. Quem terminar antes da aula pode mostrar ao vivo, se der tempo.

## Licença

O Vendure é GPLv3. Este repositório de exercício segue a mesma licença.

## Notas do time anterior

Loja no Vendure. Rodar com `npm run dev`. O dashboard é o antigo admin.

Os helpers de `src/misc/` são do relatório do financeiro, não mexer.

Ver com o Fulano antes de mexer no preco.
