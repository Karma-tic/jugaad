import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { setTextureAnisotropy } from './materials.js';

// ---------------------------------------------------------------------------
// Shared "realistic look" pipeline for both chapters:
//   renderer setup -> sunset sky + HDR lighting -> sun shadows that follow the
//   player -> post-processing (ambient occlusion, bloom, SMAA, tone mapping).
// Quality presets keep it smooth on laptops; 'auto' drops a level if FPS is low.
// ---------------------------------------------------------------------------

const QUALITY_KEY = 'jugaad_quality';
export const PRESETS = {
  // Retina screens are capped: 2x pixel density quadruples the work for little visible gain
  low:    { pixelRatio: 1,    shadow: 1024, ao: false, bloom: false, smaa: false, composer: false },
  medium: { pixelRatio: 1.25, shadow: 2048, ao: false, bloom: true,  smaa: true,  composer: true },
  high:   { pixelRatio: 1.5,  shadow: 2048, ao: true,  bloom: true,  smaa: true,  composer: true }
};

export function getQualitySetting() {
  try { return localStorage.getItem(QUALITY_KEY) || 'auto'; } catch (e) { return 'auto'; }
}
export function setQualitySetting(q) {
  try { localStorage.setItem(QUALITY_KEY, q); } catch (e) {}
}

export class Graphics {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.setting = getQualitySetting();            // 'auto' | 'low' | 'medium' | 'high'
    this.level = this.setting === 'auto' ? 'medium' : this.setting;   // Auto starts at Medium
    this.fpsSamples = [];
    this.autoChecked = false;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    setTextureAnisotropy(renderer);

    this.applyLevel();
  }

  // ---------- Sky & environment ----------
  addSunsetSky({ elevation = 9, azimuth = 235, turbidity = 7, rayleigh = 2.4 } = {}) {
    const sky = new Sky();
    sky.scale.setScalar(900);
    const u = sky.material.uniforms;
    u.turbidity.value = turbidity;
    u.rayleigh.value = rayleigh;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.86;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    this.sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(this.sunDir);
    sky.name = 'SunsetSky';
    this.scene.add(sky);
    this.sky = sky;
    return sky;
  }

  loadHDR(url, intensity = 0.6) {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    new RGBELoader().load(url, (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      this.scene.environment = env;
      this.scene.environmentIntensity = intensity;
      hdr.dispose();
      pmrem.dispose();
    });
  }

  useRoomEnvironment(intensity = 0.35) {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = intensity;
    pmrem.dispose();
  }

  // ---------- Sun that keeps crisp shadows around the player ----------
  setupSun(light, { distance = 60, extent = 16 } = {}) {
    this.sun = light;
    this.sunDistance = distance;
    const sc = light.shadow.camera;
    sc.left = -extent; sc.right = extent; sc.top = extent; sc.bottom = -extent;
    sc.near = 1; sc.far = distance * 2.2;
    sc.updateProjectionMatrix();
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.03;
    light.shadow.radius = 3;
    if (!light.target.parent) this.scene.add(light.target);
    const size = PRESETS[this.level].shadow;
    light.shadow.mapSize.set(size, size);
  }

  followSun(focus) {
    if (!this.sun || !this.sunDir) return;
    // snap to texel grid to avoid shimmering shadow edges while moving
    const step = 0.25;
    const fx = Math.round(focus.x / step) * step, fz = Math.round(focus.z / step) * step;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx, 0, fz).addScaledVector(this.sunDir, this.sunDistance);
  }

  // Centre shadows on the point the camera is looking at (cutscenes / free cameras)
  followCamera(camera, ahead = 9) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const focus = camera.position.clone().addScaledVector(dir, ahead);
    this.followSun(focus);
  }

  // ---------- Post-processing ----------
  applyLevel() {
    const p = PRESETS[this.level];
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
    if (this.sun) {
      this.sun.shadow.mapSize.set(p.shadow, p.shadow);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (!p.composer) return;

    const w = window.innerWidth, h = window.innerHeight;
    const composer = new EffectComposer(r);
    composer.setPixelRatio(r.getPixelRatio());
    composer.setSize(w, h);
    composer.addPass(new RenderPass(this.scene, this.camera));

    if (p.ao) {
      const ao = new GTAOPass(this.scene, this.camera, w, h);
      ao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 12 });
      ao.blendIntensity = 0.85;
      composer.addPass(ao);
      this.aoPass = ao;
    }
    if (p.bloom) {
      // high threshold: only lamps, tubelight, screens and brass highlights glow
      const bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.2, 0.35, 0.95);
      composer.addPass(bloom);
      this.bloomPass = bloom;
    }
    composer.addPass(new OutputPass());
    if (p.smaa) composer.addPass(new SMAAPass(w * r.getPixelRatio(), h * r.getPixelRatio()));
    this.composer = composer;
  }

  setLevel(level) {
    if (!PRESETS[level] || level === this.level) return;
    this.level = level;
    this.applyLevel();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  // Auto quality: after ~4 s of play, drop one level if average FPS < 38
  trackFps(delta) {
    if (this.setting !== 'auto' || this.autoChecked) return;
    if (delta <= 0) return;
    this.fpsSamples.push(1 / delta);
    if (this.fpsSamples.length >= 90) {              // ~1.5 s windows
      const sorted = [...this.fpsSamples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      this.fpsSamples = [];
      this.autoWindows = (this.autoWindows || 0) + 1;
      if (median < 42 && this.level !== 'low') {
        this.setLevel(this.level === 'high' ? 'medium' : 'low');
      } else if (median > 57 && this.level === 'medium' && this.autoWindows <= 2 && !this.triedHigh) {
        this.triedHigh = true;                          // plenty of headroom: try High once
        this.setLevel('high');
      } else if (this.autoWindows > 6) {
        this.autoChecked = true;
      }
    }
  }

  render(delta) {
    this.trackFps(delta);
    if (this.composer) this.composer.render(delta);
    else this.renderer.render(this.scene, this.camera);
  }
}

// Settings UI helper: <select id="quality-select"> in the controls/settings modal
export function bindQualitySelect(graphics) {
  const sel = document.getElementById('quality-select');
  if (!sel) return;
  sel.value = graphics.setting;
  sel.addEventListener('change', () => {
    const v = sel.value;
    setQualitySetting(v);
    graphics.setting = v;
    graphics.autoChecked = v !== 'auto';
    graphics.setLevel(v === 'auto' ? 'medium' : v);
  });
}

// ---------------------------------------------------------------------------
// Loading gate: start buttons show progress and unlock once textures + HDR
// have arrived (with a safety timeout so a slow/failed file never blocks play).
// Call this BEFORE the scene starts loading assets.
// ---------------------------------------------------------------------------
export function setupLoadingGate(buttonIds) {
  const buttons = buttonIds.map(id => document.getElementById(id)).filter(Boolean);
  const labels = new Map(buttons.map(b => [b, b.innerHTML]));
  let done = false;
  const lock = (pct) => buttons.forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.65';
    b.style.cursor = 'progress';
    b.innerHTML = `⏳ Loading… ${pct}%`;
  });
  const unlock = () => {
    if (done) return;
    done = true;
    buttons.forEach(b => {
      b.disabled = false;
      b.style.opacity = '';
      b.style.cursor = '';
      b.innerHTML = labels.get(b);
    });
  };
  lock(0);
  const mgr = THREE.DefaultLoadingManager;
  mgr.onProgress = (url, loaded, total) => { if (!done) lock(Math.round((loaded / Math.max(1, total)) * 100)); };
  mgr.onLoad = unlock;
  setTimeout(unlock, 12000);
  return unlock;
}

