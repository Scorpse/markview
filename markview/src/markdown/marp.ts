export function isMarpDocument(frontmatter: Record<string, unknown>): boolean {
  return frontmatter.marp === true;
}
