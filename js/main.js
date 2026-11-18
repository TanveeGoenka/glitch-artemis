// GLITCH · Night Sky VR
// Phone-in-headset VR (side-by-side stereo + gyro head tracking) with a Bluetooth remote.
import * as THREE from 'three';
import { Sky, D2R } from './sky.js';
import { TitleHUD, InfoPanel, HoverLabel, HintPanel, makeRing } from './hud.js';
import { SpaceAudio } from './audio.js';
import { Input } from './input.js';
import { CONSTELLATION_FACTS } from './facts.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------- settings ----------------
const SETTINGS_KEY = 'artemis.settings.v1';
const settings = { music: true, gaze: false, allLines: false, lens: 0, vrFov: 85, latitude: 20 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* ignore */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };

// ---------------- renderer / scene ----------------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x01030a, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 3000);
const eyes = [new THREE.PerspectiveCamera(), new THREE.PerspectiveCamera()];
eyes[0].position.x = -0.032; eyes[1].position.x = 0.032;   // ~64 mm between the eyes
camera.add(eyes[0], eyes[1]);
scene.add(camera);

const yawGroup = new THREE.Group();     // joystick turns the sky around you
const tiltGroup = new THREE.Group();    // tilts the celestial pole to your latitude
scene.add(yawGroup); yawGroup.add(tiltGroup);
tiltGroup.rotation.x = -(Math.PI / 2 - settings.latitude * D2R);

const hudGroup = new THREE.Group(); scene.add(hudGroup);
const title = new TitleHUD(), info = new InfoPanel(), hover = new HoverLabel(), hint = new HintPanel(), ring = makeRing();
hudGroup.add(title.mesh, info.mesh, hover.mesh, hint.mesh, ring);

