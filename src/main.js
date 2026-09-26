import * as THREE from 'three';
import { audio } from './audio.js';
import { AssetFactory } from './models.js';
import { Graphics, bindQualitySelect, setupLoadingGate } from './graphics.js';
import { applyWorldUVs } from './materials.js';
import { InteractGuide, cachedTextSetter, injectGuideCSS } from './guide.js';

class Game {
  constructor() {
    this.stage = 0; // 0: Stand, 1: Trench Bridge, 2: Tempt Cow, 3: Ride Scooter, 4: Won
    this.meter = 0;
    this.inventory = null;
    this.isRiding = false;
    this.scooterSpeed = 0;
    this.maxSpeed = 13;
    this.isFalling = false;
    this.plankPlaced = false;
    this.plankZ = 0;
    this.plankHalfWidth = 0.95; // Sturdy bridge width

    this.keys = { left: false, right: false, up: false, down: false };
    this.walkSpeed = 3.8; // natural brisk walking pace

    // Room (Level 0) jugaad state
    this.roomDone = new Set();
    this.requiredRoom = ['chappal', 'kurta', 'phone'];
    this.miniGame = null;
    this.clock = new THREE.Clock();

    // "10 baje tak pahunchna hai" – game clock starts at 9:30
    this.gameMinutes = 9 * 60 + 30;
    this.deadline = 10 * 60;
    this.timerRunning = false;
    this.secondsPerGameMinute = 10;
    this.levelScore = 0;

    this.initScene();
    this.initUI();
    this.setupEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.container = document.getElementById('game-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfbbf24);
    this.scene.fog = new THREE.FogExp2(0xfde047, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-99.2 + 3.2, 4.8, 1.0 + 8.8);
    this.camera.lookAt(-2, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Realistic pipeline: HDR-ish interior reflections, soft shadows, AO, glow, SMAA
    this.gfx = new Graphics(this.renderer, this.scene, this.camera);
    this.gfx.useRoomEnvironment(0.45);
    this.renderer.toneMappingExposure = 0.95;
    this.container.appendChild(this.renderer.domElement);

    // Sunset Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x78350f, 0.75);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 2.2);
    sunLight.position.set(27, 24, 18);
    sunLight.target.position.set(15, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    // Cover the whole street (x = -8 .. 38), not just the default ±5 box
    const sc = sunLight.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 90;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);
    this.sunLight = sunLight;

    // Indoor "sitcom set" backdrop while in the room
    this.streetBg = new THREE.Color(0xfbbf24);
    this.roomBg = new THREE.Color(0x1e1631);
    this.scene.background = this.roomBg;

    // Street Environment
    this.env = AssetFactory.createStreetEnvironment();
    this.scene.add(this.env);
    this.house = AssetFactory.createHouseInterior();
    this.house.position.set(-95, 0, 0);
    this.scene.add(this.house);

    // Vintage Scooter (with Seated Rider hidden initially)
    this.scooter = AssetFactory.createVintageScooter();
    this.scooter.position.set(-6, 0, -0.5);
    this.scooter.rotation.x = -0.32;
    this.scooter.userData.riderMesh.visible = false;
    this.scene.add(this.scooter);

    // Standing Pixar Boy Character
    this.player = AssetFactory.createCartoonBoy();
    this.player.position.set(-99.2, 0, 1.0);
    this.scene.add(this.player);

    // Road Excavation Trench at x = 11
    this.trench = AssetFactory.createRoadTrench();
    this.trench.position.set(11, 0, 0);
    this.scene.add(this.trench);

    // Cartoon Cow at x = 21.5, z = -0.2
    this.cow = AssetFactory.createCartoonCow();
    this.cow.position.set(21.5, 0, -0.2);
    this.cow.rotation.y = -Math.PI / 2;
    this.scene.add(this.cow);

    // Scattered Puzzle Items
    this.items = [];

    const broom = AssetFactory.createBroom();
    broom.position.set(-2.5, 0, 1.8);
    this.scene.add(broom);
    broom.visible = false;
    this.items.push(broom);

    const bottle = AssetFactory.createPlasticBottle();
    bottle.position.set(0.5, 0, -2.6);
    this.scene.add(bottle);
    bottle.visible = false;
    this.items.push(bottle);

    const brick = AssetFactory.createBrick();
    brick.position.set(-100.3, 0, -0.3);
    brick.userData.icon = '🧱';
    brick.userData.room = true;
    this.scene.add(brick);
    this.items.push(brick);

    this.initRoomJugaads();

    const cardboard = AssetFactory.createCardboard();
    cardboard.position.set(4.8, 0, 2.0);
    this.scene.add(cardboard);
    cardboard.visible = false;
    this.items.push(cardboard);

    const plank = AssetFactory.createTimberPlank();
    plank.position.set(6.8, 0, -2.8);
    this.scene.add(plank);
    plank.visible = false;
    this.items.push(plank);

    const tyre = AssetFactory.createOldTyre();
    tyre.position.set(15.5, 0, 1.8);
    this.scene.add(tyre);
    tyre.visible = false;
    this.items.push(tyre);

    const grass = AssetFactory.createGrassRotiBasket();
    grass.position.set(18.0, 0, -3.2);
    this.scene.add(grass);
    grass.visible = false;
    this.items.push(grass);

    // Solid Colliders
    this.colliders = [
      { type: 'circle', x: -6.0, z: -0.5, radius: 1.2, name: 'Scooter' },
      { type: 'box', minX: 0.6, maxX: 3.4, minZ: -4.8, maxZ: -3.2, name: 'ChaiStall' },
      { type: 'circle', x: 21.5, z: -0.2, radius: 1.5, name: 'Cow' },
      // House Room boundaries (invisible walls to prevent falling out during trailer)
      { type: 'box', minX: -102, maxX: -94, minZ: 3.5, maxZ: 4.5, name: 'WallFront' },   // Front Invisible Wall
      { type: 'box', minX: -102, maxX: -94, minZ: -3.5, maxZ: -2.0, name: 'WallBack' }, // Back Wall
      { type: 'box', minX: -95, maxX: -94, minZ: -3.5, maxZ: 4.5, name: 'WallRight' },   // Right Wall
      { type: 'box', minX: -102, maxX: -100.5, minZ: -3.5, maxZ: 4.5, name: 'WallLeft' },// Left Wall
      // Room furniture (padded by ~player radius)
      { type: 'box', minX: -98.05, maxX: -95.0, minZ: -2.8, maxZ: 1.8, name: 'Bed' },
      { type: 'box', minX: -100.55, maxX: -98.45, minZ: -2.55, maxZ: -0.45, name: 'Table' },
      { type: 'circle', x: -95.55, z: 2.3, radius: 0.3, name: 'PhoneStool' }
    ];

    // Dazed Character (Spawned after accident)
    this.dazedGuy = AssetFactory.createDazedCharacter();
    this.dazedGuy.visible = false;
    this.scene.add(this.dazedGuy);

    this.isAccident = false;
    this.shakeDuration = 0;
    
    // Hide street initially
    this.env.visible = false;
    this.scooter.visible = false;
    this.cow.visible = false;
    this.trench.visible = false;

    this.initExhaustParticles();
    this.initConfetti();
    
    // Apply shadows to all meshes
    applyWorldUVs(this.scene);
    this.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  // =====================================================================
  // ROOM JUGAADS – "Taiyaari" before stepping out
  // =====================================================================
  initRoomJugaads() {
    const addItem = (mesh, x, y, z, rotY = 0) => {
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      mesh.userData.room = true;
      this.scene.add(mesh);
      this.items.push(mesh);
      return mesh;
    };
    addItem(AssetFactory.createSafetyPin(), -98.95, 1.05, -0.95);
    addItem(AssetFactory.createSteelLota(), -98.25, 0, -1.9);
    addItem(AssetFactory.createPhoneCharger(), -100.2, 0, 2.95, 0.6);
    addItem(AssetFactory.createRubberBand(), -98.4, 0, 2.3);
    addItem(AssetFactory.createBelan(), -96.9, 0, 2.95, 0.3);

    this.roomProps = new THREE.Group();
    this.roomProps.name = 'RoomProps';
    this.scene.add(this.roomProps);

    const chappal = AssetFactory.createBrokenChappal();
    chappal.position.set(-100.1, 0, 1.7);
    chappal.rotation.y = 0.4;
    const kettle = AssetFactory.createKettleStove();
    kettle.position.set(-99.45, 1.05, -1.8);
    const paste = AssetFactory.createToothpaste();
    paste.position.set(-100.0, 1.05, -1.1);
    paste.rotation.y = 0.3;
    const kurta = AssetFactory.createCrumpledKurta();
    kurta.position.set(-96.5, 0.61, 0.5);
    const phone = AssetFactory.createPhoneAndSocket();
    phone.position.set(-95.45, 0, 2.3);
    [chappal, kettle, paste, kurta, phone].forEach(m => this.roomProps.add(m));

    const v = (x, z) => new THREE.Vector3(x, 0, z);
    this.roomStations = [
      {
        id: 'chappal', label: 'Tooti Chappal', pos: v(-100.1, 1.7), radius: 1.6, accepts: 'safetypin',
        markerY: 0.6, mesh: chappal,
        toast: '📌 JUGAAD: SAFETY PIN SE CHAPPAL JUDI!',
        line: 'Wah beta! Mummy ki safety pin ne chappal bacha li. Ab us silvat wale kurte ka kuch karo!',
        wrongLine: 'Chappal ka strap toota hai. Kuch aisa lao jo usko jod de... Mummy ki pin dibbi table pe hai!',
        onSolve: () => AssetFactory.fixChappal(chappal)
      },
      {
        id: 'kettle', label: 'Garam Kettle', pos: v(-99.45, -1.5), radius: 1.9, accepts: 'lota', required: false,
        markerY: 1.7, mesh: kettle, transformTo: { type: 'hotlota', title: 'Garam Lota (Hot!)', icon: '♨️',
          rejectMsg: 'Garam lota hai! Isse kurte ki silvatein nikalo!' },
        line: 'Lote me garam chai-paani bhar liya! Ab isse kurte pe press ki tarah chalao. Dhyaan se, garam hai!'
      },
      {
        id: 'toothpaste', label: 'Khatam Toothpaste', pos: v(-100.0, -1.1), radius: 1.9, accepts: 'belan', bonus: true,
        markerY: 1.5, mesh: paste,
        toast: '🪥 BONUS JUGAAD: BELAN SE AAKHRI PASTE!',
        line: 'Haha! Belan se tube ko bel diya, aakhri paste bhi nikal gaya. Asli Indian ghar!',
        onSolve: () => { paste.userData.paste.visible = true; }
      },
      {
        id: 'kurta', label: 'Silvat wala Kurta', pos: v(-96.5, 1.9), radius: 1.6, accepts: 'hotlota',
        markerY: 1.2, mesh: kurta,
        toast: '♨️ JUGAAD: LOTA PRESS! KURTA KADAK!',
        line: 'Iron kharab tha, par garam lote ne kurta ekdum kadak kar diya! Ab phone charge kar lo, 1% bacha hai!',
        wrongLine: 'Kurta itna silvat wala hai! Iron kharab hai... koi garam cheez chahiye. Lota + kettle?',
        onSolve: () => { kurta.userData.crumpled.visible = false; kurta.userData.pressed.visible = true; }
      },
      {
        id: 'phone', label: 'Phone 1%', pos: v(-95.6, 2.3), radius: 1.7, accepts: 'charger', miniGame: true,
        markerY: 1.2, mesh: phone,
        toast: '🔌 JUGAAD: TEDHA WIRE, PHONE CHARGING!',
        line: 'Wire ko sahi angle pe tika diya, charging shuru! Ab darwaza kholo, jaam ho gaya hai!',
        wrongLine: 'Phone 1% pe hai! Charger ka wire dheela hai, usko socket me lagao.',
        onSolve: () => { phone.userData.screenMat.color.setHex(0x22c55e); phone.userData.cable.visible = true; }
      }
    ];
  }

  goToChapter2() {
    try {
      sessionStorage.setItem('jugaad_from_ch1', '1');
      sessionStorage.setItem('bhopali_skip_flight', 'true');   // Chapter 2 page: no second plane intro
      sessionStorage.removeItem('bhopali_in_game');
      sessionStorage.removeItem('bhopali_stage');
    } catch (e) {}
    audio.stopScooterEngine();
    const fade = document.getElementById('chapter-fade');
    if (fade) fade.classList.add('show');
    setTimeout(() => { window.location.href = 'chapter2.html'; }, fade ? 700 : 0);
  }

  getRoomStationsInRange(pos) {
    if (this.stage !== 0 || !this.roomStations) return [];
    return this.roomStations.filter(s => !this.roomDone.has(s.id) &&
      Math.hypot(pos.x - s.pos.x, pos.z - s.pos.z) < s.radius);
  }

  completeRoomStation(st, carried) {
    this.player.remove(carried);
    this.inventory = null;
    this.roomDone.add(st.id);
    if (st.onSolve) st.onSolve();
    this.triggerJugaadToast(st.toast);
    this.addScore(st.bonus ? 100 : 150, 0);
    this.levelScore += st.bonus ? 100 : 150;
    this.showDialogue('Mom', st.line);
    this.renderChecklist();
    if (this.requiredRoom.every(id => this.roomDone.has(id))) {
      this.questText.textContent = 'Taiyaar ho gaye! Ab Laal Eent se jaam darwaza kholo!';
    }
  }

  renderChecklist() {
    const list = document.getElementById('checklist-items');
    if (!list) return;
    const rows = [
      { id: 'chappal', icon: '🩴', text: 'Chappal jodo' },
      { id: 'kurta', icon: '👕', text: 'Kurta press karo' },
      { id: 'phone', icon: '📱', text: 'Phone charge karo' },
      { id: 'door', icon: '🚪', text: 'Darwaza kholo', locked: !this.requiredRoom.every(id => this.roomDone.has(id)) },
      { id: 'toothpaste', icon: '🪥', text: 'Bonus: Toothpaste', bonus: true }
    ];
    list.innerHTML = rows.map(r => {
      const done = this.roomDone.has(r.id) || (r.id === 'door' && this.stage > 0);
      return `<li class="${done ? 'done' : ''} ${r.bonus ? 'bonus' : ''} ${r.locked ? 'locked' : ''}">
        <span class="chk">${done ? '✔' : ''}</span><span class="ico">${r.icon}</span>${r.text}</li>`;
    }).join('');
    const count = this.requiredRoom.filter(id => this.roomDone.has(id)).length;
    const cnt = document.getElementById('checklist-count');
    if (cnt) cnt.textContent = `${count}/3`;
  }

  // --- Charger wire "sahi angle" mini-game ---
  startWireMiniGame(st, carried) {
    // Needle sweeps back and forth at a steady, predictable speed; wide green zone; misses never cost progress
    this.miniGame = { st, carried, t: 0, hits: 0, zone: 0.65, width: 0.24, needle: 0.1, dir: 1, speed: 0.42, cooldown: 0 };
    this.keys = { left: false, right: false, up: false, down: false };
    const el = document.getElementById('wire-game');
    el.classList.add('show');
    this.renderWireGame();
    this.showDialogue('Mom', 'Is charger ka wire ek hi angle pe chalta hai! Jab safed sui HARE zone ke andar ho tab [E] ya Space dabao — 3 baar!');
    this.setWireStatus('Charging 0/3 — sui ko hare zone me pakdo!', '');
  }

  setWireStatus(text, cls) {
    const el = document.getElementById('wire-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'wire-status ' + (cls || '');
  }

  renderWireGame() {
    const g = this.miniGame;
    if (!g) return;
    document.getElementById('wire-zone').style.left = `${(g.zone - g.width / 2) * 100}%`;
    document.getElementById('wire-zone').style.width = `${g.width * 100}%`;
    document.getElementById('wire-needle').style.left = `${g.needle * 100}%`;
    document.querySelectorAll('#wire-pips .pip').forEach((p, i) => p.classList.toggle('on', i < g.hits));
  }

  wireGameTap() {
    const g = this.miniGame;
    if (!g || g.cooldown > 0) return;
    g.cooldown = 0.3;
    const el = document.getElementById('wire-game');
    const hit = Math.abs(g.needle - g.zone) <= g.width / 2 + 0.01;
    if (hit) {
      g.hits++;
      audio.playPlankSnap();
      el.classList.remove('miss'); el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 250);
      if (g.hits >= 3) {
        this.setWireStatus('Charging 3/3 — Phone charge ho raha hai! 🔋', 'ok');
        this.renderWireGame();
        setTimeout(() => {
          el.classList.remove('show');
          const { st, carried } = g;
          this.miniGame = null;
          this.completeRoomStation(st, carried);
        }, 600);
        return;
      }
      this.setWireStatus(`Charging ${g.hits}/3 — shabash! Ek baar aur...`, 'ok');
      // next round: new spot, slightly faster, a little narrower (still generous)
      g.zone = 0.2 + Math.random() * 0.6;
      g.width = Math.max(0.18, g.width - 0.03);
      g.speed += 0.08;
    } else {
      audio.playBrickThud();
      this.setWireStatus(`Galat angle! Sui hare zone me aane do — Charging ${g.hits}/3`, 'bad');
      el.classList.remove('hit'); el.classList.add('miss');
      setTimeout(() => el.classList.remove('miss'), 300);
    }
    this.renderWireGame();
  }

  // --- Clock HUD ---
  updateClock(delta) {
    if (!this.timerRunning || this.stage >= 4) return;
    this.gameMinutes += delta / this.secondsPerGameMinute;
    const el = document.getElementById('hud-clock-time');
    const box = document.getElementById('hud-clock');
    if (!el) return;
    const m = Math.floor(this.gameMinutes);
    const h = Math.floor(m / 60), mm = m % 60;
    el.textContent = `${h}:${mm.toString().padStart(2, '0')}`;
    const left = this.deadline - this.gameMinutes;
    box.classList.toggle('warn', left < 8 && left >= 0);
    box.classList.toggle('late', left < 0);
    const sub = document.getElementById('hud-clock-sub');
    if (sub) sub.textContent = left < 0 ? 'LATE HO GAYE!' : `${Math.ceil(left)} min bache`;
  }

  // --- Floating [E] marker + inventory slot ---
  updateMarker() {
    if (!this.guide) return;
    if (this.markerEl) this.markerEl.classList.remove('show');   // replaced by the labelled guide
    if (this.markerTarget && !this.miniGame) {
      const m = this.markerTarget;
      this.guide.set({ pos: new THREE.Vector3(m.x, 0, m.z), height: m.y + 0.35, text: this.markerLabel || 'Use', kind: this.markerKind || 'pick' });
    } else {
      this.guide.clear();
    }
    this.guide.setObjective(this.stage === 0 && !this.miniGame ? this.roomObjective() : null, 1.9);
    this.guide.update(this._lastDelta || 0.016, this.player.position);
  }

  // Next thing to go to in the room (drives the golden arrow)
  roomObjective() {
    const inv = this.inventory && this.inventory.userData.type;
    const item = (type) => { const it = this.items.find(i => i.userData.type === type); return it ? it.position : null; };
    const st = (id) => this.roomStations.find(s => s.id === id);
    const at = (s) => new THREE.Vector3(s.mesh.position.x, s.mesh.position.y || 0, s.mesh.position.z);
    if (!this.roomDone.has('chappal')) return inv === 'safetypin' ? at(st('chappal')) : (inv ? null : item('safetypin'));
    if (!this.roomDone.has('kurta')) {
      if (inv === 'hotlota') return at(st('kurta'));
      if (inv === 'lota') return at(st('kettle'));
      return inv ? null : item('lota');
    }
    if (!this.roomDone.has('phone')) return inv === 'charger' ? at(st('phone')) : (inv ? null : item('charger'));
    if (inv === 'brick') return new THREE.Vector3(-101, 0, 0.8);
    return inv ? null : item('brick');
  }

  updateInventorySlot() {
    const key = this.inventory ? this.inventory.userData.title : '';
    if (key === this._lastInvKey) return;
    this._lastInvKey = key;
    const slot = document.getElementById('inventory-slot');
    if (!slot) return;
    if (this.inventory) {
      slot.classList.add('filled');
      document.getElementById('inv-icon').textContent = this.inventory.userData.icon || '🎒';
      document.getElementById('inv-name').textContent = this.inventory.userData.title;
      slot.classList.remove('pop'); void slot.offsetWidth; slot.classList.add('pop');
    } else {
      slot.classList.remove('filled');
      document.getElementById('inv-icon').textContent = '✋';
      document.getElementById('inv-name').textContent = 'Haath khaali';
    }
  }

  showInfo(title, body) {
    const m = document.getElementById('info-modal');
    if (!m) return;
    document.getElementById('info-title').textContent = title;
    document.getElementById('info-body').textContent = body;
    m.style.display = 'flex';
  }

  initExhaustParticles() {
    this.particles = [];
    const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.visible = false;
      this.scene.add(p);
      this.particles.push({ mesh: p, life: 0, maxLife: 1, vel: new THREE.Vector3() });
    }
  }

  emitSmoke(pos) {
    const p = this.particles.find(pt => !pt.mesh.visible);
    if (!p) return;
    p.mesh.position.copy(pos);
    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = 0.6 + Math.random() * 0.4;
    p.mesh.scale.setScalar(0.4);
    p.vel.set(-1.5 - Math.random() * 1.5, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6);
  }

  // Confetti Particle Explosion for Victory
  initConfetti() {
    this.confetti = [];
    const colors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6, 0x8b5cf6, 0xec4899];
    for (let i = 0; i < 90; i++) {
      const cGeo = new THREE.PlaneGeometry(0.18, 0.12);
      const cMat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(cGeo, cMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.confetti.push({
        mesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        active: false
      });
    }
  }

  burstConfetti(centerPos) {
    this.confetti.forEach(c => {
      c.mesh.position.set(
        centerPos.x + (Math.random() - 0.5) * 4,
        centerPos.y + 3.5 + Math.random() * 2,
        centerPos.z + (Math.random() - 0.5) * 4
      );
      c.vel.set(
        (Math.random() - 0.5) * 6,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 6
      );
      c.rotVel.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      c.mesh.visible = true;
      c.active = true;
    });
  }

  initUI() {
    this.meterFill = document.getElementById('jugaad-bar-fill');
    this.meterPercent = document.getElementById('meter-percent');
    this.questText = document.getElementById('quest-text');
    this.dialogueBox = document.getElementById('dialogue-box');
    this.dialogueSpeaker = document.getElementById('dialogue-speaker');
    this.dialogueText = document.getElementById('dialogue-text');
    this.promptTip = cachedTextSetter(document.getElementById('prompt-text'));
    this.jugaadPopup = document.getElementById('jugaad-popup');
    this.victoryModal = document.getElementById('victory-modal');
    this.dialogueAvatar = document.getElementById('dialogue-avatar');
    this.markerEl = document.getElementById('interact-marker');
    injectGuideCSS();
    this.guide = new InteractGuide(this.scene, this.camera);
    this.questText.textContent = 'Taiyaar ho jao! Chappal, kurta aur phone — sab jugaad se theek karo!';
    this.renderChecklist();
    this.updateInventorySlot();

    this.dialogueBox.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (this.typing) this.finishTyping();
      else this.dialogueBox.style.display = 'none';
    });
  }

