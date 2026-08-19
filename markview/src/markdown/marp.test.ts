import { describe, expect, it } from 'vitest';
import { isMarpDocument } from './marp';

describe('isMarpDocument', () => {
  it('enables slides only for an explicit marp true front matter value', () => {
    expect(isMarpDocument({ marp: true })).toBe(true);
    expect(isMarpDocument({ marp: false })).toBe(false);
    expect(isMarpDocument({ marp: 'true' })).toBe(false);
    expect(isMarpDocument({})).toBe(false);
  });
});
