// The realistic sky: real stars (Hipparcos, to magnitude 6), a procedural Milky Way,
// thousands of faint background stars, constellation lines and highlight glows.
import * as THREE from 'three';
import { CONSTELLATION_FACTS, STAR_FACTS } from './facts.js';

export const D2R = Math.PI / 180;
const R_STARS = 600, R_LINES = 590, R_MILKY = 900;

// RA/Dec (degrees) -> unit vector. North celestial pole = +Y.
export function radecToVec(ra, dec, v = new THREE.Vector3()) {
  const a = ra * D2R, d = dec * D2R;
  return v.set(Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a));
}

// Equatorial (J2000) -> Galactic rotation matrix (rows)
const EQ2GAL = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.4448296300, 0.7469822445],
  [-0.8676661490, -0.1980763734, 0.4559837762],
];
function galToVec(l, b, v) {
  const g = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
  const e = [0, 1, 2].map(i => EQ2GAL[0][i] * g[0] + EQ2GAL[1][i] * g[1] + EQ2GAL[2][i] * g[2]);
  return v.set(e[0], e[2], -e[1]);
}

// B-V colour index -> star colour (slightly saturated so it reads in VR)
const BV_STOPS = [
  [-0.4, [0.58, 0.70, 1.00]], [0.0, [0.78, 0.85, 1.00]], [0.4, [1.00, 0.98, 0.96]],
  [0.8, [1.00, 0.90, 0.74]], [1.2, [1.00, 0.79, 0.56]], [1.6, [1.00, 0.67, 0.42]], [2.0, [1.00, 0.58, 0.36]],
];
export function bvToColor(bv) {
  bv = Math.max(-0.4, Math.min(2.0, bv));
  for (let i = 1; i < BV_STOPS.length; i++) {
    const [b1, c1] = BV_STOPS[i];
    if (bv <= b1) {
      const [b0, c0] = BV_STOPS[i - 1];
      const t = (bv - b0) / (b1 - b0);
      return c0.map((c, k) => c + (c1[k] - c) * t);
    }
  }
  return BV_STOPS[BV_STOPS.length - 1][1];
}

// ---------- shaders ----------
const STAR_VERT = /* glsl */`
  attribute float aSize; attribute float aBright; attribute vec3 aColor; attribute float aPhase;
  uniform float uTime, uScale, uDim, uZoom, uGain, uTwinkle;
  varying vec3 vColor; varying float vBright;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 1.0 + uTwinkle * sin(uTime * (1.7 + aPhase * 4.0) + aPhase * 60.0) * sin(uTime * (0.6 + aPhase * 1.3) + aPhase * 17.0);
    gl_PointSize = aSize * uScale * pow(uZoom, 0.55) * (0.92 + 0.08 * tw);
    vBright = aBright * tw * uDim * uGain * pow(uZoom, 0.22);
    vColor = aColor;
  }`;
const STAR_FRAG = /* glsl */`
  uniform float uHalo;
  varying vec3 vColor; varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = exp(-d * d * 16.0);
    float glow = exp(-d * 5.0) * uHalo;
    float a = (core + glow) * vBright * (1.0 - smoothstep(0.85, 1.0, d));
    if (a < 0.002) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.6), a);
  }`;

const NOISE = /* glsl */`
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }`;

