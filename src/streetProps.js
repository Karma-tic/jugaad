import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pbrMat } from './materials.js';

// ---------------------------------------------------------------------------
// Street dressing for Chapter 2 (old-Bhopal mohalla). Pure decoration – no
// colliders or gameplay objects are touched. Small repeated parts are merged
// per material so hundreds of pieces cost only a handful of draw calls.
// ---------------------------------------------------------------------------

// Mirrors the building loop in chapter2/models.js createStreetEnvironment()
// Street now runs ~110 m: houses at x = -10 + i*6.8 for i = 0..14 (i = 1 is Chacha's house)
const BUILDINGS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => ({
  i, x: -10 + i * 6.8, h: 7.0 + (i % 3) * 2, front: -5.2
}));

class Batch {
  constructor() { this.groups = new Map(); }
  add(material, geometry, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geometry.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz)
    );
    g.applyMatrix4(m);
    // merged geometries must share the same attribute set
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (g.index) { const ng = g.toNonIndexed(); g.dispose(); this._push(material, ng); }
    else this._push(material, g);
  }
  _push(material, g) {
    if (!this.groups.has(material)) this.groups.set(material, []);
    this.groups.get(material).push(g);
  }
  build(parent, { cast = true, receive = true } = {}) {
    this.groups.forEach((list, material) => {
      const merged = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      list.forEach(g => g.dispose());
    });
  }
}

function signTexture(text, sub, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  const blotches = Array.from({ length: 40 }, () => [Math.random() * 512, Math.random() * 128, 6 + Math.random() * 24, Math.random() * 0.06]);
  const draw = () => {
    const grd = x.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, bg[0]); grd.addColorStop(1, bg[1]);
    x.fillStyle = grd; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 6; x.strokeRect(3, 3, 506, 122);
    x.fillStyle = fg;
    x.textAlign = 'center';
    x.font = '800 56px "Baloo 2", "Kohinoor Devanagari", "Noto Sans Devanagari", "Mangal", sans-serif';
    x.fillText(text, 256, 70);
    x.font = '700 22px "Inter", Arial, sans-serif';
    x.fillText(sub, 256, 110);
    blotches.forEach(([bx, by, br, ba]) => { // weathered paint
      x.fillStyle = `rgba(255,255,255,${ba})`;
      x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.fill();
    });
  };
  draw();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // Baloo 2 (loaded in the page) has Devanagari glyphs – redraw once it arrives
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 56px "Baloo 2"', text).then(() => { draw(); t.needsUpdate = true; }).catch(() => {});
  }
  return t;
}

function shutterTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  for (let y = 0; y < 256; y += 8) {
    const g = x.createLinearGradient(0, y, 0, y + 8);
    g.addColorStop(0, '#8e97a1'); g.addColorStop(0.5, '#b9c1c8'); g.addColorStop(1, '#5f6770');
    x.fillStyle = g; x.fillRect(0, y, 256, 8);
  }
  for (let i = 0; i < 120; i++) { // rust & dirt
    x.fillStyle = `rgba(${120 + Math.random() * 40},${60 + Math.random() * 20},30,${Math.random() * 0.18})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 14, 2 + Math.random() * 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function addStreetDressing(scene) {
  const root = new THREE.Group();
  root.name = 'StreetDressing';
  const batch = new Batch();

  const frameMat = pbrMat('hardwood', { color: 0x6b4a32, tile: 1.0, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.08, metalness: 0.6 });
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.7, roughness: 0.45 });
  const concreteMat = pbrMat('plaster', { color: 0xbdb6aa, tile: 1.5 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.55 });
  const acMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.45, metalness: 0.2 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTexture(), roughness: 0.55, metalness: 0.55 });

  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);

  // ---------- Windows, sunshades (chajja), parapets, tanks, AC units ----------
  BUILDINGS.forEach(b => {
    const floors = [5.2];
    if (b.h >= 9) floors.push(7.3);
    if (b.h >= 11) floors.push(9.4);
    floors.forEach((fy, fi) => {
      [-1.5, 1.5].forEach((dx, wi) => {
        const wx = b.x + dx, wz = b.front + 0.02;
        batch.add(glassMat, box, wx, fy, wz, 0, 0, 0, 1.1, 1.3, 0.04);
        batch.add(frameMat, box, wx, fy + 0.69, wz + 0.04, 0, 0, 0, 1.28, 0.1, 0.1);
        batch.add(frameMat, box, wx, fy - 0.69, wz + 0.04, 0, 0, 0, 1.28, 0.1, 0.1);
        batch.add(frameMat, box, wx - 0.6, fy, wz + 0.04, 0, 0, 0, 0.1, 1.4, 0.1);
        batch.add(frameMat, box, wx + 0.6, fy, wz + 0.04, 0, 0, 0, 0.1, 1.4, 0.1);
        for (let r = -2; r <= 2; r++) batch.add(grillMat, cyl, wx + r * 0.2, fy, wz + 0.1, 0, 0, 0, 0.015, 1.3, 0.015);
        // chajja sunshade slab
        batch.add(concreteMat, box, wx, fy + 0.85, wz + 0.3, 0.12, 0, 0, 1.6, 0.08, 0.6);
        // AC unit on some windows (very Bhopal)
        if ((b.i + fi + wi) % 4 === 1) {
          batch.add(acMat, box, wx + 0.95, fy - 0.45, wz + 0.3, 0, 0, 0, 0.7, 0.45, 0.45);
          batch.add(grillMat, cyl, wx + 0.95, fy - 0.45, wz + 0.53, Math.PI / 2, 0, 0, 0.16, 0.02, 0.16);
        }
      });
    });
    // roof parapet
    batch.add(concreteMat, box, b.x, b.h + 0.2, b.front + 0.1, 0, 0, 0, 6.05, 0.4, 0.2);
    batch.add(concreteMat, box, b.x, b.h + 0.2, b.front - 3.9, 0, 0, 0, 6.05, 0.4, 0.2);
    // black Sintex water tank on alternate roofs
    if (b.i % 2 === 0) {
      batch.add(tankMat, cyl, b.x + 1.6, b.h + 0.7, b.front - 2.2, 0, 0, 0, 0.55, 1.4, 0.55);
      batch.add(tankMat, cyl, b.x + 1.6, b.h + 1.45, b.front - 2.2, 0, 0, 0, 0.2, 0.12, 0.2);
    }
  });

  // ---------- Shop shutters + Hindi signboards (only where nothing leans on the wall) ----------
  const shops = [
    { x: -10.0, t: 'शर्मा किराना स्टोर', s: 'SHARMA KIRANA', bg: ['#b91c1c', '#7f1d1d'], fg: '#fde68a' },
    { x: 10.4, t: 'गुप्ता मेडिकल', s: 'GUPTA MEDICAL · 24 HRS', bg: ['#15803d', '#14532d'], fg: '#ffffff' },
    { x: 24.0, t: 'भोपाल टेलर्स', s: 'BHOPAL TAILORS', bg: ['#1d4ed8', '#1e3a8a'], fg: '#fef9c3' },
    { x: 30.8, t: 'मोबाइल रिपेयरिंग', s: 'MOBILE REPAIRING', bg: ['#f59e0b', '#b45309'], fg: '#1c1917' },
    { x: 51.2, t: 'चाय नाश्ता भंडार', s: 'CHAI · POHA · JALEBI', bg: ['#7c3aed', '#4c1d95'], fg: '#fef3c7' },
    { x: 64.8, t: 'शुभ विवाह टेंट हाउस', s: 'SHUBH VIVAH TENT HOUSE', bg: ['#be123c', '#881337'], fg: '#fde68a' }
  ];
  shops.forEach(sh => {
    const shutter = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.3), shutterMat.clone());
    shutter.material.map = shutterMat.map.clone();
    shutter.material.map.needsUpdate = true;
    shutter.material.map.repeat.set(1, 3);
    shutter.position.set(sh.x - 0.8, 1.4, -5.17);
    shutter.receiveShadow = true;
    root.add(shutter);
    batch.add(grillMat, box, sh.x - 0.8, 2.6, -5.12, 0, 0, 0, 3.5, 0.18, 0.12); // shutter box
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 0.08), [
      grillMat, grillMat, grillMat, grillMat,
      new THREE.MeshStandardMaterial({ map: signTexture(sh.t, sh.s, sh.bg, sh.fg), roughness: 0.6 }),
      grillMat
    ]);
    sign.position.set(sh.x - 0.8, 3.05, -5.1);
    sign.castShadow = true;
    root.add(sign);
  });

  // ---------- Overhead electric wires between lamp posts + drops to houses ----------
  const wireGeos = [];
  const addWire = (a, b, sag) => {
    const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    wireGeos.push(new THREE.TubeGeometry(curve, 24, 0.012, 4, false));
  };
  for (let x = -8; x < 86; x += 12) {
    for (let k = 0; k < 3; k++) {
      addWire(new THREE.Vector3(x, 4.35 - k * 0.12, -3.8 + k * 0.05), new THREE.Vector3(x + 12, 4.35 - k * 0.12, -3.8 + k * 0.05), 0.45 + k * 0.1);
    }
    addWire(new THREE.Vector3(x, 4.3, -3.8), new THREE.Vector3(x + 3.5, 5.9, -5.2), 0.25);
  }
  if (wireGeos.length) {
    const wires = new THREE.Mesh(mergeGeometries(wireGeos, false), wireMat);
    wires.castShadow = true;
    root.add(wires);
  }

  // ---------- Neem trees ----------
  const trunkMat = pbrMat('hardwood', { color: 0x5b4636, tile: 0.8, roughness: 0.95 });
  const leafMats = [0x4d6b2e, 0x5b7a34, 0x3f5d27].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }));
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const addTree = (tx, tz, s = 1) => {
    batch.add(trunkMat, cyl, tx, 1.6 * s, tz, 0, 0, 0.05, 0.16 * s, 3.2 * s, 0.16 * s);
    batch.add(trunkMat, cyl, tx + 0.4 * s, 3.0 * s, tz, 0, 0, -0.6, 0.08 * s, 1.4 * s, 0.08 * s);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = 0.9 + (i % 3) * 0.35;
      batch.add(leafMats[i % 3], leafGeo, tx + Math.cos(a) * r * s, (3.6 + (i % 4) * 0.35) * s, tz + Math.sin(a) * r * 0.7 * s, i, i * 0.7, 0, 1.0 * s, 0.75 * s, 1.0 * s);
    }
    batch.add(leafMats[1], leafGeo, tx, 4.6 * s, tz, 0, 0, 0, 1.3 * s, 0.9 * s, 1.2 * s);
  };
  addTree(-13.2, -4.6, 1.1);
  addTree(13.9, -4.5, 1.0);
  addTree(20.6, -4.4, 0.95);
  addTree(54.6, -4.5, 1.05);
  addTree(68.2, -4.4, 0.95);

  // ---------- Low boundary wall across the road + a few shrubs ----------
  const wallMat = pbrMat('plaster', { color: 0xd9c9a8, tile: 2.5 });
  batch.add(wallMat, box, 38, 0.35, 7.2, 0, 0, 0, 120, 0.7, 0.3);
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x55702f, roughness: 0.9, flatShading: true });
  for (let sx = -14; sx < 92; sx += 4.3) {
    batch.add(shrubMat, leafGeo, sx + (sx % 3), 0.45, 6.5, sx, sx, 0, 0.5, 0.4, 0.45);
  }

  // ---------- Chai tapri seating: plastic chairs + a parked cycle ----------
  const chairMat = new THREE.MeshStandardMaterial({ color: 0xe03a2f, roughness: 0.45 });
  [[15.4, -3.95, 0.3], [14.6, -4.05, -0.4]].forEach(([cx, cz, ry]) => {
    batch.add(chairMat, box, cx, 0.45, cz, 0, ry, 0, 0.45, 0.05, 0.45);
    batch.add(chairMat, box, cx - Math.sin(ry) * 0.2, 0.72, cz - Math.cos(ry) * 0.2, -0.15, ry, 0, 0.45, 0.5, 0.05);
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([lx, lz]) =>
      batch.add(chairMat, cyl, cx + lx, 0.22, cz + lz, 0, 0, 0, 0.02, 0.45, 0.02));
  });
  // bicycle leaning near the medical shop
  const bikeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.4 });
  const tyre = new THREE.TorusGeometry(0.33, 0.025, 8, 24);
  const bx = 26.2, bz = -4.55;
  batch.add(bikeMat, tyre, bx - 0.52, 0.36, bz, 0, 0, 0);
  batch.add(bikeMat, tyre, bx + 0.52, 0.36, bz, 0, 0, 0);
  batch.add(bikeMat, cyl, bx, 0.62, bz, 0, 0, Math.PI / 2, 0.02, 0.95, 0.02);
  batch.add(bikeMat, cyl, bx - 0.25, 0.5, bz, 0, 0, 0.75, 0.02, 0.6, 0.02);
  batch.add(bikeMat, cyl, bx + 0.4, 0.62, bz, 0, 0, -0.35, 0.02, 0.6, 0.02);
  batch.add(bikeMat, cyl, bx + 0.52, 0.95, bz, Math.PI / 2, 0, 0, 0.02, 0.5, 0.02);
  batch.add(new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.6 }), box, bx - 0.28, 0.86, bz, 0, 0, 0, 0.25, 0.06, 0.12);

  batch.build(root);

  // ---------- Distant Bhopal skyline (fades into the haze) ----------
  const far = new Batch();
  const farCols = [0xc8a98a, 0xb8a090, 0xd0b89a, 0xa89888, 0xc0a8a0].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  for (let i = 0; i < 36; i++) {
    const fx = -40 + i * 5.5 + ((i * 37) % 7) - 3;
    const fh = 6 + ((i * 53) % 11);
    far.add(farCols[i % farCols.length], box, fx, fh / 2, -22 - ((i * 29) % 14), 0, 0, 0, 4.5 + (i % 3), fh, 4 + (i % 2) * 2);
  }
  // Taj-ul-Masajid silhouette: three domes + two tall minarets in pink stone
  const mosque = new THREE.MeshStandardMaterial({ color: 0xc98f86, roughness: 0.9 });
  const domeGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const mx = 96, mz = -72;
  far.add(mosque, box, mx, 5, mz, 0, 0, 0, 30, 10, 10);
  [-8, 0, 8].forEach((dx, k) => far.add(mosque, domeGeo, mx + dx, 10, mz, 0, 0, 0, k === 1 ? 5 : 4, k === 1 ? 6 : 5, k === 1 ? 5 : 4));
  [-17, 17].forEach(dx => {
    far.add(mosque, cyl, mx + dx, 16, mz, 0, 0, 0, 1.3, 32, 1.3);
    far.add(mosque, domeGeo, mx + dx, 32, mz, 0, 0, 0, 1.5, 2.2, 1.5);
  });
  far.build(root, { cast: false, receive: false });
  root.children.slice(-farCols.length - 1).forEach(m => { m.userData.noShadow = true; });

  scene.add(root);
  return root;
}

// ---------- Ambient life: birds circling + dust motes in the evening light ----------
export class AmbientLife {
  constructor(scene) {
    this.birds = [];
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x2b2522, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const wingGeo = new THREE.PlaneGeometry(0.45, 0.12);
      const l = new THREE.Mesh(wingGeo, birdMat); l.position.x = -0.22;
      const r = new THREE.Mesh(wingGeo, birdMat); r.position.x = 0.22;
      const pl = new THREE.Group(); pl.add(l);
      const pr = new THREE.Group(); pr.add(r);
      g.add(pl, pr);
      g.userData = { pl, pr, phase: Math.random() * 6, radius: 7 + Math.random() * 5, speed: 0.25 + Math.random() * 0.15, h: 13 + Math.random() * 4, cx: 20 + Math.random() * 40, cz: -9 };
      scene.add(g);
      this.birds.push(g);
    }
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -12 + Math.random() * 100;
      pos[i * 3 + 1] = 0.3 + Math.random() * 4;
      pos[i * 3 + 2] = -4.5 + Math.random() * 9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffe2b0, size: 0.03, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.dust.userData.noShadow = true;
    scene.add(this.dust);
  }

  update(delta, time) {
    this.birds.forEach(b => {
      const u = b.userData;
      u.phase += delta * u.speed;
      b.position.set(u.cx + Math.cos(u.phase) * u.radius, u.h + Math.sin(u.phase * 2) * 0.6, u.cz + Math.sin(u.phase) * u.radius * 0.5);
      b.rotation.y = -u.phase + Math.PI / 2;
      const flap = Math.sin(time * 9 + u.radius) * 0.6;
      u.pl.rotation.z = flap; u.pr.rotation.z = -flap;
    });
    const p = this.dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + delta * 0.08;
      if (y > 4.5) y = 0.3;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(time * 0.5 + i) * delta * 0.05);
    }
    p.needsUpdate = true;
  }
}
