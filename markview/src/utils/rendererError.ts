interface RendererErrorOptions {
  rendererName: string;
  message: string;
  source: string;
  className: string;
}

export function renderRendererError(
  host: Element,
  { rendererName, message, source, className }: RendererErrorOptions,
) {
  const pre = document.createElement('pre');
  pre.className = className;
  pre.textContent = `${rendererName} render error:\n${message}\n\nSource:\n${source}`;
  host.replaceWith(pre);
}
