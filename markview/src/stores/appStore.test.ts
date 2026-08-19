import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './appStore';

describe('readable line length preference', () => {
  beforeEach(() => {
    useAppStore.setState({ readableLineLength: true });
  });

  it('defaults to the readable centered layout', () => {
    expect(useAppStore.getState().readableLineLength).toBe(true);
  });

  it('can switch to fluid document width', () => {
    useAppStore.getState().setReadableLineLength(false);
    expect(useAppStore.getState().readableLineLength).toBe(false);
  });
});
