import './style.css'
import BANK from './data/patterns.json'
import { renderGridSVG, renderVerdictSVG } from './render.js'
import { togglePlay, stopPlayback, KITS, getKit, setKit, getMetronome, setMetronome } from './audio.js'
import { FLAGS, setEmphasizeTiming } from './flags.js'
import { CHAPTERS } from './chapters.js'
import { GUIDE_HTML } from './guide.js'
import { initTooltip, hideNoteTip } from './tooltip.js'

const byId = Object.fromEntries(BANK.patterns.map(p => [p.id, p]))
const MIDI_BASE = `${import.meta.env.BASE_URL}midi/`

const app = document.getElementById('app')
app.innerHTML = `
  <p class="eyebrow">The timing-analysis series · playable archive</p>
  <h1>Pocket Science</h1>
  <p class="lede">Every groove is three decisions: which notes, how hard, and — the secret — how far from the
  grid. From Bonham's fat, late snare to Dilla's drunk kicks to Robbie Shakespeare's deep bass sag, this atlas
  maps where the beat actually lives. Press play and listen for the pocket: the ghosts, the swing, the lean,
  the space between drum and bass. Open a chapter to hear how one groove became the next.</p>
  <nav class="tabs" id="tabs">
    <button class="tab" data-view="chapters">Chapters</button>
    <button class="tab" data-view="all">All grooves</button>
    <button class="tab" data-view="guide">Field guide</button>
  </nav>
  <div class="soundbar">
    <label>kit
      <select id="kitsel">${KITS.map(k=>`<option value="${k.id}"${k.id===getKit()?' selected':''}>${k.label}</option>`).join('')}</select>
    </label>
    <label class="metro"><input type="checkbox" id="metro"${getMetronome()?' checked':''}> metronome</label>
    <label class="metro" title="Exaggerate the timing offsets on the grids ×3 so small leans are easy to see — tooltips keep the true values">
      <input type="checkbox" id="emph"${FLAGS.emphasizeTiming?' checked':''}> exaggerate timing</label>
  </div>
  <main id="view"></main>
  <p class="footer">How to read the grids: dot size = how hard the hit lands (tiny = ghost note). Arrows point
  from the true beat to where the hit actually lands — left of the line is ahead of the beat, right is behind. Hollow circles are open hats. The swing
  badge is the MPC-style 16th swing to dial in on hardware. The metronome clicks the true beat, so hits that
  lean ahead of the one will sound just before the click — that's the lean, not a mistake. Every groove is
  downloadable as MIDI for your DAW or drum machine.</p>
`

const viewEl = document.getElementById('view')
const tabsEl = document.getElementById('tabs')
document.getElementById('kitsel').addEventListener('change', e => setKit(e.target.value))
document.getElementById('metro').addEventListener('change', e => setMetronome(e.target.checked))
document.getElementById('emph').addEventListener('change', e => { setEmphasizeTiming(e.target.checked); redrawGrids() })

/* re-render every step grid in place (cards + open modal) after a display
   flag changes — playback, search state and scroll position all survive.
   The modal redraws itself so its transport tweaks (swing/timing) stay in. */
let modalRedraw = null
function redrawGrids(){
  document.querySelectorAll('[data-gridfor]').forEach(el => {
    if(el.classList.contains('modalsvg')) return
    const p = byId[el.dataset.gridfor]
    if(p) el.innerHTML = renderGridSVG(p)
  })
  if(modalRedraw) modalRedraw()
}

/* ---------------- pattern card */
function metaLine(p){
  const gridName = p.grid===12?'triplet grid':p.grid===8?'8th grid':'16th grid'
  return `${p.bpm} bpm · ${p.bars} bar${p.bars>1?'s':''} · ${gridName}`
}
/* list = the ordered set of grooves the card sits in (search results,
   chapter steps) — the fullscreen modal navigates within it */
