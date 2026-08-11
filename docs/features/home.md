# Feature: home

## Purpose

Landing surface listing GJB Toolbox tools. Brand-forward, operable (Impeccable Operate).

## Behavior

- Read tools via `toolsByGroup()` from the registry catalog
- Four `<details>` sections, all open on first paint: **Text**, **IDs & time**, **Files**, **Diagrams**
- Each `<summary>` label is the group name; tool rows inside are the same title + description + `/tools/:id` links as before
- Click a summary to collapse/expand that group only (session React state; refresh resets to all-open)
- Navigate to `/tools/:id` on tool select
- No persisted “recent”, favorites, or open/closed chrome (ephemeral product)
- Theme control lives in the app-shell header (every route), not on home alone
- Under trust pills: “Theme choice stays in this browser. Everything you paste still dies on refresh.”

## UI notes

- Under trust pills: theme persistence sentence, then one-line origin note (why GJB Toolbox exists — PDF vs image-only invoice apps)
- First viewport: brand **GJB Toolbox** as hero-level signal, short supporting line, tool access
- Avoid dashboard clutter and card spam unless needed for interaction
- Group headers are raised `--surface` bands (display face, weight 700, `--line-strong` ring; brass ring on hover/focus) so they read as drawer labels, not another tool row. Padding + matching negative margin keeps labels on the origin/hero left edge.
