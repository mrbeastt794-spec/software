import { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, SRGBColorSpace, InstancedMesh, SphereGeometry, Object3D, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from 'three';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, cv = document.getElementById('bg');
const r = new WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: 'low-power' });
const sc = new Scene(), cam = new PerspectiveCamera(45, 1, .1, 60), root = new Group(); sc.add(root);
const TEAL = '#6aa6a1', OFF = '#ecebe6', SAND = '#c8a96a', PANEL = '#22272d';
// Software "windows" drawn to a canvas: generic code, terminal and UI shapes only.
function tex(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
  g.fillStyle = PANEL; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#4a525b'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 316);
  g.fillStyle = '#2d343b'; g.fillRect(2, 2, 508, 36); ['#8a8f8c', '#8a8f8c', '#8a8f8c'].forEach((x, i) => { g.fillStyle = x; g.beginPath(); g.arc(24 + i * 22, 20, 6, 0, 7); g.fill(); });
  const bar = (x, y, w, col, a = .85) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(x, y, w, 10); g.globalAlpha = 1; };
  if (kind === 0) for (let i = 0; i < 12; i++) { const ind = [0, 1, 1, 2, 2, 1, 0, 1, 2, 2, 1, 0][i] * 28; g.fillStyle = '#5b636b'; g.font = '14px monospace'; g.fillText(String(i + 1), 18, 72 + i * 20); bar(54 + ind, 62 + i * 20, 60 + ((i * 53) % 150), [TEAL, OFF, SAND, OFF][i % 4], i % 4 === 1 ? .55 : .85); }
  if (kind === 1) { g.font = '20px monospace'; ['$ git status', '$ npm install', '$ npm run build', '✓ build complete', '$ _'].forEach((t, i) => { g.fillStyle = i === 3 ? TEAL : OFF; g.globalAlpha = i === 3 ? 1 : .8; g.fillText(t, 22, 76 + i * 34); }); g.globalAlpha = 1; for (let i = 0; i < 3; i++) bar(22, 260 + i * 16, 120 + i * 90, '#4a525b', 1); }
  if (kind === 2) { g.fillStyle = '#2d343b'; g.fillRect(2, 38, 110, 280); for (let i = 0; i < 5; i++) bar(18, 62 + i * 30, 70, i === 1 ? TEAL : '#5b636b', 1); for (let i = 0; i < 4; i++) { g.strokeStyle = '#4a525b'; g.lineWidth = 2; g.strokeRect(132 + (i % 2) * 190, 60 + Math.floor(i / 2) * 120, 170, 100); bar(146 + (i % 2) * 190, 76 + Math.floor(i / 2) * 120, 90, i === 0 ? SAND : TEAL, .8); bar(146 + (i % 2) * 190, 106 + Math.floor(i / 2) * 120, 130, '#5b636b', 1); } }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
