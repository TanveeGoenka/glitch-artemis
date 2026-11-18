// Floating HUD panels drawn on 2D canvases and shown as planes in 3D space,
// so they render correctly in both eyes of the headset.
import * as THREE from 'three';

const easeOut = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const clamp01 = x => Math.min(1, Math.max(0, x));
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>';
const RED = '#ff3646';
const TITLE_FONT = '"Orbitron", "Michroma", sans-serif';
const INFO_FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';

function scramble(text, p, seed) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const reveal = 0.15 + (i / text.length) * 0.6;
    if (text[i] === ' ' || p >= reveal) out += text[i];
    else out += SCRAMBLE[(Math.floor(seed * 13 + i * 7 + p * 60) % SCRAMBLE.length)];
  }
  return out;
}
function glowText(ctx, text, x, y, blur = 18, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = blur < 5 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)'; ctx.shadowBlur = blur;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = blur * 0.3;
  ctx.fillText(text, x, y);
  ctx.restore();
}
function darkText(ctx, text, x, y, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
  ctx.fillText(text, x, y); ctx.fillText(text, x, y);
  ctx.restore();
}
function setSpacing(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

class CanvasPanel {
  constructor(w, h, worldWidth) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, h / w),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 }),
    );
    this.mesh.scale.setScalar(worldWidth);
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
    this.worldWidth = worldWidth;
    this.p = 0; this.target = 0; this.age = 0; this.lastDraw = -1;
  }
  show() { this.target = 1; this.age = 0; this.mesh.visible = true; }
  hide() { this.target = 0; }
  get active() { return this.target > 0 || this.mesh.material.opacity > 0.01; }
  update(dt, t, speed = 1) {
    this.age += dt;
    const o = this.mesh.material;
    o.opacity += ((this.target ? 1 : 0) - o.opacity) * (1 - Math.exp(-dt * (this.target ? 6 : 9)));
    this.p = this.target ? Math.min(1, this.p + dt * speed) : Math.max(0, this.p - dt * 2.5);
    if (!this.target && o.opacity < 0.01) { this.mesh.visible = false; o.opacity = 0; return; }
    // redraw while animating, otherwise ~20 fps for subtle motion
    if (this.p < 1 || t - this.lastDraw > 0.05) { this.lastDraw = t; this.draw(t); this.texture.needsUpdate = true; }
  }
}

