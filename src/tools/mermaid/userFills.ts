export type ShapeFamily = 'flowchart' | 'sequence' | 'class' | 'er' | 'gantt'

export type UserFills = {
  ids: Set<string>
  skipFamilies: Set<ShapeFamily>
  ganttStatusNames: Set<string>
}

const FILL_RE = /\bfill\s*:/i

export function parseUserFills(source: string): UserFills {
  const ids = new Set<string>()
  const skipFamilies = new Set<ShapeFamily>()
  const ganttStatusNames = new Set<string>()

  if (/\bactorBkg['"]?\s*:/.test(source)) skipFamilies.add('sequence')
  if (/\bprimaryColor['"]?\s*:/.test(source)) {
    skipFamilies.add('flowchart')
    skipFamilies.add('class')
    skipFamilies.add('er')
  }
  if (/\btaskBkgColor['"]?\s*:/.test(source)) skipFamilies.add('gantt')

  for (const m of source.matchAll(/^\s*style\s+(\S+)\s+([^\n]+)/gim)) {
    if (FILL_RE.test(m[2]!)) ids.add(m[1]!)
  }

  const classHasFill = new Map<string, boolean>()
  for (const m of source.matchAll(/^\s*classDef\s+(\S+)\s+([^\n]+)/gim)) {
    classHasFill.set(m[1]!, FILL_RE.test(m[2]!))
  }

  for (const m of source.matchAll(/^\s*class\s+(\S+)\s+(\S+)/gim)) {
    if (!classHasFill.get(m[2]!)) continue
    for (const id of m[1]!.split(',')) {
      const t = id.trim()
      if (t) ids.add(t)
    }
  }

  for (const m of source.matchAll(/(?:^|[\s])(\S+):::(\S+)/g)) {
    if (classHasFill.get(m[2]!)) ids.add(m[1]!)
  }

  for (const m of source.matchAll(
    /^\s*([^:\n]+):([^\n]*\b(?:crit|done|active)\b[^\n]*)/gim,
  )) {
    const name = m[1]!.trim()
    if (!name || /^(title|dateFormat|axisFormat|section|excludes)$/i.test(name)) {
      continue
    }
    ganttStatusNames.add(name)
  }

  return { ids, skipFamilies, ganttStatusNames }
}
