#!/usr/bin/env node
// Visão rápida do board no terminal (para o Piloto mostrar ao vivo).
//   node tools/board-mcp/cli.js            -> lista
//   node tools/board-mcp/cli.js reset      -> volta ao seed
//   node tools/board-mcp/cli.js show LOJA-2
import { load, resetBoard, boardFile } from './src/store.js';

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'reset') {
  console.log('board resetado em', resetBoard());
  process.exit(0);
}
const issues = load();
if (cmd === 'show') {
  const i = issues.find((x) => x.id === arg);
  console.log(i ? JSON.stringify(i, null, 2) : `não existe: ${arg}`);
  process.exit(0);
}
const icon = { backlog: '·', todo: '○', in_progress: '◐', in_review: '◑', done: '●', blocked: '⊘' };
console.log(`board (${boardFile()})\n`);
for (const i of issues) {
  const blk = i.blocked_by?.length ? `  ⟵ bloqueada por ${i.blocked_by.join(', ')}` : '';
  console.log(`${icon[i.state]} ${i.id.padEnd(7)} ${i.state.padEnd(11)} ${i.priority.padEnd(6)} ${i.title}${blk}`);
}