function patternCard(p, list){
  const card = document.createElement('div')
  card.className = 'card'
  card.innerHTML = `
    <div class="cardtop">
      <div>
        <p class="tname">${p.name}</p>
        <p class="tmeta">${metaLine(p)}</p>
        <p style="margin-bottom:6px">
          <span class="chip">${p.chapter||'—'}</span>
          ${p.genre?`<span class="chip genre">${p.genre}</span>`:''}
          ${p.swing_16th?`<span class="chip sw">swing ${p.swing_16th}%</span>`:''}
        </p>
      </div>
      <div class="cardbtns">
        <button class="fsbtn" title="View diagram full screen" aria-label="View diagram full screen">⛶</button>
        <button class="playbtn" data-play="${p.id}">► play</button>
      </div>
    </div>
    <div data-gridfor="${p.id}">${renderGridSVG(p)}</div>
    <div class="cardfoot">
      <p class="feel">${p.feel||''}</p>
      <a class="midilink" href="${MIDI_BASE}${p.id}.mid" download>⬇ midi</a>
    </div>`
  card.querySelector('.playbtn').addEventListener('click', e => togglePlay(p, e.currentTarget))
  card.querySelector('.fsbtn').addEventListener('click', () => openDiagramModal(p, list))
  return card
}

/* ---------------- full-screen diagram modal */
function openDiagramModal(p, list){
  list = (list && list.length) ? list : [p]
  let idx = Math.max(0, list.findIndex(q => q.id === p.id))
  let cur = { ...p } // local playback copy: bpm/swing tweaks never touch the bank
  const swingTitle = q => q.grid===12
    ? 'On triplet grids, swing pushes the skip note past its natural 2/3 spot'
    : 'Delay the offbeat subdivisions, MPC-style'
  const ov = document.createElement('div')
  ov.className = 'modal'
  ov.innerHTML = `
    <div class="modalbox">
      <div class="modalhead">
        <div>
          <p class="tname" id="mtitle">${p.name}</p>
          <p class="tmeta" id="mmeta">${metaLine(p)}</p>
        </div>
        <div class="modalnav">
          <button class="mnav" id="mprev" aria-label="Previous groove">‹</button>
          <span class="mcount" id="mcount"></span>
          <button class="mnav" id="mnext" aria-label="Next groove">›</button>
          <button class="modalclose" aria-label="Close">✕ close</button>
        </div>
      </div>
      <div class="modalsvg" data-gridfor="${p.id}"></div>
      <div class="transport">
        <button class="playbtn" data-play="${p.id}">► play</button>
        <label>bpm <input type="number" id="mbpm" min="40" max="260" value="${p.bpm}"></label>
        <label id="mswinglabel" title="${swingTitle(p)}">swing
          <input type="range" id="mswing" min="50" max="75" value="${p.swing_16th||50}">
          <span id="mswingv">${p.swing_16th||50}%</span></label>
        <label title="Multiply the groove's micro-timing offsets: 0% plays it dead on the grid, 100% as recorded, up to 300%">timing
          <input type="range" id="mtime" min="0" max="300" step="5" value="100">
          <span id="mtimev">100%</span></label>
        <label>kit
          <select id="mkit">${KITS.map(k=>`<option value="${k.id}"${k.id===getKit()?' selected':''}>${k.label}</option>`).join('')}</select>
        </label>
        <label class="metro"><input type="checkbox" id="mmetro"${getMetronome()?' checked':''}> metronome</label>
      </div>
    </div>`
  const playBtn = ov.querySelector('.playbtn')
  const holder = ov.querySelector('.modalsvg')
  const el = id => ov.querySelector(id)

  // render at the modal's real pixel width so the grid spreads out at 1:1
  // scale (more horizontal resolution) rather than magnifying the card view;
  // showSwing + cur's timing_scale keep the picture in step with playback
  const draw = () => { holder.innerHTML = renderGridSVG(cur, { width: holder.clientWidth, showSwing: true }) }

  /* ---- navigation between grooves in the list the modal was opened from */
  function updateNav(){
    el('#mprev').disabled = idx === 0
    el('#mnext').disabled = idx === list.length-1
    el('#mcount').textContent = `${idx+1} / ${list.length}`
  }
  function nav(dir){
    const ni = idx + dir
    if(ni < 0 || ni >= list.length) return
    const wasPlaying = playBtn.classList.contains('on')
    if(wasPlaying) stopPlayback()
    hideNoteTip()
    idx = ni
    cur = { ...list[idx] }
    el('#mtitle').textContent = cur.name
    el('#mmeta').textContent = metaLine(cur)
    holder.dataset.gridfor = cur.id
    playBtn.dataset.play = cur.id
    // per-pattern transport resets to the new groove's native values
    el('#mbpm').value = cur.bpm
    const sw = cur.swing_16th || 50
    el('#mswing').value = sw
    el('#mswingv').textContent = `${sw}%`
    el('#mswinglabel').title = swingTitle(cur)
    el('#mtime').value = 100
    el('#mtimev').textContent = '100%'
    draw()
    updateNav()
    if(wasPlaying) togglePlay(cur, playBtn)
  }
  el('#mprev').addEventListener('click', () => nav(-1))
  el('#mnext').addEventListener('click', () => nav(1))
  // wheel flips grooves — unless the box actually needs to scroll
  let wheelAcc = 0, wheelLock = 0
  ov.addEventListener('wheel', e => {
    const box = el('.modalbox')
    if(box.scrollHeight > box.clientHeight + 4) return
    e.preventDefault()
    const now = Date.now()
    if(now < wheelLock) return
    wheelAcc += e.deltaY
    if(Math.abs(wheelAcc) >= 60){
      nav(wheelAcc > 0 ? 1 : -1)
      wheelAcc = 0
      wheelLock = now + 350
    }
  }, { passive: false })
  // horizontal swipe on touch — but not when it starts on a control
  let tx = null, ty = 0
  ov.addEventListener('touchstart', e => {
    tx = e.target.closest('input,select,button') ? null : e.touches[0].clientX
    ty = e.touches[0].clientY
  }, { passive: true })
  ov.addEventListener('touchend', e => {
    if(tx === null) return
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty
    if(Math.abs(dx) > 48 && Math.abs(dx) > 2*Math.abs(dy)) nav(dx < 0 ? 1 : -1)
  }, { passive: true })

  const onKey = e => {
    if(e.key === 'Escape'){ close(); return }
    if(e.target.closest?.('input,select')) return
    if(e.key === 'ArrowLeft') nav(-1)
    if(e.key === 'ArrowRight') nav(1)
  }
  function close(){
    if(playBtn.classList.contains('on')) stopPlayback()
    ov.remove()
    modalRedraw = null
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', draw)
  }
  ov.addEventListener('click', e => { if(e.target === ov) close() })
  ov.querySelector('.modalclose').addEventListener('click', close)
  document.addEventListener('keydown', onKey)

  playBtn.addEventListener('click', () => togglePlay(cur, playBtn))
  // bpm/swing are baked in at schedule time, so changing them mid-play
  // restarts the loop; kit and metronome are read live and need nothing
  const restart = () => { if(playBtn.classList.contains('on')){ togglePlay(cur, playBtn); togglePlay(cur, playBtn) } }
  el('#mbpm').addEventListener('change', e => {
    cur.bpm = Math.min(260, Math.max(40, +e.target.value || cur.bpm))
    e.target.value = cur.bpm
    draw() // tooltip ms values follow the tempo
    restart()
  })
  // sliders: readout + diagram track the drag live, audio restarts on release
  el('#mswing').addEventListener('input', e => {
    const v = +e.target.value
    el('#mswingv').textContent = `${v}%`
    cur.swing_16th = v > 50 ? v : null
    draw()
  })
  el('#mswing').addEventListener('change', () => restart())
  el('#mtime').addEventListener('input', e => {
    el('#mtimev').textContent = `${e.target.value}%`
    cur.timing_scale = +e.target.value / 100
    draw()
  })
  el('#mtime').addEventListener('change', () => restart())
  el('#mkit').addEventListener('change', e => {
    setKit(e.target.value)
    const main = document.getElementById('kitsel'); if(main) main.value = e.target.value
  })
  el('#mmetro').addEventListener('change', e => {
    setMetronome(e.target.checked)
    const main = document.getElementById('metro'); if(main) main.checked = e.target.checked
  })

  document.body.appendChild(ov)
  draw()
  updateNav()
  modalRedraw = draw
  window.addEventListener('resize', draw)
}

