export function referenceLag(requested: string, actual: string, monthly = false) {
  if (monthly) {
    const month = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7));
    return month(requested) - month(actual);
  }
  return Math.round((Date.parse(requested) - Date.parse(actual)) / 86_400_000);
}
