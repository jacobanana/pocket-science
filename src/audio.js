import { stepTicks, swingDelay } from './render.js'

let AC = null
function ac(){ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); return AC }

/* ---------------- event timing (shared math with scripts/build-midi.mjs)
   If the earliest hit leans ahead of beat 1 (negative ticks), that hit becomes
   the real time-0 and everything — including the metronome grid — shifts later
   by the same amount, so relative micro-timing survives instead of being
   clamped at the loop boundary. */
export function patternEvents(p){
  const st = stepTicks(p.grid)
  const scale = p.timing_scale ?? 1 // playback-only multiplier on micro-offsets
  const ev = []
  for(const [role, hits] of Object.entries(p.tracks)){
    for(const h of hits){
      let t = h.step * st + swingDelay(p, h.step, st)
      t += Math.round((h.off_ticks || 0) * scale)
      ev.push({ t, role, v: (h.vel||100)/127 })
    }
  }
  const minT = Math.min(...ev.map(e => e.t))
  const shift = minT < 0 ? -minT : 0
  ev.forEach(e => { e.t += shift })
  return { events: ev, shift, loopTicks: p.bars * 4 * 480 }
}

/* ---------------- synthesis helpers */
function env(g,t,a,peak,dec){ g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec) }
let NB = null
function noiseBuf(){ const c=ac(); const b=c.createBuffer(1,c.sampleRate*0.7,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; return b }
function noise(out,t,vol,dec,hp,lp,q){
  const c=ac(); NB=NB||noiseBuf()
  const s=c.createBufferSource(); s.buffer=NB; s.loop=true
  const f1=c.createBiquadFilter(); f1.type='highpass'; f1.frequency.value=hp
  const f2=c.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=lp; if(q) f2.Q.value=q
  const g=c.createGain(); env(g,t,0.002,vol,dec)
  s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(out)
  s.start(t); s.stop(t+dec+0.05)
}
function tone(out,t,vol,dec,f0,f1,type,glide){
  const c=ac(); const o=c.createOscillator(); o.type=type||'sine'
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+(glide||dec*0.7))
  const g=c.createGain(); env(g,t,0.002,vol,dec)
  o.connect(g); g.connect(out); o.start(t); o.stop(t+dec+0.05)
}
/* the classic 808 metallic recipe: a bank of detuned squares through a highpass */
const METAL_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21]
function metal(out,t,vol,dec,hp,base){
  const c=ac()
  const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp
  const g=c.createGain(); env(g,t,0.002,vol,dec)
  f.connect(g); g.connect(out)
  METAL_RATIOS.forEach(r=>{
    const o=c.createOscillator(); o.type='square'; o.frequency.value=(base||65)*r
    const og=c.createGain(); og.gain.value=1/6
    o.connect(og); og.connect(f); o.start(t); o.stop(t+dec+0.05)
  })
}
function clapBurst(out,t,vol,dec,hp,lp){ [0,0.011,0.023,0.038].forEach((d,i)=>noise(out,t+d,vol*(i===3?1:0.55),i===3?dec:0.02,hp,lp)) }

/* ---------------- the kits */
export const KITS = [
  { id:'auto',   label:'Auto (match genre)' },
  { id:'studio', label:'Studio (acoustic)' },
  { id:'tr808',  label:'TR-808' },
  { id:'tr909',  label:'TR-909' },
  { id:'dusty',  label:'Dusty (boom-bap)' },
]

/* which kit a genre wants: played-by-hand genres get the acoustic kit,
   sample-culture genres get the dusty sampler, digital riddims the 808,
   club genres the 909 */
