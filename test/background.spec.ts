
import {expect, test, bench} from 'vitest';
import { sum } from '../src/background';

test('sum function adds two numbers correctly', () => {
  expect(sum(2, 2)).toBe(4);
  expect(sum(2, 2)).not.toBe(5);
});