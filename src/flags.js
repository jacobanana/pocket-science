/* Feature flags. The "timing ×3" soundbar toggle drives emphasizeTiming at
   runtime (persisted to localStorage); a URL query param overrides it for one
   session — e.g. ?emphasize-timing=1 (or =0). */
const params = new URLSearchParams(location.search)
const store = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {} }

function readFlag(param, key, fallback){
  const v = params.get(param)
  if(v !== null) return v !== '0' && v !== 'false'
  const s = store.getItem(key)
  return s === null ? fallback : s === '1'
}

export const FLAGS = {
  /* Exaggerate the visual timing offsets on the step grids so small leans are
     easy to spot: dot displacement is stretched ×3, capped inside the step.
     Positions become qualitative; tooltips always report the true values.
     Emphasized grids carry a "TIMING ×3" badge. */
  emphasizeTiming: readFlag('emphasize-timing', 'ps-emph', false),
}

export function setEmphasizeTiming(on){
  FLAGS.emphasizeTiming = !!on
  store.setItem('ps-emph', on ? '1' : '0')
}
