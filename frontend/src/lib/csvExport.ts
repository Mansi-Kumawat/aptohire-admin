const FORMULA_START = /^[\uFEFF\u0000-\u0020]*[=+\-@]/;
const CONTROL_START = /^[\t\r]/;
export function guardCsvCell(value: unknown): string {
  const text = String(value ?? '');
  return FORMULA_START.test(text) || CONTROL_START.test(text) ? `'${text}` : text;
}
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  const csv = rows.map((row) => row.map((cell) => `"${guardCsvCell(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  return `\uFEFF${csv}`;
}