/* ---------------- view: all grooves */
function renderAll(){
  const genres = [...new Set(BANK.patterns.map(p=>p.genre).filter(Boolean))].sort()
  viewEl.innerHTML = `
    <div class="controls">
      <input type="text" id="search" placeholder="search name / feel / genre…">
      <select id="genre">
        <option value="">All genres</option>
        ${genres.map(g=>`<option>${g}</option>`).join('')}
      </select>
      <select id="sort">
        <option value="id">Sort: series order</option>
        <option value="bpm">Sort: BPM</option>
        <option value="name">Sort: name</option>
      </select>
    </div>
    <p class="count" id="count"></p>
    <div id="list"></div>`
  const searchEl = viewEl.querySelector('#search'), genreEl = viewEl.querySelector('#genre'),
        sortEl = viewEl.querySelector('#sort'),
        countEl = viewEl.querySelector('#count'), listEl = viewEl.querySelector('#list')

  function render(){
    stopPlayback()
    const q = (searchEl.value||'').toLowerCase(), ge = genreEl.value, sort = sortEl.value
    let ps = BANK.patterns.filter(p =>
      (!ge || p.genre===ge) &&
      (!q || (p.name+' '+(p.feel||'')+' '+(p.chapter||'')+' '+(p.genre||'')).toLowerCase().includes(q)))
    if(sort==='bpm') ps = [...ps].sort((a,b)=>a.bpm-b.bpm)
    else if(sort==='name') ps = [...ps].sort((a,b)=>a.name.localeCompare(b.name))
    countEl.textContent = `${ps.length} pattern${ps.length!==1?'s':''}`
    listEl.innerHTML = ''
    if(!ps.length){ listEl.innerHTML = '<p class="empty">No patterns match.</p>'; return }
    ps.forEach(p => listEl.appendChild(patternCard(p, ps)))
  }
  searchEl.addEventListener('input', render)
  genreEl.addEventListener('change', render)
  sortEl.addEventListener('change', render)
  render()
}

