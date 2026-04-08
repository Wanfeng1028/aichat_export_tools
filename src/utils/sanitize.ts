export function sanitizePlainText(value: string): string {
  return value.replace(/\u0000/g, '').trim();
}
