// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../stores/appStore';
import Toolbar from './Toolbar';

vi.mock('../utils/tauriCommands', () => ({
  tauriCommands: { openFileDialog: vi.fn() },
}));

describe('contrast toolbar action', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeTabId: 'tab-1',
      contrastCheckRevision: 0,
      contrastAdjustedBlocks: null,
    });
  });

  afterEach(cleanup);

  it('requests a contrast check only when clicked', () => {
    render(<Toolbar loadFile={vi.fn()} />);

    expect(useAppStore.getState().contrastCheckRevision).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Check contrast' }));
    expect(useAppStore.getState().contrastCheckRevision).toBe(1);
  });

  it('reports how many blocks were adjusted', () => {
    useAppStore.setState({ contrastAdjustedBlocks: 2 });
    render(<Toolbar loadFile={vi.fn()} />);

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByTitle(/2 blocks adjusted/)).toBeTruthy();
  });
});
