/* Feature flags. Flip the defaults here, or override for one session with a
   URL query param — e.g. ?emphasize-timing=1 (or =0) — no rebuild needed. */
const params = new URLSearchParams(location.search)

function flag(name, fallback){
  const v = params.get(name)
  return v === null ? fallback : v !== '0' && v !== 'false'
}

export const FLAGS = {
  /* Exaggerate the visual timing offsets on the step grids so small leans are
     easy to spot: dot displacement is stretched ×3, capped inside the step.
     Positions become qualitative; tooltips always report the true values.
     Emphasized grids carry a "TIMING ×3" badge. */
  emphasizeTiming: flag('emphasize-timing', false),
}
