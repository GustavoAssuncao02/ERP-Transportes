import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const projectRoot = path.resolve(backendRoot, '..');
const frontendRoot = path.join(projectRoot, 'frontend');
const frontendPackageJson = path.join(frontendRoot, 'package.json');
const frontendDistIndex = path.join(frontendRoot, 'dist', 'index.html');

if (process.env.SKIP_FRONTEND_BUILD === 'true') {
  process.exit(0);
}

if (!fs.existsSync(frontendPackageJson)) {
  console.warn('Frontend nao encontrado; pulando build do frontend.');
  process.exit(0);
}

if (fs.existsSync(frontendDistIndex)) {
  console.log('Frontend ja compilado; pulando build.');
  process.exit(0);
}

run('npm', ['install', '--include=dev'], frontendRoot);
run('npm', ['run', 'build'], frontendRoot);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
