import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Player guidance shared by both chapters
//  • Proximity hint: floating "[E] <action>" label + pulsing ground ring under
//    whatever the player can use right now.
//  • Objective beacon: bobbing golden arrow over the next thing to go to,
//    shown while the player is still far from it.
// ---------------------------------------------------------------------------

const KIND_COLORS = { pick: 0xfbbf24, use: 0x4ade80, locked: 0x94a3b8, go: 0xfbbf24 };

export class InteractGuide {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.t = 0;

    // DOM label
    this.el = document.createElement('div');
    this.el.className = 'guide-bubble';
    this.el.innerHTML = '<span class="guide-key">E</span><span class="guide-text"></span>';
    this.textEl = this.el.querySelector('.guide-text');
    this.keyEl = this.el.querySelector('.guide-key');
    document.body.appendChild(this.el);

    // Ground ring
    this.ringMat = new THREE.MeshBasicMaterial({ color: KIND_COLORS.pick, transparent: true, opacity: 0.7, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.ring.renderOrder = 2;
    this.ring.userData.noShadow = true;
    scene.add(this.ring);

    // Objective beacon (arrow pointing down)
    this.beacon = new THREE.Group();
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.6, roughness: 0.4 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 16), arrowMat);
    cone.rotation.x = Math.PI;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12), arrowMat);
    stem.position.y = 0.36;
    this.beacon.add(cone, stem);
    this.beacon.traverse(o => { if (o.isMesh) { o.castShadow = false; o.userData.noShadow = true; } });
    this.beacon.visible = false;
    scene.add(this.beacon);

    this.current = null;
    this.lastText = '';
  }

  // target: { pos: Vector3 (ground point), height: label height above ground, text, kind }
  set(target) { this.current = target; }
  clear() { this.current = null; }

  setObjective(pos, height = 2.2) {
    this.objective = pos ? { pos, height } : null;
  }

  update(delta, playerPos) {
    this.t += delta;
    const c = this.current;
    if (c) {
      const col = KIND_COLORS[c.kind] || KIND_COLORS.pick;
      this.ringMat.color.setHex(col);
      this.ring.visible = true;
      this.ring.position.set(c.pos.x, (c.groundY || 0) + 0.03, c.pos.z);
      const pulse = 1 + Math.sin(this.t * 5) * 0.08;
      const r = c.ringScale || 1;
      this.ring.scale.set(r * pulse, r * pulse, 1);
      this.ringMat.opacity = 0.45 + Math.sin(this.t * 5) * 0.2;

      const v = new THREE.Vector3(c.pos.x, (c.groundY || 0) + (c.height || 1.6), c.pos.z).project(this.camera);
      if (v.z < 1) {
        this.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * window.innerWidth}px, ${(-v.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -100%)`;
        this.el.classList.add('show');
      } else this.el.classList.remove('show');
      if (c.text !== this.lastText) { this.textEl.textContent = c.text; this.lastText = c.text; }
      this.el.dataset.kind = c.kind || 'pick';
      this.keyEl.textContent = c.kind === 'locked' ? '🔒' : 'E';
    } else {
      this.ring.visible = false;
      this.el.classList.remove('show');
    }

    const o = this.objective;
    const far = o && playerPos && Math.hypot(playerPos.x - o.pos.x, playerPos.z - o.pos.z) > 3.2;
    if (o && far) {
      this.beacon.visible = true;
      this.beacon.position.set(o.pos.x, o.pos.y + o.height + Math.sin(this.t * 3) * 0.15, o.pos.z);
      this.beacon.rotation.y += delta * 2;
    } else {
      this.beacon.visible = false;
    }
  }
}

// Only touch the DOM when the text really changes (writing innerHTML every frame forces a layout)
export function cachedTextSetter(el) {
  let html = null;
  return {
    get innerHTML() { return el.innerHTML; },
    set innerHTML(v) { if (v !== html) { html = v; el.innerHTML = v; } },
    get textContent() { return el.textContent; },
    set textContent(v) { if (v !== html) { html = v; el.textContent = v; } },
    get style() { return el.style; },
    get classList() { return el.classList; },
    el
  };
}

export const GUIDE_CSS = `
.guide-bubble { position: fixed; left: 0; top: 0; z-index: 40; pointer-events: none; opacity: 0; transition: opacity 0.18s;
  display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px;
  background: rgba(20, 16, 34, 0.86); border: 1.5px solid rgba(251, 191, 36, 0.8); color: #fff7e6;
  font: 700 15px 'Baloo 2', 'Inter', system-ui, sans-serif; white-space: nowrap; box-shadow: 0 6px 18px rgba(0,0,0,0.4); text-shadow: none; }
.guide-bubble.show { opacity: 1; }
.guide-bubble::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); border: 7px solid transparent; border-top-color: rgba(251, 191, 36, 0.8); border-bottom: 0; }
.guide-key { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, #fde68a, #f59e0b); color: #431407; font-weight: 900; font-size: 14px; }
.guide-bubble[data-kind="use"] { border-color: rgba(74, 222, 128, 0.9); }
.guide-bubble[data-kind="use"] .guide-key { background: linear-gradient(180deg, #bbf7d0, #22c55e); color: #052e16; }
.guide-bubble[data-kind="use"]::after { border-top-color: rgba(74, 222, 128, 0.9); }
.guide-bubble[data-kind="locked"] { border-color: rgba(148, 163, 184, 0.9); color: #e2e8f0; }
.guide-bubble[data-kind="locked"] .guide-key { background: #475569; color: #fff; }
.guide-bubble[data-kind="locked"]::after { border-top-color: rgba(148, 163, 184, 0.9); }
`;

export function injectGuideCSS() {
  if (document.getElementById('guide-css')) return;
  const st = document.createElement('style');
  st.id = 'guide-css';
  st.textContent = GUIDE_CSS;
  document.head.appendChild(st);
}
