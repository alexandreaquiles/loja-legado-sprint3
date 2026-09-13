#!/usr/bin/env node
// npm run conferir            confere os cards 00 a 04 da Sprint 3
// npm run conferir -- 02      confere só um card
// npm run conferir -- --estrito   sai com 1 se houver algum ✘ (usado na verificação do curso)
//
// Feedback, não prova: Node puro, sem dependências próprias, sem LLM. Nunca lê o conteúdo do .env.
// Roda o vitest da loja e o smoke do board (tools/board-mcp/smoke.mjs --json, num board temporário) e lê o
// board de verdade (.git/board/issues.json) só para consultar estados e specs.
// ✔ feito · ✘ falta fazer (com a dica do que olhar) · … pendente (depende de outro item ainda não feito)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const estrito = args.includes('--estrito');
const filtro = args.filter((a) => /^\d{1,2}$/.test(a)).map((a) => a.padStart(2, '0'));

const SKILL = '.claude/skills/plan-issue/SKILL.md';
const REF_LOJA3 = 'docs/issues/LOJA-3.json'; // só no gabarito
const PASTA = { 'LOJA-2': 'src/plugins/regiao', 'LOJA-3': 'src/plugins/primeira-compra' };

// ---------- utilitários ----------
const arq = (...p) => path.join(raiz, ...p);
const existe = (...p) => fs.existsSync(arq(...p));
const ler = (...p) => { try { return fs.readFileSync(arq(...p), 'utf8'); } catch { return null; } };
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function git(...a) {
  const r = spawnSync('git', a, { cwd: raiz, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}
const temBranch = (nome) => git('rev-parse', '--verify', '--quiet', `refs/heads/${nome}`) !== null;
const branchAtual = () => (git('branch', '--show-current') ?? '').trim();

function lerJson(...p) {
  const t = ler(...p);
  if (t === null) return { falta: true };
  try { return { json: JSON.parse(t) }; } catch (e) { return { invalido: e.message }; }
}

let cacheTestes;
function rodarTestes() {
  if (cacheTestes) return cacheTestes;
  const bin = arq('node_modules', 'vitest', 'vitest.mjs');
  if (!fs.existsSync(bin)) return (cacheTestes = { rodou: false, motivo: 'node_modules/vitest não existe' });
  const inicio = Date.now();
  const r = spawnSync(process.execPath, [bin, 'run', '--config', 'vitest.config.mts'], {
    cwd: raiz, encoding: 'utf8', timeout: 60000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' },
  });
  const saida = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  const linha = saida.match(/^\s*Tests\s+(.+)$/m)?.[1] ?? '';
  const num = (texto, rotulo) => Number(texto.match(new RegExp(`(\\d+) ${rotulo}`))?.[1] ?? 0);
  return (cacheTestes = {
    rodou: linha !== '', verde: r.status === 0 && linha !== '',
    passaram: num(linha, 'passed'), falharam: num(linha, 'failed'),
    segundos: (Date.now() - inicio) / 1000,
    motivo: linha ? '' : saida.trim().split('\n').slice(-3).join(' '),
  });
}

let cacheSmoke;
function rodarSmoke() {
  if (cacheSmoke) return cacheSmoke;
  const r = spawnSync(process.execPath, [arq('tools', 'board-mcp', 'smoke.mjs'), '--json'], { cwd: raiz, encoding: 'utf8', timeout: 30000 });
  try {
    return (cacheSmoke = { rodou: true, ...JSON.parse(r.stdout) });
  } catch {
    return (cacheSmoke = { rodou: false, motivo: `o smoke não rodou: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' ').slice(0, 200)}` });
  }
}

let cacheBoard;
function lerBoard() {
  if (cacheBoard) return cacheBoard;
  const common = git('rev-parse', '--path-format=absolute', '--git-common-dir');
  const f = process.env.BOARD_FILE ? path.resolve(process.env.BOARD_FILE) : common ? path.join(common.trim(), 'board', 'issues.json') : null;
  const seed = lerJson('tools', 'board-mcp', 'data', 'issues.seed.json').json;
  if (f && fs.existsSync(f)) {
    try { return (cacheBoard = { arquivo: f, issues: JSON.parse(fs.readFileSync(f, 'utf8')), doSeed: false }); }
    catch (e) { return (cacheBoard = { arquivo: f, erro: `board ilegível: ${e.message}` }); }
  }
  // o board nasce do seed na primeira leitura do servidor ou do cli.js; até lá, vale o seed
  return (cacheBoard = { arquivo: f, issues: seed ?? [], doSeed: true });
}
const issue = (id) => lerBoard().issues?.find((i) => i.id === id);

const BLOCOS = ['context', 'rules', 'constraints', 'stack', 'acceptance', 'verification'];
const NOME_BLOCO = { context: 'contexto', rules: 'regras', constraints: 'restrições', stack: 'stack e padrões', acceptance: 'critérios de aceite', verification: 'verificação', files: 'files' };
function faltando(i) {
  const cheio = (v) => (Array.isArray(v) ? v.some((x) => String(x).trim()) : Boolean(String(v ?? '').trim()));
  const f = BLOCOS.filter((b) => !cheio(i?.spec?.[b]));
  if (!cheio(i?.files)) f.push('files');
  return f;
}

// ---------- cards ----------
const cards = [];
const card = (id, titulo, checagens) => cards.push({ id, titulo, checagens });
const ok = (texto) => ({ estado: 'ok', texto });
const falha = (texto, dica) => ({ estado: 'falha', texto, dica });
const pendente = (texto, dica) => ({ estado: 'pendente', texto, dica });

card('00', 'Preparar o ambiente', () => {
  const r = [];
  const [maj, min] = process.versions.node.split('.').map(Number);
  r.push(maj > 22 || (maj === 22 && min >= 12)
    ? ok(`Node ${process.versions.node} (precisa de 22.12 ou mais novo)`)
    : falha(`Node ${process.versions.node} é antigo`, 'instale o Node 22.12+ (nvm install 22)'));
  r.push(existe('node_modules', '@vendure', 'core') ? ok('dependências da loja instaladas (node_modules)') : falha('node_modules não existe', 'rode npm install (uns 2 minutos)'));
  r.push(existe('tools', 'revisor-mcp', 'node_modules', '@modelcontextprotocol', 'sdk') ? ok('dependências do servidor revisor instaladas (tools/revisor-mcp/node_modules)') : falha('tools/revisor-mcp sem node_modules', 'rode npm run setup'));
  r.push(existe('.env') ? ok('.env existe (o conferir não lê o conteúdo)') : falha('.env não existe', 'rode npm run setup'));
  r.push(existe('vendure.sqlite') ? ok('vendure.sqlite existe') : falha('vendure.sqlite não existe', 'rode npm run setup'));
  const faltam = ['main', 'gabarito'].filter((b) => !temBranch(b));
  r.push(faltam.length === 0 ? ok('branches locais main e gabarito') : falha(`faltam as branches locais: ${faltam.join(', ')}`, 'rode npm run setup (cria as branches a partir do origin)'));

  const s = lerJson('.claude', 'settings.json').json;
  const harness = s?.permissions?.deny?.includes('Read(./.env)') && s?.permissions?.deny?.includes('Edit(./.env)')
    && ['PreToolUse', 'PostToolUse', 'Stop'].every((e) => s?.hooks?.[e]?.length) && existe('.claude', 'agents', 'revisor-codigo.md') && existe('.claude', 'statusline.mjs');
  r.push(harness ? ok('harness das sprints anteriores no lugar (deny do .env, 3 hooks, statusline, revisor-codigo)') : falha('harness incompleto', 'git checkout main -- .claude'));

  const mcp = lerJson('.mcp.json').json?.mcpServers ?? {};
  const aprovados = s?.enabledMcpjsonServers ?? [];
  const servidores = Object.keys(mcp);
  r.push(['board', 'revisor'].every((n) => servidores.includes(n) && aprovados.includes(n))
    ? ok('.mcp.json com board e revisor, aprovados em enabledMcpjsonServers (vale depois de confiar na pasta)')
    : falha(`servidores no .mcp.json: ${servidores.join(', ') || 'nenhum'}; aprovados: ${aprovados.join(', ') || 'nenhum'}`, 'git checkout main -- .mcp.json .claude/settings.json'));
  const wt = s?.worktree?.baseRef === 'head' && /^\.claude\/worktrees\/?$/m.test(ler('.gitignore') ?? '') && /^\.env$/m.test(ler('.worktreeinclude') ?? '');
  r.push(wt
    ? ok('worktrees: baseRef "head", .claude/worktrees/ no .gitignore, .env no .worktreeinclude')
    : falha('configuração de worktree incompleta', 'git checkout main -- .claude/settings.json .gitignore .worktreeinclude'));

  const b = lerBoard();
  if (b.erro) r.push(falha(b.erro, 'node tools/board-mcp/cli.js reset'));
  else r.push(ok(`board: ${b.issues.length} issues ${b.doSeed ? '(ainda o seed; nasce em .git/board/issues.json na primeira leitura)' : `em ${path.relative(raiz, b.arquivo)}`}`));

  const t = rodarTestes();
  if (!t.rodou) r.push(falha('npm test não rodou', t.motivo || 'veja a saída de npm test'));
  else if (t.verde) r.push(ok(`npm test: ${t.passaram} testes verdes em ${t.segundos.toFixed(1).replace('.', ',')} s`));
  else r.push(falha(`npm test vermelho: ${t.passaram} verdes, ${t.falharam} falhando`, 'a main chega verde; sem isso o stop-gate segura cada turno do claude'));
  const sm = rodarSmoke();
  if (!sm.rodou) r.push(falha('smoke do board não rodou', sm.motivo));
  else {
    const quebradas = sm.checagens.filter((c) => !c.ok);
    r.push(quebradas.length === 0
      ? ok(`npm run smoke:board: ${sm.checagens.length} checagens (seed, claim duplo, bloqueio, sobreposição de files, lock, cli), sem LLM`)
      : falha(`npm run smoke:board: ${quebradas[0].texto}`, 'rode npm run smoke:board e veja a lista'));
  }
  return r;
});

card('01', 'Sentir o problema: a próxima issue sem workflow', () => {
  const r = [];
  const skill = semAcento(ler(SKILL));
  r.push(ok(skill.includes('update_issue_state')
    ? 'a skill plan-issue já move estado no board (evoluída no card 03)'
    : 'a skill plan-issue é a v1 do curso: não move estado, não confere Definition of Ready, não roda tsc'));
  const claude = semAcento(ler('CLAUDE.md'));
  r.push(/plan-issue/.test(claude)
    ? ok('o CLAUDE.md já manda usar /plan-issue (para repetir o card 01, abra claude --disable-slash-commands)')
    : ok('o CLAUDE.md não manda usar a skill nem proíbe a main: é o cenário do card'));
  const b = lerBoard();
  if (!b.erro) {
    const por = {};
    for (const i of b.issues) por[i.state] = (por[i.state] ?? 0) + 1;
    r.push(ok(`estados no board: ${Object.entries(por).map(([k, v]) => `${k} ${v}`).join(' · ')} (node tools/board-mcp/cli.js)`));
  }
  const soltos = (git('status', '--porcelain', '--', 'src', 'test') ?? '').trim();
  if (branchAtual() === 'main' && soltos) {
    r.push(pendente(`há ${soltos.split('\n').length} mudança(s) soltas em src/ ou test/ direto na main`, 'é o sintoma: anote o que o agente fez sem branch, sem mover estado e sem conferir a spec; depois git stash ou git restore'));
  }
  return r;
});

card('02', 'Spec como issue: a LOJA-3 pronta para o board', () => {
  const r = [];
  const noBoard = issue('LOJA-3');
  const ref = lerJson(...REF_LOJA3.split('/')).json;
  let fonte = noBoard;
  let onde = 'LOJA-3 no board';
  if (faltando(noBoard).length && ref && faltando(ref).length === 0) { fonte = ref; onde = `${REF_LOJA3} (referência do gabarito)`; }
  const faltam = faltando(fonte);
  if (faltam.length) {
    r.push(falha(`LOJA-3 sem: ${faltam.map((f) => NOME_BLOCO[f]).join(', ')}`,
      'complete a spec pedindo ao agente um save_issue_spec (curso, seção «Planejando spec-driven com Linear», aula «Quebrando o projeto em features e criando issues no Linear»); node tools/board-mcp/cli.js show LOJA-3'));
    return r;
  }
  r.push(ok(`${onde}: os 6 blocos e files preenchidos`));
  const s = fonte.spec;
  r.push(s.rules.filter((x) => String(x).trim()).length >= 3
    ? ok(`${s.rules.length} regras`) : falha(`só ${s.rules.length} regra(s)`, 'regra verificável por item: visitante, pedido anterior, pedido atual ignorado, onde fica a lógica pura'));
  r.push(s.acceptance.some((x) => /test\/[\w-]+\.test\.ts/.test(x))
    ? ok('critério de aceite aponta o arquivo de teste') : falha('nenhum critério de aceite cita o arquivo de teste', 'ex.: test/primeira-compra.test.ts cobrindo R2, R3 e R4'));
  r.push(/\b(npm|npx)\b/.test(s.verification)
    ? ok(`verificação é um comando: ${s.verification}`) : falha(`verificação não é um comando: "${s.verification}"`, 'npm test && npx tsc --noEmit'));
  const files = fonte.files;
  const proibidos = files.filter((f) => /^src\/(vendure-config\.ts|plugins\/cupons\/|misc\/)/.test(f));
  r.push(files.some((f) => f.startsWith('test/')) && files.some((f) => f.startsWith('src/plugins/')) && proibidos.length === 0
    ? ok(`files: ${files.length} arquivos, com teste e sem tocar cupons, misc ou vendure-config`)
    : falha(`files: ${files.join(', ')}`, proibidos.length ? `a spec não pode tocar ${proibidos.join(', ')}` : 'liste o plugin novo e o arquivo de teste'));
  const l2 = issue('LOJA-2')?.files ?? [];
  const comuns = files.filter((f) => l2.includes(f));
  r.push(comuns.length === 0 ? ok('sem arquivos em comum com a LOJA-2: as duas podem rodar em paralelo') : falha(`arquivos em comum com a LOJA-2: ${comuns.join(', ')}`, 'o card 04 roda LOJA-2 e LOJA-3 em paralelo'));
  if (fonte === noBoard) {
    r.push(noBoard.state !== 'backlog'
      ? ok(`LOJA-3 saiu do backlog (${noBoard.state})`)
      : falha('LOJA-3 continua no backlog', 'spec pronta: node tools/board-mcp/cli.js mover LOJA-3 todo (ou peça ao agente o update_issue_state)'));
  }
  const l5 = faltando(issue('LOJA-5'));
  r.push(ok(l5.length ? `para comparar: a LOJA-5 (urgente) não passa na Definition of Ready, faltam ${l5.map((f) => NOME_BLOCO[f]).join(', ')}` : 'a LOJA-5 já tem os 6 blocos (Intermediária)'));
  return r;
});

card('03', 'Skill v2: o workflow do time como arquivo', () => {
  const r = [];
  const bruto = ler(SKILL);
  if (bruto === null) return [falha(`${SKILL} não existe`, 'git checkout main -- .claude/skills')];
  const t = semAcento(bruto);
  const posPlanejar = t.search(/^#+ .*planejar/m);
  const posClaim = t.search(/update_issue_state[^\n]*in_progress/);
  const marcadores = [
    [posClaim >= 0 && (posPlanejar < 0 || posClaim < posPlanejar), 'claim logo depois de escolher: update_issue_state(in_progress) antes de planejar',
      'mova para in_progress assim que escolher; quem pega depois recebe "já está in_progress" (curso, aula «Para saber mais: o racional por trás das skills de planejamento»)'],
    [/recus/.test(t), 'diz o que fazer quando o board recusa (escolher outra)', 'se o update_issue_state recusar, volte à escolha e pegue outra'],
    [/files/.test(t) && /in_progress/.test(t) && /(sobrepo|em comum|mesmos arquivos)/.test(t), 'confere files das issues in_progress antes de assumir',
      'curso, aula «Para saber mais: analisando git worktrees»: paralelo só entre issues sem arquivos em comum'],
    [/(definition of ready|nao esta pronta)/.test(t) && /blocked/.test(t), 'Definition of Ready: spec incompleta vai para blocked com as perguntas',
      'se faltar regra, critério verificável ou verificação: blocked + add_comment com as perguntas; nunca inventar regra'],
    [/ambigu/.test(t), 'spec ambígua: pergunta antes de assumir', 'regra de ouro do curso: "Se algo na spec for ambíguo, pergunte antes"'],
    [/tsc --noemit/.test(t), 'gate de tipos: npx tsc --noEmit antes de dizer pronto', 'curso: "já vi ele dizer «tá pronto» com erro de tipagem que só aparece no build"'],
    [/in_review/.test(t) && /add_comment/.test(t), 'entrega: in_review com comentário (o que fez, arquivos, checklist, como verificar)', 'passo "Marcar como In Review" do curso'],
  ];
  for (const [passou, texto, dica] of marcadores) r.push(passou ? ok(texto) : falha(`${SKILL}: falta ${texto}`, dica));
  const claude = semAcento(ler('CLAUDE.md'));
  r.push(/plan-issue/.test(claude) && /main/.test(claude) && /worktree/.test(claude)
    ? ok('CLAUDE.md manda usar /plan-issue, uma issue por worktree e nunca a main')
    : falha('CLAUDE.md não diz que o trabalho vem do board pela skill, em worktree, nunca na main', 'uma regra que vale em toda sessão vai no CLAUDE.md (curso, aula «Para saber mais: quando faz sentido criar uma skill customizada»)'));
  return r;
});

card('04', 'Paralelo: LOJA-2 e LOJA-3 em worktrees', () => {
  const r = [];
  const naArvore = (id) => existe(...PASTA[id].split('/'), 'index.ts');
  const outras = (git('for-each-ref', '--format=%(refname:short)', 'refs/heads/') ?? '').split('\n').filter((b) => b && !['main', 'gabarito'].includes(b));
  const branchDe = (id) => {
    const arquivos = [...new Set([PASTA[id], ...(issue(id)?.files ?? [])])];
    return outras.find((b) => (git('log', '--format=%h', `main..${b}`, '--', ...arquivos) ?? '').trim());
  };
  const integradas = [];
  for (const id of ['LOJA-2', 'LOJA-3']) {
    const b = branchDe(id);
    if (b) r.push(ok(`${id}: branch ${b} com commit${naArvore(id) ? ' (já integrada aqui)' : ''}`));
    else if (naArvore(id)) r.push(ok(`${id}: ${PASTA[id]}/ presente nesta branch${branchAtual() === 'gabarito' ? ' (gabarito: vale como a branch da issue)' : ''}`));
    else r.push(falha(`${id}: nenhuma branch com commit em ${PASTA[id]}/`, `claude -w ${id.toLowerCase()} e /plan-issue ${id}: a branch se chama worktree-${id.toLowerCase()} (pasta .claude/worktrees/${id.toLowerCase()}/)`));
    if (naArvore(id)) integradas.push(id);
  }
  if (integradas.length === 2) {
    const t = rodarTestes();
    r.push(t.verde ? ok(`com as duas integradas: npm test ${t.passaram} verdes`) : falha(`com as duas integradas, npm test vermelho (${t.falharam} falhando)`, 'resolva antes de mover para done; a integração é trabalho humano'));
  } else {
    r.push(pendente('LOJA-2 e LOJA-3 ainda não estão juntas nesta branch', 'na main: git merge worktree-loja-2 worktree-loja-3, depois npm test e npx tsc --noEmit'));
  }
  const estados = ['LOJA-2', 'LOJA-3'].map((id) => [id, issue(id)?.state]);
  const entregues = estados.every(([, s]) => ['in_review', 'done'].includes(s));
  if (entregues) r.push(ok(`board: ${estados.map(([id, s]) => `${id} ${s}`).join(', ')}`));
  else if (branchAtual() === 'gabarito' && integradas.length === 2) r.push(ok(`board: ${estados.map(([id, s]) => `${id} ${s}`).join(', ')} (o board não é versionado; no gabarito vale o código)`));
  else r.push(falha(`board: ${estados.map(([id, s]) => `${id} ${s ?? '?'}`).join(', ')}`, 'a skill move para in_review ao entregar; depois do merge: node tools/board-mcp/cli.js mover LOJA-2 done'));
  const wts = (git('worktree', 'list', '--porcelain') ?? '').split('\n').filter((l) => l.startsWith('worktree ')).length;
  r.push(wts <= 1 ? ok('nenhum worktree sobrando') : pendente(`${wts - 1} worktree(s) ainda abertos (git worktree list)`, 'depois do merge: git worktree remove .claude/worktrees/<nome> e git branch -d worktree-<nome>'));
  return r;
});

// ---------- saída ----------
const simbolo = { ok: '✔', falha: '✘', pendente: '…' };
const total = { ok: 0, falha: 0, pendente: 0 };
const escolhidos = cards.filter((c) => filtro.length === 0 || filtro.includes(c.id));
if (escolhidos.length === 0) {
  console.log(`Card desconhecido: ${filtro.join(', ')}. Use 00, 01, 02, 03 ou 04.`);
  process.exit(estrito ? 1 : 0);
}
const inicio = Date.now();
for (const c of escolhidos) {
  console.log(`\nCard ${c.id} · ${c.titulo}`);
  let itens;
  try { itens = c.checagens(); } catch (e) { itens = [falha(`erro ao conferir: ${e.message}`)]; }
  for (const i of itens) {
    total[i.estado]++;
    console.log(`  ${simbolo[i.estado]} ${i.texto}`);
    if (i.dica && i.estado !== 'ok') console.log(`      → ${i.dica}`);
  }
}
console.log(`\nResumo: ${total.ok} ✔ · ${total.falha} ✘ · ${total.pendente} … (${((Date.now() - inicio) / 1000).toFixed(1).replace('.', ',')} s)`);
if (!estrito) console.log('Dúvida ou travou? Poste esta saída no Discord da turma (checkpoint do dia 5).');
process.exit(estrito && total.falha > 0 ? 1 : 0);