// gaze reticle (center of view)
const reticle = new THREE.Group();
const retMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false });
const retDot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 20), retMat);
const retRing = new THREE.Mesh(new THREE.RingGeometry(0.042, 0.05, 40), retMat.clone());
const dwellMat = new THREE.MeshBasicMaterial({ color: 0xff3646, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
const dwellRing = new THREE.Mesh(new THREE.RingGeometry(0.056, 0.066, 40, 1, 0, 0.001), dwellMat);
reticle.add(retDot, retRing, dwellRing);
reticle.children.forEach(m => (m.renderOrder = 30));
reticle.position.z = -3; reticle.visible = false;
camera.add(reticle);

// ---------------- state ----------------
const S = {
  mode: 'menu', yaw: 0, yawTarget: null, fov: 65, fovTarget: 65,
  lookYaw: 0, lookPitch: 0.35, pitchTarget: null, gyro: false, pointer: null,
  hovered: null, hoverTime: 0, selected: null, infoOpen: false, dim: 1, t: 0,
  nextShoot: 3, nextGlint: 2, tour: -1, hintLeft: 0,
};
const isVR = () => S.mode === 'vr';
const usingGaze = () => isVR() || (S.gyro && !!devOri);
const baseFov = () => (isVR() ? settings.vrFov : (innerWidth < innerHeight ? 80 : 62));

const input = new Input();
const audio = new SpaceAudio();
audio.musicOn = settings.music;
let sky;

// ---------------- helpers ----------------
const tmpQ = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), camFwd = new THREE.Vector3();
function skyQuat(out) { return sky.group.getWorldQuaternion(out); }
function localToWorldDir(local, out) { return out.copy(local).applyQuaternion(skyQuat(tmpQ)); }
function worldToLocalDir(world, out) { return out.copy(world).applyQuaternion(skyQuat(tmpQ).invert()); }
function targetLocalDir(t) { return t.kind === 'star' ? t.obj.v : t.obj.center; }
function eyeAspect() { return isVR() ? (innerWidth / 2) / innerHeight : innerWidth / innerHeight; }

function viewDirWorld(out) {
  if (!usingGaze() && S.pointer) {
    return out.set(S.pointer.x, S.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
  }
  return out.set(0, 0, -1).applyQuaternion(camera.quaternion);
}

// Turn the sky so `localDir` sits in front of you (offsetFrac > 0 puts it to the left)
function aimAt(localDir, offsetFrac = 0) {
  const d = localToWorldDir(localDir, v1);
  const f = v2.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const camAz = Math.atan2(-f.x, -f.z), tAz = Math.atan2(-d.x, -d.z);
  const halfH = Math.atan(Math.tan(S.fovTarget * D2R / 2) * eyeAspect());
  S.yawTarget = S.yaw + wrapPi(camAz + offsetFrac * halfH - tAz);
  if (!usingGaze()) S.pitchTarget = Math.asin(clamp(d.y, -1, 1));
}

const fmtRA = ra => { const h = ra / 15; return `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`; };
const fmtDec = dec => `${dec >= 0 ? '+' : '−'}${Math.abs(Math.round(dec))}°`;
const conName = id => sky.constellations.find(c => c.id === id)?.name || id;

// ---------------- selection flow ----------------
function titleFor(t) {
  if (t.kind === 'star') {
    const s = t.obj;
    return { name: s.name, sub: `Star · ${s.title}`, tag: s.con.toUpperCase() || 'STAR',
      micro: [`RA ${fmtRA(s.ra)}  ·  DEC ${fmtDec(s.dec)}`, `Magnitude ${s.mag.toFixed(2)}`, `${s.dist}`] };
  }
  const c = t.obj, f = c.facts;
  return { name: c.name, sub: `Constellation · ${f ? f.title : c.gen}`, tag: c.id.toUpperCase(),
    micro: [`RA ${fmtRA(c.ra)}  ·  DEC ${fmtDec(c.dec)}`, `Stars in figure ${c.starCount}`, c.brightest ? `Brightest ${c.brightest.name}` : ''] };
}
function infoFor(t) {
  if (t.kind === 'star') {
    const s = t.obj;
    return { letter: s.name[0], name: s.name, sub: s.title, id: `ID: HIP ${s.hip}`,
      rows: [['Distance', s.dist], ['Type', s.type], ['Temperature', s.temp], ['Size', s.radius],
        ['Brightness', `${s.mag.toFixed(2)} mag`], ['Constellation', conName(s.con)]],
      facts: [s.fact] };
  }
  const c = t.obj, f = c.facts;
  const rows = f
    ? [['Meaning', f.title], ['Brightest star', f.brightest], ['Stars in figure', String(c.starCount)], ['Size', f.area], ['Best seen', `${f.best} evenings`]]
    : [['Latin form', c.gen], ['Brightest star', c.brightest?.name || '—'], ['Stars in figure', String(c.starCount)], ['Position', `RA ${fmtRA(c.ra)} · DEC ${fmtDec(c.dec)}`]];
  const facts = f ? f.facts : [
    `${c.brightest?.name || 'Its brightest star'} shines at magnitude ${c.brightest?.mag.toFixed(1) ?? '?'}`,
    'One of the 88 official constellations of the sky'];
  return { letter: c.name[0], name: c.name, sub: f ? f.title : 'Constellation', id: `ID: IAU ${c.id.toUpperCase()}`, rows, facts };
}

function select(t) {
  S.selected = t; S.infoOpen = false; info.hide();
  if (t.kind === 'constellation') {
    t.obj.progress = 0;
    S.fovTarget = clamp(t.obj.radius / D2R * 2.5, 22, baseFov() * 0.9);
  } else {
    S.fovTarget = clamp(baseFov() * 0.5, 24, 42);
  }
  title.set(titleFor(t)); title.show(); hover.hide();
  if (S.hintLeft > 0) S.hintLeft = 0.01;   // instructions are done once you pick something
  aimAt(targetLocalDir(t), 0);
  audio.select();
}
function openInfo() {
  if (!S.selected) return;
  info.set(infoFor(S.selected)); info.show(); title.hide();
  S.infoOpen = true;
  aimAt(targetLocalDir(S.selected), eyeAspect() < 1 && !isVR() ? 0 : 0.42);
  audio.info();
}
function closeInfo() {
  info.hide(); S.infoOpen = false;
  title.set(titleFor(S.selected)); title.show();
  aimAt(targetLocalDir(S.selected), 0);
  audio.back();
}
function deselect() {
  S.selected = null; S.infoOpen = false; title.hide(); info.hide();
  S.fovTarget = baseFov();
  audio.back();
}
const sameTarget = (a, b) => a && b && a.obj === b.obj;

function actSelect(fromPointer = false) {
  if (S.mode === 'menu') return;
  // keyboard/remote presses use what you look at; with a mouse only clicks pick a new target
  const h = usingGaze() || fromPointer ? S.hovered : null;
  if (h && !sameTarget(h, S.selected)) select(h);
  else if (S.selected && !S.infoOpen) openInfo();
  else if (S.selected && S.infoOpen) closeInfo();
  S.hoverTime = 0;
}
function actBack() {
  if (S.infoOpen) closeInfo();
  else if (S.selected) deselect();
}
function actTour(step) {
  if (S.mode === 'menu') return;
  const feat = Object.keys(CONSTELLATION_FACTS).map(id => sky.constellations.find(c => c.id === id)).filter(Boolean);
  S.tour = (S.tour + step + feat.length) % feat.length;
  select({ kind: 'constellation', obj: feat[S.tour] });
}

input.on('select', () => actSelect(false));
input.on('back', actBack);
input.on('next', () => actTour(1));
input.on('prev', () => actTour(-1));
input.on('zoomIn', () => (S.fovTarget = clamp(S.fovTarget * 0.8, 16, baseFov())));
input.on('zoomOut', () => (S.fovTarget = clamp(S.fovTarget * 1.25, 16, baseFov())));
input.on('music', () => setMusic(!settings.music));
input.on('menu', () => S.mode !== 'menu' && exitToMenu());
input.on('recenter', () => sky && aimAt(sky.constellations.find(c => c.id === 'Ori').center));

// ---------------- shooting stars ----------------
class ShootingStars {
  constructor() {
    this.pool = [];
    const N = 32;
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(200,225,255,0.5)'); gr.addColorStop(1, 'rgba(160,200,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    for (let k = 0; k < 3; k++) {
      const pos = new Float32Array(N * 2 * 3), a = new Float32Array(N * 2), idx = [];
      for (let i = 0; i < N; i++) { a[i * 2] = a[i * 2 + 1] = Math.pow(i / (N - 1), 1.6); }
      for (let i = 0; i < N - 1; i++) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aA', new THREE.BufferAttribute(a, 1));
      geo.setIndex(idx);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uFade: { value: 0 } },
        vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float uFade; varying float vA; void main(){ gl_FragColor = vec4(0.86,0.93,1.0, vA * uFade); }',
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 6;
      const head = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      head.visible = false; head.renderOrder = 7;
      scene.add(mesh, head);
      this.pool.push({ mesh, head, N, active: false });
    }
  }
  spawn() {
    const s = this.pool.find(p => !p.active); if (!s) return;
    const fwd = v1.set(0, 0, -1).applyQuaternion(camera.quaternion);
    // start somewhere around (mostly above) where you are looking
    const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(side, fwd).normalize();
    const r = Math.random() * 0.45, th = Math.random() * Math.PI * 2;
    s.p0 = fwd.clone().addScaledVector(side, Math.cos(th) * r).addScaledVector(up, Math.abs(Math.sin(th)) * r + 0.12).normalize();
    // travel mostly downward and sideways, like a real meteor
    const dirRaw = side.clone().multiplyScalar(Math.random() < 0.5 ? -1 : 1).addScaledVector(up, -0.4 - Math.random() * 0.6);
    s.tan = dirRaw.addScaledVector(s.p0, -dirRaw.dot(s.p0)).normalize();
    s.norm = new THREE.Vector3().crossVectors(s.p0, s.tan).normalize();
    s.len = (12 + Math.random() * 14) * D2R; s.trail = (6 + Math.random() * 4) * D2R;
    s.dur = 0.7 + Math.random() * 0.7; s.t = 0; s.active = true;
    s.mesh.visible = s.head.visible = true;
    audio.shootingStar();
  }
  update(dt) {
    const R = 400;
    for (const s of this.pool) {
      if (!s.active) continue;
      s.t += dt / s.dur;
      if (s.t >= 1) { s.active = false; s.mesh.visible = s.head.visible = false; continue; }
      const e = 1 - (1 - s.t) * (1 - s.t);
      const head = s.len * e, tail = Math.max(0, head - s.trail * Math.min(1, s.t * 3));
      const pos = s.mesh.geometry.attributes.position.array;
      for (let i = 0; i < s.N; i++) {
        const a = tail + (head - tail) * (i / (s.N - 1));
        const p = v2.copy(s.p0).multiplyScalar(Math.cos(a)).addScaledVector(s.tan, Math.sin(a)).multiplyScalar(R);
        const w = 1.3 * Math.pow(i / (s.N - 1), 1.2);
        pos.set([p.x + s.norm.x * w, p.y + s.norm.y * w, p.z + s.norm.z * w], i * 6);
        pos.set([p.x - s.norm.x * w, p.y - s.norm.y * w, p.z - s.norm.z * w], i * 6 + 3);
        if (i === s.N - 1) s.head.position.copy(p);
      }
      s.mesh.geometry.attributes.position.needsUpdate = true;
      const fade = Math.pow(Math.sin(Math.PI * s.t), 0.6);
      s.mesh.material.uniforms.uFade.value = fade;
      s.head.material.opacity = fade; s.head.scale.setScalar(9); s.head.quaternion.copy(camera.quaternion);
    }
  }
}
let meteors;

// ---------------- gyro (head tracking) ----------------
let devOri = null;
const zee = new THREE.Vector3(0, 0, 1), euler = new THREE.Euler(), q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const gyroQ = new THREE.Quaternion();
addEventListener('deviceorientation', e => { if (e.alpha !== null) devOri = e; });
function readGyro(out) {
  const orient = (screen.orientation?.angle ?? window.orientation ?? 0) * D2R;
  euler.set(devOri.beta * D2R, devOri.alpha * D2R, -devOri.gamma * D2R, 'YXZ');
  out.setFromEuler(euler); out.multiply(q1); out.multiply(q0.setFromAxisAngle(zee, -orient));
  return out;
}
async function askMotionPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { return (await DeviceOrientationEvent.requestPermission()) === 'granted'; } catch { return false; }
  }
  return true;
}

