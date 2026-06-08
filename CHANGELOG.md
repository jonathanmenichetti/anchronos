# Changelog

All notable changes to Anchronos will be documented here.

## [0.0.1] — 2026-06-07

### Added

- `Alt+L` — freeze and unfreeze cursor positions in the active file
- `Alt+A` — plant or remove an anchor at the current cursor position while in stasis
- Multi-cursor absorption: use `Ctrl+D` or `Alt+Click` to build native multi-cursors, then `Alt+A` to absorb them all into the frozen timeline
- Anchor decorations with border, background tint, overview ruler mark, and minimap highlight
- Status bar item showing the live anchor count for the active file
- **Butterfly Effect** — anchors are automatically removed if their exact position is deleted
- **Paradox Unification** — anchors that collide on the same offset after an edit are merged
- **Auto-shutdown** — exiting the last anchor in a file automatically exits stasis mode
- Per-file freeze state — each tab is frozen independently with no cross-contamination
- Orphan cleanup — closing a tab without unfreezing discards its anchors automatically
- `anchronos.showNotifications` setting — toggle status messages on or off
- `anchronos.anchorColor` setting — custom hex color for anchor decorations with live preview
- `Anchronos: Clear Anchors in Current File` command — discard anchors without releasing cursors
- `Anchronos: Clear All Anchors (Nuclear Reset)` command — wipe all state across all files
