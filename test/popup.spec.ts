import { expect, test} from 'vitest';
import { farewell } from '../src/popup';

test('farewell function returns correct goodbye message', () => {
  expect(farewell('Alice')).toBe('Goodbye, Alice!');
  expect(farewell('Bob')).not.toBe('Hello, Bob!');
});