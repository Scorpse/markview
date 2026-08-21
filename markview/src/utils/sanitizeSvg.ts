const BLOCKED_ELEMENTS = 'script, iframe, object, embed';

export function sanitizeSvg(svgText: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = parsed.documentElement;

  if (svg.localName !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('Renderer returned invalid SVG');
  }

  svg.querySelectorAll(BLOCKED_ELEMENTS).forEach((element) => element.remove());

  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') ||
          ((name === 'href' || name === 'xlink:href') && value.startsWith('javascript:'))) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return document.importNode(svg, true) as unknown as SVGSVGElement;
}