/* ---------------- view: chapters */
function renderChapterIndex(){
  viewEl.innerHTML = `
    <p class="lede" style="margin-bottom:16px">Grooves don't appear from nowhere — each one answers the one before it.
    Every chapter opens with its timing verdict — where each voice sits against the beat — then walks the lineage
    groove by groove, with notes on exactly what changes at each step.</p>
    <div class="pathgrid">${CHAPTERS.map(ch=>`
      <button class="pathcard" data-chapter="${ch.id}">
        <h3>${ch.title}</h3>
        <p class="stops">${ch.steps.length} stops</p>
        <p>${ch.blurb}</p>
      </button>`).join('')}
    </div>`
  viewEl.querySelectorAll('[data-chapter]').forEach(b =>
    b.addEventListener('click', () => { location.hash = `#/chapters/${b.dataset.chapter}` }))
}

function renderChapter(ch){
  viewEl.innerHTML = `
    <button class="backbtn" id="back">← all chapters</button>
    <div class="pathintro">
      <h2>${ch.title}</h2>
      <p>${ch.intro}</p>
    </div>
    <div class="card verdict">
      <p class="vhead">The verdict: where everything sits</p>
      ${renderVerdictSVG(ch.verdict)}
      <p class="note">${ch.verdict.note}</p>
    </div>
    <div id="steps"></div>`
  viewEl.querySelector('#back').addEventListener('click', () => { location.hash = '#/chapters' })
  const stepsEl = viewEl.querySelector('#steps')
  const chPatterns = ch.steps.map(s => byId[s.pattern]).filter(Boolean)
  ch.steps.forEach((s, i) => {
    const p = byId[s.pattern]
    if(!p) return
    const row = document.createElement('div')
    row.className = 'step'
    row.innerHTML = `
      <div class="steprail">
        <div class="stepnum">${i+1}</div>
        ${i < ch.steps.length-1 ? '<div class="stepline"></div>' : ''}
      </div>
      <div class="stepbody">
        <p class="stepnote">${s.note}</p>
      </div>`
    row.querySelector('.stepbody').appendChild(patternCard(p, chPatterns))
    stepsEl.appendChild(row)
  })
}

/* ---------------- view: guide */
function renderGuide(){
  viewEl.innerHTML = `<div class="guide">${GUIDE_HTML}</div>`
}

/* ---------------- hash router */
function route(){
  stopPlayback()
  document.querySelectorAll('.modal').forEach(m => m.remove())
  const hash = location.hash || '#/chapters'
  const m = hash.match(/^#\/(chapters|paths|all|guide)(?:\/([\w-]+))?/)
  const view = m ? (m[1]==='paths' ? 'chapters' : m[1]) : 'chapters'
  tabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view===view))
  if(view==='all') renderAll()
  else if(view==='guide') renderGuide()
  else {
    const ch = m && m[2] ? CHAPTERS.find(c=>c.id===m[2]) : null
    if(ch) renderChapter(ch); else renderChapterIndex()
  }
  window.scrollTo(0, 0)
}
tabsEl.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => { location.hash = `#/${t.dataset.view}` }))
window.addEventListener('hashchange', route)
initTooltip()
route()
