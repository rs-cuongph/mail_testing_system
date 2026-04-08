import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const electronRoot = path.resolve(__dirname, '..');
const distRoot = path.join(electronRoot, 'dist');
const stagingRoot = path.join(electronRoot, '.packaging', 'app');
const stagingDistRoot = path.join(stagingRoot, 'dist');

const sourcePackageJson = JSON.parse(readFileSync(path.join(electronRoot, 'package.json'), 'utf8'));
const packagedManifest = {
  name: sourcePackageJson.name,
  version: sourcePackageJson.version,
  description: sourcePackageJson.description,
  author: sourcePackageJson.author,
  main: sourcePackageJson.main,
};

function prepareAppStaging() {
  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(stagingDistRoot, { recursive: true });

  for (const entry of ['main.js', 'preload.js', 'tray.js']) {
    const sourcePath = path.join(distRoot, entry);
    const targetPath = path.join(stagingDistRoot, entry);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing Electron build output: ${sourcePath}`);
    }

    cpSync(sourcePath, targetPath);
  }

  writeFileSync(
    path.join(stagingRoot, 'package.json'),
    `${JSON.stringify(packagedManifest, null, 2)}\n`,
    'utf8',
  );
}

prepareAppStaging();
