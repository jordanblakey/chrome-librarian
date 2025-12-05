import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import ora from 'ora';
import * as ts from 'typescript';

export function buildExtension(options: { dev?: boolean } = {}) {
  const startTime = Date.now();
  const spinner = ora('Building extension...').start();

  // Build unpacked extension
  fs.rmSync('dist', { recursive: true, force: true });
  execSync('tsc --build tsconfig.json', { stdio: 'inherit' });
  fs.cpSync('manifest.json', 'dist/manifest.json');
  fs.cpSync('src/assets', 'dist/assets', { recursive: true });

  if (options.dev) {
    injectHotReload();
  }

  // Create zip for Web Store upload
  const admZip = new AdmZip()
  admZip.addLocalFolder('dist')
  admZip.writeZip('dist/chrome-librarian.zip')

  spinner.succeed(`Build complete. ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('📂 Unpacked extension: dist/');
  console.log(`📦 Web Store Zip: chrome-librarian.zip`)
}

function injectHotReload() {
  const HOT_RELOAD_SOURCE = 'scripts/hot-reload.ts';
  const ENTRY_POINTS = ['background.js', 'options.js', 'popup.js'];

  if (!fs.existsSync(HOT_RELOAD_SOURCE)) return;

  const tsContent = fs.readFileSync(HOT_RELOAD_SOURCE, 'utf-8');
  const jsContent = ts.transpileModule(tsContent, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;

  ENTRY_POINTS.forEach(file => {
    const filePath = `dist/${file}`;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      fs.writeFileSync(filePath, jsContent + '\n' + content);
    }
  });
}

// Only run if called directly
import.meta.main && buildExtension();