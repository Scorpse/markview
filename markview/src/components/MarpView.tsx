import { useEffect, useState } from 'react';

interface MarpViewProps {
  source: string;
}

function sanitizeMarpHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, iframe, object, embed').forEach((node) => node.remove());
  parsed.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  return parsed.body.innerHTML;
}

export default function MarpView({ source }: MarpViewProps) {
  const [result, setResult] = useState<{ html: string; css: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@marp-team/marp-core').then(({ Marp }) => {
      const marp = new Marp({ html: false });
      const rendered = marp.render(source);
      if (!cancelled) setResult({ html: sanitizeMarpHtml(rendered.html), css: rendered.css });
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { cancelled = true; };
  }, [source]);

  if (error) return <pre className="specialized-renderer-error">Marp render error: {error}{'\n\n'}{source}</pre>;
  if (!result) return <div className="marp-loading">Loading slides…</div>;

  return (
    <div className="marp-view">
      <style>{result.css}</style>
      <div className="marp-slides" dangerouslySetInnerHTML={{ __html: result.html }} />
    </div>
  );
}
