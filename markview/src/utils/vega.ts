// Lazy-loaded Vega-Lite / Vega renderer. Renders a JSON spec to an SVG string.
//
// Unlike mermaid, vega needs a real element with a width to lay out against, so
// the chart is built in an offscreen host that is removed again before we
// return. The live document never sees it.

type EmbedFn = typeof import('vega-embed').default;

let embedPromise: Promise<EmbedFn> | null = null;

async function getEmbed(): Promise<EmbedFn> {
  if (!embedPromise) {
    embedPromise = import('vega-embed').then((mod) => mod.default);
  }
  return embedPromise;
}

function vegaThemeFor(theme: 'light' | 'dark') {
  // vega-embed's built-in `dark` theme works. Light uses default.
  return theme === 'dark' ? ('dark' as const) : undefined;
}

// Matches .markdown-body's content box (max-w-4xl = 896px minus p-8 padding),
// so specs using "width": "container" lay out at the width they will be shown
// at. The SVG scales with the viewport from there via CSS.
const OFFSCREEN_WIDTH = 832;

/**
 * Render one Vega / Vega-Lite spec to an SVG string. Throws on invalid JSON or
 * a bad spec so the caller can substitute an error block.
 */
export async function renderVegaToSvg(
  source: string,
  mode: 'vega' | 'vega-lite',
  theme: 'light' | 'dark',
): Promise<string> {
  const embed = await getEmbed();
  const spec = JSON.parse(source);

  const host = document.createElement('div');
  host.style.cssText = `position:absolute;left:-99999px;top:0;width:${OFFSCREEN_WIDTH}px`;
  document.body.appendChild(host);

  try {
    const result = await embed(host, spec, {
      mode,
      actions: false,
      renderer: 'svg',
      theme: vegaThemeFor(theme),
    });
    const svg = host.querySelector('svg')?.outerHTML ?? '';
    result.finalize();
    return svg;
  } finally {
    host.remove();
  }
}
