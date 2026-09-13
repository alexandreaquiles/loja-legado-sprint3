# Intermediária · a LOJA-5 reescrita

A LOJA-5 chega no board como "Melhorar o sistema de cupons", urgente, com um contexto de corredor e um critério que não dá para verificar ("Deve funcionar bem e ficar mais claro"). O exercício não é implementar: é fazer o papel da PO e deixar a issue pronta (Definition of Ready) ou dizer, por escrito, o que falta perguntar.

Há duas respostas aceitas. Nenhuma inventa regra de negócio.

## Resposta A · as perguntas que bloqueiam a issue

A skill v2 move a LOJA-5 para `blocked` e comenta. Um bom comentário:

1. Qual é a confusão dos clientes? (mensagem de erro do cupom, cupom que não aplica em silêncio, desconto diferente do anunciado?) Um exemplo real de pedido ou chamado.
2. Qual é a reclamação do financeiro? (desconto acima do teto, dois cupons no mesmo pedido, relatório?) Valor ou pedido de exemplo.
3. O que "ficar mais claro" muda na tela ou na API? Quem valida?
4. Até quando (data da Black Friday) e o que pode ficar para depois?
5. O que NÃO pode mudar (teto de 30% da LOJA-1, `src/misc/preco.ts`, promoções já cadastradas)?

## Resposta B · uma LOJA-5 pronta, depois da conversa com a PO

Suponha que a PO respondeu: "o financeiro viu um cupom de 20% dar R$ 1.000 de desconto num pedido de R$ 5.000; quer um teto em reais por cupom, e o cliente precisa ver esse teto na descrição". Aí a issue vira:

- **Contexto:** a action `desconto_percentual_com_teto` (LOJA-1) limita o percentual a 30%, mas não o valor. Em pedidos grandes o desconto passa do que o financeiro aceita. Black Friday em 27/11.
- **Regras:** R1. Nova action `desconto_percentual_com_teto_em_reais` no plugin `cupons`, com os argumentos `pct` (int) e `tetoCentavos` (int). R2. Desconto = o menor entre `pct`% da base (limitado a 30%, como na LOJA-1) e `tetoCentavos`. R3. Base respeita `ctx.channel.pricesIncludeTax`; resultado negativo, em centavos inteiros, arredondado uma vez. R4. `description` em `pt_BR` e `en` mostra o percentual e o teto.
- **Restrições:** não alterar a `desconto_percentual_com_teto` nem `src/misc/preco.ts`; somar às actions nativas; não criar entidade nem migration; não instalar dependências.
- **Stack e padrões:** Vendure 3.7, TypeScript, vitest; conta pura em `src/plugins/cupons/regras.ts`.
- **Critérios de aceite:** `test/cupom.test.ts` com: 20% de R$ 5.000,00 e teto R$ 300,00 → `-30000`; 20% de R$ 100,00 e teto R$ 300,00 → `-2000`; `pct` 50 limitado a 30%; `pricesIncludeTax` false usa `subTotal`. `npm test` verde.
- **Verificação:** `npm test && npx tsc --noEmit`.
- **files:** `src/plugins/cupons/regras.ts`, `src/plugins/cupons/promocoes.ts`, `src/plugins/cupons/cupons.plugin.ts`, `test/cupom.test.ts`.

Gravar no board: peça ao agente um `save_issue_spec` com esses blocos (ou `node tools/board-mcp/cli.js spec LOJA-5 arquivo.json`). O `save_issue_spec` não muda o estado: a LOJA-5 continua `todo` e agora passa na Definition of Ready.

## O que costuma faltar

- `files` vazio: sem ele o board não consegue recusar paralelo com sobreposição.
- Critério de aceite sem arquivo de teste ou sem comando.
- Regra que é solução técnica escondida ("refatorar o plugin") em vez de comportamento verificável.