export const GENRE_KITS = {
  Rock:'studio', Blues:'studio', Punk:'studio', Metal:'studio', Funk:'studio',
  Soul:'studio', Jazz:'studio', Disco:'studio', Reggae:'studio', Latin:'studio',
  Afrobeat:'studio', 'Neo-Soul':'studio',
  'Hip-Hop':'dusty', 'Jungle / DnB':'dusty',
  'R&B':'tr808', 'Electro-Funk':'tr808', Dancehall:'tr808', Reggaeton:'tr808',
  House:'tr909', Techno:'tr909', Trance:'tr909', 'UK Garage':'tr909',
}
export function kitFor(p){
  if(currentKit !== 'auto') return currentKit
  return GENRE_KITS[p.genre] || 'studio'
}

const VOICES = {
  studio: {
    kick:(o,t,v)=>{ tone(o,t,v*0.95,0.24,140,44); noise(o,t,v*0.25,0.012,900,5000) },
    snare:(o,t,v)=>{ noise(o,t,v*0.62,0.17,1100,9500); tone(o,t,v*0.32,0.1,196,150,'triangle'); tone(o,t,v*0.2,0.06,330,280,'sine') },
    rim:(o,t,v)=>{ noise(o,t,v*0.42,0.045,2200,9000,3); tone(o,t,v*0.4,0.04,880,760,'square') },
    clap:(o,t,v)=>clapBurst(o,t,v*0.5,0.12,1300,7800),
    hat:(o,t,v)=>metal(o,t,v*0.34,0.05,7800),
    openhat:(o,t,v)=>metal(o,t,v*0.34,0.32,7200),
    ride:(o,t,v)=>{ metal(o,t,v*0.2,0.5,6000,72); noise(o,t,v*0.16,0.4,5500,12000) },
    crash:(o,t,v)=>{ noise(o,t,v*0.42,0.95,3600,12000); metal(o,t,v*0.15,0.7,5200,80) },
    tamb:(o,t,v)=>{ noise(o,t,v*0.3,0.09,7500,15000); noise(o,t+0.015,v*0.18,0.05,8000,15000) },
    shaker:(o,t,v)=>noise(o,t,v*0.3,0.07,5800,12000,2),
    cowbell:(o,t,v)=>{ tone(o,t,v*0.35,0.13,540,540,'square'); tone(o,t,v*0.26,0.13,800,800,'square') },
    tom_hi:(o,t,v)=>{ tone(o,t,v*0.7,0.2,235,150); noise(o,t,v*0.1,0.01,1000,4000) },
    tom_mid:(o,t,v)=>{ tone(o,t,v*0.7,0.25,180,110); noise(o,t,v*0.1,0.01,900,3500) },
    tom_lo:(o,t,v)=>{ tone(o,t,v*0.75,0.32,140,78); noise(o,t,v*0.1,0.01,800,3000) },
    bass:(o,t,v)=>tone(o,t,v*0.8,0.45,88,54,'triangle'),
  },
  tr808: {
    kick:(o,t,v)=>{ tone(o,t,v*1.0,0.5,58,46,'sine',0.4); noise(o,t,v*0.12,0.008,1200,5000) },
    snare:(o,t,v)=>{ tone(o,t,v*0.4,0.09,182,175,'sine'); tone(o,t,v*0.3,0.07,330,320,'sine'); noise(o,t,v*0.5,0.14,1600,10000) },
    rim:(o,t,v)=>{ tone(o,t,v*0.45,0.03,1750,1700,'square'); noise(o,t,v*0.2,0.02,3000,9000) },
    clap:(o,t,v)=>clapBurst(o,t,v*0.55,0.16,900,6500),
    hat:(o,t,v)=>metal(o,t,v*0.36,0.04,8200),
    openhat:(o,t,v)=>metal(o,t,v*0.36,0.42,7600),
    ride:(o,t,v)=>metal(o,t,v*0.22,0.5,6500,70),
    crash:(o,t,v)=>{ metal(o,t,v*0.28,0.9,5200,58); noise(o,t,v*0.2,0.8,4200,11000) },
    tamb:(o,t,v)=>metal(o,t,v*0.22,0.09,9000,90),
    shaker:(o,t,v)=>noise(o,t,v*0.28,0.06,6500,12000,2),
    cowbell:(o,t,v)=>{ tone(o,t,v*0.45,0.16,540,538,'square'); tone(o,t,v*0.34,0.16,800,797,'square') },
    tom_hi:(o,t,v)=>tone(o,t,v*0.7,0.22,220,120,'sine',0.18),
    tom_mid:(o,t,v)=>tone(o,t,v*0.72,0.28,165,90,'sine',0.22),
    tom_lo:(o,t,v)=>tone(o,t,v*0.75,0.34,120,65,'sine',0.28),
    bass:(o,t,v)=>tone(o,t,v*0.85,0.5,80,52,'sine'),
  },
  tr909: {
    kick:(o,t,v)=>{ tone(o,t,v*1.0,0.28,220,48,'sine',0.035); noise(o,t,v*0.3,0.01,1500,7000) },
    snare:(o,t,v)=>{ noise(o,t,v*0.68,0.15,900,11000); tone(o,t,v*0.35,0.06,229,180,'triangle') },
    rim:(o,t,v)=>{ tone(o,t,v*0.45,0.035,1000,950,'square'); noise(o,t,v*0.25,0.02,2500,9000) },
    clap:(o,t,v)=>clapBurst(o,t,v*0.55,0.14,1100,7500),
    hat:(o,t,v)=>{ noise(o,t,v*0.4,0.04,8500,15000,4); metal(o,t,v*0.14,0.03,9000,90) },
    openhat:(o,t,v)=>{ noise(o,t,v*0.4,0.34,7800,14000,3); metal(o,t,v*0.14,0.3,8500,90) },
    ride:(o,t,v)=>{ noise(o,t,v*0.3,0.45,5200,12000); metal(o,t,v*0.12,0.4,6000,84) },
    crash:(o,t,v)=>noise(o,t,v*0.45,1.0,3800,12500),
    tamb:(o,t,v)=>noise(o,t,v*0.32,0.08,8000,15000),
    shaker:(o,t,v)=>noise(o,t,v*0.3,0.06,6200,12500,2),
    cowbell:(o,t,v)=>{ tone(o,t,v*0.4,0.14,540,540,'square'); tone(o,t,v*0.3,0.14,800,800,'square') },
    tom_hi:(o,t,v)=>tone(o,t,v*0.72,0.2,240,140,'sine',0.06),
    tom_mid:(o,t,v)=>tone(o,t,v*0.74,0.26,185,100,'sine',0.08),
    tom_lo:(o,t,v)=>tone(o,t,v*0.78,0.32,145,70,'sine',0.1),
    bass:(o,t,v)=>tone(o,t,v*0.82,0.42,90,55,'triangle'),
  },
  dusty: {
    kick:(o,t,v)=>{ tone(o,t,soft(v)*0.95,0.2,95,42,'sine'); noise(o,t,soft(v)*0.1,0.008,600,2500) },
    snare:(o,t,v)=>{ noise(o,t,soft(v)*0.6,0.13,700,5200); tone(o,t,soft(v)*0.3,0.08,185,150,'triangle') },
    rim:(o,t,v)=>{ noise(o,t,soft(v)*0.4,0.04,1500,5500,3); tone(o,t,soft(v)*0.35,0.035,820,720,'square') },
    clap:(o,t,v)=>clapBurst(o,t,soft(v)*0.5,0.11,800,4800),
    hat:(o,t,v)=>noise(o,t,soft(v)*0.3,0.04,4800,8500),
    openhat:(o,t,v)=>noise(o,t,soft(v)*0.3,0.24,4400,8000),
    ride:(o,t,v)=>noise(o,t,soft(v)*0.24,0.35,3800,7500),
    crash:(o,t,v)=>noise(o,t,soft(v)*0.36,0.7,2800,7000),
    tamb:(o,t,v)=>noise(o,t,soft(v)*0.26,0.08,4500,8500),
    shaker:(o,t,v)=>noise(o,t,soft(v)*0.26,0.06,4200,8000),
    cowbell:(o,t,v)=>{ tone(o,t,soft(v)*0.32,0.12,540,540,'square'); tone(o,t,soft(v)*0.22,0.12,800,800,'square') },
    tom_hi:(o,t,v)=>tone(o,t,soft(v)*0.65,0.18,220,140),
    tom_mid:(o,t,v)=>tone(o,t,soft(v)*0.65,0.22,170,105),
    tom_lo:(o,t,v)=>tone(o,t,soft(v)*0.7,0.28,130,75),
    bass:(o,t,v)=>tone(o,t,soft(v)*0.8,0.45,85,52,'triangle'),
  },
}
/* dusty compresses dynamics like a worn sampler */
function soft(v){ return 0.45 + 0.55*v }