// ---------------- pointer / touch (screen mode) ----------------
const touches = new Map();
let drag = null, pinch0 = 0, fov0 = 0;
canvas.addEventListener('pointerdown', e => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0 };
  if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = S.fovTarget; drag = null; }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') S.pointer = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!touches.has(e.pointerId)) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2 && pinch0) {
    const [a, b] = [...touches.values()];
    S.fovTarget = clamp(fov0 * pinch0 / Math.hypot(a.x - b.x, a.y - b.y), 16, baseFov());
  } else if (drag && !isVR()) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    const k = (S.fov / innerHeight) * D2R;
    if (S.gyro) { S.yaw += dx * k; S.yawTarget = null; }
    else { S.lookYaw += dx * k; S.lookPitch = clamp(S.lookPitch + dy * k, -1.5, 1.5); S.pitchTarget = null; S.yawTarget = null; }
  }
});
const endPointer = e => {
  const wasTap = drag && drag.moved < 8 && touches.size === 1;
  touches.delete(e.pointerId);
  if (touches.size < 2) pinch0 = 0;
  if (e.type === 'pointerup' && (wasTap || isVR()) && S.mode !== 'menu') {
    if (!isVR() && !usingGaze()) {
      // pick exactly where the tap / click happened
      S.pointer = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      updateHover(0, true);
      if (e.pointerType !== 'mouse') setTimeout(() => (S.pointer = null), 0);
    }
    actSelect(true);
  }
  if (touches.size === 0) drag = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') S.pointer = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); S.fovTarget = clamp(S.fovTarget * Math.exp(e.deltaY * 0.001), 16, baseFov()); }, { passive: false });

// ---------------- hover ----------------
function updateHover(dt, force = false) {
  const canHover = usingGaze() || S.pointer;
  let h = null;
  if (canHover) h = sky.pick(worldToLocalDir(viewDirWorld(v1), v2), S.fov);
  if (!sameTarget(h, S.hovered) || force) {
    if (h && !sameTarget(h, S.selected) && !force) {
      hover.set(h.kind === 'star' ? h.obj.name : h.obj.name, h.kind === 'star' ? 'Star' : 'Constellation'); hover.show();
      audio.hover();
    } else if (!h || sameTarget(h, S.selected)) hover.hide();
    S.hovered = h; S.hoverTime = 0;
  } else if (h) S.hoverTime += dt;
  // dwell (gaze) selection for people without a remote
  const dwellOn = settings.gaze && usingGaze() && h && !(S.infoOpen && sameTarget(h, S.selected));
  const prog = dwellOn ? clamp((S.hoverTime - 0.4) / 1.6, 0, 1) : 0;
  if (Math.abs(prog - (dwellRing.userData.prog ?? -1)) > 0.01) {
    dwellRing.userData.prog = prog;
    dwellRing.geometry.dispose();
    dwellRing.geometry = new THREE.RingGeometry(0.056, 0.066, 40, 1, Math.PI / 2 - prog * Math.PI * 2, Math.max(0.001, prog * Math.PI * 2));
  }
  if (prog >= 1) { actSelect(true); S.hoverTime = -1.5; }
}

// ---------------- panel placement ----------------
function place(mesh, worldDir, D, a, b, widthFrac) {
  const h = D * Math.tan(camera.fov * D2R / 2);
  mesh.position.copy(worldDir).multiplyScalar(D).addScaledVector(camUp, a * h).addScaledVector(camRight, b * h);
  mesh.quaternion.copy(camera.quaternion);
  mesh.scale.setScalar(widthFrac * 2 * h);
}

// ---------------- render loop ----------------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  S.t += dt;
  input.poll();

  // camera orientation
  if ((S.gyro || isVR()) && devOri) {
    readGyro(gyroQ);
    camera.quaternion.slerp(gyroQ, 0.75);
  } else {
    if (S.pitchTarget !== null) { S.lookPitch += (S.pitchTarget - S.lookPitch) * (1 - Math.exp(-dt * 3)); if (Math.abs(S.pitchTarget - S.lookPitch) < 0.001) S.pitchTarget = null; }
    camera.quaternion.setFromEuler(euler.set(S.lookPitch, S.lookYaw, 0, 'YXZ'));
  }

  // joystick: left/right turns the sky, up/down zooms
  const ax = input.axis.x, ay = input.axis.y;
  if (S.mode === 'menu') S.yaw += dt * 0.012;
  else if (ax) { S.yaw += ax * dt * 0.9 * (S.fov / baseFov()); S.yawTarget = null; }
  if (ay && S.mode !== 'menu') S.fovTarget = clamp(S.fovTarget * Math.exp(ay * dt * 1.1), 16, baseFov());
  if (S.yawTarget !== null) {
    const d = S.yawTarget - S.yaw;
    S.yaw += d * (1 - Math.exp(-dt * 3));
    if (Math.abs(d) < 0.0005) S.yawTarget = null;
  }
  yawGroup.rotation.y = S.yaw;
  S.fov += (S.fovTarget - S.fov) * (1 - Math.exp(-dt * 3));
  camera.fov = S.fov; camera.aspect = eyeAspect(); camera.updateProjectionMatrix();
  scene.updateMatrixWorld();
  camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  camFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);

  if (sky) {
    if (S.mode !== 'menu') updateHover(dt);
    // constellation highlight targets
    const sel = S.selected?.kind === 'constellation' ? S.selected.obj : null;
    const hov = S.hovered?.kind === 'constellation' ? S.hovered.obj : null;
    for (const c of sky.constellations) {
      let lt = settings.allLines && S.mode !== 'menu' ? 0.14 : 0, gt = 0;
      if (c === sel) { lt = 0.85; gt = 1; c.progress = Math.min(1, c.progress + dt / 1.4); }
      else if (c === hov) { lt = Math.max(lt, 0.3); gt = 0.45; c.progress = 1; }
      else c.progress = 1;
      if (c.glint > 0) {
        c.glint -= dt;
        const k = Math.sin(Math.PI * clamp(1 - c.glint / 2.6, 0, 1));
        lt = Math.max(lt, 0.2 * k); gt = Math.max(gt, 1.1 * k);
      }
      c.lineTarget = lt; c.glowTarget = gt;
    }
    // featured constellations twinkle brighter now and then: "look at me"
    if (S.mode !== 'menu' && (S.nextGlint -= dt) <= 0) {
      S.nextGlint = 3 + Math.random() * 3.5;
      const view = worldToLocalDir(camFwd, v1);
      const near = sky.constellations.filter(c => c.featured && c !== sel && c !== hov && view.angleTo(c.center) < 55 * D2R * (S.fov / 60));
      if (near.length) { near[Math.floor(Math.random() * near.length)].glint = 2.6; audio.twinkle(); }
    }
    S.dim += ((S.selected ? 0.55 : 1) - S.dim) * (1 - Math.exp(-dt * 3));
    const scale = renderer.getPixelRatio() * clamp(innerHeight / 800, 0.9, 1.5);
    sky.update(S.t, dt, { zoom: baseFov() / S.fov, scale, dim: S.dim });

    // shooting stars
    if (S.mode !== 'menu' && (S.nextShoot -= dt) <= 0) { S.nextShoot = 6 + Math.random() * 10; meteors.spawn(); }
    meteors.update(dt);

    // HUD panels follow their target
    const vr = isVR(), narrow = !vr && eyeAspect() < 1;
    if (S.selected) {
      const wd = localToWorldDir(targetLocalDir(S.selected), new THREE.Vector3());
      const halfW = eyeAspect();   // half the eye's width, in units of half its height
      if (vr) place(title.mesh, wd, 6, 0.5, -0.02, Math.min(0.74, 0.72 * halfW));
      else place(title.mesh, wd, 6, narrow ? 0.45 : 0.55, 0, narrow ? 0.48 : 0.62);
      const infoH = vr ? 1.2 : 1.25, wf = infoH * 640 / 860 / 2;
      if (vr) place(info.mesh, wd, 5.5, -0.02, 0.48 * halfW, Math.min(wf, 0.44 * halfW));
      else if (narrow) place(info.mesh, wd, 5.5, -0.1, 0, Math.min(wf, eyeAspect() * 0.92));
      else place(info.mesh, wd, 5.5, 0, 0.5, wf);
      if (S.selected.kind === 'star') {
        ring.visible = true; ring.material.opacity += (0.9 - ring.material.opacity) * 0.1;
        place(ring, wd, 50, 0, 0, 0.05);
        ring.quaternion.copy(camera.quaternion); ring.rotateZ(S.t * 0.3);
      }
    }
    if (!S.selected || S.selected.kind !== 'star') { ring.material.opacity *= 0.85; if (ring.material.opacity < 0.02) ring.visible = false; }
    if (S.hovered && hover.active) {
      const wd = localToWorldDir(targetLocalDir(S.hovered), new THREE.Vector3());
      place(hover.mesh, wd, 7, S.hovered.kind === 'star' ? 0.14 : 0.02, 0, vr ? 0.36 : 0.3);
    }
    if (S.hintLeft > 0) {
      S.hintLeft -= dt;
      if (S.hintLeft <= 0) hint.hide();
      const target = camFwd.clone().multiplyScalar(6).addScaledVector(camUp, -6 * Math.tan(camera.fov * D2R / 2) * 0.32);
      hint.mesh.position.lerp(target, hint.mesh.visible && hint.p > 0 ? 0.06 : 1);
      hint.mesh.quaternion.copy(camera.quaternion);
      hint.mesh.scale.setScalar(6 * Math.tan(camera.fov * D2R / 2) * (vr ? 1.25 : 1.1));
    }
    title.update(dt, S.t, 1.1); info.update(dt, S.t, 0.9); hover.update(dt, S.t, 2); hint.update(dt, S.t, 1.2);

    // reticle
    reticle.visible = usingGaze() && S.mode !== 'menu';
    reticle.scale.setScalar(Math.tan(S.fov * D2R / 2) / Math.tan(42 * D2R));
    const hot = !!S.hovered;
    retRing.scale.setScalar(retRing.scale.x + ((hot ? 1.35 : 1) - retRing.scale.x) * 0.2);
    retRing.material.opacity = hot ? 0.95 : 0.45;
  }

  render();
  updateRemoteUI();
  requestAnimationFrame(frame);
}

