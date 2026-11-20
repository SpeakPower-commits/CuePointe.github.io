// Run from the repo root:  node tools/build-brand.cjs
// Draws docs/brand/fireball.svg and docs/brand/banner.svg for the README.
// One big black 8-ball on fire: a standalone icon and the README banner hero.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'docs', 'brand');

// Flame with five licks, pointing up from y=0, unit width ±1; scaled per layer.
function flamePath(s) {
  const pts = [
    ['M', -1, 0], ['C', -1.2, -0.6, -0.7, -0.9, -0.82, -1.5], ['C', -0.5, -1.15, -0.32, -1.32, -0.38, -1.98],
    ['C', -0.05, -1.45, 0.16, -1.62, 0.1, -2.38], ['C', 0.46, -1.76, 0.72, -1.56, 0.62, -1.06],
    ['C', 0.86, -1.26, 1.02, -0.9, 0.96, -0.6], ['C', 1.12, -0.44, 1.06, -0.2, 1.0, 0]
  ];
  return pts.map(([c, ...v]) => c + ' ' + v.map(x => (x * s).toFixed(1)).join(' ')).join(' ') + ' Z';
}

const DEFS = (p) => `
    <linearGradient id="${p}f1" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#B81E05"/><stop offset=".45" stop-color="#F0410C"/><stop offset="1" stop-color="#FF7A1A" stop-opacity=".85"/>
    </linearGradient>
    <linearGradient id="${p}f2" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FF6A10"/><stop offset="1" stop-color="#FFB12E"/>
    </linearGradient>
    <linearGradient id="${p}f3" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFD254"/><stop offset="1" stop-color="#FFEFA8"/>
    </linearGradient>
    <linearGradient id="${p}f4" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFF6D5"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".9"/>
    </linearGradient>
    <radialGradient id="${p}glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FF7A1A" stop-opacity=".6"/><stop offset=".55" stop-color="#FF5A14" stop-opacity=".18"/><stop offset="1" stop-color="#FF5A14" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}ball" cx="38%" cy="34%" r="70%">
      <stop offset="0" stop-color="#262626"/><stop offset=".4" stop-color="#0A0A0A"/><stop offset="1" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="${p}shine" cx="32%" cy="25%" r="22%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".7"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}rim" cx="70%" cy="72%" r="55%">
      <stop offset=".72" stop-color="#FF7A1A" stop-opacity="0"/><stop offset="1" stop-color="#FF7A1A" stop-opacity=".32"/>
    </radialGradient>`;

// The fireball, centred on (cx, cy) with ball radius R, flames trailing up-left.
function fireball(p, cx, cy, R) {
  const sparks = [[-0.95, -2.15, 0.05], [0.7, -1.95, 0.04], [-0.25, -2.75, 0.035], [1.15, -1.25, 0.03], [-1.3, -1.35, 0.03]]
    .map(([x, y, r], i) => `<circle cx="${(x * R * 1.15).toFixed(1)}" cy="${(y * R * 1.15).toFixed(1)}" r="${(r * R).toFixed(1)}" fill="${i % 2 ? '#FFB12E' : '#FFE27A'}"/>`).join('');
  return `
  <circle cx="${cx}" cy="${cy}" r="${(R * 1.9).toFixed(1)}" fill="url(#${p}glow)"/>
  <g transform="translate(${cx} ${cy}) rotate(-40)">
    <path d="${flamePath(R * 1.18)}" transform="translate(0 ${(R * 0.18).toFixed(1)})" fill="url(#${p}f1)"/>
    <path d="${flamePath(R * 0.9)}" transform="translate(0 ${(R * 0.05).toFixed(1)})" fill="url(#${p}f2)"/>
    <path d="${flamePath(R * 0.6)}" transform="translate(0 ${(-R * 0.12).toFixed(1)})" fill="url(#${p}f3)"/>
    <path d="${flamePath(R * 0.34)}" transform="translate(0 ${(-R * 0.3).toFixed(1)})" fill="url(#${p}f4)"/>
    ${sparks}
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}ball)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}rim)"/>
  <circle cx="${cx}" cy="${cy}" r="${(R * 0.43).toFixed(1)}" fill="#FBF8EE"/>
  <text x="${cx}" y="${(cy + R * 0.2).toFixed(1)}" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${(R * 0.56).toFixed(1)}" fill="#111">8</text>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}shine)"/>`;
}

/* standalone icon, 256×256 */
fs.writeFileSync(path.join(OUT, 'fireball.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="CuePointe fireball 8-ball">
  <defs>${DEFS('i')}
  </defs>${fireball('i', 156, 156, 62)}
</svg>
`);

/* banner 1280×420 with the fireball as the hero */
const pockets = [[64, 64], [640, 52], [1216, 64], [64, 356], [640, 368], [1216, 356]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="22" fill="#020806"/><circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#2B1608" stroke-width="3"/>`).join('');
let sights = '';
for (const x of [208, 352, 496, 784, 928, 1072]) sights += `<circle cx="${x}" cy="52" r="3" fill="#E8D9A8"/><circle cx="${x}" cy="368" r="3" fill="#E8D9A8"/>`;
for (const y of [138, 210, 282]) sights += `<circle cx="52" cy="${y}" r="3" fill="#E8D9A8"/><circle cx="1228" cy="${y}" r="3" fill="#E8D9A8"/>`;

fs.writeFileSync(path.join(OUT, 'banner.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 420" width="1280" height="420" role="img" aria-label="CuePointe Action Pool: an 8-ball on fire across the felt">
  <defs>
    <filter id="felt" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .16 0" result="grain"/>
      <feComposite in="grain" in2="SourceGraphic" operator="in" result="g2"/>
      <feBlend in="SourceGraphic" in2="g2" mode="multiply"/>
    </filter>
    <radialGradient id="lamp" cx="70%" cy="55%" r="60%">
      <stop offset="0" stop-color="#1B7A52"/><stop offset=".6" stop-color="#0E4D36"/><stop offset="1" stop-color="#093626"/>
    </radialGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7A4A26"/><stop offset="1" stop-color="#4A2A12"/>
    </linearGradient>
    <clipPath id="feltclip"><rect x="64" y="64" width="1152" height="292" rx="12"/></clipPath>${DEFS('b')}
  </defs>
  <rect width="1280" height="420" fill="#061A14"/>
  <rect x="28" y="28" width="1224" height="364" rx="40" fill="url(#wood)"/>
  <rect x="64" y="64" width="1152" height="292" rx="12" fill="url(#lamp)" filter="url(#felt)"/>
  ${sights}
  ${pockets}
  <g clip-path="url(#feltclip)">${fireball('b', 960, 250, 74)}
  </g>
  <text x="112" y="196" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" font-size="92" fill="#FFFFFF" letter-spacing="1">CUEPOINTE</text>
  <text x="116" y="240" font-family="'Courier New', monospace" font-weight="700" font-size="22" fill="#FFFFCB" letter-spacing="4">ACTION POOL · KAMPALA</text>
  <text x="116" y="292" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="26" fill="#DDE8E1">Every shot is your story.</text>
</svg>
`);

// the numbered ball icons are retired
for (let n = 1; n <= 8; n++) { const f = path.join(OUT, `ball-${n}.svg`); if (fs.existsSync(f)) fs.unlinkSync(f); }
console.log('wrote fireball.svg + banner.svg; removed ball-1..8.svg');
