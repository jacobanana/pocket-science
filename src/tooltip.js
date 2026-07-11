/* Note tooltip: hover on desktop, tap on mobile. Reads the data-tip text
   baked into each .hit target by renderGridSVG. */
export function initTooltip(){
  const tip = document.createElement('div')
  tip.className = 'notetip'
  tip.hidden = true
  document.body.appendChild(tip)

  let pinned = null // the tapped hit, when tap-opened

  function show(hit){
    const text = hit.dataset.tip
    if(!text) return
    tip.innerHTML = ''
    text.split('\n').forEach((line, i) => {
      const d = document.createElement('div')
      if(i === 0) d.className = 't1'
      d.textContent = line
      tip.appendChild(d)
    })
    tip.style.visibility = 'hidden'
    tip.hidden = false
    const r = hit.getBoundingClientRect()
    const tw = tip.offsetWidth, th = tip.offsetHeight
    let left = r.left + r.width/2 - tw/2 + window.scrollX
    left = Math.max(8 + window.scrollX, Math.min(left, window.scrollX + document.documentElement.clientWidth - tw - 8))
    let top = r.top - th - 10 + window.scrollY
    if(r.top - th - 10 < 0) top = r.bottom + 10 + window.scrollY
    tip.style.left = `${left}px`
    tip.style.top = `${top}px`
    tip.style.visibility = ''
  }
  function hide(){ tip.hidden = true; pinned = null }

  // desktop hover
  document.addEventListener('pointerover', e => {
    if(e.pointerType !== 'mouse' || pinned) return
    const h = e.target.closest?.('.hit')
    if(h) show(h)
  })
  document.addEventListener('pointerout', e => {
    if(e.pointerType !== 'mouse' || pinned) return
    if(e.target.closest?.('.hit')) hide()
  })
  // tap (and click) toggles + pins
  document.addEventListener('click', e => {
    const h = e.target.closest?.('.hit')
    if(h){
      if(pinned === h){ hide(); return }
      show(h); pinned = h
    } else {
      hide()
    }
  })
  window.addEventListener('scroll', () => { if(!pinned) hide() }, { passive: true })
  window.addEventListener('hashchange', hide)
}
