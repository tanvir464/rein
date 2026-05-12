# REIN brand assets

Source SVGs for the REIN identity. All marks are vector and use `currentColor` where possible so they pick up the surrounding text color in `<a>` / `<button>` contexts.

## Files

| File | Purpose | Size |
|---|---|---|
| `mark.svg` | Loop mark only, square. Uses `currentColor`. | 24×24 viewBox |
| `wordmark.svg` | "REIN" type only. Uses `currentColor`. Geist 600, tracking −0.02em. | 160×32 |
| `logo.svg` | Horizontal lockup: mark (accent-700) + wordmark (`currentColor`). | 200×32 |
| `og-card.svg` | Social share card. | 1200×630 |
| `../app/icon.svg` | Next 16 favicon — accent-700 rounded square with white mark inside. | 32×32 |

## Usage rules

**Clearspace.** Reserve at least the mark's own width (`1em`) of empty space on every side of the lockup.

**Minimum size.** Mark: 16px. Lockup: 96px wide (drop the mark below 96px and use the wordmark alone). OG card: never resize below 600×315.

**Color combinations.**
- Light surface: mark in `accent-700` (`hsl(173 80% 36%)`), wordmark in `--fg` (`hsl(0 0% 9%)`).
- Dark surface: mark in `accent-500` (`hsl(170 70% 72%)`), wordmark in white.
- Mono: everything in `--fg`. Acceptable for legal docs, faxes, embossed.
- One-color reverse: everything in white on a saturated `accent-700` field. Acceptable for stickers, swag.

**Don't.**
- Don't recolor the mark with non-token hues. If you need a different hue, change the accent token globally — never one-off.
- Don't add a drop-shadow, glow, or gradient. The brand is flat and confident.
- Don't crop or rotate the mark. The crossover is geometry, not decoration.
- Don't pair with another logo at equal weight. If we co-brand, REIN sits to the right of the partner mark with a 24px vertical divider in `--border`.
- Don't change the wordmark's letter-spacing. `-0.02em` is the value.

## Notes for production

- The wordmark currently uses an SVG `<text>` element with a Geist fallback chain. For static asset reliability outside the web app (decks, partner press kits), generate outlined-path versions before sending. Track that as a follow-up under F37 (landing) when we have real distribution.
- The mark's two-strand crossover is rendered as overlapping `<path>` elements in z-order, not as a single closed path. This is intentional — it lets us animate the over-strand independently in the landing hero (Phase 6, F37).
- An animated landing variant of the mark is planned for F37 — `--ease-spring`, 600ms self-draw.

## Source of truth

If you need to change the brand: update `specs/features/F0-brand.md`, then regenerate these SVGs from it. The doc is normative; these files are downstream.
