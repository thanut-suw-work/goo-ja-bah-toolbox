export type CaseMode = 'lower' | 'upper' | 'title' | 'camel' | 'snake'

function words(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function transformCase(input: string, mode: CaseMode): string {
  switch (mode) {
    case 'lower':
      return input.toLowerCase()
    case 'upper':
      return input.toUpperCase()
    case 'title':
      return words(input)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    case 'camel': {
      const w = words(input).map((x) => x.toLowerCase())
      if (w.length === 0) return ''
      return (
        w[0] +
        w
          .slice(1)
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join('')
      )
    }
    case 'snake':
      return words(input)
        .map((w) => w.toLowerCase())
        .join('_')
  }
}
