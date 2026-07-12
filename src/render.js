import { FLAGS } from './flags.js'

/* Timing-emphasis mode: stretch displayed offsets so leans are visible at a
   glance, capped so a dot never crosses into the neighboring step. The bank's
   largest real offsets are ~27% of a step, so the cap only bites on those. */
const EMPH_FACTOR = 3, EMPH_MAX_STEP_FRAC = 0.45

export const ROLE = {
  hat:{label:"HATS",cval:"#9FB3C8"}, openhat:{label:"OPEN",cval:"#C9CDD8",open:true},
  ride:{label:"RIDE",cval:"#B8C9A8"}, crash:{label:"CRASH",cval:"#D8C9A0",open:true},
  snare:{label:"SNARE",cval:"#E0632F"}, rim:{label:"RIM",cval:"#E58BAD"},
  clap:{label:"CLAP",cval:"#D64545"}, tamb:{label:"TAMB",cval:"#C9A0D8"},
  shaker:{label:"SHAKER",cval:"#A0C8B8"}, cowbell:{label:"BELL",cval:"#E9B33B"},
  tom_hi:{label:"TOM H",cval:"#8C5FBF"}, tom_mid:{label:"TOM M",cval:"#8C5FBF"},
  tom_lo:{label:"TOM L",cval:"#8C5FBF"},
  kick:{label:"KICK",cval:"#D9AE4A"}, bass:{label:"BASS",cval:"#F5C518"},
};
export const ROLE_ORDER = ["openhat","hat","ride","crash","shaker","tamb","cowbell","rim","snare","clap","tom_hi","tom_mid","tom_lo","kick","bass"];

export function stepTicks(grid){ return grid===12?160 : grid===8?240 : 120; }

function velKind(v){ return v<=25?'feathered' : v<=55?'ghost' : v>=112?'accent' : 'normal' }

/* nearest note-value fraction for a tick offset (whole note = 1920 ticks),
   matching the database's off_approx convention (e.g. +1/192) */
function offFraction(t){
  const a = Math.abs(t)
  if(!a) return '0'
  const denoms = [16,24,32,48,64,96,128,192,256,384]
  let best = denoms[0]
  for(const d of denoms) if(Math.abs(1920/d - a) < Math.abs(1920/best - a)) best = d
  return `${t>0?'+':'−'}1/${best}`
}

function hitTip(p, role, h, st){
  const offT = h.off_ticks || 0
  const lines = [`${ROLE[role].label} · vel ${h.vel} (${velKind(h.vel)})`]
  if(offT === 0){
    lines.push('dead on the beat')
  } else {
    const frac = (h.off_approx && h.off_approx !== '0') ? h.off_approx.replace('-','−') : offFraction(offT)
    const ms = h.off_ms_at_native_bpm ?? Math.round(offT*60000/(p.bpm*480))
    lines.push(`${frac} ${offT>0?'behind':'ahead of'} the beat (${ms>0?'+':'−'}${Math.abs(ms)} ms)`)
  }
  if(p.swing_16th && p.grid===16 && h.step%2===1){
    lines.push(`plus ${p.swing_16th}% swing on this 16th`)
  }
  return lines.join('\n')
}

function labelsFor(grid,bars){
  if(grid===12) return ["1","","","2","","","3","","","4","",""];
  if(grid===8){
    const one=["1","&","2","&","3","&","4","&"];
    return bars===2?one.concat(one):one;
  }
  const l=["1","e","&","a","2","e","&","a","3","e","&","a","4","e","&","a"];
  return bars===2?l.concat(l):l;
}

/* The chapter "verdict" chart: one ahead/behind axis, a dot per voice showing
   its characteristic lean (in ticks @ PPQ 480), optional jitter band for
   feels that scatter both ways. Modeled on the series' timing-study pages. */
