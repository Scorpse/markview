// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import DataTable from './DataTable';
import type { TableData } from './parseStructured';

// This project has no vitest setup file, so Testing Library's automatic
// cleanup is not registered; without this each render would leak into the
// next test's queries.
afterEach(cleanup);

const table: TableData = {
  columns: ['name', 'commits'],
  rows: [
    ['Grace', '98'],
    ['Ada', '120'],
    ['Alan', '9'],
  ],
  truncatedRows: 0,
  errors: [],
};

function bodyRows() {
  return screen.getAllByRole('row').slice(1).map((row) =>
    Array.from(row.querySelectorAll('td')).slice(1).map((cell) => cell.textContent),
  );
}

describe('DataTable', () => {
  it('shows rows in file order until a column is sorted', () => {
    render(<DataTable table={table} />);
    expect(bodyRows()).toEqual([['Grace', '98'], ['Ada', '120'], ['Alan', '9']]);
  });

  it('sorts numerically, then descending, then back to file order', () => {
    render(<DataTable table={table} />);
    const commits = screen.getByRole('button', { name: 'Sort by commits' });

    fireEvent.click(commits);
    expect(bodyRows()).toEqual([['Alan', '9'], ['Grace', '98'], ['Ada', '120']]);

    fireEvent.click(commits);
    expect(bodyRows()).toEqual([['Ada', '120'], ['Grace', '98'], ['Alan', '9']]);

    fireEvent.click(commits);
    expect(bodyRows()).toEqual([['Grace', '98'], ['Ada', '120'], ['Alan', '9']]);
  });

  it('sorts text columns alphabetically', () => {
    render(<DataTable table={table} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by name' }));
    expect(bodyRows()).toEqual([['Ada', '120'], ['Alan', '9'], ['Grace', '98']]);
  });

  it('reports the row count and anything dropped by the row cap', () => {
    render(<DataTable table={{ ...table, truncatedRows: 12 }} />);
    expect(screen.getByText(/3 rows/).textContent).toContain('12 more not shown');
  });

  it('renders a placeholder when there are no columns', () => {
    render(<DataTable table={{ columns: [], rows: [], truncatedRows: 0, errors: [] }} />);
    expect(screen.getByText('No rows to show.')).toBeTruthy();
  });
});