  showDialogue(speaker, text) {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    const avatars = { Mom: '👩🏽', Chacha: '🧔🏽', Papa: '👨🏽' };
    this.dialogueSpeaker.textContent = speaker === 'Mom' ? 'Mummy' : speaker;
    if (this.dialogueAvatar) this.dialogueAvatar.textContent = avatars[speaker] || '🙂';
    this.dialogueBox.style.display = 'flex';
    this.dialogueBox.classList.remove('pop'); void this.dialogueBox.offsetWidth; this.dialogueBox.classList.add('pop');

    clearInterval(this.typeInterval);
    clearTimeout(this.dialogueTimeout);
    this.fullDialogue = text;
    let i = 0;
    this.typing = true;
    this.dialogueText.textContent = '';
    this.typeInterval = setInterval(() => {
      i += 2;
      this.dialogueText.textContent = text.slice(0, i);
      if (i >= text.length) this.finishTyping();
    }, 24);
  }

  finishTyping() {
    clearInterval(this.typeInterval);
    this.typing = false;
    this.dialogueText.textContent = this.fullDialogue;
    clearTimeout(this.dialogueTimeout);
    this.dialogueTimeout = setTimeout(() => {
      this.dialogueBox.style.display = 'none';
    }, 2500 + this.fullDialogue.length * 40);
  }

