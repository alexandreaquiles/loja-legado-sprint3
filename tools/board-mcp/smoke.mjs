// Teste de fumaça do board-mcp, sem LLM e sem SDK: fala JSON-RPC 2.0 por stdio na mão,
// do mesmo jeito que o Claude Code fala com o servidor. Usa um board temporário (BOARD_FILE).
//   npm run smoke:board
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(mkdtempSync(path.join(os.tmpdir(), 'board-')), 'issues.json');
const srv = spawn(process.execPath, [path.join(HERE, 'src', 'index.js')], {
  env: { ...process.env, BOARD_FILE: tmp },
  stdio: ['pipe', 'pipe', 'inherit'],
});

const pending = new Map();
createInterface({ input: srv.stdout }).on('line', (line) => {
  const msg = JSON.parse(line);
  if (pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

let seq = 0;
const send = (msg) => srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    send({ id, method, params });
  });
const tool = async (name, args) => (await call('tools/call', { name, arguments: args })).content.map((c) => c.text).join('');

await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0.0.0' } });
send({ method: 'notifications/initialized' });

const { tools } = await call('tools/list');
console.log('tools:', tools.map((t) => t.name).join(', '));
const next = JSON.parse(await tool('list_issues', { state: 'todo', unblocked_only: true }));
console.log('todo não bloqueadas (por prioridade):', next.issues.map((i) => `${i.id}[${i.priority}]`).join(' '));
console.log('mover LOJA-4 (bloqueada) → in_progress:', await tool('update_issue_state', { id: 'LOJA-4', state: 'in_progress' }));
console.log('LOJA-2 → in_progress:', await tool('update_issue_state', { id: 'LOJA-2', state: 'in_progress' }));
console.log('comment:', await tool('add_comment', { id: 'LOJA-2', body: 'teste' }));
const spec5 = JSON.parse(await tool('get_issue', { id: 'LOJA-5' }));
console.log('LOJA-5 rules:', spec5.spec.rules.length, '| verification:', JSON.stringify(spec5.spec.verification));

srv.stdin.end();
console.log('ok (dados temporários em', tmp + ')');
