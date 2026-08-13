import { describe, it, expect } from 'vitest'
import { parseUserFills } from '@/tools/mermaid/userFills'

describe('parseUserFills', () => {
  it('returns empty sets for unstyled source', () => {
    const u = parseUserFills('flowchart TD\n  A-->B')
    expect(u.ids.size).toBe(0)
    expect(u.skipFamilies.size).toBe(0)
    expect(u.ganttStatusNames.size).toBe(0)
  })

  it('records style id when fill is present', () => {
    const u = parseUserFills('flowchart TD\n  A-->B\n  style A fill:#f96')
    expect([...u.ids]).toEqual(['A'])
  })

  it('ignores style without fill', () => {
    const u = parseUserFills('style A stroke:#333')
    expect(u.ids.size).toBe(0)
  })

  it('records classDef+class ids when the class has fill', () => {
    const u = parseUserFills(
      'classDef foo fill:#f96\nclass A,B foo\nclass C bar',
    )
    expect(u.ids.has('A')).toBe(true)
    expect(u.ids.has('B')).toBe(true)
    expect(u.ids.has('C')).toBe(false)
  })

  it('keeps classDef fill when later classDef restyles without fill', () => {
    const u = parseUserFills(
      'classDef foo fill:#f96\nclassDef foo stroke:red\nclass A foo',
    )
    expect(u.ids.has('A')).toBe(true)
  })

  it('does not record class id when classDef has no fill', () => {
    const u = parseUserFills('classDef bar stroke:#333\nclass C bar')
    expect(u.ids.has('C')).toBe(false)
  })

  it('records ::: classname when that classDef has fill', () => {
    const u = parseUserFills('classDef foo fill:#f96\nA:::foo')
    expect(u.ids.has('A')).toBe(true)
  })

  it('skips sequence when actorBkg is set', () => {
    const u = parseUserFills("%%{init: {'themeVariables': {'actorBkg': '#ff0'}}}%%")
    expect(u.skipFamilies.has('sequence')).toBe(true)
  })

  it('skips flowchart class and er when primaryColor is set', () => {
    const u = parseUserFills('primaryColor: #fff')
    expect(u.skipFamilies.has('flowchart')).toBe(true)
    expect(u.skipFamilies.has('class')).toBe(true)
    expect(u.skipFamilies.has('er')).toBe(true)
  })

  it('skips flowchart class and er when primaryColor is quoted in init', () => {
    const u = parseUserFills("%%{init: {'themeVariables': {'primaryColor': '#fff'}}}%%")
    expect(u.skipFamilies.has('flowchart')).toBe(true)
    expect(u.skipFamilies.has('class')).toBe(true)
    expect(u.skipFamilies.has('er')).toBe(true)
  })

  it('skips gantt when taskBkgColor is set', () => {
    const u = parseUserFills('taskBkgColor: #abc')
    expect(u.skipFamilies.has('gantt')).toBe(true)
  })

  it('skips gantt when taskBkgColor is quoted in init', () => {
    const u = parseUserFills("%%{init: {'themeVariables': {'taskBkgColor': '#abc'}}}%%")
    expect(u.skipFamilies.has('gantt')).toBe(true)
  })

  it('records gantt task names with crit done or active', () => {
    const src = `gantt
    title Project Timeline
    Research :crit, a1, 2026-01-01, 7d
    Wireframes :a2, after a1, 5d
    Frontend :done, b1, after a2, 10d
    QA :active, c1, after b1, 5d`
    const u = parseUserFills(src)
    expect(u.ganttStatusNames.has('Research')).toBe(true)
    expect(u.ganttStatusNames.has('Frontend')).toBe(true)
    expect(u.ganttStatusNames.has('QA')).toBe(true)
    expect(u.ganttStatusNames.has('Wireframes')).toBe(false)
  })
})
