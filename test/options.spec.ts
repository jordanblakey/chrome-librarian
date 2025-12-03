import {test, expect} from 'vitest';
import { greet } from '../src/options';

test('greet function returns correct greeting message', () => {
  expect(greet('Alice')).toBe('Hello, Alice!');
  expect(greet('Bob')).not.toBe('Goodbye, Bob!');
});