function render() {
  const w = innerWidth, h = innerHeight;
  if (!isVR()) {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
    renderer.render(scene, camera);
    return;
  }
  renderer.setScissorTest(true);
  eyes.forEach((eye, i) => {
    eye.fov = camera.fov; eye.aspect = (w / 2) / h; eye.near = camera.near; eye.far = camera.far;
    eye.updateProjectionMatrix();
    // shift each image toward/away from the lens centre (Settings > Lens spacing)
    eye.projectionMatrix.elements[8] = (i === 0 ? -1 : 1) * settings.lens;
    eye.projectionMatrixInverse.copy(eye.projectionMatrix).invert();
    const x = i * w / 2;
    renderer.setViewport(x, 0, w / 2, h); renderer.setScissor(x, 0, w / 2, h);
    renderer.render(scene, eye);
  });
  renderer.setScissorTest(false);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  $('rotate-hint').classList.toggle('show', isVR() && innerHeight > innerWidth);
}
addEventListener('resize', resize);

// ---------------- menu / modes ----------------
let wakeLock = null;
async function enterVR() {
  audio.start();
  // everything below must start inside the button press (browser rules), but nothing may block
  const motion = askMotionPermission();
  const el = document.documentElement;
  try {
    const fs = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.();
    Promise.resolve(fs).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  } catch { /* iOS Safari: no fullscreen API */ }
  navigator.wakeLock?.request('screen').then(l => (wakeLock = l)).catch(() => {});
  S.mode = 'vr'; S.gyro = true; S.fovTarget = baseFov(); S.fov = baseFov();
  document.body.dataset.mode = 'vr';
  resize();
  motion.catch(() => {});   // if motion is blocked, the joystick still turns the sky
  hint.set(['WELCOME TO THE NIGHT SKY', 'Look around  ·  Joystick turns the sky & zooms',
    'Press A to select  ·  press again for info  ·  B to go back', 'Glowing constellations have stories to tell']);
  hint.show(); S.hintLeft = 9;
  // face Orion first, whatever direction you're sitting
  setTimeout(() => aimAt(sky.constellations.find(c => c.id === 'Ori').center), 300);
}
async function enterScreen() {
  audio.start();
  S.mode = 'screen'; S.fovTarget = baseFov();
  document.body.dataset.mode = 'screen';
  // phones/tablets: move the phone to look around (magic window)
  const phone = matchMedia('(pointer: coarse)').matches;
  S.gyro = phone;
  $('ui-motion').classList.toggle('on', phone);
  if (phone) askMotionPermission().catch(() => {});
  resize();
  // once the sensors start, turn the sky so Orion is where the phone points
  setTimeout(() => aimAt(sky.constellations.find(c => c.id === 'Ori').center), devOri ? 300 : 0);
}
function exitToMenu() {
  if (S.selected) deselect();
  S.mode = 'menu'; S.gyro = false; S.fovTarget = 65; S.pitchTarget = 0.35;
  hover.hide(); hint.hide(); S.hintLeft = 0;
  document.body.dataset.mode = 'menu';
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  try { wakeLock?.release(); } catch { /* ignore */ }
  resize();
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && isVR()) exitToMenu(); });

