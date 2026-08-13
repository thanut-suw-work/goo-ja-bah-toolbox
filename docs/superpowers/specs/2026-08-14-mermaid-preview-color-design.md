# Mermaid Preview Color — Design Spec

Date: 2026-08-14  
Status: approved (brainstorm)  
Surface: `/tools/mermaid` preview + lightbox + optional colored downloads

Sister specs: `2026-08-12-mermaid-viewer-design.md` (engine, parse, cards, lightbox), `2026-08-12-theme-design.md` (resolved theme → mermaid `dark` | `default`).

## Summary

After each successful `mermaid.render`, clone the SVG and stamp a **shuffled, theme-safe palette** onto unstyled **primary shapes**. Card preview and lightbox show the clone. Raw engine SVG is kept. Per success card, a **Download with color?** checkbox (default **off**) sits before the download buttons; off → files are the raw engine SVG/PNG; on → files match the clone. User-authored fills in the **source** win. No second engine render. No new npm. No persistence.

## Goals

- Preview + lightbox use a colored clone when at least one primary shape was restyled
- Default downloads stay bit-for-bit engine output
- Optional colored downloads match the on-screen clone
- Each unstyled primary shape gets a different palette color (wrap if more shapes than colors)
- New Visualize **or** theme flip re-rolls the shuffle
- Card and lightbox share the same clone for that result
- User `style` / `classDef` / `:::` / init-YAML fill keys / gantt `crit|done|active` stay engine-painted
- Palette looks acceptable on mermaid `dark` and `default`; no purple/indigo; no brass node fills

## Non-goals

- Live-as-you-type colorize
- Persisting palette, toggle, or roll across refresh
- Color picker, legend, or per-shape controls
- Overlay on state, pie, mindmap, git, timeline, or other non-listed types
- Recoloring edges, lifelines, messages, notes, clusters, gantt section row tints, axis, title
- Second `mermaid.render` / injecting `style` into source
- `themeVariables`-only single fill for the whole diagram
- Changing PlantUML
- New runtime dependencies

## Constraints

- Client-only; React memory only; refresh clears overlay + toggle (`docs/privacy.md`)
- One `mermaid.render` per block; colorize is post-process
- Detect user color from **block source text**, not computed CSS (dark theme rewrites `#eaeaea`)
- Impeccable Operate; native checkbox, not a custom knob; honor `DESIGN.md` (no purple/indigo; brass is chrome only)
- Tests under `testing/unit/tools/mermaid/` must not boot `mermaid`
- Local browser-reachable servers: never start in Cursor sandbox netns

## Approach (chosen)

**Clone + mutate after one engine render.**

1. `renderBlock` unchanged → raw `svg`
2. `colorizePreview(svg, blockText, theme)` → `{ previewSvg, colored }`
3. Card / lightbox bind `previewSvg`
4. Downloads pick `svg` or `previewSvg` from the checkbox

Rejected: inject `style` + render twice (cost + fights `classDef`); `themeVariables` only (cannot differ per shape).

## Architecture

```
source → parseMermaid → renderBlock (unchanged)
                      → raw svg
                      → colorizePreview(raw, block.text, mermaidTheme)
                      → { previewSvg, colored }
```

| Unit | Does | Depends on |
|------|------|------------|
| `userFills.ts` | Scan **block** source for styled ids, skip-families, gantt status names | — |
| `palette.ts` | Curated fill+label+stroke triples per `dark` / `default`; Fisher–Yates shuffle | — |
| `colorizeSvg.ts` | Parse SVG; walk primary shapes; skip user fills; stamp palette; serialize. Throw → caller falls back | userFills, palette |
| `MermaidTool.tsx` | Store raw + preview + `colored`; checkbox; lightbox = preview; download = chosen svg | colorizePreview, existing render/parse |

No extra npm. `DOMParser` + `XMLSerializer` (jsdom in unit tests).

## Primary shapes

Detect type from root SVG `aria-roledescription` (`flowchart` / `flowchart-v2` → flowchart; `sequence`; `class`; `er`; `gantt`). Anything else: return raw, `colored: false`.

| Type | Recolor | Skip | Identity (same id → same color) |
|------|---------|------|----------------------------------|
| Flowchart | `g.node` geom (`.label-container`, `rect`, `polygon`, `circle`) | `.cluster`, `.edgeLabel`, edges | `data-id` or id after `flowchart-` prefix |
| Sequence | `rect.actor`; stick-figure `g.actor-man` fills | `.actor-line`, messages, notes, activation `rect` (not `.actor`) | `name` attr or inner text |
| Class | mermaid 11: inject `rect.gjb-header-fill` from outer-path top to first `.divider` (title band only). No divider → whole box. Legacy `g.classGroup` rect. Title `.label-group` only | relations, `.members-group` / `.methods-group` | `data-id` or `classId-NAME-n` |
| ER | mermaid 11: `.outer-path` header band only. Empty entity: `:scope > rect.label-container`. Title `.label.name` only | relationships, `.row-rect-odd` / `.row-rect-even`, attribute labels | `data-id` or `entity-NAME-n` |
| Gantt | `rect.task` (not `.section`) | section row tints, axis, title | task name text |
| Other | — | whole diagram | — |

Sequence top + bottom boxes for one participant share one roll. Node body + its label share one roll.

## User color wins

Scan **that block’s** mermaid text only (not the whole markdown buffer).

**Styled ids** (leave those shapes):

- `style ID fill:…` (fill present in the style list)
- `classDef NAME … fill:…` plus `class ID,ID2 NAME` or `ID:::NAME`
- Gantt task lines whose options include `crit`, `done`, or `active` (match task **name**)

