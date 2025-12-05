import fs from 'fs'
import { buildExtension } from '../scripts/build'
import { test, expect, describe } from 'vitest';

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}
fs.writeFileSync('dist/fingerprint', '');

buildExtension();

describe('build', () => {
  test('build deletes dist/', () => {
    expect(fs.existsSync('dist/fingerprint')).toBe(false);
  })

  test('build creates dist/manifest.json', () => {
    expect(fs.existsSync('dist/manifest.json')).toBe(true);
  })

  test('build creates dist/assets', () => {
    expect(fs.existsSync('dist/assets')).toBe(true);
  })

  test('build transpiles .js and source maps', () => {
    expect(fs.globSync('dist/*.js').length).toBeGreaterThan(0);
    expect(fs.globSync('dist/*.js.map').length).toBeGreaterThan(0);
  })

  test('build creates .zip', () => {
    expect(fs.globSync('dist/*.zip').length).toBe(1);
  })
})