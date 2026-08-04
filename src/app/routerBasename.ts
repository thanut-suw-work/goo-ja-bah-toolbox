/** Vite BASE_URL ends with `/`; React Router basename must not. */
export function routerBasename(baseUrl: string): string {
  if (baseUrl === '/') return ''
  return baseUrl.replace(/\/$/, '')
}
