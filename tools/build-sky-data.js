// Builds data/sky.json (compact) from the d3-celestial data files.
// Usage: node tools/build-sky-data.js <folder with raw d3-celestial json>
const path = require('path');
const raw = process.argv[2] || path.join(__dirname, 'raw');
const fs = require('fs');
const load = f => JSON.parse(fs.readFileSync(path.join(raw, f), 'utf8'));
const stars = load('stars.6.json').features;
const names = load('starnames.json');
const cons = load('constellations.json').features;
const lines = load('constellations.lines.json').features;
const r = v => Math.round(v * 1e4) / 1e4;
const out = { stars: [], names: {}, constellations: [] };
for (const s of stars) {
  const [ra, dec] = s.geometry.coordinates;
  out.stars.push(s.id, r(ra < 0 ? ra + 360 : ra), r(dec), s.properties.mag, parseFloat(s.properties.bv) || 0.6);
}
for (const [hip, n] of Object.entries(names)) {
  if (n.name || n.bayer) out.names[hip] = [n.name || '', (n.bayer || n.flam || '') + (n.c ? ' ' + n.c : ''), n.c || ''];
}
const lineMap = Object.fromEntries(lines.map(l => [l.id, l.geometry.coordinates]));
for (const c of cons) {
  const p = c.properties;
  out.constellations.push({
    id: c.id, name: p.name, gen: p.gen, hi: p.hi || '',
    center: [p.display[0], p.display[1]], scale: p.display[2],
    lines: (lineMap[c.id] || []).map(seg => seg.map(([ra, dec]) => [r(ra < 0 ? ra + 360 : ra), r(dec)])),
  });
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'sky.json'), JSON.stringify(out));
console.log('stars', out.stars.length / 5, 'names', Object.keys(out.names).length, 'constellations', out.constellations.length);
