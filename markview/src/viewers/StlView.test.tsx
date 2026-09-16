// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import StlView from './StlView';

afterEach(cleanup);

const SOURCE = [
  '# Platform Spec',
  '# generated today',
  '[Project:App] -> [Goal:Ship] ::mod(rule="definitional", confidence=0.95, description="why it exists", source="PRD.pdf")',
  '# --- Decisions ---',
  '[ns:Decision_runtime] -> [ns:Choice_node] ::mod(action="decide", outcome="pass", confidence=1.0, author="codex", timestamp="2026-09-08")',
].join('\n');

describe('StlView', () => {
  it('summarises the document', () => {
    render(<StlView source={SOURCE} />);
    expect(screen.getByText('2 relations across 2 sections')).toBeTruthy();
  });

  it('uses the file\'s comments as headings and notes', () => {
    render(<StlView source={SOURCE} />);
    expect(screen.getByRole('heading', { name: 'Platform Spec' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Decisions' })).toBeTruthy();
    expect(screen.getByText('generated today')).toBeTruthy();
  });

  it('shows each relation with its nodes and description', () => {
    render(<StlView source={SOURCE} />);
    expect(screen.getByText('Ship')).toBeTruthy();
    expect(screen.getByText('why it exists')).toBeTruthy();
  });

  it('renders unknown domain fields without field-specific UI rules', () => {
    render(
      <StlView
        source={'[Domain:A] -> [Domain:B] ::mod(explanation="A future domain can explain itself here", custom_phase=alpha)'}
      />,
    );
    expect(screen.getByText('custom_phase')).toBeTruthy();
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('explanation')).toBeTruthy();
    expect(screen.getByText('A future domain can explain itself here').tagName).toBe('P');
    const explanation = screen.getByText('explanation');
    const customPhase = screen.getByText('custom_phase');
    expect(explanation.compareDocumentPosition(customPhase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // The stl-k profile carries ~12 attributes per edge; only a few belong up front.
  it('promotes the telling attributes and folds the rest away', () => {
    render(<StlView source={SOURCE} />);
    expect(screen.getByText('decide')).toBeTruthy();
    expect(screen.getByText('pass')).toBeTruthy();
    // author and timestamp are behind the expander, not shown as badges
    expect(screen.getByText('1 more attribute')).toBeTruthy();
  });

  it('reports unreadable lines without losing the rest', () => {
    render(<StlView source={'[A:1] -> [B:1] ::mod(rule="logical")\ngarbage'} />);
    expect(screen.getByText(/Line 2/)).toBeTruthy();
    expect(screen.getByText('1 relation across 1 section')).toBeTruthy();
  });

  it('says so when there is nothing to show', () => {
    render(<StlView source={''} />);
    expect(screen.getByText('No STL statements found.')).toBeTruthy();
  });

  it('shows diagnostics when an invalid file has no relations', () => {
    render(<StlView source={'not STL'} />);
    expect(screen.getByText(/Line 1/)).toBeTruthy();
    expect(screen.queryByText('No STL statements found.')).toBeNull();
  });
});
