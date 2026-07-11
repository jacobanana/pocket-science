// The field guide: the supporting text from the timing-analysis series,
// explaining how to read and reproduce the grooves.
export const GUIDE_HTML = `
<h2>The three ingredients of every groove</h2>
<ol>
  <li><b>Pattern</b> — which steps are hit. The dots in the diagrams. This is the part
  a step sequencer stores natively, and it is the least interesting of the three.</li>
  <li><b>Velocity</b> — how hard. Accent <code>112–127</code> · normal <code>80–110</code> ·
  <b>ghost 30–55</b> · feathered <code>≤25</code>. Ghost notes are half of everything
  (Purdie, Stubblefield, Porcaro): if your kit sounds stiff, your ghosts are too loud.</li>
  <li><b>Micro-timing</b> — per-hit offsets from the grid, stored beat-based so they
  survive tempo changes: <code>off_ticks</code> at PPQ 480 (negative = ahead of the beat,
  positive = behind), plus the nearest note fraction (e.g. <code>+1/128</code>).
  In the diagrams, the tail on a dot shows its lean: tail to the left = pushing ahead,
  tail to the right = dragging behind.</li>
</ol>

<h2>How to read the diagrams</h2>
<p>Each row is an instrument, each column a grid step (16ths, 8ths, or triplets).
Dot <b>size</b> = velocity — the tiny dots are ghost notes. A <b>hollow</b> circle is an
open hat or crash. A dot drawn <b>off its gridline with a tail</b> is a hit with
micro-timing: the distance shows how far ahead or behind the grid it lands.
A <b>swing badge</b> on a card is the MPC-style 16th-swing setting to dial in on hardware
(50 = straight, 66 = full triplet).</p>

<h2>Swing cheat sheet (hardware swing knob, 16th swing)</h2>
<div class="tablewrap"><table>
<tr><th>setting</th><th>feel</th><th>grooves</th></tr>
<tr><td>50%</td><td>straight</td><td>techno, trance, metal, Timbaland, Neptunes, punk, Motown</td></tr>
<tr><td>54–56%</td><td>whisper swing</td><td>Funky Drummer, house, disco, Premier, son clave</td></tr>
<tr><td>56–58%</td><td><b>the crack</b></td><td>Cissy Strut, Pocky A-Way, Dilla “Runnin’”, Think</td></tr>
<tr><td>60–63%</td><td>heavy shuffle</td><td>UK garage, deep house shaker, Pete Rock</td></tr>
<tr><td>66% / triplets</td><td>full shuffle</td><td>blues, Purdie shuffle, Rosanna, Fool in the Rain, bembé</td></tr>
</table></div>

<h2>Lean cheat sheet (global track nudge)</h2>
<p>Beat-based, so it works at any tempo. Ticks at PPQ 480 — a 16th note is 120 ticks.</p>
<div class="tablewrap"><table>
<tr><th>nudge</th><th>≈ fraction</th><th>feel</th><th>who</th></tr>
<tr><td>−10…−20t</td><td>−1/192…−1/96</td><td>urgent, forward</td><td>punk, Moon, Copeland, Motown</td></tr>
<tr><td>−12…−18t</td><td>≈ −1/128</td><td>drunk kicks</td><td>Dilla, Questlove drunk mode (kicks only!)</td></tr>
<tr><td>0</td><td>0</td><td>grid / slick center</td><td>machines, Palmer, Porcaro, Garibaldi, Purdie accents</td></tr>
<tr><td>+6…+12t</td><td>+1/256…+1/192</td><td>classic pocket</td><td>Dre, Premier snare, Rudd, Watts</td></tr>
<tr><td>+10…+20t</td><td>+1/192…+1/96</td><td>deep lean</td><td>Bonham snare, boom-bap, blues, Barrett</td></tr>
<tr><td>+20…+30t</td><td>+1/96…+1/64</td><td>the sag</td><td>Al Jackson, Robbie Shakespeare bass, Pino on Voodoo</td></tr>
</table></div>
<p><b>One honest caveat:</b> human lean is partly constant-time — a drummer's 20ms lag
doesn't become 40ms at half tempo. Beat-based offsets are the right storage and scale
correctly for moderate tempo changes, but if you retempo a groove drastically (±25%+),
re-tune the lean by ear: slower usually wants a slightly smaller fraction, faster a
slightly bigger one.</p>

<h2>Things a step sequencer can't store (do these by hand)</h2>
<ul>
  <li><b>Tony Allen</b> (Zombie, Water No Get Enemy): never loop identically — move one
  accent, one ghost, one kick every bar. Program 4 variations and chain them.</li>
  <li><b>Punk</b> (Blitzkrieg Bop): optionally automate tempo +1 bpm every 8 bars.</li>
  <li><b>Filter house</b>: the velocity ramp emulates sidechain; better still, put a real
  sidechain compressor on the hats keyed from the kick.</li>
  <li><b>The crack</b> (Cissy Strut, Pocky A-Way, Just Kissed My Baby): add ±3–5ms random
  humanize ON TOP of the +22ms offsets.</li>
  <li><b>Jungle</b>: for authenticity, chop an actual Amen recording to these positions
  instead of triggering one-shots.</li>
  <li><b>Sample-mode Questlove</b> (The Next Movement): flatten velocities further, add
  tape/vinyl character.</li>
</ul>

<h2>A note on the “bass” track</h2>
<p>⚠ <b>“bass” is not a drum.</b> The Questlove and Sly &amp; Robbie patterns include
bass-guitar hits so the drum-vs-bass gap survives the export. In your DAW, move those
notes to a bass instrument — any pitch works; the <em>placement</em> is what matters,
especially the +40–50ms sag.</p>

<h2>Using the MIDI files</h2>
<p>Every card has a ⬇ MIDI link — a Standard MIDI File generated from the pattern database
at build time, loop-length exact (1 or 2 bars), tempo embedded, GM drum mapping (kick 36,
snare 38, rim 37, closed hat 42, open hat 46, ride 51, crash 49, clap 39, tambourine 54,
shaker 70, cowbell 56, toms 45/48/50, bass 35). Offsets appear as slightly off-grid notes —
that's the whole point, <b>don't quantize them away</b>. Elektron users: one 1/384-of-a-bar
microtiming step = 5 ticks here, so <code>+1/64</code> ≈ +6 Elektron clicks.</p>
<p>One subtlety: MIDI time can't go below zero, so when a groove's first hit leans AHEAD of
beat 1 (Dilla's kicks, punk's rush), that hit becomes the file's tick 0 and the whole grid
shifts later by the same amount — relative feel preserved exactly. Playback in the app does
the same, which is why the metronome click on beat 1 lands slightly <em>after</em> those
early hits. That's not a bug; that's the lean.</p>

<p>Have fun. Remember Purdie's law: <b>the ghost notes make you dance.</b></p>
`;