/* ---------------- kit + metronome state */
const store = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {} }
const validKit = id => id === 'auto' || id in VOICES
let currentKit = validKit(store.getItem('ps-kit')) ? store.getItem('ps-kit') : 'auto'
let metronomeOn = store.getItem('ps-metro') === '1'
export function getKit(){ return currentKit }
export function setKit(id){ if(validKit(id)){ currentKit = id; store.setItem('ps-kit', id) } }
export function getMetronome(){ return metronomeOn }
export function setMetronome(on){ metronomeOn = !!on; store.setItem('ps-metro', on?'1':'0') }

function click(out,t,accent){
  tone(out,t,accent?0.5:0.3,0.03,accent?1900:1320,accent?1850:1280,'square')
  noise(out,t,0.12,0.012,5000,12000)
}

/* ---------------- playback: one session at a time, instant stop */
let session = null   // { id, gain, timer }

export function stopPlayback(){
  if(!session) return
  const c = ac(), s = session
  session = null
  clearInterval(s.timer)
  // kill everything in flight immediately (~15ms fade to avoid a click)
  s.gain.gain.cancelScheduledValues(c.currentTime)
  s.gain.gain.setTargetAtTime(0, c.currentTime, 0.005)
  setTimeout(()=>s.gain.disconnect(), 80)
  const b = document.querySelector(`[data-play="${s.id}"].on`)
  if(b){ b.classList.remove('on'); b.textContent = '► play' }
}

