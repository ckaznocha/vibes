export function spliceTable(
  readme: string,
  table: string,
  start: string,
  end: string,
): string {
  const startIndex = readme.indexOf(start);
  const endIndex = readme.indexOf(end);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`README.md is missing ${start} / ${end} markers`);
  }

  return (
    readme.slice(0, startIndex + start.length) +
    "\n\n" +
    table +
    "\n\n" +
    readme.slice(endIndex)
  );
}
