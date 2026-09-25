import { describe, expect, it } from 'vitest';
import { productName } from './page';

describe('foundation', () => {
  it('installs and tests', () => {
    // The check that a fresh checkout installs and runs: it is this suite running at all.
    expect(typeof productName).toBe('function');
  });

  it('first screen', () => {
    // The app starts and shows its name. Yours to make it your own name.
    expect(productName().length).toBeGreaterThan(0);
  });
});
