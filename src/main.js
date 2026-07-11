import './style.css'
import BANK from './data/patterns.json'
import { renderGridSVG, renderVerdictSVG } from './render.js'
import { togglePlay, stopPlayback } from './audio.js'
import { CHAPTERS } from './chapters.js'
import { GUIDE_HTML } from './guide.js'

const byId = Object.fromEntries(BANK.patterns.map(p => [p.id, p]))
const MIDI_BASE = `${import.meta.env.BASE_URL}midi/`

const app = document.getElementById('app')
app.innerHTML = `
  <p class="eyebrow">The timing-analysis series · playable archive</p>
  <h1>Pocket Science</h1>
  <p class="lede">A groove atlas: all ${BANK.patterns.length} patterns from the series — Bonham to Sly &amp; Robbie —
  drawn in the grid language (dot size = velocity, tails = micro-timing lean) and playable with a synthesized kit
  that honors offsets, ghosts and swing. Open a chapter to walk a lineage groove by groove.</p>
  <nav class="tabs" id="tabs">
    <button class="tab" data-view="chapters">Chapters</button>
    <button class="tab" data-view="all">All grooves</button>
    <button class="tab" data-view="guide">Field guide</button>
  </nav>
  <main id="view"></main>
  <p class="footer">Dot size = velocity (tiny = ghost note). Tails show micro-timing: left = ahead of the grid,
  right = behind. Hollow = open hat. Swing badge = MPC-style 16th swing to dial on hardware. Playback is a sketch
  kit — synthesized one-shots scheduled with the exact tick offsets from the bank. Every pattern is downloadable
  as a Standard MIDI File.</p>
`

const viewEl = document.getElementById('view')
const tabsEl = document.getElementById('tabs')

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
          ${p.swing_16th?`<span class="chip sw">swing ${p.swing_16th}%</span>`:''}
        </p>
      </div>
      <button class="playbtn" data-play="${p.id}">► play</button>
    </div>
    ${renderGridSVG(p)}
    <div class="cardfoot">
      <p class="feel">${p.feel||''}</p>
      <a class="midilink" href="${MIDI_BASE}${p.id}.mid" download>⬇ midi</a>
    </div>`
  card.querySelector('.playbtn').addEventListener('click', e => togglePlay(p, e.currentTarget))
  return card
}

/* ---------------- view: all grooves */
function renderAll(){
  viewEl.innerHTML = `
    <div class="controls">
      <input type="text" id="search" placeholder="search name / feel / chapter…">
      <select id="sort">
        <option value="id">Sort: series order</option>
        <option value="bpm">Sort: BPM</option>
        <option value="name">Sort: name</option>
      </select>
    </div>
    <p class="count" id="count"></p>
    <div id="list"></div>`
  const searchEl = viewEl.querySelector('#search'), sortEl = viewEl.querySelector('#sort'),
        countEl = viewEl.querySelector('#count'), listEl = viewEl.querySelector('#list')

  function render(){
    stopPlayback()
    const q = (searchEl.value||'').toLowerCase(), sort = sortEl.value
    let ps = BANK.patterns.filter(p =>
      (!q || (p.name+' '+(p.feel||'')+' '+(p.chapter||'')).toLowerCase().includes(q)))
    if(sort==='bpm') ps = [...ps].sort((a,b)=>a.bpm-b.bpm)
    else if(sort==='name') ps = [...ps].sort((a,b)=>a.name.localeCompare(b.name))
    countEl.textContent = `${ps.length} pattern${ps.length!==1?'s':''}`
    listEl.innerHTML = ''
    if(!ps.length){ listEl.innerHTML = '<p class="empty">No patterns match.</p>'; return }
    ps.forEach(p => listEl.appendChild(patternCard(p)))
  }
  searchEl.addEventListener('input', render)
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
route()
