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

function labelsFor(grid,bars){
  if(grid===12) return ["1","","","2","","","3","","","4","",""];
  if(grid===8){
    const one=["1","&","2","&","3","&","4","&"];
    return bars===2?one.concat(one):one;
  }
  const l=["1","e","&","a","2","e","&","a","3","e","&","a","4","e","&","a"];
  return bars===2?l.concat(l):l;
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
    p.tracks[r].forEach(h=>{
      const offT = h.off_ticks||0;
      const cx = x(h.step) + offT/st*w;
      const rr = h.vel<=55 ? 3.5 : (h.vel>=118 ? 8.5 : 6.5);
      if(Math.abs(offT) >= st*0.06){
        const edge = offT>0 ? cx-rr : cx+rr;
        g += `<line x1="${x(h.step)}" y1="${y}" x2="${edge}" y2="${y}" stroke="${rc.cval}" stroke-width="3" opacity="0.45"/>`;
      }
      if(rc.open){
        g += `<circle cx="${cx}" cy="${y}" r="${rr+1}" fill="none" stroke="${rc.cval}" stroke-width="2.6"/>`;
      } else {
        g += `<circle cx="${cx}" cy="${y}" r="${rr}" fill="${rc.cval}" ${h.vel<=55?'opacity="0.55"':''}/>`;
      }
    });
  });
  return `<svg viewBox="0 0 700 ${H}" role="img" aria-label="Step grid for ${p.name}">${g}</svg>`;
}