**Skip whole family** if the block sets that family’s themeVariables fill key (`%%{init}%%` or YAML `themeVariables`). Detection: key name present (`actorBkg:`, `primaryColor:`, `taskBkgColor:`). No JSON parse.

| Key substring | Skip family |
|---------------|-------------|
| `actorBkg` | sequence |
| `primaryColor` | flowchart **and** class **and** er |
| `taskBkgColor` | gantt |

`theme: forest` without those keys still gets overlay (theme name is not a fill key).

## Palette

Eight fills each. Label is `--text-primary` for that chrome theme. Stroke is a darker (light mermaid) or lighter (dark mermaid) sibling so the box still reads.

**Dark** (`theme: 'dark'`), label `#e6edf3`:

| Fill | Stroke |
|------|--------|
| `#2f5d50` | `#7aa894` |
| `#35536e` | `#7a9bb8` |
| `#6b5344` | `#c4a890` |
| `#3d5c5c` | `#7aabab` |
| `#5c4a32` | `#c4a878` |
| `#4a5a3c` | `#9bb07a` |
| `#5a4040` | `#c49090` |
| `#3c4a5c` | `#7a90a8` |

**Light** (`theme: 'default'`), label `#14171d`:

| Fill | Stroke |
|------|--------|
| `#c5d9ce` | `#2f5d50` |
| `#c5d0dc` | `#35536e` |
| `#e2d4c4` | `#6b5344` |
| `#c5d6d6` | `#3d5c5c` |
| `#ddd4c4` | `#5c4a32` |
| `#d4dcc5` | `#4a5a3c` |
| `#e0cccc` | `#5a4040` |
| `#d0d4dc` | `#3c4a5c` |

No purple/indigo. No brass (`#d99a3f` / `#e7ab55` / `#a35a17`). Shuffle once per diagram per Visualize/theme flip via injectable `rng` (`Math.random` in prod). More shapes than colors: wrap; if wrap would repeat the previous color, skip one slot.

Stamp on the clone only: geom `fill` + `stroke`; label `fill` and CSS `color` (HTML foreignObject labels).

## UI

Success card header actions, left → right:

**View** · **Download with color?** · **Download SVG** · **Download PNG**

- Native `<input type="checkbox">` + label **Download with color?**
- Default **off** (absent map entry = off)
- Show checkbox **only** when `colored === true`
- Preview click + **View** always use `previewSvg`
- Downloads + `svgToRaster` use raw `svg` when off, `previewSvg` when on
- Zoomed lightbox transform never used for files (unchanged)
- No toggle on source card; no global toggle; no legend
- Visualize **click** clears toggle state. Theme re-render **keeps** per-index toggle

## Data flow

```
Visualize click → clear results + toggles
  for block of parseMermaid(source):
    raw = renderBlock(block.text, …)
    if raw.ok:
      { previewSvg, colored } = colorizePreview(raw.svg, block.text, theme)
        catch → previewSvg = raw.svg, colored = false
      store { ok, svg: raw, previewSvg, colored, pngError }
    else store { ok: false, error }

Theme flip → same loop, do not clear toggles, do not clear results first
  (existing in-place re-render; new shuffle inside colorize)
```

## Error handling

| Case | Behavior |
|------|----------|
| Colorize throw / XML parse fail | Raw SVG on card; `colored: false`; no toggle; no toast |
| Engine fail | Unchanged (that card `role="alert"`) |
| PNG raster fail | Unchanged copy; SVG download still enabled |
| Unsupported diagram type | Raw preview; no toggle |
| Every primary shape user-styled | Raw preview; `colored: false`; no toggle |

## Privacy

Unchanged. Overlay and checkbox live in React state. No new `localStorage` keys.

## Files

Create:

- `src/tools/mermaid/userFills.ts`
- `src/tools/mermaid/palette.ts`
- `src/tools/mermaid/colorizeSvg.ts` (exports `colorizePreview`)
- `testing/unit/tools/mermaid/userFills.test.ts`
- `testing/unit/tools/mermaid/palette.test.ts`
- `testing/unit/tools/mermaid/colorizeSvg.test.ts`

Modify:

- `src/tools/mermaid/MermaidTool.tsx`
- `testing/unit/tools/mermaid/MermaidTool.test.tsx`
- `docs/features/mermaid.md`
- `docs/README.md`

## Testing

Unit tests **do not** boot `mermaid`. UI tests mock `renderBlock`, `svgToRaster`, and `colorizePreview`.

**`userFills`**

- `style A fill:#f96` → ids has `A`
- `classDef foo fill:#f96` + `class A foo` / `A:::foo` → `A`
- `classDef` without fill → not an id
- `actorBkg:` → skip sequence
- `primaryColor:` → skip flowchart, class, er
- `taskBkgColor:` → skip gantt
- gantt `crit`/`done`/`active` → that task name
- unstyled source → empty ids, no skip families

**`palette`**

- dark/light each have 8 triples
- no purple/indigo/brass hexes
- shuffle is a permutation; seeded rng is deterministic

**`colorizeSvg` / `colorizePreview`**

- Fixture flowchart/sequence/class/ER/gantt: unstyled primary shapes change to palette fills; styled id unchanged
- Sequence top+bottom same fill
- Unsupported `aria-roledescription` passthrough, `colored: false`
- Throw/invalid XML → `{ previewSvg: original, colored: false }`
- Injectable rng so assertions are stable

**UI**

- `colored: false` → no checkbox; downloads raw
- `colored: true`, checkbox default off → Download SVG/PNG get raw `svg`
- checkbox on → same calls get `previewSvg`
- lightbox HTML is `previewSvg`
- theme flip still re-calls `renderBlock` (existing test)

## Docs follow-through

- This spec
- `docs/features/mermaid.md`: overlay + checkbox
- `docs/README.md`: link spec + plan
- Privacy unchanged