// Milky Way painted once into an equirectangular texture (RA along u, Dec along v)
const MILKY_BAKE_FRAG = /* glsl */`
  precision highp float;
  uniform mat3 uEq2Gal; varying vec2 vUv;
  ${NOISE}
  void main() {
    float ra = vUv.x * 6.2831853, dec = (vUv.y - 0.5) * 3.14159265;
    vec3 eq = vec3(cos(dec) * cos(ra), cos(dec) * sin(ra), sin(dec));
    vec3 g = uEq2Gal * eq;
    float l = atan(g.y, g.x), b = asin(clamp(g.z, -1.0, 1.0));
    float centerW = exp(-l * l / 1.2);
    float n1 = fbm(g * 4.0 + 3.0), n2 = fbm(g * 11.0), n3 = fbm(g * 30.0);
    float bb = b + (fbm(g * 2.5) - 0.5) * 0.09;
    float width = 0.10 + 0.10 * centerW;
    float band = exp(-bb * bb / (width * width));
    float clouds = band * (0.30 + 1.0 * n1 * n1) * (0.6 + 0.6 * n2) * (0.75 + 0.4 * n3);
    clouds *= 0.40 + 0.80 * centerW;
    float bulge = exp(-(l * l) / 0.16 - (b * b) / 0.025);
    clouds += bulge * (0.5 + 0.7 * n2);
    float dustN = fbm(g * 7.0 + 11.0);
    float lane = exp(-pow((b - 0.01 + 0.05 * (n1 - 0.5)) / (0.022 + 0.03 * centerW), 2.0));
    float rift = smoothstep(-0.6, 0.0, l) * smoothstep(1.6, 0.7, l);
    clouds *= 1.0 - 0.85 * lane * (0.3 + 0.7 * rift) * smoothstep(0.3, 0.65, dustN + 0.15);
    clouds *= 1.0 - 0.5 * smoothstep(0.52, 0.78, dustN) * band;
    clouds = max(clouds, 0.0);
    vec3 cool = vec3(0.48, 0.58, 0.98), warm = vec3(1.0, 0.84, 0.66);
    vec3 col = mix(cool, warm, clamp(centerW * 0.7 + bulge, 0.0, 1.0)) * clouds * 0.55;
    col += vec3(0.25, 0.35, 0.85) * exp(-b * b / 0.3) * 0.022;
    float gr = hash(vec3(floor(vUv * vec2(4096.0, 2048.0)), 3.0));
    col += vec3(0.9, 0.93, 1.0) * pow(gr, 40.0) * (band + 0.15) * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }`;
const MILKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const MILKY_FRAG = /* glsl */`
  uniform sampler2D uTex; uniform float uGain;
  varying vec3 vDir;
  float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float u = fract(atan(-d.z, d.x) / 6.2831853 + 1.0);
    float v = asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5;
    vec3 c = texture2D(uTex, vec2(u, v)).rgb * uGain + vec3(0.006, 0.011, 0.034);
    c += (h(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }`;

