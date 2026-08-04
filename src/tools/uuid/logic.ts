export function generateUuids(count: number): string[] {
  const n = Math.max(1, Math.min(100, Math.floor(count)))
  return Array.from({ length: n }, () => crypto.randomUUID())
}