function setMusic(on) {
  settings.music = on; saveSettings(); audio.setMusic(on);
  document.querySelectorAll('[data-music]').forEach(el => (el.textContent = on ? '♪ Music on' : '♪ Music off'));
  $('set-music').checked = on;
}

// menu wiring
$('btn-vr').onclick = enterVR;
$('btn-screen').onclick = enterScreen;
$('ui-menu').onclick = exitToMenu;
$('ui-vr').onclick = enterVR;
$('ui-music').onclick = () => setMusic(!settings.music);
$('ui-lines').onclick = () => { settings.allLines = !settings.allLines; saveSettings(); $('set-lines').checked = settings.allLines; };
$('ui-motion').onclick = async () => {
  if (!S.gyro) askMotionPermission().catch(() => {});
  S.gyro = !S.gyro;
  if (S.gyro) setTimeout(() => aimAt(sky.constellations.find(c => c.id === 'Ori').center), 400); $('ui-motion').classList.toggle('on', S.gyro);
};
$('ui-back').onclick = actBack;
$('ui-next').onclick = () => actTour(1);
$('set-music').checked = settings.music; $('set-music').onchange = e => setMusic(e.target.checked);
$('set-gaze').checked = settings.gaze; $('set-gaze').onchange = e => { settings.gaze = e.target.checked; saveSettings(); };
$('set-lines').checked = settings.allLines; $('set-lines').onchange = e => { settings.allLines = e.target.checked; saveSettings(); };
$('set-lens').value = settings.lens; $('set-lens').oninput = e => { settings.lens = +e.target.value; saveSettings(); };
$('set-fov').value = settings.vrFov; $('set-fov').oninput = e => { settings.vrFov = +e.target.value; saveSettings(); };
$('learn-select').onclick = () => input.learn('select');
$('learn-back').onclick = () => input.learn('back');
$('reset-map').onclick = () => input.resetMap();
document.querySelectorAll('[data-music]').forEach(el => (el.textContent = settings.music ? '♪ Music on' : '♪ Music off'));
// don't leave buttons focused: Enter/Space are remote keys, not button presses
document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.blur()));

