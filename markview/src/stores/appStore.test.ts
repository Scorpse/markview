import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './appStore';

describe('document width preference', () => {
  beforeEach(() => {
    useAppStore.setState({ documentWidth: 'narrow' });
  });

  it('defaults to the readable centered layout', () => {
    expect(useAppStore.getState().documentWidth).toBe('narrow');
  });

  it('can switch to any width step', () => {
    useAppStore.getState().setDocumentWidth('extra-wide');
    expect(useAppStore.getState().documentWidth).toBe('extra-wide');
    useAppStore.getState().setDocumentWidth('full');
    expect(useAppStore.getState().documentWidth).toBe('full');
  });
});

describe('on-demand contrast check', () => {
  beforeEach(() => {
    useAppStore.setState({ contrastCheckRevision: 0, contrastAdjustedBlocks: null });
  });

  it('requests a scan without running one automatically', () => {
    expect(useAppStore.getState().contrastAdjustedBlocks).toBeNull();
    useAppStore.getState().requestContrastCheck();
    expect(useAppStore.getState().contrastCheckRevision).toBe(1);
  });

  it('stores and clears the latest result', () => {
    useAppStore.getState().setContrastAdjustedBlocks(2);
    expect(useAppStore.getState().contrastAdjustedBlocks).toBe(2);
    useAppStore.getState().clearContrastResult();
    expect(useAppStore.getState().contrastAdjustedBlocks).toBeNull();
  });
});