export function renderVerdictSVG(v){
  const items = v.items
  const rowH = 36, top = 30, L = 190, R = 680, C = (L+R)/2, scale = 6
  const H = top + items.length*rowH + 46
  const axisY = top + items.length*rowH + 4
  const x = lean => C + Math.max(-40, Math.min(40, lean))*scale
  let g = `<line x1="${C}" y1="${top-14}" x2="${C}" y2="${axisY+6}" stroke="#9A9077" stroke-width="1.5" stroke-dasharray="4 4"/>`
  g += `<line x1="${L}" y1="${axisY}" x2="${R}" y2="${axisY}" stroke="#38321F" stroke-width="2"/>`
  g += `<text x="${C}" y="${axisY+26}" fill="#F1EADB" font-family="Space Mono" font-size="12" text-anchor="middle">ON THE BEAT</text>`
  g += `<text x="${L}" y="${axisY+26}" fill="#9A9077" font-family="Space Mono" font-size="11" text-anchor="start">← AHEAD</text>`
  g += `<text x="${R}" y="${axisY+26}" fill="#9A9077" font-family="Space Mono" font-size="11" text-anchor="end">BEHIND →</text>`
  items.forEach((it, i) => {
    const y = top + i*rowH + rowH/2 - 8
    const cx = x(it.lean)
    g += `<text x="6" y="${y+4}" fill="${it.color}" font-family="Space Mono" font-size="11">${it.label}</text>`
    g += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="#2E2917" stroke-width="1" stroke-dasharray="2 5"/>`
    if(it.jitter){
      g += `<rect x="${x(it.lean-it.jitter)}" y="${y-6}" width="${x(it.lean+it.jitter)-x(it.lean-it.jitter)}" height="12" rx="6" fill="${it.color}" opacity="0.18"/>`
    }
    if(Math.abs(it.lean) >= 2){
      const edge = it.lean > 0 ? cx-8 : cx+8
      g += `<line x1="${C}" y1="${y}" x2="${edge}" y2="${y}" stroke="${it.color}" stroke-width="3" opacity="0.45"/>`
    }
    g += `<circle cx="${cx}" cy="${y}" r="8" fill="${it.color}"/>`
  })
  return `<svg viewBox="0 0 700 ${H}" role="img" aria-label="Timing chart: where each voice sits relative to the beat">${g}</svg>`
}

export function renderGridSVG(p){
  const roles = ROLE_ORDER.filter(r=>p.tracks[r] && p.tracks[r].length);
  const steps = p.grid * p.bars;
  const rowH = 34, top = 26, L = 74, R = 690;
  const H = top + roles.length*rowH + 34;
  const w = (R-L)/steps, x = i=>L+i*w;
  const st = stepTicks(p.grid);
  const beatEvery = p.grid===12?3 : p.grid===8?2 : 4;
  const labels = labelsFor(p.grid,p.bars);
  let g = "";
  for(let i=0;i<steps;i++){
    const isBeat = i%beatEvery===0;
    g += `<line x1="${x(i)}" y1="${top-6}" x2="${x(i)}" y2="${top+roles.length*rowH-8}" stroke="${isBeat?'#4E4527':'#2E2917'}" stroke-width="${isBeat?2:1}"/>`;
    const lb = labels[i]||"";
    if(lb) g += `<text x="${x(i)}" y="${top+roles.length*rowH+12}" fill="${lb.length===1&&!isNaN(lb)?'#F1EADB':'#9A9077'}" font-family="Space Mono" font-size="10.5" text-anchor="middle">${lb}</text>`;
  }
  if(p.bars===2){
    g += `<line x1="${x(steps/2)}" y1="${top-14}" x2="${x(steps/2)}" y2="${top+roles.length*rowH-8}" stroke="#F1EADB" stroke-width="1.5"/>`;
  }
  roles.forEach((r,ri)=>{
    const y = top + ri*rowH + rowH/2 - 8;
    const rc = ROLE[r];
    g += `<text x="6" y="${y+4}" fill="${rc.cval}" font-family="Space Mono" font-size="10.5">${rc.label}</text>`;
    g += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="#2E2917" stroke-width="1" stroke-dasharray="2 5"/>`;
    const tapR = Math.min(11, w/2 - 0.5); // enlarged invisible tap target, capped so neighbors don't overlap
    p.tracks[r].forEach(h=>{
      const offT = h.off_ticks||0;
      const dispT = FLAGS.emphasizeTiming && offT
        ? Math.sign(offT) * Math.min(Math.abs(offT)*EMPH_FACTOR, st*EMPH_MAX_STEP_FRAC)
        : offT;
      const cx = x(h.step) + dispT/st*w;
      const rr = h.vel<=55 ? 3.5 : (h.vel>=118 ? 8.5 : 6.5);
      if(Math.abs(dispT) >= st*0.06){
        const edge = offT>0 ? cx-rr : cx+rr;
        g += `<line x1="${x(h.step)}" y1="${y}" x2="${edge}" y2="${y}" stroke="${rc.cval}" stroke-width="3" opacity="0.45"/>`;
      }
      if(rc.open){
        g += `<circle cx="${cx}" cy="${y}" r="${rr+1}" fill="none" stroke="${rc.cval}" stroke-width="2.6"/>`;
      } else {
        g += `<circle cx="${cx}" cy="${y}" r="${rr}" fill="${rc.cval}" ${h.vel<=55?'opacity="0.55"':''}/>`;
      }
      g += `<circle class="hit" cx="${cx}" cy="${y}" r="${Math.max(rr+2, tapR)}" fill="transparent" data-tip="${hitTip(p, r, h, st)}"/>`;
    });
  });
  if(FLAGS.emphasizeTiming){
    g += `<text x="${R}" y="12" fill="#E9B33B" font-family="Space Mono" font-size="10" text-anchor="end">TIMING ×${EMPH_FACTOR}</text>`;
  }
  return `<svg viewBox="0 0 700 ${H}" role="img" aria-label="Step grid for ${p.name}${FLAGS.emphasizeTiming?' (timing offsets visually exaggerated)':''}">${g}</svg>`;
}