let lastRemoteUI = '';
function updateRemoteUI() {
  if (S.mode !== 'menu') return;
  const name = input.remoteName || 'none yet — press a button on the remote';
  const txt = name + '|' + input.lastEvent;
  if (txt !== lastRemoteUI) { lastRemoteUI = txt; $('remote-name').textContent = name; $('last-input').textContent = input.lastEvent; }
  $('stick-dot').style.transform = `translate(${input.axis.x * 22}px, ${input.axis.y * 22}px)`;
}

// ---------------- boot ----------------
async function boot() {
  resize();
  const fontsReady = Promise.all(['700 64px Orbitron', '500 20px Orbitron', '400 24px "Barlow Condensed"', '600 50px "Barlow Condensed"', '300 40px "Barlow Condensed"']
    .map(f => document.fonts?.load(f))).catch(() => {});
  const [data] = await Promise.all([fetch('data/sky.json').then(r => r.json()), Promise.race([fontsReady, new Promise(r => setTimeout(r, 3000))])]);
  sky = new Sky(renderer, data);
  tiltGroup.add(sky.group);
  sky.group.rotation.y = -130 * D2R;    // time of night: winter sky, Orion up
  meteors = new ShootingStars();
  // start looking toward Orion in the menu background
  scene.updateMatrixWorld();
  const d = localToWorldDir(sky.constellations.find(c => c.id === 'Ori').center, v1);
  S.lookYaw = Math.atan2(-d.x, -d.z) + 0.5; S.lookPitch = Math.asin(d.y) * 0.7;
  console.log(`Sky ready: ${sky.catalog.length} stars, ${sky.constellations.length} constellations, featured: ${Object.keys(CONSTELLATION_FACTS).length}`);
  document.body.classList.add('ready');
  window.artemis = { S, sky, camera, settings };   // handy for debugging in the browser console
  requestAnimationFrame(frame);
}
boot().catch(err => {
  console.error(err);
  $('loading').textContent = 'Could not load the stars. Open this through a web server (see README).';
});
