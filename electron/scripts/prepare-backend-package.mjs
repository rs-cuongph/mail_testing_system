import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const electronRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(electronRoot, '..');
const backendRoot = path.join(workspaceRoot, 'backend');
const stagingRoot = path.join(electronRoot, '.packaging', 'backend');

const backendEntries = ['dist', 'prisma', 'package.json', 'package-lock.json', 'node_modules'];

function copyBackendForPackaging() {
  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(stagingRoot, { recursive: true });

  for (const entry of backendEntries) {
    const sourcePath = path.join(backendRoot, entry);
    const targetPath = path.join(stagingRoot, entry);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing backend packaging input: ${sourcePath}`);
    }

    cpSync(sourcePath, targetPath, { recursive: true });
  }
}

function pruneDevDependencies() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm prune --omit=dev --legacy-peer-deps --no-audit --no-fund']
      : ['prune', '--omit=dev', '--legacy-peer-deps', '--no-audit', '--no-fund'];
  const result = spawnSync(command, args, {
    cwd: stagingRoot,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(
      `npm prune --omit=dev failed with exit code ${result.status ?? 'unknown'}${
        result.error ? ` (${result.error.message})` : ''
      }`,
    );
  }
}

copyBackendForPackaging();
pruneDevDependencies();
