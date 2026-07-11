// Generates the downloadable Standard MIDI Files from src/data/patterns.json.
// Runs before dev/build (see package.json) so patterns.json is the single
// source of truth — the checked-in app never ships stale MIDI.
//
// Negative-offset rule: MIDI time cannot go below zero, so when a pattern's
// earliest hit leans AHEAD of beat 1 (negative ticks), that hit becomes the
// real tick-0 and every other event — including the notional grid — shifts
// later by the same amount. Relative micro-timing is preserved exactly,
// instead of being clamped away.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bank = JSON.parse(readFileSync(join(root, 'src/data/patterns.json'), 'utf8'))
const outDir = join(root, 'public/midi')
mkdirSync(outDir, { recursive: true })

const PPQ = 480
const NOTE_DUR = 100 // drum hits: fixed short gate
const CHANNEL = 9   // GM drums (channel 10, 0-indexed)

function stepTicks(grid){ return grid===12?160 : grid===8?240 : 120 }

// Same event-time math as the in-app player (src/audio.js patternEvents).
export function patternEvents(p){
  const st = stepTicks(p.grid)
  const ev = []
  for(const [role, hits] of Object.entries(p.tracks)){
    const note = bank.note_map[role]
    if(note === undefined) continue
    for(const h of hits){
      let t = h.step * st
      if(p.swing_16th && p.grid===16 && h.step%2===1) t += Math.round((p.swing_16th-50)/100*2*st)
      t += h.off_ticks || 0
      ev.push({ t, note, vel: h.vel || 100 })
    }
  }
  const minT = Math.min(...ev.map(e => e.t))
  const shift = minT < 0 ? -minT : 0
  ev.forEach(e => { e.t += shift })
  return { events: ev.sort((a,b)=>a.t-b.t || a.note-b.note), shift, loopTicks: p.bars * 4 * PPQ }
}

function vlq(n){
  const bytes = [n & 0x7F]
  while((n >>= 7)) bytes.unshift((n & 0x7F) | 0x80)
  return bytes
}

function buildMidi(p){
  const { events, loopTicks } = patternEvents(p)
  // interleave note-on/note-off as absolute-time messages, then delta-encode
  const msgs = []
  for(const e of events){
    msgs.push({ t: e.t, data: [0x90 | CHANNEL, e.note, e.vel] })
    msgs.push({ t: Math.min(e.t + NOTE_DUR, loopTicks), data: [0x80 | CHANNEL, e.note, 0] })
  }
  msgs.sort((a,b)=>a.t-b.t)

  const track = []
  // tempo
  const mpq = Math.round(60_000_000 / p.bpm)
  track.push(0x00, 0xFF, 0x51, 0x03, (mpq>>16)&0xFF, (mpq>>8)&0xFF, mpq&0xFF)
  // track name
  const name = Buffer.from(p.name, 'utf8')
  track.push(0x00, 0xFF, 0x03, ...vlq(name.length), ...name)
  let last = 0
  for(const m of msgs){
    track.push(...vlq(m.t - last), ...m.data)
    last = m.t
  }
  // end-of-track pinned to the exact loop length so DAW clips loop cleanly
  track.push(...vlq(loopTicks - last), 0xFF, 0x2F, 0x00)

  const header = Buffer.alloc(14)
  header.write('MThd', 0)
  header.writeUInt32BE(6, 4)
  header.writeUInt16BE(0, 8)      // format 0
  header.writeUInt16BE(1, 10)     // one track
  header.writeUInt16BE(PPQ, 12)
  const trackHead = Buffer.alloc(8)
  trackHead.write('MTrk', 0)
  trackHead.writeUInt32BE(track.length, 4)
  return Buffer.concat([header, trackHead, Buffer.from(track)])
}

let shifted = 0
for(const p of bank.patterns){
  const { shift } = patternEvents(p)
  if(shift) shifted++
  writeFileSync(join(outDir, `${p.id}.mid`), buildMidi(p))
}
console.log(`build-midi: wrote ${bank.patterns.length} files to public/midi (${shifted} with negative-offset shift applied)`)
