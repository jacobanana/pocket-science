# Pocket Science — Groove Atlas

A playable atlas of **67 grooves** from the timing-analysis series — Bonham to Dilla to
Sly & Robbie — with the three ingredients of every groove baked into the data:

1. **Pattern** — which steps are hit
2. **Velocity** — accents, normals, and the ghost notes that make you dance
3. **Micro-timing** — per-hit offsets in beat-based ticks (PPQ 480), so the lean survives tempo changes

The full pattern database ([`src/data/patterns.json`](src/data/patterns.json)) is bundled
into the app at build time — nothing to upload. Every groove is drawn in the series' grid
language (dot size = velocity, tails = micro-timing lean), playable in the browser with a
synthesized kit that honors offsets, ghosts and swing, and downloadable as a Standard MIDI
File ([`public/midi/`](public/midi)).

## Paths

The atlas includes curated **paths** — lineages you can walk groove by groove, with notes on
what changes at each step:

- **Blues → Rock: the flattening** — the triplet shuffle hammered into straight eighths
- **The Bonham path** — behind-the-beat weight and the half-time shuffle conversation (Purdie → Bonham → Porcaro)
- **The Questlove path** — James Brown → breaks → Dilla's drunk MPC → Questlove playing the machine
- **Breaks → Jungle → Drum & Bass** — five sampled bars become thirty years of dance music
- **The Producers path** — Premier, Pete Rock, RZA, Dre, Timbaland, Neptunes: micro-timing as authorship
- **Kingston: One Drop → Dancehall** — Barrett empties beat one; Sly & Robbie digitize it; the bass always sags
- **Four-on-the-floor: 1938 → Techno** — from Papa Jo's feathered kick to the machine grid
- **New Orleans: the Crack** — bembé → second line → Zigaboo's in-between offbeats

## Development

```
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

Built with [Vite](https://vite.dev), vanilla JS, no runtime dependencies. Deployed to
GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
