import './style.css'
import BANK from './data/patterns.json'
import { renderGridSVG, renderVerdictSVG } from './render.js'
import { togglePlay, stopPlayback, KITS, getKit, setKit, getMetronome, setMetronome } from './audio.js'
import { CHAPTERS } from './chapters.js'
import { GUIDE_HTML } from './guide.js'
import { initTooltip } from './tooltip.js'

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

/* ---------------- pattern card */
function metaLine(p){
  const gridName = p.grid===12?'triplet grid':p.grid===8?'8th grid':'16th grid'
  return `${p.bpm} bpm · ${p.bars} bar${p.bars>1?'s':''} · ${gridName}`
}
function patternCard(p){
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
    ${renderGridSVG(p)}
    <div class="cardfoot">
      <p class="feel">${p.feel||''}</p>
      <a class="midilink" href="${MIDI_BASE}${p.id}.mid" download>⬇ midi</a>
    </div>`
  card.querySelector('.playbtn').addEventListener('click', e => togglePlay(p, e.currentTarget))
  card.querySelector('.fsbtn').addEventListener('click', () => openDiagramModal(p))
  return card
}

/* ---------------- full-screen diagram modal */
function openDiagramModal(p){
  const ov = document.createElement('div')
  ov.className = 'modal'
  ov.innerHTML = `
    <div class="modalbox">
      <div class="modalhead">
        <div>
          <p class="tname">${p.name}</p>
          <p class="tmeta">${metaLine(p)}</p>
        </div>
        <button class="modalclose" aria-label="Close">✕ close</button>
      </div>
      ${renderGridSVG(p)}
    </div>`
  const onKey = e => { if(e.key === 'Escape') close() }
  function close(){ ov.remove(); document.removeEventListener('keydown', onKey) }
  ov.addEventListener('click', e => { if(e.target === ov) close() })
  ov.querySelector('.modalclose').addEventListener('click', close)
  document.addEventListener('keydown', onKey)
  document.body.appendChild(ov)
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
    ps.forEach(p => listEl.appendChild(patternCard(p)))
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
    row.querySelector('.stepbody').appendChild(patternCard(p))
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
