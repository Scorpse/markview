export function documentWidthClass(readableLineLength: boolean): string {
  return readableLineLength
    ? 'p-8 max-w-4xl mx-auto pb-32'
    : 'p-8 max-w-none w-full pb-32';
}
