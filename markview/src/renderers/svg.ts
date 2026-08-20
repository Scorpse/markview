export function safeSvgElement(svgText: string): SVGSVGElement {
  const documentNode = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = documentNode.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg' || documentNode.querySelector('parsererror')) {
    throw new Error('Renderer returned invalid SVG');
  }
  svg.querySelectorAll('script, iframe, object, embed').forEach((node) => node.remove());
  [svg, ...Array.from(svg.querySelectorAll('*'))].forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  return document.importNode(svg, true) as unknown as SVGSVGElement;
}
