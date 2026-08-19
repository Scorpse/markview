export type RendererTheme = 'light' | 'dark';

export interface RenderBlockOptions {
  source: string;
  language: string;
  theme: RendererTheme;
}

export interface RendererModule {
  render(options: RenderBlockOptions): Promise<HTMLElement>;
}

export interface RendererDefinition {
  id: string;
  languages: readonly string[];
  load: () => Promise<RendererModule>;
}
