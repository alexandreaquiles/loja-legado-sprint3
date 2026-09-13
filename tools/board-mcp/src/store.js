// Onde o board vive: .git/board/issues.json (git-common-dir, compartilhado por todos os worktrees)
// ou BOARD_FILE, se definido. Seed em data/issues.seed.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.join(HERE, '..', 'data', 'issues.seed.json');

export function boardFile() {
  if (process.env.BOARD_FILE) return path.resolve(process.env.BOARD_FILE);
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
  return path.join(common, 'board', 'issues.json');
}
export function load() {
  const f = boardFile();
  if (!existsSync(f)) {
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, readFileSync(SEED, 'utf8'));
  }
  return JSON.parse(readFileSync(f, 'utf8'));
}
export function save(issues) {
  writeFileSync(boardFile(), JSON.stringify(issues, null, 2) + '\n');
}
export function resetBoard() {
  const f = boardFile();
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, readFileSync(SEED, 'utf8'));
  return f;
}
