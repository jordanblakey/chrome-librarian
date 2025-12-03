import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import ora from 'ora';

const startTime = Date.now();
const spinner = ora('Building extension...').start();

// Build unpacked extension
fs.rmSync('dist', { recursive: true, force: true });
execSync('tsc --build tsconfig.json', { stdio: 'inherit' });
fs.cpSync('manifest.json', 'dist/manifest.json');
fs.cpSync('src/assets', 'dist/assets', { recursive: true });

// Create zip for Web Store upload
const admZip = new AdmZip()
admZip.addLocalFolder('dist')
admZip.writeZip('dist/chrome-librarian.zip')

spinner.succeed(`Build complete. ${((Date.now() - startTime)/1000).toFixed(1)}s`);
console.log('📂 Unpacked extension: dist/');
console.log(`📦 Web Store Zip: chrome-librarian.zip`)