const LINE_VERT = /* glsl */`
  attribute float aT; varying float vT;
  void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINE_FRAG = /* glsl */`
  uniform float uProgress, uOpacity; uniform vec3 uColor; varying float vT;
  void main() { if (vT > uProgress) discard; gl_FragColor = vec4(uColor, uOpacity); }`;

function starMaterial(extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 1 }, uDim: { value: 1 }, uZoom: { value: 1 },
      uGain: { value: 1 }, uTwinkle: { value: 0.22 }, uHalo: { value: 0.45 }, ...extra,
    },
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
}

function pointsGeometry(list) {
  // list: [{v, size, bright, color, phase}]
  const n = list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const size = new Float32Array(n), bright = new Float32Array(n), phase = new Float32Array(n);
  list.forEach((s, i) => {
    pos.set([s.v.x, s.v.y, s.v.z], i * 3); col.set(s.color, i * 3);
    size[i] = s.size; bright[i] = s.bright; phase[i] = s.phase ?? Math.random();
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R_MILKY * 2);
  return g;
}
const magSize = m => 3.5 + 15.0 * Math.pow(Math.pow(10, -0.4 * m), 0.32);
const magBright = m => Math.min(3.0, 0.22 + 1.6 * Math.pow(Math.pow(10, -0.4 * m), 0.40));

export class Sky {
  constructor(renderer, data) {
    this.renderer = renderer;
    this.group = new THREE.Group();          // rotates around the celestial pole
    this.materials = [];
    this.buildMilkyWay();
    this.buildCatalog(data);
    this.buildFaintStars();
    this.buildConstellations(data);
    this.buildFeaturedStars();
  }

  buildMilkyWay() {
    const W = Math.min(4096, this.renderer.capabilities.maxTextureSize), H = W / 2;
    const rt = new THREE.WebGLRenderTarget(W, H, { generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const m3 = new THREE.Matrix3().set(...EQ2GAL.flat());
    const bake = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { uEq2Gal: { value: m3 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: MILKY_BAKE_FRAG,
    }));
    const scene = new THREE.Scene(); scene.add(bake);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer.setRenderTarget(rt); this.renderer.render(scene, cam); this.renderer.setRenderTarget(null);
    bake.geometry.dispose(); bake.material.dispose();
    this.milkyMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: rt.texture }, uGain: { value: 1 } },
      vertexShader: MILKY_VERT, fragmentShader: MILKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(R_MILKY, 64, 32), this.milkyMat);
    sphere.renderOrder = -10; sphere.frustumCulled = false;
    this.group.add(sphere);
  }

  buildCatalog(data) {
    const s = data.stars, list = [];
    this.catalog = [];                       // {hip, v(unit), mag, bv}
    for (let i = 0; i < s.length; i += 5) {
      const [hip, ra, dec, mag, bv] = s.slice(i, i + 5);
      const u = radecToVec(ra, dec);
      this.catalog.push({ hip, v: u, mag, bv, ra, dec });
      list.push({ v: u.clone().multiplyScalar(R_STARS), size: magSize(mag), bright: magBright(mag), color: bvToColor(bv) });
    }
    this.names = data.names;
    this.starsMat = starMaterial();
    const pts = new THREE.Points(pointsGeometry(list), this.starsMat);
    pts.renderOrder = 2; pts.frustumCulled = false;
    this.group.add(pts); this.materials.push(this.starsMat);
  }

  // Thousands of faint stars hugging the galactic plane, so the Milky Way sparkles.
  buildFaintStars() {
    const list = [], v = new THREE.Vector3();
    let count = 0;
    while (count < 26000) {
      const l = (Math.random() * 2 - 1) * Math.PI, b = Math.asin(Math.random() * 2 - 1);
      const dens = 0.25 + Math.exp(-(b * b) / 0.03) * (1 + 1.8 * Math.exp(-l * l / 1.2));
      if (Math.random() * 3.05 > dens) continue;
      galToVec(l, b, v);
      const f = Math.random();
      list.push({
        v: v.clone().multiplyScalar(R_STARS + 10), size: 1.6 + f * f * 2.6, bright: 0.05 + Math.pow(f, 3) * 0.28,
        color: bvToColor(-0.2 + Math.random() * 1.6),
      });
      count++;
    }
    this.faintMat = starMaterial({ uTwinkle: { value: 0.35 }, uHalo: { value: 0.15 } });
    const pts = new THREE.Points(pointsGeometry(list), this.faintMat);
    pts.renderOrder = 1; pts.frustumCulled = false;
    this.group.add(pts); this.materials.push(this.faintMat);
  }

  nearestCatalogStar(u) {
    let best = null, bd = -2;
    for (const s of this.catalog) { const d = s.v.dot(u); if (d > bd) { bd = d; best = s; } }
    return best;
  }
  starName(hip) {
    const n = this.names[hip];
    if (!n) return `HIP ${hip}`;
    return n[0] || n[1] || `HIP ${hip}`;
  }

  buildConstellations(data) {
    // merge split constellations (Serpens comes in two parts)
    const byId = new Map();
    for (const c of data.constellations) {
      if (byId.has(c.id)) byId.get(c.id).lines.push(...c.lines);
      else byId.set(c.id, { ...c, lines: [...c.lines] });
    }
    this.constellations = [];
    for (const c of byId.values()) {
      const center = radecToVec(c.center[0], c.center[1]);
      const verts = new Map();             // unique star vertices
      const pos = [], t = [];
      const segs = [];
      for (const line of c.lines) {
        const pts = line.map(([ra, dec]) => {
          const k = `${ra},${dec}`;
          if (!verts.has(k)) verts.set(k, radecToVec(ra, dec));
          return verts.get(k);
        });
        for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
      }
      const gap = 0.5 * D2R;
      segs.forEach(([a, b], i) => {
        const ang = a.angleTo(b);
        const g = ang > gap * 3 ? gap / ang : 0;
        const pa = a.clone().lerp(b, g).normalize().multiplyScalar(R_LINES);
        const pb = a.clone().lerp(b, 1 - g).normalize().multiplyScalar(R_LINES);
        pos.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
        t.push(i / segs.length, (i + 1) / segs.length);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uProgress: { value: 1 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0.75, 0.85, 1.0) } },
        vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      });
      const lines = new THREE.LineSegments(geo, mat);
      lines.visible = false; lines.renderOrder = 3; lines.frustumCulled = false;
      this.group.add(lines);

      // match each vertex to the real catalogue star
      const stars = [...verts.values()].map(u => ({ u, star: this.nearestCatalogStar(u) }));
      const glowList = stars.map(({ u, star }) => ({
        v: u.clone().multiplyScalar(R_STARS - 5), size: magSize(star.mag) * 1.7 + 6, bright: 0.25 + magBright(star.mag) * 0.6,
        color: bvToColor(star.bv),
      }));
      const glowMat = starMaterial({ uGain: { value: 0 }, uHalo: { value: 0.9 }, uTwinkle: { value: 0.12 } });
      const glow = new THREE.Points(pointsGeometry(glowList), glowMat);
      glow.visible = false; glow.renderOrder = 4; glow.frustumCulled = false;
      this.group.add(glow); this.materials.push(glowMat);

      let radius = 0;
      for (const { u } of stars) radius = Math.max(radius, u.angleTo(center));
      const brightest = stars.reduce((a, b) => (b.star.mag < a.star.mag ? b : a), stars[0]);
      const facts = CONSTELLATION_FACTS[c.id];
      this.constellations.push({
        id: c.id, name: c.name, gen: c.gen, hi: c.hi, center, ra: c.center[0], dec: c.center[1],
        radius: Math.max(radius, 3 * D2R), segs, lines, glow, facts, featured: !!facts,
        starCount: stars.length,
        brightest: brightest ? { name: this.starName(brightest.star.hip), mag: brightest.star.mag } : null,
        // animated state
        lineOpacity: 0, lineTarget: 0, glowGain: 0, glowTarget: 0, progress: 1,
      });
    }
  }

  buildFeaturedStars() {
    this.featuredStars = [];
    for (const [hip, f] of Object.entries(STAR_FACTS)) {
      const s = this.catalog.find(c => c.hip === +hip);
      if (!s) continue;
      const con = this.names[hip]?.[2] || '';
      this.featuredStars.push({ hip: +hip, ...f, v: s.v, mag: s.mag, bv: s.bv, ra: s.ra, dec: s.dec, con });
    }
  }

  // angular distance from direction p (unit, sky-local) to great-circle segment a-b
  static segDist(p, a, b) {
    const n = new THREE.Vector3().crossVectors(a, b);
    const len = n.length();
    if (len < 1e-9) return p.angleTo(a);
    n.divideScalar(len);
    const q = p.clone().addScaledVector(n, -p.dot(n));
    const inside = new THREE.Vector3().crossVectors(a, q).dot(n) >= 0 && new THREE.Vector3().crossVectors(q, b).dot(n) >= 0;
    if (inside) return Math.asin(Math.min(1, Math.abs(p.dot(n))));
    return Math.min(p.angleTo(a), p.angleTo(b));
  }

  // Find what the user is pointing at. dir = unit vector in sky-local space.
  pick(dir, fovDeg) {
    const zoom = fovDeg / 80;
    const starThr = Math.max(1.0, 3.2 * zoom) * D2R;
    let star = null, sd = starThr;
    for (const s of this.featuredStars) { const d = dir.angleTo(s.v); if (d < sd) { sd = d; star = s; } }
    if (star) return { kind: 'star', obj: star };
    const lineThr = Math.max(1.2, 4.5 * zoom) * D2R;
    let best = null, bestScore = 1;
    for (const c of this.constellations) {
      const dc = dir.angleTo(c.center);
      if (dc > c.radius + lineThr) continue;
      let dl = Infinity;
      for (const [a, b] of c.segs) dl = Math.min(dl, Sky.segDist(dir, a, b));
      const score = Math.min(dl / lineThr, dc / (c.radius * 0.55));
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best ? { kind: 'constellation', obj: best } : null;
  }

  update(t, dt, { zoom, scale, dim }) {
    for (const m of this.materials) {
      m.uniforms.uTime.value = t; m.uniforms.uZoom.value = zoom; m.uniforms.uScale.value = scale;
    }
    this.starsMat.uniforms.uDim.value = dim;
    this.faintMat.uniforms.uDim.value = dim;
    this.milkyMat.uniforms.uGain.value = 0.55 + 0.45 * dim;
    const k = 1 - Math.exp(-dt * 4);
    for (const c of this.constellations) {
      c.lineOpacity += (c.lineTarget - c.lineOpacity) * k;
      c.glowGain += (c.glowTarget - c.glowGain) * k;
      c.lines.visible = c.lineOpacity > 0.004;
      c.glow.visible = c.glowGain > 0.004;
      c.lines.material.uniforms.uOpacity.value = c.lineOpacity;
      c.lines.material.uniforms.uProgress.value = c.progress;
      c.glow.material.uniforms.uGain.value = c.glowGain;
    }
  }
}