export function togglePlay(p, btn){
  if(session && session.id === p.id){ stopPlayback(); return }
  stopPlayback() // enforce: one and only one pattern playing
  const c = ac(); if(c.state === 'suspended') c.resume()

  const sessionKit = kitFor(p)
  const gain = c.createGain(); gain.gain.value = 1
  let out = gain
  if(sessionKit === 'dusty'){ // kit-level lo-fi ceiling
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200
    lp.connect(gain); out = lp
  }
  gain.connect(c.destination)

  const { events, shift, loopTicks } = patternEvents(p)
  const tickSec = 60/(p.bpm*480)
  const loopSec = loopTicks * tickSec
  const beats = p.bars * 4

  const loopStart = c.currentTime + 0.08
  let nextLoop = 0
  function schedule(){
    const voices = VOICES[kitFor(p)]
    const horizon = c.currentTime + 0.35
    while(loopStart + nextLoop*loopSec < horizon){
      const base = loopStart + nextLoop*loopSec
      events.forEach(e => { const fn = voices[e.role]; if(fn) fn(out, base + e.t*tickSec, e.v) })
      if(metronomeOn){
        // the true grid: beat b lives at b*480 ticks PLUS the shift, so the
        // click stays honest when the first hit leans ahead of the beat
        for(let b=0; b<beats; b++) click(out, base + (b*480 + shift)*tickSec, b%4===0)
      }
      nextLoop++
    }
  }
  schedule()
  session = { id: p.id, gain, timer: setInterval(()=>{ if(session && session.id===p.id) schedule() }, 120) }
  btn.classList.add('on'); btn.textContent = '■ stop'
}
