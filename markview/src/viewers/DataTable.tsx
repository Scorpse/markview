import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sortRows, type TableData } from './parseStructured';

interface DataTableProps {
  table: TableData;
}

export default function DataTable({ table }: DataTableProps) {
  const [sort, setSort] = useState<{ column: number; direction: 'asc' | 'desc' } | null>(null);

  const rows = useMemo(
    () => (sort ? sortRows(table.rows, sort.column, sort.direction) : table.rows),
    [table.rows, sort],
  );

  const toggleSort = (column: number) => {
    setSort((current) => {
      if (!current || current.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null; // third click restores file order
    });
  };

  if (table.columns.length === 0) {
    return <p className="structured-empty">No rows to show.</p>;
  }

  return (
    <div className="data-table-wrapper">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="data-table-rownum" scope="col">#</th>
              {table.columns.map((column, index) => (
                <th key={`${column}-${index}`} scope="col">
                  <button
                    type="button"
                    onClick={() => toggleSort(index)}
                    aria-label={`Sort by ${column}`}
                  >
                    <span>{column === '' ? '(unnamed)' : column}</span>
                    {sort?.column === index &&
                      (sort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="data-table-rownum">{rowIndex + 1}</td>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} title={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="data-table-footer">
        {rows.length} row{rows.length === 1 ? '' : 's'}
        {table.truncatedRows > 0 && ` — ${table.truncatedRows} more not shown`}
      </p>
    </div>
  );
}
