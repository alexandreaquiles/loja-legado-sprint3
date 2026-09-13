#!/usr/bin/env node
// board-mcp: um "Linear de bolso". Servidor MCP sem dependências (JSON-RPC 2.0 por stdio),
// para a demo não precisar de conta, OAuth nem npm install dentro de cada worktree.
//
// Os dados ficam FORA das branches, em .git/board/issues.json (o git-common-dir é compartilhado
// por todos os worktrees), exatamente como um board de verdade vive fora do repositório.
// Seed: tools/board-mcp/data/issues.seed.json. Reset: node tools/board-mcp/cli.js reset
import { createInterface } from 'node:readline';

const STATES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked'];
const PRIO = { urgent: 0, high: 1, medium: 2, low: 3 };

import { load, save } from './store.js';

const brief = (i) => ({ id: i.id, title: i.title, state: i.state, priority: i.priority, blocked_by: i.blocked_by, files: i.files });

// ---- tools -----------------------------------------------------------------
const tools = [
  {
    name: 'list_issues',
    description:
      'Lists issues of the board, optionally filtered by state. ' +
      'Use this to pick the next issue to work on: set unblocked_only=true to hide issues whose blockers are not done. ' +
      'Returns id, title, state, priority, blocked_by and the files each issue touches (never the full spec). Sorted by priority.',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: STATES, description: 'Filter by state. Omit to list all.' },
        unblocked_only: { type: 'boolean', description: 'true = only issues whose blocked_by are all done (default false).' },
      },
    },
    handler: ({ state, unblocked_only }) => {
      const all = load();
      const done = new Set(all.filter((i) => i.state === 'done').map((i) => i.id));
      const out = all
        .filter((i) => !state || i.state === state)
        .filter((i) => !unblocked_only || (i.blocked_by ?? []).every((b) => done.has(b)))
        .sort((a, b) => PRIO[a.priority] - PRIO[b.priority])
        .map(brief);
      return { issues: out, count: out.length };
    },
  },
  {
    name: 'get_issue',
    description:
      'Returns one issue with its full spec (context, rules, constraints, stack, acceptance criteria, verification) and comments. ' +
      'Use this after choosing an issue and before planning. ' +
      'The spec is written by humans: if a section is missing or vague, treat the issue as not ready.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Issue id, e.g. "LOJA-2".' } }, required: ['id'] },
    handler: ({ id }) => {
      const issue = load().find((i) => i.id === id);
      if (!issue) throw new Error(`issue ${id} não existe`);
      return issue;
    },
  },
  {
    name: 'update_issue_state',
    description:
      'Moves an issue to a new state. Use it at the start of work (in_progress), when the work is ready for review (in_review), ' +
      'when it cannot proceed (blocked, with a comment explaining why) or after merge (done). ' +
      'Returns the issue id and the new state. Refuses to move to in_progress an issue whose blockers are not done.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Issue id.' },
        state: { type: 'string', enum: STATES, description: 'New state.' },
      },
      required: ['id', 'state'],
    },
    handler: ({ id, state }) => {
      const all = load();
      const issue = all.find((i) => i.id === id);
      if (!issue) throw new Error(`issue ${id} não existe`);
      const done = new Set(all.filter((i) => i.state === 'done').map((i) => i.id));
      const pending = (issue.blocked_by ?? []).filter((b) => !done.has(b));
      if (state === 'in_progress' && pending.length) throw new Error(`${id} está bloqueada por ${pending.join(', ')} (não done)`);
      const from = issue.state;
      issue.state = state;
      issue.updated_at = new Date().toISOString();
      save(all);
      return { id, from, to: state };
    },
  },
  {
    name: 'add_comment',
    description:
      'Adds a comment to an issue. Use it to leave the delivery summary when moving to in_review ' +
      '(what was implemented, files touched, acceptance checklist, how to verify) or to explain why an issue is blocked. ' +
      'Returns the number of comments.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, body: { type: 'string', description: 'Markdown, max 1500 chars.' } },
      required: ['id', 'body'],
    },
    handler: ({ id, body }) => {
      const all = load();
      const issue = all.find((i) => i.id === id);
      if (!issue) throw new Error(`issue ${id} não existe`);
      issue.comments = issue.comments ?? [];
      issue.comments.push({ body: String(body).slice(0, 1500), at: new Date().toISOString() });
      save(all);
      return { id, comments: issue.comments.length };
    },
  },
  {
    name: 'save_issue_spec',
    description:
      'Replaces the spec sections of an issue (context, rules, constraints, stack, acceptance, verification, files). ' +
      'Use it only when a human asks to rewrite or complete a spec. ' +
      'Returns the issue id and which sections are now filled.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        spec: {
          type: 'object',
          properties: {
            context: { type: 'string' }, rules: { type: 'array', items: { type: 'string' } },
            constraints: { type: 'array', items: { type: 'string' } }, stack: { type: 'string' },
            acceptance: { type: 'array', items: { type: 'string' } }, verification: { type: 'string' },
          },
        },
        files: { type: 'array', items: { type: 'string' }, description: 'Files the issue is expected to touch.' },
      },
      required: ['id', 'spec'],
    },
    handler: ({ id, spec, files }) => {
      const all = load();
      const issue = all.find((i) => i.id === id);
      if (!issue) throw new Error(`issue ${id} não existe`);
      issue.spec = { ...issue.spec, ...spec };
      if (files) issue.files = files;
      issue.updated_at = new Date().toISOString();
      save(all);
      return { id, filled: Object.entries(issue.spec).filter(([, v]) => v && (Array.isArray(v) ? v.length : true)).map(([k]) => k) };
    },
  },
];

// ---- JSON-RPC por stdio (o protocolo MCP, sem SDK) --------------------------
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { return; }
  const { id, method, params } = req;
  const reply = (result) => id !== undefined && send({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => id !== undefined && send({ jsonrpc: '2.0', id, error: { code, message } });
  try {
    if (method === 'initialize') {
      reply({
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'board', version: '1.0.0' },
        instructions: 'Board de issues do time loja. Specs vivem nas issues; o estado vive no board, não no código.',
      });
    } else if (method === 'ping') {
      reply({});
    } else if (method === 'tools/list') {
      reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    } else if (method === 'tools/call') {
      const tool = tools.find((t) => t.name === params?.name);
      if (!tool) return fail(-32602, `tool desconhecida: ${params?.name}`);
      try {
        const out = tool.handler(params.arguments ?? {});
        reply({ content: [{ type: 'text', text: JSON.stringify(out) }] });
      } catch (e) {
        reply({ content: [{ type: 'text', text: `erro: ${e.message}` }], isError: true });
      }
    } else if (id !== undefined) {
      fail(-32601, `método não suportado: ${method}`);
    }
  } catch (e) {
    fail(-32603, e.message);
  }
});