// --- Constellation / star title, in the style of a sci-fi lower third ---
export class TitleHUD extends CanvasPanel {
  constructor() { super(1024, 360, 3.4); this.seed = Math.random(); }
  set({ name, sub, tag, micro }) {
    this.name = name.toUpperCase(); this.sub = sub.toUpperCase(); this.tag = tag; this.micro = micro || [];
    this.p = 0; this.seed = Math.random();
  }
  draw(t) {
    const { ctx, canvas } = this, W = canvas.width, p = this.p, E = easeOut(p);
    ctx.clearRect(0, 0, W, canvas.height);
    const cx = 118, cy = 186, x0 = 214;
    // name size: shrink long names to fit
    let size = 66;
    ctx.font = `700 ${size}px ${TITLE_FONT}`; setSpacing(ctx, 4);
    let tw = ctx.measureText(this.name).width;
    while (x0 + tw + 150 > W && size > 30) { size -= 2; ctx.font = `700 ${size}px ${TITLE_FONT}`; tw = ctx.measureText(this.name).width; }
    const endX = x0 + tw;

    // soft dark band behind the words so they read over bright stars
    const bg = ctx.createLinearGradient(0, cy - 90, 0, cy + 170);
    bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(0.3, `rgba(0,0,0,${0.55 * E})`); bg.addColorStop(0.75, `rgba(0,0,0,${0.55 * E})`); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(x0 - 30, cy - 90, endX - x0 + 140, 260);
    ctx.lineCap = 'round';
    // faint crosshair lines
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, cy - 40); ctx.lineTo(10 + (W - 20) * E, cy - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX + 46, 30); ctx.lineTo(endX + 46, 30 + 300 * E); ctx.stroke();
    // dial
    const rot = t * 0.35;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 62, rot + 0.6, rot + 0.6 + E * Math.PI * 1.25); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, 82, -rot * 0.6, -rot * 0.6 + E * Math.PI * 1.7); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 24 * E; i++) {
      const a = i / 24 * Math.PI * 2 - rot * 0.3, r1 = i % 6 === 0 ? 66 : 70;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * 74, cy + Math.sin(a) * 74); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 4, cy); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 20, cy); ctx.stroke();
    // underline
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx + 84, cy + 40); ctx.lineTo(cx + 84 + (endX + 90 - cx - 84) * E, cy + 40); ctx.stroke();
    // red marker triangle on the line
    if (p > 0.5) {
      ctx.fillStyle = RED; ctx.globalAlpha = clamp01((p - 0.5) * 4) * (0.7 + 0.3 * Math.sin(t * 4));
      ctx.beginPath(); ctx.moveTo(endX + 74, cy + 32); ctx.lineTo(endX + 62, cy + 40); ctx.lineTo(endX + 74, cy + 48); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // name (decoding effect)
    const flicker = p < 0.35 ? (Math.sin(t * 90) > 0 ? 1 : 0.45) : 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${size}px ${TITLE_FONT}`; setSpacing(ctx, 4);
    darkText(ctx, scramble(this.name, p, this.seed), x0, cy + 22, clamp01(p * 3) * flicker);
    glowText(ctx, scramble(this.name, p, this.seed), x0, cy + 22, 16, clamp01(p * 3) * flicker);
    // red tag
    ctx.font = `500 22px ${TITLE_FONT}`; setSpacing(ctx, 2); ctx.fillStyle = RED;
    ctx.globalAlpha = clamp01(p * 2 - 0.4);
    const tagText = `[${this.tag}]`;
    darkText(ctx, tagText, endX + 40 - ctx.measureText(tagText).width, cy - 58);
    // subtitle under the line
    ctx.fillStyle = '#ffffff'; ctx.font = `500 19px ${TITLE_FONT}`; setSpacing(ctx, 3);
    ctx.globalAlpha = clamp01(p * 2 - 0.7) * 0.9;
    darkText(ctx, this.sub, endX + 40 - ctx.measureText(this.sub).width, cy + 72);
    // micro data text
    ctx.font = `500 17px ${INFO_FONT}`; setSpacing(ctx, 2); ctx.globalAlpha = clamp01(p * 2 - 1) * 0.75;
    this.micro.forEach((m, i) => darkText(ctx, m.toUpperCase(), x0, cy + 104 + i * 21));
    ctx.font = `400 14px monospace`; setSpacing(ctx, 1); ctx.globalAlpha *= 0.6;
    let bits = ''; for (let i = 0; i < 22; i++) bits += ((Math.sin(i * 12.9898 + Math.floor(t * 2) * 7.1 + this.seed * 99) * 43758.5) % 1 + 1) % 1 > 0.5 ? '1' : '0';
    ctx.fillText(bits, cx - 60, cy + 128);
    ctx.globalAlpha = 1;
  }
}

// --- Info card: semi-transparent black, white softly-glowing text, short facts ---
export class InfoPanel extends CanvasPanel {
  constructor() { super(640, 860, 2.15); }
  set({ letter, name, sub, id, rows, facts }) {
    Object.assign(this, { letter, name: name.toUpperCase(), sub: sub.toUpperCase(), id, rows, facts }); this.p = 0;
  }
  draw(t) {
    const { ctx, canvas } = this, W = canvas.width, p = this.p;
    ctx.clearRect(0, 0, W, canvas.height);
    // wrap facts
    ctx.font = `400 25px ${INFO_FONT}`; setSpacing(ctx, 1);
    const factLines = [];
    for (const f of this.facts) {
      const words = f.split(' '); let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > W - 110 && line) { factLines.push([line, factLines.length === 0 || false]); line = w; }
        else line = test;
      }
      factLines.push([line, false]);
      factLines.push(null); // spacer
    }
    const rowsTop = 248, rowH = 44;
    const factsTop = rowsTop + this.rows.length * rowH + 40;
    const H = Math.min(canvas.height - 4, factsTop + factLines.length * 17 + 30);
    // background
    const a = easeOut(p * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.66)';
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H, 14); ctx.fill(); ctx.stroke();
    // corner accents
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    const c = 18;
    ctx.beginPath(); ctx.moveTo(2, c + 2); ctx.lineTo(2, 2); ctx.lineTo(c + 2, 2);
    ctx.moveTo(W - c - 2, H + 2); ctx.lineTo(W - 2, H + 2); ctx.lineTo(W - 2, H - c + 2); ctx.stroke();
    // letter box
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.strokeRect(40, 44, 78, 78);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `300 46px ${INFO_FONT}`; setSpacing(ctx, 0);
    ctx.textAlign = 'center'; ctx.fillText(this.letter, 79, 99); ctx.textAlign = 'left';
    // name + subtitle + id
    ctx.fillStyle = '#fff'; ctx.font = `600 52px ${INFO_FONT}`; setSpacing(ctx, 4);
    glowText(ctx, this.name, 146, 88, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `500 29px ${INFO_FONT}`; setSpacing(ctx, 4);
    ctx.fillText(this.sub, 146, 124);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = `400 19px ${INFO_FONT}`; setSpacing(ctx, 2);
    ctx.fillText(this.id, 146, 152);
    // ring + divider
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(52, 196, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(64, 196); ctx.lineTo(64 + (W - 104) * easeOut(p * 1.6), 196); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52, 206); ctx.lineTo(52, 206 + (H - 240) * easeOut(p * 1.2)); ctx.stroke();
    // rows
    const n = this.rows.length + factLines.length;
    this.rows.forEach(([label, value], i) => {
      ctx.globalAlpha = clamp01(p * n * 0.9 - i * 0.7);
      const y = rowsTop + i * rowH;
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `400 25px ${INFO_FONT}`; setSpacing(ctx, 1);
      ctx.fillText(label, 84, y);
      ctx.fillStyle = '#fff'; ctx.font = `500 26px ${INFO_FONT}`;
      glowText(ctx, value, 290, y, 2);
    });
    // short facts
    let y = factsTop;
    factLines.forEach((fl, i) => {
      if (!fl) { y += 10; return; }
      ctx.globalAlpha = clamp01(p * n * 0.9 - (this.rows.length + i) * 0.7);
      ctx.fillStyle = '#fff'; ctx.font = `400 25px ${INFO_FONT}`; setSpacing(ctx, 1);
      glowText(ctx, fl[0], 84, y, 2, 0.92);
      y += 32;
    });
    // little bullets on the left line
    ctx.globalAlpha = a; ctx.fillStyle = RED;
    ctx.fillRect(48, factsTop - 20, 8, 8);
    ctx.globalAlpha = 1;
  }
}

// --- Small label shown while gazing at something (before selecting) ---
export class HoverLabel extends CanvasPanel {
  constructor() { super(640, 120, 1.5); }
  set(name, sub) { this.name = name.toUpperCase(); this.sub = sub.toUpperCase(); this.p = 0; }
  draw(t) {
    const { ctx, canvas } = this, p = easeOut(this.p * 1.5);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff'; ctx.font = `500 38px ${TITLE_FONT}`; setSpacing(ctx, 4); ctx.textAlign = 'center';
    glowText(ctx, this.name, 320, 52, 14, p);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    const w = 220 * p;
    ctx.beginPath(); ctx.moveTo(320 - w, 70); ctx.lineTo(320 + w, 70); ctx.stroke();
    ctx.globalAlpha = p * 0.6; ctx.font = `500 18px ${TITLE_FONT}`; setSpacing(ctx, 3);
    ctx.fillText(this.sub, 320, 100);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}

// --- Instruction card at the start of the VR experience ---
export class HintPanel extends CanvasPanel {
  constructor() { super(1024, 300, 3.2); }
  set(lines) { this.lines = lines; this.p = 0; }
  draw() {
    const { ctx, canvas } = this, p = easeOut(this.p);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = p;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 16); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    this.lines.forEach((l, i) => {
      ctx.font = i === 0 ? `600 34px ${TITLE_FONT}` : `500 30px ${INFO_FONT}`; setSpacing(ctx, i === 0 ? 6 : 2);
      glowText(ctx, l, 512, 70 + i * 52, i === 0 ? 14 : 6, i === 0 ? 1 : 0.85);
    });
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

// --- Ring marker around a selected star (like the white rings in the reference) ---
export function makeRing() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.setLineDash([6, 14]);
  ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI * 2); ctx.stroke();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
  m.renderOrder = 15; m.visible = false;
  return m;
}
