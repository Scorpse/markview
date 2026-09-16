import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  parseStl,
  splitAttributes,
  splitNode,
  type StlEdge,
} from './parseStl';

interface StlViewProps {
  source: string;
}

/** Outcome and confidence read as status, so they get a colour rather than a chip. */
function badgeClass(key: string, value: string): string {
  if (key === 'outcome') return `stl-badge stl-outcome-${value.toLowerCase().replace(/[^a-z]/g, '')}`;
  if (key === 'confidence') {
    const n = Number(value);
    if (!Number.isNaN(n)) return `stl-badge stl-confidence-${n >= 0.9 ? 'high' : n >= 0.7 ? 'medium' : 'low'}`;
  }
  return 'stl-badge';
}

function Node({ node }: { node: string }) {
  const { namespace, name } = splitNode(node);
  return (
    <span className="stl-node" title={node}>
      {namespace && <span className="stl-node-ns">{namespace}</span>}
      <span className="stl-node-name">{name}</span>
    </span>
  );
}

function Edge({ edge }: { edge: StlEdge }) {
  const { primary, rest } = splitAttributes(edge.attributes);
  const description = edge.attributes.description;

  return (
    <li className="stl-edge">
      <div className="stl-relation">
        <Node node={edge.source} />
        <ArrowRight size={14} className="stl-arrow" aria-label="relates to" />
        <Node node={edge.target} />
      </div>

      {primary.length > 0 && (
        <div className="stl-badges">
          {primary.map(([key, value]) => (
            <span key={key} className={badgeClass(key, value)}>
              <span className="stl-badge-key">{key}</span>
              {value}
            </span>
          ))}
        </div>
      )}

      {description && <p className="stl-description">{description}</p>}

      {rest.length > 0 && (
        <details className="stl-details">
          <summary>{rest.length} more {rest.length === 1 ? 'attribute' : 'attributes'}</summary>
          <dl className="stl-attributes">
            {rest.map(([key, value]) => (
              <div key={key} className="stl-attribute">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </li>
  );
}

export default function StlView({ source }: StlViewProps) {
  const document = useMemo(() => parseStl(source), [source]);

  if (document.edgeCount === 0 && document.sections.length === 0 && document.errors.length === 0) {
    return <p className="structured-empty">No STL statements found.</p>;
  }

  return (
    <div className="stl-document">
      <p className="stl-summary">
        {document.edgeCount} {document.edgeCount === 1 ? 'relation' : 'relations'} across{' '}
        {document.sections.length} {document.sections.length === 1 ? 'section' : 'sections'}
      </p>

      {document.errors.length > 0 && (
        <ul className="structured-problems">
          {document.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}

      {document.sections.map((section, index) => (
        <section key={index} className="stl-section">
          {section.title && <h2 className="stl-section-title">{section.title}</h2>}
          {section.notes.map((note, noteIndex) => (
            <p key={noteIndex} className="stl-note">{note}</p>
          ))}
          <ul className="stl-edges">
            {section.edges.map((edge, edgeIndex) => (
              <Edge key={`${edge.line}:${edgeIndex}:${edge.source}:${edge.target}`} edge={edge} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
