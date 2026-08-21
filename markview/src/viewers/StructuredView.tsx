import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { configLanguageFor, delimiterFor, type FileKind } from './fileKind';
import {
  isTabular,
  parseCsv,
  parseJson,
  parseJsonl,
  recordsToTable,
  type TableData,
} from './parseStructured';
import ValueTree from './ValueTree';
import DataTable from './DataTable';

interface StructuredViewProps {
  kind: Exclude<FileKind, 'markdown'>;
}

type Mode = 'view' | 'raw';

function Problems({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="structured-problems">
      {errors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  );
}

function RawSource({ source, language }: { source: string; language?: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!language) {
      setHtml(null);
      return;
    }
    import('highlight.js')
      .then(({ default: hljs }) => {
        if (cancelled) return;
        if (!hljs.getLanguage(language)) {
          setHtml(null);
          return;
        }
        setHtml(hljs.highlight(source, { language }).value);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [source, language]);

  return (
    <pre className="structured-raw">
      {html === null ? (
        <code>{source}</code>
      ) : (
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </pre>
  );
}

/** YAML is parsed lazily so its cost lands only on YAML documents. */
function useYaml(source: string, enabled: boolean) {
  const [state, setState] = useState<{ value: unknown; errors: string[] } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState(null);
      return;
    }
    let cancelled = false;
    import('yaml')
      .then((yaml) => {
        if (cancelled) return;
        const documents = yaml.parseAllDocuments(source);
        const errors = documents.flatMap((document) =>
          document.errors.map((error) => error.message),
        );
        const values = documents.map((document) => document.toJS());
        setState({ value: values.length === 1 ? values[0] : values, errors });
      })
      .catch((error) => {
        if (!cancelled) setState({ value: undefined, errors: [String(error)] });
      });
    return () => {
      cancelled = true;
    };
  }, [source, enabled]);

  return state;
}

export default function StructuredView({ kind }: StructuredViewProps) {
  const source = useAppStore((s) => s.rawMarkdown);
  const currentFile = useAppStore((s) => s.currentFile) ?? '';
  const activeTabId = useAppStore((s) => s.activeTabId);
  const [mode, setMode] = useState<Mode>('view');

  useEffect(() => setMode('view'), [activeTabId]);

  const yamlState = useYaml(source, kind === 'yaml');

  const json = useMemo(() => (kind === 'json' ? parseJson(source) : null), [kind, source]);
  const jsonl = useMemo(() => (kind === 'jsonl' ? parseJsonl(source) : null), [kind, source]);
  const csv = useMemo(
    () => (kind === 'csv' ? parseCsv(source, delimiterFor(currentFile)) : null),
    [kind, source, currentFile],
  );

  const jsonlTable: TableData | null = useMemo(() => {
    if (!jsonl || !isTabular(jsonl.records)) return null;
    const table = recordsToTable(jsonl.records);
    return { ...table, truncatedRows: jsonl.truncatedRows };
  }, [jsonl]);

  const rawLanguage =
    kind === 'json' || kind === 'jsonl' ? 'json' : kind === 'yaml' ? 'yaml' : configLanguageFor(currentFile);

  const showRawToggle = kind !== 'config';

  const body = () => {
    if (mode === 'raw' || kind === 'config') {
      return <RawSource source={source} language={rawLanguage} />;
    }

    if (kind === 'json') {
      if (json?.error) {
        return (
          <>
            <Problems errors={[json.error]} />
            <RawSource source={source} language="json" />
          </>
        );
      }
      return <ValueTree value={json?.value} />;
    }

    if (kind === 'yaml') {
      if (!yamlState) return <p className="structured-empty">Parsing…</p>;
      return (
        <>
          <Problems errors={yamlState.errors} />
          {yamlState.value === undefined ? (
            <RawSource source={source} language="yaml" />
          ) : (
            <ValueTree value={yamlState.value} />
          )}
        </>
      );
    }

    if (kind === 'csv' && csv) {
      return (
        <>
          <Problems errors={csv.errors} />
          <DataTable table={csv} />
        </>
      );
    }

    if (kind === 'jsonl' && jsonl) {
      return (
        <>
          <Problems errors={jsonl.errors} />
          {jsonlTable ? (
            <DataTable table={jsonlTable} />
          ) : (
            <ValueTree value={jsonl.records} defaultExpandDepth={1} />
          )}
        </>
      );
    }

    return <RawSource source={source} language={rawLanguage} />;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="structured-view">
        <div className="structured-header no-print">
          <span className="structured-kind">{kind.toUpperCase()}</span>
          {showRawToggle && (
            <div className="structured-mode" role="group" aria-label="View mode">
              <button
                type="button"
                className={mode === 'view' ? 'active' : ''}
                onClick={() => setMode('view')}
              >
                {kind === 'csv' || kind === 'jsonl' ? 'Table' : 'Tree'}
              </button>
              <button
                type="button"
                className={mode === 'raw' ? 'active' : ''}
                onClick={() => setMode('raw')}
              >
                Source
              </button>
            </div>
          )}
        </div>
        {body()}
      </div>
    </div>
  );
}
