import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ValueTreeProps {
  value: unknown;
  /** Depth up to which nodes start expanded. */
  defaultExpandDepth?: number;
}

interface NodeProps {
  label: string;
  value: unknown;
  path: string;
  depth: number;
  defaultExpandDepth: number;
  isLast: boolean;
}

function kindOf(value: unknown): 'object' | 'array' | 'primitive' {
  if (Array.isArray(value)) return 'array';
  if (value !== null && typeof value === 'object') return 'object';
  return 'primitive';
}

function primitiveText(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return String(value);
}

function primitiveClass(value: unknown): string {
  if (typeof value === 'string') return 'value-string';
  if (typeof value === 'number') return 'value-number';
  if (typeof value === 'boolean') return 'value-boolean';
  return 'value-null';
}

function summaryOf(value: unknown): string {
  if (Array.isArray(value)) return `[] ${value.length} item${value.length === 1 ? '' : 's'}`;
  const keys = Object.keys(value as Record<string, unknown>);
  return `{} ${keys.length} key${keys.length === 1 ? '' : 's'}`;
}

/** Bracket-notation for array indices, dot-notation otherwise. */
function childPath(parent: string, key: string, inArray: boolean): string {
  if (inArray) return `${parent}[${key}]`;
  return parent ? `${parent}.${key}` : key;
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function TreeNode({ label, value, path, depth, defaultExpandDepth, isLast }: NodeProps) {
  const kind = kindOf(value);
  const [expanded, setExpanded] = useState(depth < defaultExpandDepth);

  if (kind === 'primitive') {
    return (
      <div className="value-tree-row" style={{ paddingLeft: `${depth * 14}px` }}>
        <span className="value-tree-spacer" />
        {label !== '' && <span className="value-key">{label}</span>}
        {label !== '' && <span className="value-punctuation">: </span>}
        <span className={primitiveClass(value)}>{primitiveText(value)}</span>
        {!isLast && <span className="value-punctuation">,</span>}
        <span className="value-tree-actions">
          <button type="button" onClick={() => copy(primitiveText(value))} title="Copy value">value</button>
          <button type="button" onClick={() => copy(path)} title="Copy path">path</button>
        </span>
      </div>
    );
  }

  const inArray = kind === 'array';
  const entries = inArray
    ? (value as unknown[]).map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="value-tree-branch">
      <div className="value-tree-row" style={{ paddingLeft: `${depth * 14}px` }}>
        <button
          type="button"
          className="value-tree-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${label || 'root'}` : `Expand ${label || 'root'}`}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {label !== '' && <span className="value-key">{label}</span>}
        {label !== '' && <span className="value-punctuation">: </span>}
        <span className="value-summary">{summaryOf(value)}</span>
        <span className="value-tree-actions">
          <button type="button" onClick={() => copy(JSON.stringify(value, null, 2))} title="Copy value">value</button>
          {path && <button type="button" onClick={() => copy(path)} title="Copy path">path</button>}
        </span>
      </div>
      {expanded &&
        entries.map(([key, child], index) => (
          <TreeNode
            key={key}
            label={key}
            value={child}
            path={childPath(path, key, inArray)}
            depth={depth + 1}
            defaultExpandDepth={defaultExpandDepth}
            isLast={index === entries.length - 1}
          />
        ))}
    </div>
  );
}

export default function ValueTree({ value, defaultExpandDepth = 2 }: ValueTreeProps) {
  return (
    <div className="value-tree">
      <TreeNode
        label=""
        value={value}
        path=""
        depth={0}
        defaultExpandDepth={defaultExpandDepth}
        isLast
      />
    </div>
  );
}
