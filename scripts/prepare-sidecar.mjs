import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const backendDir = path.join(repoRoot, 'backend');
const binariesDir = path.join(repoRoot, 'src-tauri', 'binaries');

run('npm', ['run', 'build:sea', '--prefix', backendDir]);

const hostTuple = run('rustc', ['--print', 'host-tuple']).stdout.trim();
const sourceBinary = path.join(backendDir, 'backend.exe');

if (!existsSync(sourceBinary)) {
  throw new Error(`SEA build did not produce ${sourceBinary}`);
}

mkdirSync(binariesDir, { recursive: true });

const targetBinary = path.join(binariesDir, `backend-${hostTuple}.exe`);
rmSync(targetBinary, { force: true });
copyFileSync(sourceBinary, targetBinary);

console.log(`Prepared sidecar: ${targetBinary}`);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }

  return result;
}