  triggerJugaadToast(title) {
    this.jugaadPopup.textContent = title;
    this.jugaadPopup.classList.add('show');
    audio.playJugaadSuccess();
    setTimeout(() => {
      this.jugaadPopup.classList.remove('show');
    }, 2800);
  }

  updateMeter(val) {
    this.meter = Math.min(100, val);
    this.meterFill.style.width = `${this.meter}%`;
    this.meterPercent.textContent = `${this.meter}%`;
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.gfx.resize();
    });
    bindQualitySelect(this.gfx);

    window.addEventListener('keydown', (e) => {
      audio.init();
      if (!audio.musicPlaying) audio.startDesiBGM();

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = true;

      if (e.code === 'KeyE' && !e.repeat) this.handleAction();
      if (e.code === 'Space' && this.miniGame && !e.repeat) { e.preventDefault(); this.wireGameTap(); return; }
      if (e.code === 'Space' || e.code === 'KeyH') {
        audio.playHorn();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = false;
    });

    // D-Pad buttons
    const bindHold = (btnId, key) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        audio.init();
        if (!audio.musicPlaying) audio.startDesiBGM();
        this.keys[key] = true;
      });
      btn.addEventListener('pointerup', (e) => { e.stopPropagation(); this.keys[key] = false; });
      btn.addEventListener('pointerleave', (e) => { e.stopPropagation(); this.keys[key] = false; });
    };

    bindHold('btn-up', 'up');
    bindHold('btn-down', 'down');
    bindHold('btn-left', 'left');
    bindHold('btn-right', 'right');

    const btnE = document.getElementById('btn-e');
    if (btnE) {
      btnE.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        audio.init();
        if (!audio.musicPlaying) audio.startDesiBGM();
        this.handleAction();
      });
    }

    const btnHonk = document.getElementById('btn-honk');
    if (btnHonk) {
      btnHonk.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        audio.init();
        audio.playHorn();
      });
    }

    window.addEventListener('pointerdown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      // Do NOT trigger in-game actions while on landing, map, or intro overlays!
      const landing = document.getElementById('landing-screen');
      const intro = document.getElementById('intro-screen');
      const map = document.getElementById('level-map-screen');
      if ((landing && landing.style.display !== 'none') ||
          (intro && intro.style.display !== 'none') ||
          (map && map.style.display === 'flex')) {
        return;
      }
      audio.init();
      if (!audio.musicPlaying) audio.startDesiBGM();
      this.handleAction();
    });

    // Continue the story in Chapter 2 (Chacha ka Safar – chapter2.html)
    const goChapter2 = () => this.goToChapter2();
    ['btn-next-chapter', 'btn-chapter-2'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', (e) => { e.stopPropagation(); goChapter2(); });
    });

    // Replay button inside victory modal
    const btnReplay = document.getElementById('btn-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        window.location.reload();
      });
    }

    // Accident respawn button
    const btnAccRespawn = document.getElementById('btn-accident-respawn');
    if (btnAccRespawn) {
      btnAccRespawn.addEventListener('click', () => {
        this.resetAfterAccident();
      });
    }

    // Initialize persistent Stars & Desi Swag Score
    this.initStats();

    // 1. Supersonic Paper Plane Intro Launch Screen (Constant-Speed Arc-Length Flight)
    const introScreen = document.getElementById('intro-screen');
    const plane = document.getElementById('flying-plane');
    if (introScreen && plane) {
      // Cubic Bezier curve control points matching user's exact red marker trajectory
      const p0 = { x: -0.22, y: 0.26 }; // Enter offscreen left at y=26%
      const p1 = { x: 0.22, y: 0.64 };  // Control point pulling down into the scoop
      const p2 = { x: 0.54, y: 0.66 };  // Control point curving the scoop bottom
      const p3 = { x: 1.20, y: -0.20 }; // Exit past top-right corner

      // Precompute 300 points for precise arc-length parameterization (strictly constant speed!)
      const samples = 300;
      const rawPts = [];
      const rawTans = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const inv = 1 - t;
        const x = inv*inv*inv * p0.x + 3*inv*inv*t * p1.x + 3*inv*t*t * p2.x + t*t*t * p3.x;
        const y = inv*inv*inv * p0.y + 3*inv*inv*t * p1.y + 3*inv*t*t * p2.y + t*t*t * p3.y;
        const dx = 3*inv*inv * (p1.x - p0.x) + 6*inv*t * (p2.x - p1.x) + 3*t*t * (p3.x - p2.x);
        const dy = 3*inv*inv * (p1.y - p0.y) + 6*inv*t * (p2.y - p1.y) + 3*t*t * (p3.y - p2.y);
        rawPts.push({ x, y });
        rawTans.push({ dx, dy });
      }

      const arcLengths = [0];
      let totalLen = 0;
      for (let i = 1; i < rawPts.length; i++) {
        totalLen += Math.hypot(rawPts[i].x - rawPts[i-1].x, rawPts[i].y - rawPts[i-1].y);
        arcLengths.push(totalLen);
      }

      // Function returning point & continuous tangent angle at uniform normalized distance u in [0, 1]
      const getAtDistance = (u) => {
        const target = u * totalLen;
        let low = 0, high = arcLengths.length - 1;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (arcLengths[mid] < target) low = mid + 1;
          else high = mid;
        }
        const idx = Math.max(1, low);
        const segLen = arcLengths[idx] - arcLengths[idx - 1] || 1e-6;
        const frac = (target - arcLengths[idx - 1]) / segLen;
        
        const x = rawPts[idx - 1].x + frac * (rawPts[idx].x - rawPts[idx - 1].x);
        const y = rawPts[idx - 1].y + frac * (rawPts[idx].y - rawPts[idx - 1].y);
        const dx = rawTans[idx - 1].dx + frac * (rawTans[idx].dx - rawTans[idx - 1].dx);
        const dy = rawTans[idx - 1].dy + frac * (rawTans[idx].dy - rawTans[idx - 1].dy);
        // Plane graphic points at -29.3deg naturally, so rotate by:
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 29.3;
        return { x, y, angle };
      };

      let startTime = null;
      let flightEnded = false;
      const duration = 2400; // 2.4 seconds uniform, constant speed throughout

      const stepFlight = (now) => {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        // Strictly linear u => strictly constant physical speed across entire path!
        const u = Math.min(1, elapsed / duration);

        const pos = getAtDistance(u);
        const scrW = window.innerWidth;
        const scrH = window.innerHeight;
        const px = pos.x * scrW;
        const py = pos.y * scrH;

        // Smooth 3D Banking derived from flight direction
        const bankY = -pos.angle * 0.32;
        const bankX = Math.sin(u * Math.PI) * 10;
        const scale = 0.72 + u * 0.58;

        plane.style.left = `${px}px`;
        plane.style.top = `${py}px`;
        plane.style.transform = `translate(-50%, -50%) perspective(800px) rotateZ(${pos.angle}deg) rotateY(${bankY}deg) rotateX(${bankX}deg) scale(${scale})`;
        plane.style.opacity = u < 0.04 ? `${u / 0.04}` : (u > 0.94 ? `${(1 - u) / 0.06}` : '1');

        if (u < 1) {
          requestAnimationFrame(stepFlight);
        } else {
          // Flight completed! STOP whoosh sound immediately so it never bleeds into landing page!
          flightEnded = true;
          audio.stopPlaneWhoosh();

          introScreen.style.opacity = '0';
          introScreen.style.transition = 'opacity 0.6s ease';
          setTimeout(() => {
            introScreen.style.display = 'none';
          }, 600);
        }
      };

      // User Interaction Launch: Guarantees 100% audio unlock per browser Autoplay policy!
      let flightStarted = false;

      const launchFlight = (e) => {
        if (flightStarted) return;
        flightStarted = true;
        if (e && e.stopPropagation) e.stopPropagation();

        introScreen.removeEventListener('pointerdown', launchFlight);
        window.removeEventListener('keydown', onKeyDown);

        const prompt = document.getElementById('intro-launch-prompt');
        if (prompt) {
          prompt.style.opacity = '0';
          prompt.style.transition = 'opacity 0.2s ease';
          setTimeout(() => { prompt.style.display = 'none'; }, 220);
        }

        // Initialize WebAudio & HTML5 audio synchronously inside explicit user gesture
        audio.init();
        audio.playPlaneWhoosh();

        // Launch smooth constant-speed supersonic flight!
        requestAnimationFrame(stepFlight);
      };

      const onKeyDown = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          launchFlight(e);
        }
      };

      introScreen.addEventListener('pointerdown', launchFlight);
      window.addEventListener('keydown', onKeyDown);
    }

    // 2. Landing Screen & Sound Toggle
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    if (btnToggleSound) {
      btnToggleSound.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMuted = audio.toggleMute();
        btnToggleSound.textContent = isMuted ? '🔇' : '🔊';
        btnToggleSound.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
      });
    }

    // 3. Candy-Crush Roadmap Surprise Desi Hack Gift Boxes
    const giftBox1 = document.getElementById('gift-box-1');
    if (giftBox1) {
      giftBox1.addEventListener('click', () => {
        audio.init();
        audio.playJugaadSuccess();
        this.addScore(150, 0);
        this.showInfo('🎁 Desi Hack #1: Bhopal Scooter Secret', "Agar scooter ki kick jam ho jaye ya subah thand me start na ho — gaadi ko 45° right tilt karke 3 second ruko, phir single kick maaro, 100% start!  (+150 Swag)");
      });
    }

    const giftBox2 = document.getElementById('gift-box-2');
    if (giftBox2) {
      giftBox2.addEventListener('click', () => {
        audio.init();
        audio.playJugaadSuccess();
        this.addScore(150, 0);
        this.showInfo('🎁 Desi Hack #2: Universal Desi Rule', "Chappal tooti? Safety pin. Remote dheela? Rubber band. Iron kharab? Garam lota. Desi jugaad zindabad!  (+150 Swag)");
      });
    }

    // Landing Screen & Winding Roadmap Menu Handlers
    const landingScreen = document.getElementById('landing-screen');
    const levelMapScreen = document.getElementById('level-map-screen');
    const settingsModal = document.getElementById('settings-modal');

    const startGame = () => {
      if (landingScreen) landingScreen.style.display = 'none';
      if (levelMapScreen) levelMapScreen.style.display = 'none';
      audio.init();
      if (!audio.musicPlaying) audio.startDesiBGM();
      if (!this.timerRunning) {
        this.timerRunning = true;
        this.clock.getDelta();
        this.showDialogue('Mom',
          'Beta jaldi uth! 10 baje tak function pahunchna hai! Par dekh — chappal tooti, kurta silvat wala, phone 1% pe, aur darwaza bhi jaam! Jugaad lagao!');
      }
    };

    const btnWireTap = document.getElementById('btn-wire-tap');
    if (btnWireTap) btnWireTap.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.wireGameTap(); });

    const btnInfoClose = document.getElementById('btn-info-close');
    if (btnInfoClose) btnInfoClose.addEventListener('click', () => {
      document.getElementById('info-modal').style.display = 'none';
    });

    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) btnStart.addEventListener('click', startGame);

    const nodeLevel1 = document.getElementById('node-level-1');
    if (nodeLevel1) nodeLevel1.addEventListener('click', startGame);

    const btnOpenMap = document.getElementById('btn-open-map');
    if (btnOpenMap) {
      btnOpenMap.addEventListener('click', () => {
        if (levelMapScreen) levelMapScreen.style.display = 'flex';
      });
    }

    const btnCloseMap = document.getElementById('btn-close-map');
    if (btnCloseMap) {
      btnCloseMap.addEventListener('click', () => {
        if (levelMapScreen) levelMapScreen.style.display = 'none';
      });
    }

    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        if (settingsModal) settingsModal.style.display = 'flex';
      });
    }

    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        if (settingsModal) settingsModal.style.display = 'none';
      });
    }

    // Modal Tab Switching: Controls vs Tech Architecture vs Creators & Team
    const btnTabControls = document.getElementById('btn-tab-controls');
    const btnTabTech = document.getElementById('btn-tab-tech');
    const btnTabTeam = document.getElementById('btn-tab-team');
    const tabContentControls = document.getElementById('tab-content-controls');
    const tabContentTech = document.getElementById('tab-content-tech');
    const tabContentTeam = document.getElementById('tab-content-team');

    const switchTab = (activeBtn, activeContent) => {
      [btnTabControls, btnTabTech, btnTabTeam].forEach(btn => btn && btn.classList.remove('active'));
      [tabContentControls, tabContentTech, tabContentTeam].forEach(content => content && (content.style.display = 'none'));
      if (activeBtn) activeBtn.classList.add('active');
      if (activeContent) activeContent.style.display = 'block';
    };

    if (btnTabControls) btnTabControls.addEventListener('click', () => switchTab(btnTabControls, tabContentControls));
    if (btnTabTech) btnTabTech.addEventListener('click', () => switchTab(btnTabTech, tabContentTech));
    if (btnTabTeam) btnTabTeam.addEventListener('click', () => switchTab(btnTabTeam, tabContentTeam));
  }

  initStats() {
    let savedStars = localStorage.getItem('bhopali_stars') || '3';
    let savedScore = localStorage.getItem('bhopali_total_swag') || localStorage.getItem('bhopali_swag') || '1000';
    let savedHigh = localStorage.getItem('bhopali_high_score') || '0';
    const topStars = document.getElementById('top-stars');
    const topScore = document.getElementById('top-score');
    const topHigh = document.getElementById('top-high-score');
    if (topStars) topStars.textContent = savedStars;
    if (topScore) topScore.textContent = savedScore;
    if (topHigh) topHigh.textContent = savedHigh;
  }

  addScore(points, stars = 0) {
    let currentScore = parseInt(localStorage.getItem('bhopali_total_swag') || localStorage.getItem('bhopali_swag') || '1000', 10);
    let currentStars = parseInt(localStorage.getItem('bhopali_stars') || '3', 10);
    currentScore += points;
    currentStars = Math.min(12, currentStars + stars);
    localStorage.setItem('bhopali_swag', currentScore.toString());
    localStorage.setItem('bhopali_total_swag', currentScore.toString());   // shared with Chapter 2's landing stats
    localStorage.setItem('bhopali_stars', currentStars.toString());
    const topStars = document.getElementById('top-stars');
    const topScore = document.getElementById('top-score');
    if (topStars) topStars.textContent = currentStars;
    if (topScore) topScore.textContent = currentScore;
  }

  // Realistic Accident Animation Sequence
  triggerCowAccident() {
    this.isAccident = true;
    this.scooterSpeed = 0;
    audio.stopScooterEngine();
    audio.playTireScreech();
    audio.playMetalCrash();
    audio.playCowAlarmed();

    this.shakeDuration = 0.55;

    // 1. Hide seated rider from scooter
    this.scooter.userData.riderMesh.visible = false;

    // 2. Spawn dazed Pixar boy thrown forward in front of cow
    this.dazedGuy.position.set(this.scooter.position.x + 2.5, 0, this.scooter.position.z);
    this.dazedGuy.visible = true;

    // 3. Scooter flips onto front wheel and falls on its side
    this.scooter.position.y = 0.35;
    this.scooter.rotation.z = -0.55;
    this.scooter.rotation.x = -0.65;

    // 4. Cow looks alarmed
    if (this.cow.userData.headGroup) {
      this.cow.userData.headGroup.rotation.x = -0.3;
    }

    this.triggerJugaadToast(' ACCIDENT! GAU MATA SE TAKKAR! ');
    this.showDialogue(
      'Mom',
      'ARRE BAAP RE! ACCIDENT HO GAYA! Gau Mata se takra gaye! Pehle sabzi market se roti & ghaas laake unhe side karna tha miyaan!'
    );

    const accModal = document.getElementById('accident-modal');
    if (accModal) {
      setTimeout(() => {
        accModal.style.display = 'flex';
      }, 1100);
    }
  }

  resetAfterAccident() {
    const accModal = document.getElementById('accident-modal');
    if (accModal) accModal.style.display = 'none';

    this.isAccident = false;
    this.isRiding = false;
    this.scooterSpeed = 0;

    // Hide dazed guy
    this.dazedGuy.visible = false;

    // Restore scooter before cow
    this.scooter.position.set(14.0, 0, 0);
    this.scooter.rotation.set(0, 0, 0);
    this.scooter.userData.riderMesh.visible = false;

    // Restore walking player
    this.player.position.set(15.0, 0, 0.5);
    this.player.visible = true;
    this.player.rotation.set(0, 0, 0);

    audio.stopScooterEngine();
    this.questText.textContent = 'Pehle Sabzi Market se Taazi Ghaas & Roti laao aur Gau Mata ko side karo!';
    this.promptTip.innerHTML = 'Walk to Grass Basket <b>[E]</b> | Feed Gau Mata before riding!';
  }

  // Handle Pick, Place, Inspect, and Mount
  handleAction() {
    if (this.isFalling) return;
    if (this.miniGame) { this.wireGameTap(); return; }
    const pPos = this.player.position;

    // 1. Not carrying: Pick up nearest item
    if (!this.inventory) {
      let nearestItem = null;
      let minDist = 2.2;

      this.items.forEach(item => {
        const d = pPos.distanceTo(item.position);
        if (d < minDist) {
          minDist = d;
          nearestItem = item;
        }
      });

      if (nearestItem) {
        this.inventory = nearestItem;
        this.items = this.items.filter(it => it !== nearestItem);
        this.scene.remove(nearestItem);
        this.player.add(nearestItem);
        nearestItem.position.set(0, 1.0, 0.4);
        nearestItem.rotation.set(0, 0, 0);
        audio.playBrickThud();
        this.promptTip.innerHTML = `Carrying: <b>${nearestItem.userData.title}</b>. Press [E] to use or drop!`;
        return;
      }
    }

    // 2. Carrying an item: Test / Use / Place
    if (this.inventory) {
      const carried = this.inventory;

      // ROOM JUGAADS: stations that accept the carried item win first
      const inRange = this.getRoomStationsInRange(pPos);
      const match = inRange.find(s => s.accepts === carried.userData.type);
      if (match) {
        if (match.transformTo) {
          Object.assign(carried.userData, match.transformTo);
          if (carried.userData.steam) carried.userData.steam.visible = true;
          this.roomDone.add(match.id);
          audio.playJugaadSuccess();
          this.showDialogue('Mom', match.line);
          this.updateInventorySlot();
          return;
        }
        if (match.miniGame) { this.startWireMiniGame(match, carried); return; }
        this.completeRoomStation(match, carried);
        return;
      }

      // CRISIS 1: Near House Door in Trailer Level (x=-101)
      const distToDoor = pPos.distanceTo(new THREE.Vector3(-101, 0, 0.5));
      const isBrick = carried.userData.type === 'brick';
      if (this.stage === 0 && ((isBrick && distToDoor < 3.5) || (!isBrick && distToDoor < 1.8 && !inRange.length && this.lastRejectId !== 'door'))) {
        if (carried.userData.type === 'brick') {
          if (!this.requiredRoom.every(id => this.roomDone.has(id))) {
            const missing = this.roomStations.filter(s => this.requiredRoom.includes(s.id) && !this.roomDone.has(s.id)).map(s => s.label);
            this.showDialogue('Mom', `Aise hi jaoge function me?! Pehle yeh theek karo: ${missing.join(', ')}.`);
            return;
          }
          this.player.remove(carried);
          // Don't add brick back, just destroy it
          
          // Open door animation
          if(this.house) {
            this.house.children.forEach(child => {
               if(child.name === 'HouseDoor') child.rotation.y = Math.PI / 2.5;
            });
          }
          
          // Room level done -> continue the story straight into Chapter 2 (Chacha ka Safar)
          this.timerRunning = false;
          setTimeout(() => this.goToChapter2(), 2600);

          this.inventory = null;
          this.stage = 1;
          this.updateMeter(25);
          audio.playBrickThud();
          this.triggerJugaadToast('🧱 JUGAAD: EENT SE DARWAZA KHULA! (+25%)');
          this.levelScore += 150;
          const minsLeft = this.deadline - this.gameMinutes;
          this.addScore(150, minsLeft > 15 ? 3 : (minsLeft > 5 ? 2 : 1));
          this.renderChecklist();
          this.showDialogue(
            'Mom',
            'Eent maar ke jaam darwaza khul gaya! Shabash, ekdum taiyaar! Chalo bahar, Chacha ke ghar chalte hain!'
          );
          this.questText.textContent = 'Darwaza khul gaya! Bahar nikal rahe hain...';
          return;
        } else {
          this.lastRejectId = 'door';
          this.showDialogue('Mom', 'Isse jaam darwaza nahi khulega! Koi bhari cheez chahiye thokne ke liye.');
          return;
        }
      }

      // CRISIS 2: Near 3D Deep Chasm (11, 0, 0)
      const distToTrench = pPos.distanceTo(this.trench.position);
      if (this.stage === 1 && distToTrench < 3.8) {
        if (carried.userData.type === 'plank') {
          // Snap plank across trench spanning from Platform 1 (x=9.2) to Platform 2 (x=12.8)!
          this.player.remove(carried);
          this.scene.add(carried);
          
          this.plankZ = Math.max(-2.2, Math.min(2.2, pPos.z)); // Place bridge at current lane!
          carried.position.set(11.0, 0.09, this.plankZ);
          carried.rotation.set(0, 0, 0);

          this.plankPlaced = true;
          this.inventory = null;
          this.stage = 2;
          this.updateMeter(50);
          audio.playPlankSnap();
          this.triggerJugaadToast(' JUGAAD 2: TIMBER BRIDGE READY! (+25%)');
          this.showDialogue(
            'Mom',
            'Bhari lakdi ka phatta lag gaya! 3.6 meter ka chasm cover ho gaya! Aage dekho, Gau Mata raaste ke beech baithi hain!'
          );
          this.questText.textContent = 'Raste me Gau Mata baithi hain! Sabzi market se Taazi Ghaas & Roti le aao!';
          return;
        } else {
          this.showDialogue('Mom', carried.userData.rejectMsg || 'Isse bridge nahi banega!');
          return;
        }
      }

      // CRISIS 3: Near Cow (21.5, 0, -0.2)
      const distToCow = pPos.distanceTo(this.cow.position);
      if (this.stage === 2 && distToCow < 3.6) {
        if (carried.userData.type === 'grass') {
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(21.5, 0, -2.8);
          this.inventory = null;
          this.stage = 3;
          this.updateMeter(75);

          this.cow.userData.isDistracted = true;
          this.cow.userData.state = 'moving';
          audio.playCowMoo();
          this.triggerJugaadToast(' JUGAAD 3: GAU MATA RASTA CLEAR! (+25%)');
          this.showDialogue(
            'Mom',
            'Gau Mata khush, rasta saaf! Ab vaapis scooter pe chalo aur kick maarke VIP road niklo!'
          );
          this.questText.textContent = 'Vaapis Scooter ke paas jao aur Kickstart [E] karke VIP Road niklo!';
          return;
        } else {
          this.showDialogue('Mom', carried.userData.rejectMsg || 'Gau Mata isko nahi khayengi!');
          return;
        }
      }

      // Wrong item at a room station
      // (first press explains, second press just drops the item)
      if (inRange.length && this.lastRejectId !== inRange[0].id) {
        this.lastRejectId = inRange[0].id;
        this.showDialogue('Mom', inRange[0].wrongLine || carried.userData.rejectMsg || 'Isse kaam nahi banega beta!');
        this.promptTip.innerHTML = 'Galat cheez! <b>[E]</b> dobara dabao to drop';
        return;
      }
      this.lastRejectId = null;

      // Drop item anywhere
      this.player.remove(carried);
      this.scene.add(carried);
      carried.position.set(pPos.x, 0, pPos.z);
      carried.rotation.set(0, 0, 0);
      this.items.push(carried);
      this.inventory = null;
      this.promptTip.textContent = `Dropped ${carried.userData.title}.`;
      return;
    }

    // 3. Mount Scooter (Once stand is fixed) - SEATED RIDER POSE!
    if (this.stage >= 1 && !this.isRiding) {
      const distToScooter = pPos.distanceTo(this.scooter.position);
      if (distToScooter < 2.8) {
        this.isRiding = true;
        this.player.visible = false;
        this.scooter.userData.riderMesh.visible = true;
        audio.startScooterEngine();
        audio.playHorn();
        this.showDialogue(
          'Mom',
          'Dhup-dhup-dhup! Scooter start! Ab steering sambhalo, aur dhyan se phatte ke upar se nikalna!'
        );
        this.questText.textContent = 'Dhyan se chalayein! Phatte ke upar se gaddhe ko cross karein!';
        this.promptTip.innerHTML = 'Drive [W/S/A/D] | Cross Plank Carefully | [Space] Honk | [E] Stop & Dismount';
        return;
      }
    }

    if (this.isRiding) {
      if (Math.abs(this.scooterSpeed) < 1.0) {
        // Stop and Dismount
        this.isRiding = false;
        this.player.position.set(this.scooter.position.x, 0, this.scooter.position.z + 1.1);
        this.player.visible = true;
        this.scooter.userData.riderMesh.visible = false;
        audio.stopScooterEngine();
        this.promptTip.textContent = 'Dismounted scooter. Press [E] near scooter to mount again.';
        return;
      } else {
        audio.playHorn();
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Real frame delta (capped) so 120Hz screens don't run the game 2x faster
    const delta = Math.min(0.05, this.clock.getDelta());
    this._lastDelta = delta;
    const time = performance.now() * 0.002;
    this.updateClock(delta);
    this.updateInventorySlot();

    if (this.miniGame) {
      const g = this.miniGame;
      g.t += delta;
      g.cooldown = Math.max(0, g.cooldown - delta);
      g.needle += g.dir * g.speed * delta;
      if (g.needle >= 1) { g.needle = 1; g.dir = -1; }
      if (g.needle <= 0) { g.needle = 0; g.dir = 1; }
      this.renderWireGame();
    }

    // --- 1. WALKING PLAYER PHYSICS & COLLISION ---
    const landing = document.getElementById('landing-screen');
      const intro = document.getElementById('intro-screen');
      const map = document.getElementById('level-map-screen');
      const isOverlayActive = (landing && landing.style.display !== 'none') || 
                              (intro && intro.style.display !== 'none') || 
                              (map && map.style.display === 'flex');

      if (!this.isRiding && this.stage < 4 && !this.isFalling && !isOverlayActive && !this.miniGame) {
      let vx = 0;
      let vz = 0;

      if (this.keys.left) vx -= 1;
      if (this.keys.right) vx += 1;
      if (this.keys.up) vz -= 1;
      if (this.keys.down) vz += 1;

      const moveLen = Math.hypot(vx, vz);

      if (moveLen > 0.01) {
        vx = (vx / moveLen) * this.walkSpeed * delta;
        vz = (vz / moveLen) * this.walkSpeed * delta;

        let nextX = this.player.position.x + vx;
        let nextZ = this.player.position.z + vz;

        // Handle different bounds for House (Stage 0) and Street (Stage > 0)
        if (this.stage === 0) {
            nextX = Math.max(-101, Math.min(-95, nextX));
            nextZ = Math.max(-2.2, Math.min(3.2, nextZ));
        } else {
            nextX = Math.max(-8, Math.min(38, nextX));
            nextZ = Math.max(-4.2, Math.min(2.8, nextZ));
        }

        // Solid Colliders
        this.colliders.forEach(c => {
          if (c.type === 'circle') {
            const dx = nextX - c.x;
            const dz = nextZ - c.z;
            const dist = Math.hypot(dx, dz);
            const minDist = c.radius + this.player.userData.radius;
            if (dist < minDist) {
              const push = minDist - dist;
              nextX += (dx / dist) * push;
              nextZ += (dz / dist) * push;
            }
          } else if (c.type === 'box') {
            if (nextX > c.minX && nextX < c.maxX && nextZ > c.minZ && nextZ < c.maxZ) {
              const dLeft = Math.abs(nextX - c.minX);
              const dRight = Math.abs(nextX - c.maxX);
              const dTop = Math.abs(nextZ - c.minZ);
              const dBottom = Math.abs(nextZ - c.maxZ);
              const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
              if (minEdge === dLeft) nextX = c.minX - 0.1;
              else if (minEdge === dRight) nextX = c.maxX + 0.1;
              else if (minEdge === dTop) nextZ = c.minZ - 0.1;
              else nextZ = c.maxZ + 0.1;
            }
          }
        });

        this.player.position.x = nextX;
        this.player.position.z = nextZ;

        // Facing
        const targetAngle = Math.atan2(vx, vz);
        let diff = targetAngle - this.player.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.player.rotation.y += diff * 0.22;

        // Natural walk cycle (steps driven by distance travelled)
        AssetFactory.animateWalk(this.player, this.walkSpeed, delta, false);
        if (this.player.userData.stepped) audio.playFootstep('shoe');
      } else {
        AssetFactory.animateWalk(this.player, 0, delta, false);
      }

      // --- TRENCH CROSSING LOGIC FOR WALKING CHACHA ---
      if (this.player.position.x >= 9.2 && this.player.position.x <= 12.8) {
        const onPlank = this.plankPlaced && Math.abs(this.player.position.z - this.plankZ) <= this.plankHalfWidth;
        if (onPlank) {
          // Sturdy on plank!
          this.player.position.y = 0.09;
        } else {
          // Fell into deep trench!
          this.isFalling = true;
          audio.playSplash();
          audio.playBrickThud();
          this.showDialogue('Mom', 'Arey Baap Re! 2 meter gehre gaddhe me gir gaye! Phatte ke upar se chalo!');
          this.triggerJugaadToast('️ SPLASH! GEHRE GADDHE ME GIR GAYE!');
          this.player.position.y = -2.0;

          setTimeout(() => {
            this.player.position.set(7.5, 0, this.plankPlaced ? this.plankZ : 0);
            this.player.position.y = 0;
            this.isFalling = false;
          }, 1600);
        }
      } else {
        if (!this.isFalling) this.player.position.y = 0;
      }

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x + 3.2, 0.06);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.player.position.z + 8.8, 0.06);
      this.camera.lookAt(this.player.position.x + 1, 1.3, this.player.position.z);

      this.updatePrompt();
    } else if (this.isRiding) {
      this.markerTarget = null;
    }
    this.updateMarker();

    // --- 2. COW BEHAVIOR ---
    if (this.cow.userData.isDistracted && this.cow.userData.state === 'moving') {
      if (this.cow.position.z > -2.6) {
        this.cow.position.z -= delta * 1.2;
        this.cow.rotation.y = THREE.MathUtils.lerp(this.cow.rotation.y, 0, 0.06);
      } else {
        this.cow.userData.state = 'eating';
        this.colliders = this.colliders.filter(c => c.name !== 'Cow');
      }
    }
    if (this.cow.userData.headGroup) {
      this.cow.userData.headGroup.rotation.x = Math.sin(time * 3) * 0.06;
      this.cow.userData.tailGroup.rotation.z = Math.sin(time * 5) * 0.22;
    }

    // --- 3. SCOOTER RIDING & SKILL-BASED TRENCH BRIDGE CROSSING ---
    if (this.isRiding && this.stage === 3 && !this.isFalling) {
      if (this.keys.right) {
        this.scooterSpeed = Math.min(this.maxSpeed, this.scooterSpeed + 9 * delta);
      } else if (this.keys.left) {
        this.scooterSpeed = Math.max(-2, this.scooterSpeed - 8 * delta);
      } else {
        this.scooterSpeed *= 0.96;
      }

      // Steer across road width
      if (this.keys.up) this.scooter.position.z = Math.max(-2.5, this.scooter.position.z - 3.5 * delta);
      if (this.keys.down) this.scooter.position.z = Math.min(2.5, this.scooter.position.z + 3.5 * delta);

      this.scooter.position.x += this.scooterSpeed * delta;

      // Wheel rotation
      const wheelRot = (this.scooterSpeed * delta) / 0.34;
      this.scooter.userData.frontWheel.rotation.z -= wheelRot;
      this.scooter.userData.rearWheel.rotation.z -= wheelRot;

      // Gentle suspension bounce
      this.scooter.position.y = Math.abs(Math.sin(time * 16)) * 0.04;

      // --- TRENCH CRASH CHECK FOR SCOOTER ---
      if (this.scooter.position.x >= 9.2 && this.scooter.position.x <= 12.8) {
        const onPlank = this.plankPlaced && Math.abs(this.scooter.position.z - this.plankZ) <= this.plankHalfWidth;
        if (onPlank) {
          // Riding safely over the wooden timber bridge!
          this.scooter.position.y = 0.09;
        } else {
          // CRASH! Drove into the open ditch!
          this.isFalling = true;
          this.scooterSpeed = 0;
          audio.stopScooterEngine();
          audio.playSplash();
          audio.playBrickThud();
          this.triggerJugaadToast(' CRASH! SCOOTER GEHRE GADDHE ME GIR GAYI!');
          this.showDialogue('Mom', 'Arey miyaan! Dhyan se handle sambhalo, phatte ke side me gehre khadde me gira diya!');

          // Dip deep into trench
          this.scooter.position.y = -1.8;
          this.scooter.rotation.z = -0.55;

          setTimeout(() => {
            // Respawn safely aligned with bridge!
            this.scooter.position.set(7.0, 0, this.plankZ);
            this.scooter.rotation.z = 0;
            this.scooter.position.y = 0;
            this.isFalling = false;
            audio.startScooterEngine();
          }, 1800);
        }
      }

      // --- COW ACCIDENT COLLISION CHECK ---
      const distToCow = Math.hypot(
        this.scooter.position.x - this.cow.position.x,
        this.scooter.position.z - this.cow.position.z
      );
      if (distToCow < 2.5 && !this.isAccident) {
        this.triggerCowAccident();
        return;
      }

      // Exhaust smoke
      const exhaustPos = this.scooter.localToWorld(this.scooter.userData.exhaustPos.clone());
      if (Math.random() < 0.4 && Math.abs(this.scooterSpeed) > 0.5) {
        this.emitSmoke(exhaustPos);
      }

      audio.setEngineSpeed(Math.abs(this.scooterSpeed) / this.maxSpeed);

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.scooter.position.x + 4.5, 0.08);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.scooter.position.z + 8.8, 0.08);
      this.camera.lookAt(this.scooter.position.x + 2, 1.4, this.scooter.position.z);

      // --- 4. GRAND FINISH LINE VICTORY CELEBRATION (x = 38) ---
      if (this.scooter.position.x > 37.5) {
        this.stage = 4;
        this.updateMeter(100);
        audio.stopScooterEngine();

        // Confetti explosion
        this.burstConfetti(this.scooter.position);
        const minsLeft = this.deadline - this.gameMinutes;
        const stars = minsLeft > 10 ? 3 : (minsLeft >= 0 ? 2 : 1);
        this.addScore(500, stars);
        this.levelScore += 500;
        const setTxt = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
        const m = Math.floor(this.gameMinutes);
        setTxt('victory-score', `+${this.levelScore}`);
        setTxt('victory-time', `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}`);
        setTxt('victory-stars', '⭐'.repeat(stars) + '☆'.repeat(3 - stars));
        setTxt('victory-jugaads', `${this.roomDone.size + 3}`);

        this.triggerJugaadToast(' VICTORY: LEVEL 1 CLEARED! ');
        this.showDialogue(
          'Mom',
          'Wah! Destination pahunch gaye! Jugaad se sab kuch mumkin hai!'
        );
        this.questText.textContent = '🌟 CONGRATULATIONS! You mastered the Jugaad: Bas Pahunchna Hai!';
        this.promptTip.innerHTML = 'Wah Miyaan! 100% Desi Swag Champion! ';

        // Show Full Victory Modal
        if (this.victoryModal) {
          setTimeout(() => {
            this.victoryModal.style.display = 'flex';
          }, 1200);
        }
      }
    }

    // --- 5. UPDATE CONFETTI PARTICLES ---
    this.confetti.forEach(c => {
      if (c.active) {
        c.mesh.position.addScaledVector(c.vel, delta);
        c.vel.y -= 3.5 * delta; // Gravity
        c.mesh.rotation.x += c.rotVel.x * delta;
        c.mesh.rotation.y += c.rotVel.y * delta;
        if (c.mesh.position.y < 0.05) {
          c.mesh.position.y = 0.05;
          c.vel.set(0, 0, 0);
        }
      }
    });

    // --- 6. EXHAUST PARTICLES ---
    this.particles.forEach(p => {
      if (p.mesh.visible) {
        p.life += delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.scale.setScalar(0.4 + (p.life / p.maxLife) * 0.8);
        p.mesh.material.opacity = (1 - p.life / p.maxLife) * 0.5;
        if (p.life >= p.maxLife) p.mesh.visible = false;
      }
    });

    // --- 7. ACCIDENT CAMERA SHAKE & SPINNING STARS ---
    if (this.dazedGuy && this.dazedGuy.visible && this.dazedGuy.userData.starsOrbit) {
      this.dazedGuy.userData.starsOrbit.rotation.y += 0.08;
    }

    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      this.camera.position.x += (Math.random() - 0.5) * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * 0.35;
    }

    this.gfx.render(delta);
  }

  updatePrompt() {
    const pPos = this.player.position;
    const up = (v, y) => new THREE.Vector3(v.x, y, v.z);
    this.markerTarget = null;
    this.markerKind = 'pick';
    const short = (t) => (t || '').replace(/\s*\(.*\)\s*/g, '').trim();

    if (!this.inventory) {
      let nearestItem = null;
      let minDist = 2.2;
      this.items.forEach(it => {
        const d = pPos.distanceTo(it.position);
        if (d < minDist) {
          minDist = d;
          nearestItem = it;
        }
      });

      if (nearestItem) {
        this.markerTarget = up(nearestItem.position, nearestItem.position.y + 0.8);
        this.markerLabel = 'Uthao: ' + short(nearestItem.userData.title);
        this.promptTip.innerHTML = `Press <b>[E]</b> to pick up <b>${nearestItem.userData.title}</b>`;
        return;
      }

      if (this.stage === 0) {
        const st = this.getRoomStationsInRange(pPos)[0];
        if (st) {
          this.markerTarget = up(st.mesh.position, st.markerY + (st.mesh.position.y || 0));
          this.markerLabel = st.label + ' — jugaad dhoondo';
          this.markerKind = 'locked';
          this.promptTip.innerHTML = `<b>${st.label}</b> — iske liye kuch jugaad dhoondo!`;
          return;
        }
        this.promptTip.innerHTML = 'Kamre me ghoomo <b>W A S D</b> | Cheezein uthao <b>[E]</b>';
        return;
      }

      if (this.stage >= 1 && !this.isRiding && pPos.distanceTo(this.scooter.position) < 2.8) {
        this.markerTarget = up(this.scooter.position, 2.0);
        this.promptTip.innerHTML = 'Press <b>[E]</b> to Kickstart & Mount Scooter!';
        return;
      }

      this.promptTip.innerHTML = 'Explore the mohalla with <b>W A S D</b> | Find the right Jugaad objects!';
    } else {
      const title = this.inventory.userData.title;
      if (this.stage === 0) {
        const inRange = this.getRoomStationsInRange(pPos);
        const match = inRange.find(s => s.accepts === this.inventory.userData.type);
        if (match) {
          this.markerTarget = up(match.mesh.position, match.markerY + (match.mesh.position.y || 0));
          this.markerLabel = `${short(title)} → ${match.label}`;
          this.markerKind = 'use';
          this.promptTip.innerHTML = `Press <b>[E]</b> — <b>${title}</b> ka jugaad <b>${match.label}</b> pe!`;
          return;
        }
        if (inRange.length) {
          this.markerTarget = up(inRange[0].mesh.position, inRange[0].markerY + (inRange[0].mesh.position.y || 0));
          this.markerLabel = `${inRange[0].label}: ye cheez kaam nahi aayegi`;
          this.markerKind = 'locked';
        }
        if (this.inventory.userData.type === 'brick' && pPos.distanceTo(new THREE.Vector3(-101, 0, 0.5)) < 3.5) {
          this.markerTarget = new THREE.Vector3(-101, 2.2, 1.0);
          this.markerLabel = 'Eent se darwaza thoko';
          this.markerKind = 'use';
          this.promptTip.innerHTML = 'Press <b>[E]</b> to thok the jaam darwaza with the <b>Eent</b>!';
          return;
        }
      } else if (this.stage === 1 && pPos.distanceTo(this.trench.position) < 3.4) {
        this.markerTarget = up(this.trench.position, 1.2);
        this.promptTip.innerHTML = `Press <b>[E]</b> to place <b>${title}</b> across Trench!`;
        return;
      } else if (this.stage === 2 && pPos.distanceTo(this.cow.position) < 3.6) {
        this.markerTarget = up(this.cow.position, 2.6);
        this.promptTip.innerHTML = `Press <b>[E]</b> to offer <b>${title}</b> to Gau Mata!`;
        return;
      }
      this.promptTip.innerHTML = `Carrying <b>${title}</b> | <b>[E]</b> to use / drop`;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setupLoadingGate(['btn-start-game', 'btn-chapter-2']);
  const game = new Game();
  if (import.meta.env && import.meta.env.DEV) window.__game = game; // handy for debugging in the console
});
