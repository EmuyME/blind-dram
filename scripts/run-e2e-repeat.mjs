import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function getArg(name, defaultValue) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return defaultValue;
  return arg.slice(prefix.length);
}

const runs = Number(getArg('runs', '3'));
const project = getArg('project', 'Mobile Chrome');
const grep = getArg('grep', '');
const file = getArg('file', 'e2e/robust-sequential-fuzz.spec.ts');

if (!Number.isFinite(runs) || runs <= 0) {
  console.error(`Invalid --runs=${runs}`);
  process.exit(2);
}

for (let i = 1; i <= runs; i++) {
  console.log(`\n=== RUN ${i}/${runs} (project="${project}") ===\n`);
  const args = ['test', file, '--project', project, '--workers=1'];
  if (grep) args.push('-g', grep);

  // Windows で shell 経由にすると "Mobile Chrome" のような値が分割されやすいので、
  // node で Playwright CLI を直接叩く（引数を安全に渡す）
  const here = path.dirname(fileURLToPath(import.meta.url));
  const playwrightCli = path.resolve(here, '..', 'node_modules', '@playwright', 'test', 'cli.js');
  const cmd = process.execPath;
  const r = spawnSync(cmd, [playwrightCli, ...args], { stdio: 'inherit' });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

