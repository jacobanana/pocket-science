import { stepTicks } from './render.js'

let AC=null, playing=null, timer=null;
function ac(){ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); return AC; }
function env(g,t,a,peak,dec){ g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec); }
let NB=null;
function noiseBuf(){ const c=ac(); const b=c.createBuffer(1,c.sampleRate*0.6,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; return b; }
function playNoise(t,vol,dec,hp,lp){
  const c=ac(); NB=NB||noiseBuf();
  const s=c.createBufferSource(); s.buffer=NB;
  const f1=c.createBiquadFilter(); f1.type="highpass"; f1.frequency.value=hp;
  const f2=c.createBiquadFilter(); f2.type="lowpass"; f2.frequency.value=lp;
  const g=c.createGain(); env(g,t,0.002,vol,dec);
  s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(c.destination);
  s.start(t); s.stop(t+dec+0.05);
}
function playTone(t,vol,dec,f0,f1,type){
  const c=ac(); const o=c.createOscillator(); o.type=type||"sine";
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dec*0.7);
  const g=c.createGain(); env(g,t,0.002,vol,dec);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dec+0.05);
}
const VOICES = {
  kick:(t,v)=>playTone(t,v*0.95,0.22,150,42),
  snare:(t,v)=>{playNoise(t,v*0.7,0.16,1200,9000); playTone(t,v*0.35,0.09,210,150,"triangle");},
  rim:(t,v)=>{playNoise(t,v*0.5,0.05,2000,9000); playTone(t,v*0.4,0.045,880,700,"square");},
  clap:(t,v)=>{[0,0.012,0.026].forEach(d=>playNoise(t+d,v*0.5,0.09,1400,7500));},
  hat:(t,v)=>playNoise(t,v*0.4,0.045,7000,14000),
  openhat:(t,v)=>playNoise(t,v*0.42,0.28,6500,13000),
  ride:(t,v)=>playNoise(t,v*0.35,0.4,5000,12000),
  crash:(t,v)=>playNoise(t,v*0.45,0.9,3800,12000),
  tamb:(t,v)=>playNoise(t,v*0.35,0.09,8000,15000),
  shaker:(t,v)=>playNoise(t,v*0.3,0.07,6000,12000),
  cowbell:(t,v)=>{playTone(t,v*0.4,0.14,540,540,"square"); playTone(t,v*0.3,0.14,800,800,"square");},
  tom_hi:(t,v)=>playTone(t,v*0.7,0.2,230,150),
  tom_mid:(t,v)=>playTone(t,v*0.7,0.24,180,110),
  tom_lo:(t,v)=>playTone(t,v*0.75,0.3,140,80),
  bass:(t,v)=>playTone(t,v*0.8,0.45,90,55,"triangle"),
};

export function stopPlayback(){
  if(timer) clearInterval(timer); timer=null;
  if(playing){ const b=document.querySelector(`[data-play="${playing}"].on`); if(b){b.classList.remove("on"); b.textContent="► play";} }
  playing=null;
}

export function togglePlay(p, btn){
  if(playing===p.id){ stopPlayback(); return; }
  stopPlayback();
  playing=p.id; btn.classList.add("on"); btn.textContent="■ stop";
  const c=ac(); if(c.state==="suspended") c.resume();
  const st=stepTicks(p.grid);
  const tickSec = 60/(p.bpm*480);
  const barSec = 480*4*tickSec;
  const loopSec = barSec*p.bars;
  const ev=[];
  for(const [role,hs] of Object.entries(p.tracks)){
    if(!VOICES[role]) continue;
    hs.forEach(h=>{
      let t = h.step*st;
      if(p.swing_16th && p.grid===16 && h.step%2===1) t += (p.swing_16th-50)/100*2*st;
      t += (h.off_ticks||0);
      ev.push({t:Math.max(0,t*tickSec), role, v:(h.vel||100)/127});
    });
  }
  let loopStart = c.currentTime + 0.08;
  let nextLoop = 0;
  function schedule(){
    const horizon = c.currentTime + 0.35;
    while(loopStart + nextLoop*loopSec < horizon){
      const base = loopStart + nextLoop*loopSec;
      ev.forEach(e=>VOICES[e.role](base+e.t, e.v));
      nextLoop++;
    }
  }
  schedule();
  timer=setInterval(()=>{ if(playing===p.id) schedule(); }, 120);
}
