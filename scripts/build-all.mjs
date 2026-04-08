import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const installerDir = path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle', 'nsis');

run('npm', ['run', 'build', '--prefix', path.join(repoRoot, 'frontend')]);
run('node', [path.join(repoRoot, 'scripts', 'prepare-sidecar.mjs')]);
run('cargo', ['tauri', 'build']);

const installer = findInstaller(installerDir);
const sizeMb = installer ? (statSync(installer).size / (1024 * 1024)).toFixed(2) : null;

if (installer) {
  console.log(`Installer: ${installer}`);
  console.log(`Size (MB): ${sizeMb}`);
} else {
  console.warn(`No NSIS installer found in ${installerDir}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function findInstaller(dir) {
  if (!existsSync(dir)) {
    return null;
  }

  const files = readdirSync(dir)
    .filter((entry) => entry.toLowerCase().endsWith('.exe'))
    .map((entry) => path.join(dir, entry));

  return files[0] ?? null;
}