const panels = [0, 1, 2].map(k => { const m = new Mesh(new PlaneGeometry(4, 2.5), new MeshBasicMaterial({ map: tex(k), transparent: true })); root.add(m); return m; });
// Connected nodes: a small tree (components / services) with lines between parent and child.
const pts = [[0, 3]]; const edges = []; for (let d = 1; d < 4; d++) for (let i = 0; i < 2 ** d; i++) { pts.push([(i - (2 ** d - 1) / 2) * 6 / 2 ** d * 1.3, 3 - d * 2.1]); edges.push([(2 ** d - 1 + i - 1 >> 1) , pts.length - 1]); }
const nodes = new Group(); root.add(nodes);
const lg = new BufferGeometry(); lg.setAttribute('position', new Float32BufferAttribute(edges.flatMap(([a, b]) => [...pts[a], 0, ...pts[b], 0]), 3));
const lm = new LineBasicMaterial({ color: TEAL, transparent: true }); nodes.add(new LineSegments(lg, lm));
const im = new InstancedMesh(new SphereGeometry(.11, 10, 6), new MeshBasicMaterial({ color: OFF, transparent: true }), pts.length), o = new Object3D();
pts.forEach((p, i) => { o.position.set(p[0], p[1], 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); nodes.add(im); nodes.position.z = -3; nodes.scale.setScalar(.8);
let portrait = false;
// Per state: 3 panels (x,y,z,rotY,scale,opacity), nodes (opacity, scale), root (x,y)
const K = s => { const P = portrait; return [
  [[-.7, .9, -.4, .35, 1, .6], [.5, -.2, .5, .35, 1, .6], [-.4, -1.3, 1.4, .35, 1, .6], .07, 1, P ? 0 : 4.4, P ? -2.6 : 0],
  [[-3.4, 2.2, -4, .5, .8, .22], [3.4, -2.6, -4, -.5, .8, .22], [-3, -3.5, -5, .4, .7, .22], .7, 1, P ? 0 : 3.8, 0],
  P ? [[0, 3.4, 0, 0, .62, .45], [0, 0, 0, 0, .62, .45], [0, -3.4, 0, 0, .62, .45], .1, 1, 0, 0] : [[-4.3, 0, 0, .15, .85, .3], [0, 0, 0, 0, .85, .3], [4.3, 0, 0, -.15, .85, .3], .1, 1, 0, 2.9],
  [[-3, 2, -6, .3, .8, .12], [3, -1, -6, -.3, .8, .12], [0, -4, -7, 0, .8, .12], .1, 1, 0, 0]][s].flat(); };
let tops = [], vh = 1, cur = 0, tx = 0, ty = 0, dirty = true; const secs = [...document.querySelectorAll('[data-shape]')];
const size = () => { const w = innerWidth; vh = innerHeight; portrait = w / vh < 1.1; r.setPixelRatio(Math.min(devicePixelRatio, w < 700 ? 1.25 : 1.75)); r.setSize(w, vh, false); cam.aspect = w / vh; cam.position.z = portrait ? 15 : 12; cam.updateProjectionMatrix(); root.scale.setScalar(portrait ? Math.min(1, cam.aspect * 2) : 1); tops = secs.map(s => s.offsetTop); dirty = true; };
const target = () => tops.slice(1).reduce((n, t) => n + Math.min(1, Math.max(0, (scrollY + vh * .9 - t) / (vh * .6))), 0);
const ease = t => t * t * (3 - 2 * t); let last = performance.now(), t0 = last;
function frame(now) {
  requestAnimationFrame(frame); if (document.hidden) { last = now; return; }
  const dt = Math.min(.25, (now - last) / 1e3); last = now; const tg = reduce ? Math.round(target()) : target();
  if (reduce) { if (cur !== tg) { cur = tg; dirty = true; } if (!dirty) return; } else cur += (tg - cur) * (1 - Math.exp(-dt * 6));
  dirty = false; if (!(cur >= 0)) cur = 0; const k = Math.min(2, Math.floor(cur)), f = ease(Math.min(1, cur - k)), A = K(k), B = K(Math.min(3, k + 1)), v = A.map((a, i) => a + (B[i] - a) * f);
  panels.forEach((m, i) => { const j = i * 6; m.position.set(v[j], v[j + 1], v[j + 2]); m.rotation.y = v[j + 3]; m.scale.setScalar(v[j + 4]); m.material.opacity = v[j + 5]; });
  lm.opacity = v[18]; im.material.opacity = Math.min(1, v[18] * 1.3); root.position.set(v[20], v[21], 0);
  if (!reduce) { const s = (now - t0) / 1e3; root.rotation.y += ((tx * .25) - root.rotation.y) * .06; root.rotation.x += ((ty * .12) - root.rotation.x) * .06; panels.forEach((m, i) => m.position.y += Math.sin(s * .8 + i * 2) * .08); }
  r.render(sc, cam);
}
if (!reduce) addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
addEventListener('resize', size); addEventListener('scroll', () => dirty = true, { passive: true }); document.fonts?.ready.then(size); size(); requestAnimationFrame(frame);
cv.addEventListener('webglcontextlost', e => { e.preventDefault(); document.body.classList.add('nogl'); });
