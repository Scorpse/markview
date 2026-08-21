// Lazy-loaded Mermaid renderer. Keeps initial bundle small — mermaid is
// only imported on first use.
//
// Renders a diagram source to an SVG string. Nothing here touches the live
// document: the caller decides where the result ends up.

type MermaidModule = typeof import('mermaid')['default'];

let mermaidPromise: Promise<MermaidModule> | null = null;
let currentTheme: 'light' | 'dark' = 'light';
let renderCounter = 0;

function configFor(theme: 'light' | 'dark') {
  return {
    startOnLoad: false,
    theme: theme === 'dark' ? ('dark' as const) : ('default' as const),
    securityLevel: 'strict' as const,
    fontFamily: 'inherit',
  };
}

async function getMermaid(theme: 'light' | 'dark'): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const m = mod.default;
      m.initialize(configFor(theme));
      currentTheme = theme;
      return m;
    });
  }
  const m = await mermaidPromise;
  if (theme !== currentTheme) {
    m.initialize(configFor(theme));
    currentTheme = theme;
  }
  return m;
}

/**
 * Render one Mermaid source to an SVG string. Throws on invalid syntax so the
 * caller can substitute an error block.
 */
export async function renderMermaidToSvg(
  source: string,
  theme: 'light' | 'dark',
): Promise<string> {
  const mermaid = await getMermaid(theme);
  const id = `mermaid-${Date.now()}-${++renderCounter}`;
  const { svg } = await mermaid.render(id, source);
  return svg;
}
