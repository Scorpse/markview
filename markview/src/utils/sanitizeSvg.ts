const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BLOCKED_ELEMENTS = 'script, iframe, object, embed';

/**
 * Take renderer-produced SVG text and return a DOM element with active content
 * removed.
 *
 * Parsing happens in HTML mode via a `<template>`, whose content is inert: no
 * script runs and no resource is fetched while the tree is built. An XML parse
 * would be stricter but cannot read real renderer output — Mermaid serialises
 * `htmlLabels` inside `<foreignObject>` as HTML, so a node label containing a
 * line break emits a void `<br>` and fails an XML parse outright.
 *
 * Strictness of the parser is not what makes this safe: blocked elements and
 * `on*` / `javascript:` attributes are stripped from the parsed tree below.
 */
export function sanitizeSvg(svgText: string): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = svgText;

  // Matched on namespace rather than tag name, so an HTML element merely
  // named "svg" cannot pose as the root.
  const svg = Array.from(template.content.children).find(
    (element) => element.namespaceURI === SVG_NAMESPACE && element.localName === 'svg',
  );
  if (!svg) throw new Error('Renderer returned invalid SVG');

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
