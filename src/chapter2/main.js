import * as THREE from 'three';
import { audio } from './audio.js';
import { AssetFactory } from './models.js';
import { Graphics, bindQualitySelect, setupLoadingGate } from '../graphics.js';
import { applyWorldUVs, mergeStaticGroup } from '../materials.js';
import { addStreetDressing, AmbientLife } from '../streetProps.js';
import { InteractGuide, cachedTextSetter, injectGuideCSS } from '../guide.js';

class Game {
  constructor() {
    this.stage = 0; // 0: Stand, 1: Trench Bridge, 2: Tempt Cow, 3: Ride Scooter, 4: Won
    this.meter = 0;
    this.inventory = null;
    this.isRiding = false;
    this.scooterSpeed = 0;
    this.maxSpeed = 13; // was missing -> Math.min(undefined, x) = NaN froze the scooter
    this.isFalling = false;
    this.plankPlaced = false;
    this.plankZ = 0;
    this.plankHalfWidth = 0.95; // Sturdy bridge width
    this.placedPlankType = null;
    this.placedPlankMesh = null;
    this.longPlankPlaced = false;
    this.longPlankMesh = null;
    this.longPlankZ = 0;
    this.shortPlankPlaced = false;
    this.shortPlankMesh = null;
    this.shortPlankZ = 0;

    // Opening Cutscene State
    this.isCutscene = false;
    this.cutsceneTime = 0;
    this.cutscenePhase = 0;

    // Collectibles & Barriers
    this.coins = [];
    this.warningBarrier = null;
    this.trenchEncountered = false;

    // Chances (3 Hearts for Major Accidents) & 3-Minute Muhurat Timer
    this.lives = 3;
    this.gameTimer = 180; // Exactly 3:00 minutes (180 seconds)
    this.timerRunning = false; // Starts ticking ONLY after Chacha finishes phone call cutscene!
    this.currentRunScore = 0;
    this.isGameOver = false;

    this.keys = { left: false, right: false, up: false, down: false };
    this.walkSpeed = 4.0; // natural brisk walk (a little quicker: the shaadi timer is running!)

    this.initScene();
    this.initUI();
    this.setupEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.container = document.getElementById('game-container');
    this.scene = new THREE.Scene();
    // Warm golden-hour haze; the sky itself comes from the Sky shader below
    this.scene.background = new THREE.Color(0xe9b98a);
    this.scene.fog = new THREE.FogExp2(0xe6b88c, 0.011);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-4, 4.8, 9.5);
    this.camera.lookAt(-2, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // Realistic rendering pipeline (sky, HDR light, soft shadows, AO, bloom, SMAA)
    this.gfx = new Graphics(this.renderer, this.scene, this.camera);
    this.gfx.addSunsetSky({ elevation: 5, azimuth: 225, turbidity: 9, rayleigh: 3.2 });
    this.renderer.toneMappingExposure = 0.85;
    this.gfx.loadHDR(import.meta.env.BASE_URL + 'assets/hdr/venice_sunset_1k.hdr', 0.55);

    // Golden-hour lighting: warm low sun + soft sky/ground bounce
    const hemiLight = new THREE.HemisphereLight(0xcfe0ff, 0x6b4a2e, 0.45);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffc98f, 2.6);
    sunLight.castShadow = true;
    this.scene.add(sunLight);
    this.gfx.setupSun(sunLight, { distance: 60, extent: 18 });
    this.gfx.followSun(new THREE.Vector3(-4, 0, 0));

    // Street Environment
    this.env = AssetFactory.createStreetEnvironment();
    this.scene.add(this.env);

    // Vintage Scooter (Parked upright outside home in driveway at x = -2.8, z = 0.0)
    this.scooter = AssetFactory.createVintageScooter();
    this.scooter.position.set(-2.8, 0, 0.0);
    this.scooter.rotation.set(0, 0, 0);
    this.scooter.userData.setFallenState(false);
    this.scooter.userData.riderMesh.visible = false;
    this.scene.add(this.scooter);

    // Chacha's Traditional Bhopali Ancestral Home (x = -6.0, z = -4.8)
    this.chachaHome = AssetFactory.createChachaHome();
    this.chachaHome.position.set(-6.0, 0, -4.8);
    this.scene.add(this.chachaHome);

    // Standing Pixar Boy Character (Initially on home verandah behind doors)
    this.player = AssetFactory.createCartoonBoy({ style: 'chacha' });
    this.player.position.set(-6.0, 0.32, -4.6);
    this.player.visible = false;
    this.scene.add(this.player);

    // Dynamic Falling Phone Mesh used for 3D cutscene drop animation
    this.fallingPhoneMesh = AssetFactory.createBrokenPhoneBack();
    const fallingScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    fallingScreen.rotation.x = -Math.PI / 2;
    fallingScreen.position.set(0, 0.024, 0);
    this.fallingPhoneMesh.add(fallingScreen);
    this.fallingPhoneMesh.visible = false;
    this.scene.add(this.fallingPhoneMesh);

    // Road Excavation Trench at x = 45.8 (Starts at x = 44.0, exactly 50m from Chacha's house at x = -6.0)
    this.trench = AssetFactory.createRoadTrench();
    this.trench.position.set(45.8, 0, 0);
    this.scene.add(this.trench);

    // Excavated Construction Rubble & Municipal Barricade on Sidewalk beside Trench
    this.footpathRubble = AssetFactory.createFootpathRubble();
    this.footpathRubble.position.set(45.8, 0.08, -5.0);
    this.scene.add(this.footpathRubble);

    // Cartoon Cow at x = 62.0, z = -0.2 (Level 3 Roadblock past trench)
    this.cow = AssetFactory.createCartoonCow();
    this.cow.position.set(62.0, 0, -0.2);
    this.cow.rotation.y = -Math.PI / 2;
    this.scene.add(this.cow);

    // Chachi Character at Sheesh Mahal on Red Carpet (x = 77.8, z = 0.3)
    this.chachi = AssetFactory.createCartoonChachi();
    this.chachi.position.set(77.8, 0, 0.3);
    this.chachi.rotation.y = -Math.PI / 2 - 0.25; // Angled facing the camera
    this.scene.add(this.chachi);

    // VIP Scooter Parking Bay outside Sheesh Mahal Gate (x = 74.0, z = -2.2)
    this.parkingBay = AssetFactory.createParkingBay();
    this.parkingBay.position.set(74.0, 0.02, -2.2);
    this.scene.add(this.parkingBay);
    this.parkingArrow = this.parkingBay.userData.arrow;

    // Scattered Puzzle Items
    this.items = [];

    // Broken Phone Pieces (Initially spawned during cutscene on the verandah floor)
    this.phoneScreenItem = AssetFactory.createBrokenPhoneScreen();
    this.phoneScreenItem.position.set(-5.8, 0.32, -3.4);
    this.phoneScreenItem.userData = { type: 'broken_phone', title: 'Toota Hua Phone', isPhone: true };
    this.phoneScreenItem.visible = false;
    this.scene.add(this.phoneScreenItem);
    this.items.push(this.phoneScreenItem);

    this.phoneBackItem = AssetFactory.createBrokenPhoneBack();
    this.phoneBackItem.position.set(-6.1, 0.32, -3.2);
    this.phoneBackItem.visible = false;
    this.scene.add(this.phoneBackItem);

    // Kabaad Ka Dher (Tools & Scrap Corner at left sidewalk corner x = -9.2, z = -2.8)
    this.junkPile = AssetFactory.createJunkToolCorner();
    this.junkPile.position.set(-9.2, 0.32, -2.8);
    if (this.junkPile.userData && this.junkPile.userData.labelMesh) {
      this.junkPile.userData.labelMesh.visible = false;
    }
    this.scene.add(this.junkPile);

    // Level 2 Plank 1: Long Sturdy Timber Bridge (4.2m) leaning against Building Wall near Trench (x = 39.0)
    const plank = AssetFactory.createTimberPlank();
    plank.position.set(39.0, 2.05, -5.0);
    plank.rotation.set(-0.14, Math.PI / 2, Math.PI / 2);
    this.scene.add(plank);
    this.items.push(plank);

    // Level 2 Plank 2: Short Plank Distractor (2.2m) leaning against Wall right beside Trench (x = 41.5)
    const shortPlank = AssetFactory.createShortPlank();
    shortPlank.position.set(41.5, 1.05, -5.0);
    shortPlank.rotation.set(-0.14, Math.PI / 2, Math.PI / 2);
    this.scene.add(shortPlank);
    this.items.push(shortPlank);

    // Level 3 Grass Item (Cow feed near Chai Stall at x = 58.5)
    const grass = AssetFactory.createGrassRotiBasket();
    grass.position.set(58.5, 0, -3.2);
    this.scene.add(grass);
    this.items.push(grass);

    // Level 4 Climax Puzzle Props on Sidewalk / Footpath near Sheesh Mahal (z = -3.8)
    // Sidewalk top surface is y = 0.255m; items placed at y = 0.28-0.34m so they are 100% visible and unburied!
    const brick = AssetFactory.createBrick();
    brick.position.set(74.8, 0.28, -3.8);
    this.scene.add(brick);
    this.items.push(brick);

    const broom = AssetFactory.createBroom();
    broom.position.set(75.6, 0.32, -3.85);
    broom.rotation.set(0.08, 0.35, 0.04);
    this.scene.add(broom);
    this.items.push(broom);

    const tyre = AssetFactory.createOldTyre();
    tyre.position.set(76.4, 0.30, -3.8);
    tyre.rotation.set(Math.PI / 2, 0, 0.3);
    this.scene.add(tyre);
    this.items.push(tyre);

    // 13 Shiny Collectible Desi Rupee Coins along the 50m road (Slalom S-Curve for exciting steering!)
    const coinCoords = [
      { x: 3.5, z: -1.4 },
      { x: 8.0, z: 1.4 },
      { x: 13.0, z: -1.6 },
      { x: 18.0, z: 1.6 },
      { x: 23.0, z: -1.2 },
      { x: 28.0, z: 1.2 },
      { x: 33.0, z: -1.5 },
      { x: 38.0, z: 1.5 },
      { x: 41.5, z: 0.0 }, // Right before trench!
      { x: 45.8, z: 0.0 }, // Directly on the plank bridge!
      { x: 50.0, z: 1.0 },
      { x: 67.0, z: -0.8 },
      { x: 73.0, z: 0.0 }
    ];
    this.coins = coinCoords.map(pos => {
      const c = AssetFactory.createDesiCoin();
      c.position.set(pos.x, 0.65, pos.z);
      this.scene.add(c);
      return c;
    });

    // Universal Static Colliders (Permanent Structures in Bhopal Mohalla)
    this.staticColliders = [
      // 1. Chacha's Home main back wall and verandah props (Verandah surface is 100% walkable!)
      { type: 'box', minX: -9.5, maxX: -2.5, minZ: -10.0, maxZ: -4.8, name: 'HomeBackWall' },
      { type: 'circle', x: -3.6, z: -3.4, radius: 0.45, name: 'TulsiPot' },
      { type: 'box', minX: -9.8, maxX: -8.6, minZ: -3.4, maxZ: -2.2, name: 'JunkPile' },

      // 2. Chai Tapri (x = 18.0, z = -4.0)
      { type: 'box', minX: 16.5, maxX: 19.5, minZ: -4.8, maxZ: -3.2, name: 'ChaiStall' },

      // 3. North buildings wall along road (sidewalk barrier spanning entire street)
      { type: 'box', minX: 2.0, maxX: 78.0, minZ: -10.0, maxZ: -4.4, name: 'NorthBuildings' },

      // 4. South boundary railing along road
      { type: 'box', minX: -16.0, maxX: 94.0, minZ: 3.2, maxZ: 10.0, name: 'SouthRailing' },

      // 5. Sheesh Mahal Palace Facade Walls & Side Wings (at x = 80.0)
      { type: 'box', minX: 79.6, maxX: 80.6, minZ: -6.0, maxZ: -1.35, name: 'PalaceWallLeft' },
      { type: 'box', minX: 79.6, maxX: 80.6, minZ: 1.35, maxZ: 6.0, name: 'PalaceWallRight' },
      { type: 'box', minX: 83.0, maxX: 95.0, minZ: -6.0, maxZ: 6.0, name: 'PalaceBackBoundary' },

      // 6. Footpath Excavated Construction Rubble & Municipal Barricade (Blocks pedestrian bypass around trench)
      { type: 'box', minX: 43.6, maxX: 48.0, minZ: -6.5, maxZ: -3.3, name: 'FootpathRubble' }
    ];

    // Dazed Character (Spawned after accident)
    this.dazedGuy = AssetFactory.createDazedCharacter();
    this.dazedGuy.visible = false;
    this.scene.add(this.dazedGuy);

    this.isAccident = false;
    this.shakeDuration = 0;

    this.initExhaustParticles();
    this.initSplashParticles();
    this.initConfetti();

    // On-screen guidance: [E] labels + ground ring near usable things, arrow over the next objective
    injectGuideCSS();
    this.guide = new InteractGuide(this.scene, this.camera);

    // Street dressing (shops, windows, wires, trees, skyline) + birds & dust
    addStreetDressing(this.scene);
    this.life = new AmbientLife(this.scene);

    // Shadows: everything receives; only objects big enough to matter cast (small beads, coins,
    // cones etc. were costing a full extra draw each in the shadow pass)
    const sphere = new THREE.Sphere();
    const scl = new THREE.Vector3();
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((o) => {
      if (!o.isMesh || o.userData.noShadow) return;
      const basic = o.material && o.material.isMeshBasicMaterial;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      o.getWorldScale(scl);
      const r = o.geometry.boundingSphere.radius * Math.max(scl.x, scl.y, scl.z);
      o.castShadow = !basic && r > 0.28;
      o.receiveShadow = !basic;
    });
    // Characters, scooter and cow always cast (they read as grounded)
    [this.player, this.scooter, this.cow, this.chachi].forEach(obj => obj && obj.traverse(m => {
      if (m.isMesh && !(m.material && m.material.isMeshBasicMaterial)) m.castShadow = true;
    }));
    applyWorldUVs(this.scene);

    // Static batching: merge the fixed street + trench pieces into one mesh per material
    mergeStaticGroup(this.env);
    mergeStaticGroup(this.trench);
    if (this.footpathRubble) mergeStaticGroup(this.footpathRubble);
    // Faces are many tiny parts that never move on their own – merge each head
    [this.player, this.chachi, this.cow].forEach(obj => {
      const head = obj && obj.userData && obj.userData.headGroup;
      if (head) mergeStaticGroup(head);
    });
  }

  initSplashParticles() {
    this.splashParticles = [];
    const pGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const splashColors = [0x38bdf8, 0x0284c7, 0x7dd3fc, 0x78350f, 0x451a03];
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: splashColors[i % splashColors.length],
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(pGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.splashParticles.push({
        mesh,
        life: 0,
        maxLife: 1.0,
        vel: new THREE.Vector3()
      });
    }
  }

  emitWaterSplash(pos) {
    if (!this.splashParticles) return;
    for (let i = 0; i < 35; i++) {
      const p = this.splashParticles.find(pt => !pt.mesh.visible);
      if (!p) break;
      p.mesh.position.set(
        pos.x + (Math.random() - 0.5) * 1.2,
        pos.y + 0.15,
        pos.z + (Math.random() - 0.5) * 1.2
      );
      p.mesh.visible = true;
      p.life = 0;
      p.maxLife = 0.8 + Math.random() * 0.6;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 4.5;
      p.vel.set(
        Math.cos(angle) * speed * 0.6,
        3.8 + Math.random() * 4.2, // Upward splash fountain
        Math.sin(angle) * speed * 0.6
      );
      p.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
    }
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

  emitTyreDust(pos) {
    if (!this.dustPuffs) {
      this.dustPuffs = [];
      const geo = new THREE.SphereGeometry(0.1, 6, 6);
      for (let i = 0; i < 30; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }));
        m.visible = false;
        m.userData.noShadow = true;
        this.scene.add(m);
        this.dustPuffs.push({ mesh: m, life: 0, maxLife: 1, vel: new THREE.Vector3() });
      }
    }
    const p = this.dustPuffs.find(d => !d.mesh.visible);
    if (!p) return;
    p.mesh.position.copy(pos);
    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = 0.7 + Math.random() * 0.5;
    p.vel.set(-0.8 - Math.random(), 0.35 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8);
  }

  updateTyreDust(delta) {
    if (!this.dustPuffs) return;
    this.dustPuffs.forEach(p => {
      if (!p.mesh.visible) return;
      p.life += delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.multiplyScalar(0.96);
      const k = p.life / p.maxLife;
      p.mesh.scale.setScalar(0.6 + k * 2.2);
      p.mesh.material.opacity = 0.45 * (1 - k);
      if (k >= 1) p.mesh.visible = false;
    });
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

  // Unified Real-Time Colliders (Dynamic Scooter & Cow + Static World Obstacles)
  getColliders() {
    const list = [...this.staticColliders];

    // 1. Dynamic Solid Scooter Barrier (Active whenever player is on foot)
    if (!this.isRiding && this.scooter) {
      list.push({
        type: 'box',
        minX: this.scooter.position.x - 1.15,
        maxX: this.scooter.position.x + 1.15,
        minZ: this.scooter.position.z - 0.55,
        maxZ: this.scooter.position.z + 0.55,
        name: 'Scooter'
      });
    }

    // 2. Dynamic Solid Cow Barrier (Follows cow wherever Gau Mata moves)
    if (this.cow) {
      list.push({
        type: 'circle',
        x: this.cow.position.x,
        z: this.cow.position.z,
        radius: 1.45,
        name: 'Cow'
      });
    }

    return list;
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

    if (this.questText) this.questText.textContent = '📞 Chachi ka urgent call suniye...';
    this.initRadialWheel();
  }

  showDialogue(speaker, text) {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.dialogueSpeaker.textContent = `🗣️ ${speaker}`;
    this.dialogueText.textContent = `"${text}"`;
    this.dialogueBox.style.display = 'block';
    clearTimeout(this.dialogueTimeout);
    this.dialogueTimeout = setTimeout(() => {
      this.dialogueBox.style.display = 'none';
    }, 5500);
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

  // 1. Cinematic Opening Cutscene (Sheesh Mahal Call -> Mohalla Flyover -> Chacha's Phone Drop)
  startCutscene() {
    this.isCutscene = true;
    this.cutsceneTime = 0;
    this.cutscenePhase = 1;
    this.phoneDropped = false;
    this.keys = { left: false, right: false, up: false, down: false };

    // Reset phone drop pieces visibility (strictly 2 pieces: screen and back)
    if (this.fallingPhoneMesh) this.fallingPhoneMesh.visible = false;
    if (this.phoneScreenItem) this.phoneScreenItem.visible = false;
    if (this.phoneBackItem) this.phoneBackItem.visible = false;

    // Scooter starts standing upright in driveway
    if (this.scooter && this.scooter.userData.setFallenState) {
      this.scooter.userData.setFallenState(false);
    }

    // Reset Chacha Home doors closed initially
    if (this.chachaHome) this.chachaHome.userData.closeDoors();

    // Chacha starts inside doorway, hidden initially
    this.player.position.set(-6.0, 0.32, -4.6);
    this.player.visible = false;
    if (this.player.userData.setPhoneCallPose) this.player.userData.setPhoneCallPose(false);

    // Hide junk pile label and gameplay UI during cutscene
    if (this.junkPile && this.junkPile.userData && this.junkPile.userData.labelMesh) {
      this.junkPile.userData.labelMesh.visible = false;
    }

    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    if (this.promptTip) this.promptTip.innerHTML = '';

    const overlay = document.getElementById('cutscene-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }

    const speakerTitle = document.getElementById('cutscene-speaker-title');
    const cutsceneText = document.getElementById('cutscene-text');
    if (speakerTitle) speakerTitle.textContent = '👰 Chachi (Sheesh Mahal Mandap)';
    if (cutsceneText) cutsceneText.textContent = '"Arey suno! Baaraat dwar par khadi hai! Pandit ji gusse me hain! Guddu ka dulha sehra leke turant aao!"';

    audio.playPhoneRing();

    // Position camera framing Chachi from comfortable medium-wide angle
    this.camera.position.set(72.2, 1.85, 2.8);
    this.camera.lookAt(77.8, 1.25, 0.3);
  }

  endCutscene() {
    if (!this.isCutscene) return;
    this.isCutscene = false;
    this.timerRunning = true; // 3-Minute Muhurat Timer starts counting down now!
    this.updateTimerDisplay();

    // Show gameplay UI overlay now that cutscene is finished and phone has dropped
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'flex';

    if (this.junkPile && this.junkPile.userData && this.junkPile.userData.labelMesh) {
      this.junkPile.userData.labelMesh.visible = true;
    }

    // Ensure Chacha's doors remain open
    if (this.chachaHome) this.chachaHome.userData.openDoors();

    // Ensure broken phone pieces are visible on verandah (strictly 2 pieces: screen and back)
    if (this.phoneScreenItem) this.phoneScreenItem.visible = true;
    if (this.phoneBackItem) this.phoneBackItem.visible = true;
    if (this.fallingPhoneMesh) this.fallingPhoneMesh.visible = false;

    // Chacha stands on verandah looking down at broken phone
    this.player.position.set(-5.8, 0.32, -3.0);
    this.player.rotation.y = 0.2;
    this.player.visible = true;
    if (this.player.userData.setPhoneCallPose) this.player.userData.setPhoneCallPose(false);
    if (this.player.userData.rightArmPivot) this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
    if (this.player.userData.leftArmPivot) this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
    if (this.player.userData.leftLegPivot) this.player.userData.leftLegPivot.rotation.set(0, 0, 0);
    if (this.player.userData.rightLegPivot) this.player.userData.rightLegPivot.rotation.set(0, 0, 0);
    if (this.player.userData.headGroup) this.player.userData.headGroup.rotation.set(0, 0, 0);

    const overlay = document.getElementById('cutscene-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '1';
      }, 400);
    }

    // Return camera smoothly framing Chacha and the verandah
    this.camera.position.set(-3.2, 2.1, 0.2);
    this.camera.lookAt(-6.0, 1.25, -3.4);

    this.questText.textContent = 'Toota phone theek karein aur Chetak scooter par sawar hon!';
    this.promptTip.innerHTML = '✨ Toota Phone uthayein [E] ya Kabaad Dher se tool chunein!';
  }

  setStage(newStage) {
    this.stage = newStage;
    try {
      sessionStorage.setItem('bhopali_stage', newStage.toString());
    } catch (e) {}
  }

  resumeInGameSession() {
    const savedStage = parseInt(sessionStorage.getItem('bhopali_stage') || '0', 10);
    this.stage = savedStage;
    this.isCutscene = false;
    this.timerRunning = true;
    this.updateTimerDisplay();

    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'flex';

    if (this.junkPile && this.junkPile.userData && this.junkPile.userData.labelMesh) {
      this.junkPile.userData.labelMesh.visible = true;
    }

    const cutOverlay = document.getElementById('cutscene-overlay');
    if (cutOverlay) cutOverlay.style.display = 'none';

    audio.init();
    if (!audio.musicPlaying) audio.startDesiBGM();

    if (savedStage === 0) {
      this.updateMeter(0);
      if (this.chachaHome) this.chachaHome.userData.openDoors();
      this.player.position.set(-5.8, 0.32, -3.0);
      this.player.rotation.set(0, 0.2, 0);
      this.player.visible = true;
      if (this.player.userData.setPhoneCallPose) this.player.userData.setPhoneCallPose(false);

      if (this.phoneScreenItem) this.phoneScreenItem.visible = true;
      if (this.phoneBackItem) this.phoneBackItem.visible = true;
      if (this.fallingPhoneMesh) this.fallingPhoneMesh.visible = false;

      this.camera.position.set(-3.2, 2.1, 0.2);
      this.camera.lookAt(-6.0, 1.25, -3.4);

      this.questText.textContent = 'Toota phone theek karein aur Chetak scooter par sawar hon!';
      this.promptTip.innerHTML = '✨ Toota Phone uthayein [E] ya baayin taraf Kabaad Dher se tool chunein!';
    } else if (savedStage === 1) {
      this.updateMeter(25);
      if (this.chachaHome) this.chachaHome.userData.openDoors();
      this.player.position.set(-1.5, 0, 0.5);
      this.player.visible = true;
      this.scooter.userData.riderMesh.visible = false;
      this.camera.position.set(1.5, 2.4, 7.5);
      this.camera.lookAt(0, 1.3, 0);
      this.questText.textContent = 'Sadak par 2m gehra gaddha hai! Lakdi ka phatta lagakar pull banayein!';
      this.promptTip.innerHTML = '✨ Press <b>[E]</b> to Kickstart & Mount Chetak Scooter!';
    } else if (savedStage === 2) {
      this.updateMeter(50);
      if (this.chachaHome) this.chachaHome.userData.openDoors();
      this.plankPlaced = true;
      this.trenchEncountered = true;
      this.isRiding = true;
      this.player.visible = false;
      this.scooter.userData.riderMesh.visible = true;
      this.scooter.position.set(49.0, 0, 0);
      this.camera.position.set(53.5, 2.2, 8.8);
      this.camera.lookAt(51.0, 1.4, 0);
      this.questText.textContent = 'Gau Mata sadak par aaram kar rahi hain! Taazi ghaas khilayein!';
      this.promptTip.innerHTML = 'Gau Mata ke paas badhein | Watch road!';
    } else if (savedStage === 3) {
      this.updateMeter(75);
      if (this.chachaHome) this.chachaHome.userData.openDoors();
      this.plankPlaced = true;
      this.trenchEncountered = true;
      this.cow.userData.isDistracted = true;
      this.cow.userData.state = 'eating';
      this.isRiding = true;
      this.player.visible = false;
      this.scooter.userData.riderMesh.visible = true;
      this.scooter.position.set(64.0, 0, 0);
      this.camera.position.set(68.5, 2.2, 8.8);
      this.camera.lookAt(66.0, 1.4, 0);
      this.questText.textContent = 'Full throttle bhagao! Sheesh Mahal gate ke bahar VIP Parking me lagao!';
      this.promptTip.innerHTML = '🅿️ VIP Parking Bay me Chetak park karein!';
    } else if (savedStage === 4) {
      this.updateMeter(75);
      if (this.chachaHome) this.chachaHome.userData.openDoors();
      this.isRiding = false;
      this.scooter.position.set(74.0, 0, -2.2);
      this.scooter.userData.setFallenState(true);
      this.scooter.userData.riderMesh.visible = false;
      if (this.parkingArrow) this.parkingArrow.visible = false;
      this.player.position.set(73.2, 0, -1.2);
      this.player.visible = true;
      this.camera.position.set(76.5, 2.1, 7.8);
      this.camera.lookAt(74.5, 1.25, -1.8);
      this.questText.textContent = 'Chetak ka stand toot gaya! Deewal ke paas pade samaan se scooter ko khada karein!';
      this.promptTip.innerHTML = 'Deewal ke paas dekhein [E] | Chetak ko khada karein!';
    } else {
      // Stage 5 or invalid: clean restart from initial point (Stage 0)
      this.setStage(0);
      this.resumeInGameSession();
    }
  }

  triggerTrenchFall(isRiding) {
    if (this.isFalling) return;
    this.isFalling = true;
    this.trenchLanded = false;
    this.trenchFallVel = -1.2;
    this.trenchTargetX = 45.8;

    if (isRiding) {
      this.scooterSpeed = 0;
      audio.stopScooterEngine();
    }
  }

  // --- CIRCULAR RADIAL SELECTION WHEEL (GTA/RPG STYLE) ---
  initRadialWheel() {
    this.radialWheelModal = document.getElementById('radial-wheel-modal');
    const hubIcon = document.getElementById('radial-hub-icon');
    const hubName = document.getElementById('radial-hub-name');
    const hubScore = document.getElementById('radial-hub-score');

    const toolsInfo = {
      rubber: { icon: '🟡', name: 'Mithai Rubber Band', score: '⭐ 100% Best Jugaad (+300 Swag Score)' },
      hammer: { icon: '🔨', name: 'Bhari Desi Hathoda', score: '⚠️ High Risk! Phone Chur-Chur (-200)' },
      rope: { icon: '🪢', name: 'Moti Jute Ki Rassi', score: '❌ Too Thick! Jeb me nahi aayegi' },
      tape: { icon: '🩹', name: 'Chupkaoo Cello Tape', score: '⭐ OK Jugaad (+100 Swag / Kam Score)' }
    };

    const setupBtn = (btnId, type) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('mouseenter', () => {
        const info = toolsInfo[type];
        if (hubIcon) hubIcon.textContent = info.icon;
        if (hubName) hubName.textContent = info.name;
        if (hubScore) hubScore.textContent = info.score;
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectJunkTool(type);
      });
    };

    setupBtn('btn-radial-rubber', 'rubber');
    setupBtn('btn-radial-hammer', 'hammer');
    setupBtn('btn-radial-rope', 'rope');
    setupBtn('btn-radial-tape', 'tape');

    const btnClose = document.getElementById('btn-close-wheel');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeRadialWheel();
      });
    }

    // Keyboard shortcut handler for radial wheel (1-4, Esc)
    window.addEventListener('keydown', (e) => {
      if (this.radialWheelModal && this.radialWheelModal.style.display === 'flex') {
        if (e.key === '1') { this.selectJunkTool('rubber'); }
        else if (e.key === '2') { this.selectJunkTool('hammer'); }
        else if (e.key === '3') { this.selectJunkTool('rope'); }
        else if (e.key === '4') { this.selectJunkTool('tape'); }
        else if (e.key === 'Escape') { this.closeRadialWheel(); }
      }
    });
  }

  openRadialWheel() {
    if (this.radialWheelModal) {
      const junkWorldPos = new THREE.Vector3(-10.8, 3.1, -3.9);
      const proj = junkWorldPos.clone().project(this.camera);
      if (proj.z < 1) {
        const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;
        this.radialWheelModal.style.left = `${sx}px`;
        this.radialWheelModal.style.top = `${sy}px`;
      }
      this.radialWheelModal.style.display = 'flex';
      audio.init();
    }
  }

  closeRadialWheel() {
    if (this.radialWheelModal) {
      this.radialWheelModal.style.display = 'none';
    }
  }

  selectJunkTool(toolType) {
    this.closeRadialWheel();
    audio.init();

    // WORKFLOW 1: Player ALREADY CARRIES Broken Phone in hands!
    if (this.inventory && this.inventory.userData.isPhone) {
      if (toolType === 'rubber') {
        // High Score Best Jugaad! Phone goes into pocket!
        this.player.remove(this.inventory);
        this.inventory = null;
        if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
          this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
          this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
        }

        this.setStage(1);
        this.updateMeter(25);
        this.addScore(300, 3);
        audio.playPhoneRebootSound();
        audio.playJugaadSuccess();
        this.triggerJugaadToast('🎉 JUGAAD 1: RUBBER BAND SE PHONE REPAIRED! (+300 PTS)');
        this.questText.textContent = 'Phone jeb me rakh liya! Chetak Scooter par baitho [E] aur VIP Road Sheesh Mahal ki taraf nikal pado!';
        this.promptTip.innerHTML = 'Press <b>[E]</b> near Chetak Scooter to Kickstart & Mount!';
        return;
      } else if (toolType === 'tape') {
        // Alternative OK Jugaad (Lower Score) - Phone goes into pocket!
        this.player.remove(this.inventory);
        this.inventory = null;
        if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
          this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
          this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
        }

        this.setStage(1);
        this.updateMeter(25);
        this.addScore(100, 1);
        audio.playTapeSound();
        audio.playPhoneRebootSound();
        audio.playJugaadSuccess();
        this.triggerJugaadToast('🩹 JUGAAD 1: TAPE SE PHONE JUD GAYA! (+100 PTS)');
        this.questText.textContent = 'Phone jeb me rakh liya! Chetak Scooter par baitho [E] aur VIP Road Sheesh Mahal ki taraf nikal pado!';
        this.promptTip.innerHTML = 'Press <b>[E]</b> near Chetak Scooter to Kickstart & Mount!';
        return;
      } else if (toolType === 'rope') {
        audio.playBrickThud();
        this.addScore(-50, 0);
        this.spawnFloatingScore('⚠️ -50 SWAG! TOO THICK!', this.player.position);
        this.promptTip.innerHTML = '⚠️ Rassi bahut moti hai! Kabaad Dher [E] se patla jugaad chuno!';
        return;
      } else if (toolType === 'hammer') {
        // CATASTROPHIC DISASTER!
        this.triggerHammerDisaster();
        return;
      }
    }

    // WORKFLOW 2: Player selects Tool first (Chacha carries the tool in hands)
    if (this.inventory) {
      this.player.remove(this.inventory);
      this.inventory = null;
    }

    let toolMesh = null;
    if (toolType === 'rubber') {
      toolMesh = AssetFactory.createMithaiRubberBand();
    } else if (toolType === 'hammer') {
      toolMesh = AssetFactory.createHammerItem();
    } else if (toolType === 'rope') {
      toolMesh = AssetFactory.createThickRope();
    } else if (toolType === 'tape') {
      toolMesh = AssetFactory.createCelloTapeItem();
    }

    if (toolMesh) {
      this.inventory = toolMesh;
      this.player.add(toolMesh);
      toolMesh.position.set(0, 1.28, 0.56);
      toolMesh.rotation.set(0.35, 0, 0);

      if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
        this.player.userData.leftArmPivot.rotation.set(-1.25, -0.15, -0.22);
        this.player.userData.rightArmPivot.rotation.set(-1.25, 0.15, 0.22);
      }

      audio.playBrickThud();
      this.promptTip.innerHTML = `Carrying: <b>${toolMesh.userData.title}</b>. Toota Phone ke paas jakar [E] dabayein!`;
    }
  }

  // --- CATASTROPHIC HAMMER DISASTER EVENT ---
  triggerHammerDisaster() {
    audio.playHammerSmashPhone();
    this.shakeDuration = 0.65;

    // Determine smash position (at Chacha's feet if carrying or near junk, else at current phone location)
    const smashPos = (this.inventory && this.inventory.userData.isPhone)
      ? new THREE.Vector3(this.player.position.x, 0.32, this.player.position.z)
      : (this.phoneCurrentPos || new THREE.Vector3(-5.8, 0.32, -3.4));

    // Remove phone if carried
    if (this.inventory && this.inventory.userData.isPhone) {
      this.player.remove(this.inventory);
      this.inventory = null;
    }
    // Remove broken phone pieces from verandah floor (strictly 2 pieces: screen and back)
    [this.phoneScreenItem, this.phoneBackItem].forEach(item => {
      if (item) {
        this.scene.remove(item);
        this.items = this.items.filter(it => it !== item);
      }
    });

    // Spawn crushed flat smashed phone debris at smashPos
    if (this.smashedPhoneMesh) this.scene.remove(this.smashedPhoneMesh);
    this.smashedPhoneMesh = AssetFactory.createSmashedPhoneDebris();
    this.smashedPhoneMesh.position.set(smashPos.x, 0.32, smashPos.z);
    this.scene.add(this.smashedPhoneMesh);

    // Deduct 1 Heart for Major Disaster & Score Penalty: -200 Swag Score!
    this.deductLife('Hathoda se phone chur-chur kar diya! (-1 Heart)');
    this.addScore(-200, 0);
    this.spawnFloatingScore('💥 -200 SWAG POINTS! PHONE CHUR-CHUR!', new THREE.Vector3(smashPos.x, 1.2, smashPos.z));
    this.triggerJugaadToast('💥 DISASTER! PHONE PAR HATHODA MAAR DIYA! (-200 PTS)');

    // Comic shock animation for Chacha
    if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
      this.player.userData.leftArmPivot.rotation.set(-2.2, 0.35, -0.65);
      this.player.userData.rightArmPivot.rotation.set(-2.2, -0.35, 0.65);
    }
    if (this.player.userData.headGroup) {
      this.player.userData.headGroup.rotation.x = 0.3;
    }

    // Auto-Recovery after 2.8 seconds (only if lives remain)
    setTimeout(() => {
      if (this.lives <= 0) return;
      if (this.smashedPhoneMesh) {
        this.scene.remove(this.smashedPhoneMesh);
        this.smashedPhoneMesh = null;
      }

      // Respawn 2 phone pieces slightly into the open sidewalk area (not overlapping Kabaad Dher corner)
      const respawnX = smashPos.x < -8.0 ? smashPos.x + 0.8 : smashPos.x;
      const respawnZ = smashPos.z < -2.4 ? smashPos.z + 0.7 : smashPos.z;
      this.phoneCurrentPos = new THREE.Vector3(respawnX, 0.32, respawnZ);
      this.phoneScreenItem.position.set(respawnX, 0.32, respawnZ);
      this.phoneScreenItem.visible = true;
      this.scene.add(this.phoneScreenItem);
      this.items.push(this.phoneScreenItem);

      this.phoneBackItem.position.set(respawnX - 0.25, 0.32, respawnZ + 0.15);
      this.phoneBackItem.visible = true;
      this.scene.add(this.phoneBackItem);

      if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
        this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
        this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
      }
      if (this.player.userData.headGroup) {
        this.player.userData.headGroup.rotation.set(0, 0, 0);
      }

      this.promptTip.innerHTML = '⚠️ Kabaad Dher [E] ke paas jayein | Rubber Band ya Cello Tape chuno!';
    }, 2800);
  }

  // 2. Floating 3D -> Screen Score FX
  spawnFloatingScore(text, worldPos) {
    const container = document.getElementById('floating-score-container');
    if (!container) return;
    const v = worldPos.clone();
    v.project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = 'floating-score';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1100);
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

      // Skip cutscene on Space / Enter / Escape
      if (this.isCutscene) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
          this.endCutscene();
        }
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = true;

      if (e.code === 'KeyE' && !e.repeat) this.handleAction();
      if (e.code === 'Space' || e.code === 'KeyH') {
        audio.playHorn();
      }
    });

    const btnSkipCutscene = document.getElementById('btn-skip-cutscene');
    if (btnSkipCutscene) {
      btnSkipCutscene.addEventListener('click', (e) => {
        e.stopPropagation();
        this.endCutscene();
      });
    }

    window.addEventListener('keyup', (e) => {
      if (this.isCutscene) return;
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
        if (this.isCutscene) return;
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
        if (this.isCutscene) return;
        audio.init();
        if (!audio.musicPlaying) audio.startDesiBGM();
        this.handleAction();
      });
    }

    const btnHonk = document.getElementById('btn-honk');
    if (btnHonk) {
      btnHonk.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.isCutscene) return;
        audio.init();
        audio.playHorn();
      });
    }

    window.addEventListener('pointerdown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      // Do NOT trigger in-game actions while on landing, map, or intro overlays!
      const landing = document.getElementById('landing-screen');
      const intro = document.getElementById('intro-screen');
      const radial = document.getElementById('radial-wheel-modal');
      if ((landing && landing.style.display !== 'none') ||
          (intro && intro.style.display !== 'none') ||
          (radial && radial.style.display === 'flex')) {
        return;
      }
      audio.init();
      if (!audio.musicPlaying) audio.startDesiBGM();
      this.handleAction();
    });

    // Replay button inside victory modal
    const btnReplay = document.getElementById('btn-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        sessionStorage.removeItem('bhopali_stage');
        sessionStorage.setItem('bhopali_in_game', 'true');
        sessionStorage.setItem('bhopali_restart_flow', 'intro_conversation');
        sessionStorage.setItem('bhopali_skip_flight', 'true');
        window.location.reload();
      });
    }

    // Accident respawn button
    const btnAccRespawn = document.getElementById('btn-accident-respawn');
    if (btnAccRespawn) {
      btnAccRespawn.addEventListener('click', () => {
        if (this.lives > 0) {
          this.resetAfterAccident();
        } else {
          const accModal = document.getElementById('accident-modal');
          if (accModal) accModal.style.display = 'none';
          this.triggerGameOver('Gau Mata se takkar maar di aur 3 galtiyan ho gayin!');
        }
      });
    }

    // Game Over Restart button ("Phir Se Koshish Karo") -> Starts fresh run from intro conversation
    const btnRestartGame = document.getElementById('btn-restart-game');
    if (btnRestartGame) {
      btnRestartGame.addEventListener('click', () => {
        sessionStorage.removeItem('bhopali_stage');
        sessionStorage.setItem('bhopali_in_game', 'true');
        sessionStorage.setItem('bhopali_restart_flow', 'intro_conversation');
        sessionStorage.setItem('bhopali_skip_flight', 'true');
        window.location.reload();
      });
    }

    // Game Over Home / Main Menu button -> Goes directly to Home Screen without flying plane intro
    const btnGameOverHome = document.getElementById('btn-game-over-home');
    if (btnGameOverHome) {
      btnGameOverHome.addEventListener('click', () => {
        sessionStorage.removeItem('bhopali_stage');
        sessionStorage.removeItem('bhopali_in_game');
        sessionStorage.removeItem('bhopali_restart_flow');
        sessionStorage.setItem('bhopali_skip_flight', 'true');
        window.location.reload();
      });
    }

    // Initialize persistent Stars & Desi Swag Score
    this.initStats();

    // Check if player was already playing in-game (session persistence on F5 reload)
    const wasInGame = sessionStorage.getItem('bhopali_in_game') === 'true';
    const skipFlight = sessionStorage.getItem('bhopali_skip_flight') === 'true';
    if (skipFlight) {
      sessionStorage.removeItem('bhopali_skip_flight');
    }

    // 1. Supersonic Paper Plane Intro Launch Screen (Constant-Speed Arc-Length Flight)
    const introScreen = document.getElementById('intro-screen');
    const plane = document.getElementById('flying-plane');
    if (wasInGame || skipFlight) {
      if (introScreen) introScreen.style.display = 'none';
    } else if (introScreen && plane) {
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

    // Landing Screen & Game Session Handlers
    const landingScreen = document.getElementById('landing-screen');
    const settingsModal = document.getElementById('settings-modal');

    // Arriving from Chapter 1 (index.html victory): skip intro/landing, show story bridge
    let fromCh1 = false;
    try { fromCh1 = sessionStorage.getItem('jugaad_from_ch1') === '1'; } catch (e) {}
    const bridge = document.getElementById('story-bridge');
    if (fromCh1 && !wasInGame && bridge) {
      try { sessionStorage.removeItem('jugaad_from_ch1'); } catch (e) {}
      if (introScreen) introScreen.style.display = 'none';
      if (landingScreen) landingScreen.style.display = 'none';
      audio.stopPlaneWhoosh();
      bridge.classList.add('show');
      const go = document.getElementById('btn-bridge-go');
      if (go) go.addEventListener('click', (e) => {
        e.stopPropagation();
        bridge.classList.remove('show');
        startGame();
      });
    }

    const startGame = () => {
      sessionStorage.setItem('bhopali_in_game', 'true');
      this.setStage(0);
      if (landingScreen) landingScreen.style.display = 'none';
      
      this.lives = 3;
      this.updateLivesDisplay();
      this.gameTimer = 180; // Exactly 3:00 minutes (180s)
      this.timerRunning = false; // Starts ONLY after phone call cutscene!
      this.updateTimerDisplay();
      this.currentRunScore = 0;
      this.isGameOver = false;

      const hudScore = document.getElementById('hud-run-score');
      if (hudScore) hudScore.textContent = '0';

      audio.init();
      if (!audio.musicPlaying) audio.startDesiBGM();
      this.startCutscene();
    };

    const restartFlow = sessionStorage.getItem('bhopali_restart_flow');
    if (restartFlow === 'intro_conversation') {
      sessionStorage.removeItem('bhopali_restart_flow');
      if (landingScreen) landingScreen.style.display = 'none';
      startGame();
    } else if (wasInGame) {
      if (landingScreen) landingScreen.style.display = 'none';
      this.resumeInGameSession();
    }

    const btnBackHome = document.getElementById('btn-back-home');
    if (btnBackHome) {
      btnBackHome.addEventListener('click', () => {
        sessionStorage.removeItem('bhopali_in_game');
        sessionStorage.removeItem('bhopali_stage');
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = 'none';
        if (landingScreen) landingScreen.style.display = 'flex';
        this.timerRunning = false;
        this.initStats();
        audio.stopScooterEngine();
        if (this.isRiding) {
          this.isRiding = false;
          this.scooterSpeed = 0;
          this.player.visible = true;
          this.scooter.userData.riderMesh.visible = false;
        }
      });
    }

    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) btnStart.addEventListener('click', startGame);

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
    let savedTotalSwag = localStorage.getItem('bhopali_total_swag') || localStorage.getItem('bhopali_swag') || '1000';
    let savedHighScore = localStorage.getItem('bhopali_high_score') || '0';

    const topStars = document.getElementById('top-stars');
    const topTotalScore = document.getElementById('top-score');
    const topHighScore = document.getElementById('top-high-score');

    if (topStars) topStars.textContent = savedStars;
    if (topTotalScore) topTotalScore.textContent = savedTotalSwag;
    if (topHighScore) topHighScore.textContent = savedHighScore;

    this.updateLivesDisplay();
    this.updateTimerDisplay();
  }

  updateLivesDisplay() {
    const el = document.getElementById('lives-display');
    if (!el) return;
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += i < this.lives ? '❤️' : '🖤';
    }
    el.textContent = hearts;
  }

  updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    const badge = document.getElementById('timer-display-badge');
    if (!el) return;
    const m = Math.floor(this.gameTimer / 60);
    const s = Math.floor(this.gameTimer % 60);
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (badge) {
      if (this.gameTimer <= 30 && this.gameTimer > 0) {
        badge.style.borderColor = '#ef4444';
        badge.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.85)';
        badge.style.color = '#fca5a5';
      } else {
        badge.style.borderColor = '#f59e0b';
        badge.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.35)';
        badge.style.color = '#fef08a';
      }
    }
  }

  deductLife(reason = 'Galti ho gayi!') {
    if (this.isGameOver) return;
    this.lives = Math.max(0, this.lives - 1);
    this.updateLivesDisplay();
    this.shakeDuration = 0.5;

    if (this.lives <= 0) {
      setTimeout(() => {
        this.triggerGameOver('3 Galtiyan ho gayin! Shaadi ka shubh muhurat nikal gaya aur Chetak raste me phas gayi!');
      }, 850);
    }
  }

  triggerGameOver(reason) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.timerRunning = false;
    this.scooterSpeed = 0;
    audio.stopScooterEngine();
    audio.playMetalCrash();

    const accModal = document.getElementById('accident-modal');
    if (accModal) accModal.style.display = 'none';

    const modal = document.getElementById('game-over-modal');
    const reasonEl = document.getElementById('game-over-reason');
    if (reasonEl) reasonEl.textContent = reason;
    if (modal) modal.style.display = 'flex';
  }

  addScore(points, stars = 0) {
    this.currentRunScore = Math.max(0, this.currentRunScore + points);
    const hudScore = document.getElementById('hud-run-score');
    if (hudScore) hudScore.textContent = this.currentRunScore;

    if (stars > 0) {
      let currentStars = parseInt(localStorage.getItem('bhopali_stars') || '3', 10);
      currentStars = Math.min(12, currentStars + stars);
      localStorage.setItem('bhopali_stars', currentStars.toString());
      const topStars = document.getElementById('top-stars');
      if (topStars) topStars.textContent = currentStars;
    }
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

    // Deduct 1 Heart for Major Cow Collision and apply Score Penalty
    this.deductLife('Gau Mata se takkar maar di! (-1 Heart)');
    this.addScore(-150, 0);
    this.spawnFloatingScore('💥 -150 SWAG! ACCIDENT!', this.scooter.position);

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

    this.triggerJugaadToast('💥 ACCIDENT! GAU MATA SE TAKKAR! (-1 HEART)');

    const accModal = document.getElementById('accident-modal');
    if (accModal && this.lives > 0) {
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

    // Restore scooter before cow (cow is at x = 62.0)
    this.scooter.position.set(55.0, 0, 0);
    this.scooter.rotation.set(0, 0, 0);
    this.scooter.userData.riderMesh.visible = false;

    // Restore walking player
    this.player.position.set(56.0, 0, 1.6);
    this.player.visible = true;
    this.player.rotation.set(0, 0, 0);

    audio.stopScooterEngine();
    this.questText.textContent = 'Pehle Sabzi Market se Taazi Ghaas & Roti laao aur Gau Mata ko side karo!';
    this.promptTip.innerHTML = 'Walk to Grass Basket <b>[E]</b> | Feed Gau Mata before riding!';
  }

  // Handle Pick, Place, Inspect, and Mount
  handleAction() {
    if (this.isFalling || this.isCutscene) return;

    // 0. IF RIDING:
    if (this.isRiding) {
      const inParkingBay = (
        this.scooter.position.x >= 71.8 &&
        this.scooter.position.x <= 76.2 &&
        this.scooter.position.z <= -1.1 &&
        this.scooter.position.z >= -3.3
      );

      if (this.stage === 3 && inParkingBay) {
        // Manual Parking Climax! Player steered into VIP bay and pressed [E] to park Chetak!
        this.setStage(4);
        this.isRiding = false;
        this.scooterSpeed = 0;
        this.scooter.userData.riderMesh.visible = false;
        audio.stopScooterEngine();

        // Chetak's kickstand snaps off!
        audio.playPlankSnap();
        audio.playBrickThud();

        // Chetak falls onto its side in the parking slot
        this.scooter.userData.setFallenState(true);

        // Hide bouncing arrow once parked
        if (this.parkingArrow) this.parkingArrow.visible = false;

        // Dismount Chacha standing upright next to fallen scooter
        this.player.position.set(this.scooter.position.x - 0.7, 0, this.scooter.position.z + 1.0);
        this.player.rotation.set(0, 0.35, 0);
        this.player.visible = true;

        this.triggerJugaadToast('⚠️ KHATTT! CHETAK KA STAND TOOT GAYA!');
        this.showDialogue(
          'Chacha',
          'Arey baap re! Chetak ka stand toot gaya! Ab kisi cheez ke sahare khada karna padega... Deewal ke paas kuch samaan pada hai, unse prayas karta hoon!'
        );
        this.questText.textContent = 'Chetak ka stand toot gaya! Deewal ke paas pade samaan se scooter ko khada karein!';
        this.promptTip.innerHTML = 'Deewal ke paas dekhein [E] | Chetak ko khada karein!';
        return;
      }

      // Normal dismount anywhere else on the road
      this.isRiding = false;
      this.scooterSpeed = 0;
      this.player.position.set(this.scooter.position.x, 0, this.scooter.position.z <= 1.0 ? this.scooter.position.z + 1.4 : this.scooter.position.z - 1.4); // step off clear of Chetak
      this.player.visible = true;
      this.scooter.userData.riderMesh.visible = false;
      audio.stopScooterEngine();
      if (this.stage === 3) {
        this.promptTip.innerHTML = 'Dismounted. Pehle Chetak ko baayein VIP Parking Bay me mod kar le jaayein aur park karein!';
      } else {
        this.promptTip.textContent = 'Dismounted scooter. Press [E] near scooter to mount again.';
      }
      return;
    }

    const pPos = this.player.position;
    const distToScooter = pPos.distanceTo(this.scooter.position);

    // 1. MOUNT SCOOTER (Priority when standing near Chetak with empty hands)
    // …but only if no pick-up item is closer than Chetak (e.g. the grass basket next to the parked scooter)
    const flatScooter = Math.hypot(pPos.x - this.scooter.position.x, pPos.z - this.scooter.position.z);
    const itemCloser = !this.inventory && this.items.some(it => it.visible !== false &&
      Math.hypot(pPos.x - it.position.x, pPos.z - it.position.z) < Math.min(2.8, flatScooter));
    if (!this.inventory && this.stage < 4 && distToScooter < 3.2 && !itemCloser) {
      if (this.stage === 0) {
        audio.playBrickThud();
        this.triggerJugaadToast('🔒 Chetak Locked: Pehle toota phone repair karein!');
        return;
      }
      this.isRiding = true;
      this.player.visible = false;
      this.scooter.userData.riderMesh.visible = true;
      audio.startScooterEngine();
      this.questText.textContent = 'Dhyan se chalayein! Sadak par aage badhein!';
      this.promptTip.innerHTML = '<b>D</b> = Aage | <b>A</b> = Brake | <b>W/S</b> = Lane badlo | <b>[E]</b> Utro | [Space] Horn';
      return;
    }

    // 1B. Empty-handed interaction near fallen Chetak in Stage 4 (ONLY if not near an item)
    if (!this.inventory && this.stage === 4) {
      let nearbyItemExists = false;
      this.items.forEach(it => {
        if (Math.hypot(pPos.x - it.position.x, pPos.z - it.position.z) < 2.5) {
          nearbyItemExists = true;
        }
      });
      if (!nearbyItemExists && distToScooter < 1.8) {
        audio.playBrickThud();
        this.promptTip.innerHTML = '⚠️ Chetak zameen par giri hai! Deewal ke paas pade samaan [E] se khada karein!';
        return;
      }
    }

    // 2. Priority: Broken Phone on ground takes precedence over Kabaad Dher wheel!
    if (!this.inventory && this.stage === 0) {
      const phoneTargetPos = this.phoneCurrentPos || new THREE.Vector3(-5.8, 0.32, -3.4);
      const distToPhone = pPos.distanceTo(phoneTargetPos);
      if (distToPhone < 2.5) {
        this.inventory = this.phoneScreenItem;
        this.scene.remove(this.phoneScreenItem);
        this.items = this.items.filter(it => it !== this.phoneScreenItem);
        if (this.phoneBackItem) this.phoneBackItem.visible = false;
        this.player.add(this.inventory);
        this.inventory.position.set(0, 1.28, 0.56);
        this.inventory.rotation.set(0.35, 0, 0);

        if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
          this.player.userData.leftArmPivot.rotation.set(-1.25, -0.15, -0.22);
          this.player.userData.rightArmPivot.rotation.set(-1.25, 0.15, 0.22);
        }

        audio.playBrickThud();
        this.promptTip.innerHTML = 'Toota Phone haath me hai! Kabaad Dher [E] se tool chuno!';
        return;
      }
    }

    // 1. Near Kabaad ka Dher (Tools & Scrap Corner at left sidewalk corner x = -9.2, z = -2.8)
    const distToJunk = pPos.distanceTo(new THREE.Vector3(-9.2, 0.32, -2.8));
    if (distToJunk < 1.8) {
      this.openRadialWheel();
      return;
    }

    // 2. Pick up an already placed plank from trench to swap or test
    if (!this.inventory && this.stage === 1) {
      let targetMesh = null;
      let minPlankDist = 2.5;
      [this.longPlankMesh, this.shortPlankMesh, this.placedPlankMesh].forEach(mesh => {
        if (mesh && mesh.parent === this.scene) {
          const d = Math.hypot(pPos.x - mesh.position.x, pPos.z - mesh.position.z);
          if (d < minPlankDist) {
            minPlankDist = d;
            targetMesh = mesh;
          }
        }
      });

      if (targetMesh) {
        this.inventory = targetMesh;
        this.scene.remove(targetMesh);
        this.player.add(this.inventory);
        this.inventory.position.set(0, 1.28, 0.56);
        this.inventory.rotation.set(0.35, 0, 0);

        if (targetMesh === this.longPlankMesh) {
          this.longPlankPlaced = false;
          this.longPlankMesh = null;
          this.plankPlaced = false;
        } else if (targetMesh === this.shortPlankMesh) {
          this.shortPlankPlaced = false;
          this.shortPlankMesh = null;
        }
        if (targetMesh === this.placedPlankMesh) {
          this.placedPlankMesh = null;
          this.plankPlaced = this.longPlankPlaced;
        }

        if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
          this.player.userData.leftArmPivot.rotation.set(-1.25, -0.15, -0.22);
          this.player.userData.rightArmPivot.rotation.set(-1.25, 0.15, 0.22);
        }
        audio.playBrickThud();
        this.promptTip.innerHTML = `Carrying: <b>${this.inventory.userData.title}</b>. Press [E] to place or drop!`;
        return;
      }
    }

    // 3. Not carrying: Pick up other items
    if (!this.inventory) {

      let nearestItem = null;
      let minDist = 2.8;

      this.items.forEach(item => {
        // Use horizontal ground distance so items leaning against walls (with higher vertical center) can be easily reached and picked up
        const horizDist = Math.hypot(pPos.x - item.position.x, pPos.z - item.position.z);
        const vertDist = Math.abs(pPos.y - item.position.y);
        if (horizDist < minDist && vertDist < 3.2) {
          minDist = horizDist;
          nearestItem = item;
        }
      });

      // If Chetak is closer than the nearest item, [E] should mount – not grab junk lying nearby
      if (nearestItem && this.stage >= 1 && this.stage < 4 && !this.isRiding &&
          Math.hypot(pPos.x - this.scooter.position.x, pPos.z - this.scooter.position.z) < minDist) {
        nearestItem = null;
      }

      if (nearestItem) {
        const isPlank = nearestItem.userData.type === 'plank' || nearestItem.userData.type === 'short_plank';
        if (isPlank) {
          if (this.stage === 0) {
            audio.playBrickThud();
            this.triggerJugaadToast('🔒 Abhi iski zaroorat nahi hai. Pehle toota phone theek karein!');
            return;
          }
          if (!this.trenchEncountered) {
            audio.playBrickThud();
            this.triggerJugaadToast('🔒 Pehle Chetak Scooter lekar aao!');
            return;
          }
        }

        this.inventory = nearestItem;
        this.items = this.items.filter(it => it !== nearestItem);
        this.scene.remove(nearestItem);
        this.player.add(nearestItem);

        // Position item directly in Chacha's hands in front of torso
        nearestItem.position.set(0, 1.28, 0.56);
        nearestItem.rotation.set(0.35, 0, 0);

        // Bring both arms forward to firmly hold the object
        if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
          this.player.userData.leftArmPivot.rotation.set(-1.25, -0.15, -0.22);
          this.player.userData.rightArmPivot.rotation.set(-1.25, 0.15, 0.22);
        }

        audio.playBrickThud();
        this.promptTip.innerHTML = `Carrying: <b>${nearestItem.userData.title}</b>. Press [E] to use or drop!`;
        return;
      }
    }

    // 2. Carrying an item: Test / Use / Place
    if (this.inventory) {
      const carried = this.inventory;

      // CRISIS 1: Near Broken Phone (verandah or respawned position)
      const phoneTargetPos = this.phoneCurrentPos || new THREE.Vector3(-5.8, 0.32, -3.4);
      const distToPhone = pPos.distanceTo(phoneTargetPos);
      if (this.stage === 0 && distToPhone < 2.8) {
        if (carried.userData.type === 'rubber_band') {
          this.player.remove(carried);
          this.inventory = null;

          // Remove scattered phone pieces (strictly 2 pieces)
          [this.phoneScreenItem, this.phoneBackItem].forEach(item => {
            if (item) {
              this.scene.remove(item);
              this.items = this.items.filter(it => it !== item);
            }
          });

          // POCKET THE PHONE! Reset arms to natural posture
          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }

          this.setStage(1);
          this.updateMeter(25);
          this.addScore(300, 3);
          audio.playPhoneRebootSound();
          audio.playJugaadSuccess();
          this.triggerJugaadToast('🎉 JUGAAD 1: RUBBER BAND SE PHONE REPAIRED! (+300 PTS)');
          this.questText.textContent = 'Phone jeb me rakh liya! Driveway me Chetak Scooter par baitho [E] aur Sheesh Mahal ki taraf nikal pado!';
          this.promptTip.innerHTML = 'Press <b>[E]</b> near Chetak Scooter to Kickstart & Mount!';
          return;
        } else if (carried.userData.type === 'cello_tape') {
          this.player.remove(carried);
          this.inventory = null;

          // Remove scattered phone pieces (strictly 2 pieces)
          [this.phoneScreenItem, this.phoneBackItem].forEach(item => {
            if (item) {
              this.scene.remove(item);
              this.items = this.items.filter(it => it !== item);
            }
          });

          // POCKET THE PHONE!
          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }

          this.setStage(1);
          this.updateMeter(25);
          this.addScore(100, 1);
          audio.playTapeSound();
          audio.playPhoneRebootSound();
          audio.playJugaadSuccess();
          this.triggerJugaadToast('🩹 JUGAAD 1: TAPE SE PHONE JUD GAYA! (+100 PTS)');
          this.questText.textContent = 'Phone jeb me rakh liya! Driveway me Chetak Scooter par baitho [E] aur Sheesh Mahal ki taraf nikal pado!';
          this.promptTip.innerHTML = 'Press <b>[E]</b> near Chetak Scooter to Kickstart & Mount!';
        } else if (carried.userData.type === 'hammer') {
          this.triggerHammerDisaster();
          return;
        } else if (carried.userData.type === 'rope') {
          this.addScore(-50, 0);
          this.spawnFloatingScore('⚠️ -50 SWAG! TOO THICK!', pPos);
          this.promptTip.innerHTML = '⚠️ Rassi bahut moti hai! Kabaad Dher [E] se patla jugaad chuno!';
          return;
        } else {
          this.promptTip.innerHTML = '⚠️ Is cheez se phone theek nahi hoga! Kabaad Dher [E] se tool chuno!';
          return;
        }
      }

      // CRISIS 2: Near 3D Deep Chasm
      const distToTrench = Math.hypot(pPos.x - 45.8, pPos.z);
      if (this.stage === 1 && distToTrench < 5.0) {
        if (carried.userData.type === 'plank') {
          // Snap long plank (4.2m) across trench spanning from Platform 1 (x=44.0) to Platform 2 (x=47.6)!
          this.player.remove(carried);
          this.scene.add(carried);
          
          this.longPlankZ = Math.max(-2.4, Math.min(2.4, this.scooter.position.z)); // Lay the bridge in Chetak's lane
          this.plankZ = this.longPlankZ;
          carried.position.set(45.8, 0.09, this.longPlankZ);
          carried.rotation.set(0, 0, 0);

          this.longPlankPlaced = true;
          this.longPlankMesh = carried;
          this.plankPlaced = true;
          this.placedPlankMesh = carried;
          this.inventory = null;
          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }
          this.updateMeter(50);
          audio.playPlankSnap();
          this.triggerJugaadToast('🎉 JUGAAD 2: TIMBER BRIDGE READY! (+25%)');
          this.questText.textContent = 'Bridge taiyaar! Chetak par baitho [E] aur dhyan se phatte ke upar se niklo!';
          this.promptTip.innerHTML = 'Press <b>[E]</b> near scooter to mount | Drive across plank carefully!';
          return;
        } else if (carried.userData.type === 'short_plank') {
          // Place 2.2m short plank (spans halfway: x=44.0 to 46.2)
          this.player.remove(carried);
          this.scene.add(carried);
          
          this.shortPlankZ = Math.max(-2.4, Math.min(2.4, pPos.z));
          carried.position.set(45.1, 0.09, this.shortPlankZ);
          carried.rotation.set(0, 0, 0);

          this.shortPlankPlaced = true;
          this.shortPlankMesh = carried;
          this.inventory = null;
          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }
          audio.playPlankSnap();
          this.promptTip.innerHTML = '⚠️ Yeh phatta gaddhe se chhota hai! Dono kinaron par nahi tik paya!';
          return;
        } else {
          this.promptTip.innerHTML = '⚠️ Is cheez se bridge nahi banega! Lakdi ka phatta laayein!';
          return;
        }
      }

      // CRISIS 3: Near Cow (62.0, 0, -0.2)
      const distToCow = pPos.distanceTo(this.cow.position);
      if ((this.stage === 1 || this.stage === 2) && distToCow < 3.6) {
        if (carried.userData.type === 'grass') {
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(62.0, 0, -2.8);
          this.inventory = null;
          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }
          this.setStage(3);
          this.updateMeter(75);

          this.cow.userData.isDistracted = true;
          this.cow.userData.state = 'moving';
          audio.playCowMoo();
          this.addScore(250, 1);
          this.spawnFloatingScore('+250 SWAG 🐮 GAU MATA KHUSH!', this.cow.position);
          this.triggerJugaadToast('🎉 JUGAAD 3: GAU MATA RASTA CLEAR! (+25%)');
          this.questText.textContent = 'Gau Mata khush, rasta saaf! Chetak par baitho [E] aur Sheesh Mahal bhagao!';
          this.promptTip.innerHTML = 'Press <b>[E]</b> to Mount Scooter | Race to Sheesh Mahal!';
          return;
        } else {
          this.promptTip.innerHTML = '⚠️ Gau Mata isko nahi khayengi! Taazi Ghaas khilayein!';
          return;
        }
      }

      // CRISIS 4: At Sheesh Mahal gate, prop up fallen scooter with Red Brick!
      const distToScooter = pPos.distanceTo(this.scooter.position);
      if (this.stage === 4 && distToScooter < 3.4) {
        if (carried.userData.type === 'brick') {
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(this.scooter.position.x - 0.42, 0.17, this.scooter.position.z - 0.42);
          this.scooter.userData.setFallenState(false); // Upright supported by brick!
          this.inventory = null;

          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }

          this.setStage(5);
          this.updateMeter(100);
          audio.playBrickThud();
          audio.playJugaadSuccess();
          this.burstConfetti(this.scooter.position);
          this.addScore(500, 1);

          this.triggerJugaadToast('🏆 JUGAAD 4: LAAL EENT KA SOLID STAND! (+25%)');
          this.showDialogue(
            'Chachi',
            'Arey wah! Chetak shaahi style me khadi ho gayi aur Guddu ka sehra bhi bach gaya! Chalo ab jaldi mandap ke andar aao!'
          );
          this.questText.textContent = '🌟 CONGRATULATIONS! Chacha & Chachi entering Sheesh Mahal!';
          this.promptTip.innerHTML = '100% Desi Swag Champion! 🏆';

          // Start the Grand Entrance Walk with Chachi!
          this.isWeddingWalk = true;
          this.weddingWalkTimer = 0;
          return;
        } else {
          // Non-brick item (broom, tyre, etc.): Scooter tries to balance, collapses, and falls over!
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(this.scooter.position.x - 0.25, 0.08, this.scooter.position.z - 0.65);
          this.items.push(carried);
          this.inventory = null;

          if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
            this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
            this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
          }

          this.scooter.userData.setFallenState(true);
          this.shakeDuration = 0.35;
          this.addScore(-50, 0);
          this.spawnFloatingScore('❌ -50 SWAG! STAND TOOT GAYA!', this.scooter.position);

          if (carried.userData.type === 'broom') {
            audio.playPlankSnap();
            audio.playBrickThud();
            this.promptTip.innerHTML = '⚠️ Jhadu scooter ka wazan nahi sambhal payi aur toot gayi!';
          } else if (carried.userData.type === 'tyre') {
            audio.playSplash();
            audio.playBrickThud();
            this.promptTip.innerHTML = '⚠️ Gol tyre fisal gaya aur scooter phir se gir gayi!';
          } else {
            audio.playPlankSnap();
            this.promptTip.innerHTML = '⚠️ Yeh cheez scooter ka 100 kg wazan nahi jhel payi!';
          }
          this.triggerJugaadToast('❌ STAND TOOT GAYA! SCOOTER GIR GAYI!');
          return;
        }
      }

      // Drop item anywhere
      this.player.remove(carried);
      this.scene.add(carried);
      const dropY = pPos.z <= -3.2 ? 0.30 : 0.08;
      carried.position.set(pPos.x, dropY, pPos.z);
      carried.rotation.set(0, 0, 0);
      this.items.push(carried);
      this.inventory = null;
      if (this.player.userData.leftArmPivot && this.player.userData.rightArmPivot) {
        this.player.userData.leftArmPivot.rotation.set(0, 0, 0);
        this.player.userData.rightArmPivot.rotation.set(0, 0, 0);
      }
      this.promptTip.textContent = `Dropped ${carried.userData.title}.`;
      return;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Real frame time (capped) so 60Hz, 120Hz and slow laptops all play at the same speed
    if (!this.clock) this.clock = new THREE.Clock();
    const delta = Math.min(0.05, this.clock.getDelta());
    const time = performance.now() * 0.002;

    // --- 0. CINEMATIC CUTSCENE FLYOVER ---
    if (this.isCutscene) {
      this.cutsceneTime += delta;
      const t = this.cutsceneTime;

      if (t < 2.8) {
        // Shot 1: Chachi talking urgently on phone at Sheesh Mahal Mandap (Camera pulled back at comfortable medium-wide angle)
        this.camera.position.set(72.2, 1.85, 2.8);
        this.camera.lookAt(77.8, 1.25, 0.3);

        // Animated head nod & phone gesture while talking
        if (this.chachi && this.chachi.userData.headGroup) {
          this.chachi.userData.headGroup.rotation.x = Math.sin(time * 6) * 0.08;
          this.chachi.userData.headGroup.rotation.z = 0.12 + Math.sin(time * 4) * 0.05;
        }
        if (this.chachi && this.chachi.userData.phoneArmPivot) {
          this.chachi.userData.phoneArmPivot.rotation.x = Math.sin(time * 5) * 0.06;
        }
      } else if (t < 4.8) {
        // Shot 2: Fast cinematic flyover tracking backwards from Sheesh Mahal to Chacha's mohalla home
        const u = (t - 2.8) / 2.0; // 0 to 1
        const easeU = u * u * (3 - 2 * u); // SmoothStep

        const camX = THREE.MathUtils.lerp(72.2, -2.8, easeU);
        const camY = THREE.MathUtils.lerp(1.85, 2.2, easeU);
        const camZ = THREE.MathUtils.lerp(2.8, 0.8, easeU);

        const lookX = THREE.MathUtils.lerp(77.8, -6.0, easeU);
        const lookY = THREE.MathUtils.lerp(1.25, 1.35, easeU);
        const lookZ = THREE.MathUtils.lerp(0.3, -3.6, easeU);

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(lookX, lookY, lookZ);

        // Transition speech toast to Chacha's phone reply
        if (this.cutscenePhase === 1) {
          this.cutscenePhase = 2;
          const speakerTitle = document.getElementById('cutscene-speaker-title');
          const cutsceneText = document.getElementById('cutscene-text');
          if (speakerTitle) speakerTitle.textContent = '🛵 Chacha (Mohalla Driveway)';
          if (cutsceneText) cutsceneText.textContent = '"Haan haan bhagyawan! Bas 5 minute me Chetak leke pohoch raha hoon!"';
        }
      } else if (t < 7.0) {
        // Shot 3A: Chacha's ancestral doors open, Chacha steps JUST OUTSIDE THE DOOR ON THE VERANDAH and talks on phone!
        if (this.chachaHome) this.chachaHome.userData.openDoors();
        this.player.visible = true;
        if (this.player.userData.setPhoneCallPose) {
          this.player.userData.setPhoneCallPose(true);
        }

        // Chacha steps only from inside door (-6.0, 0.32, -4.6) to just outside on verandah (-6.0, 0.32, -3.6)
        const stepProg = Math.min(1, (t - 4.8) / 0.8);
        const wz = THREE.MathUtils.lerp(-4.6, -3.6, stepProg);
        this.player.position.set(-6.0, 0.32, wz);
        this.player.rotation.y = 0.2; // Facing camera / verandah

        if (stepProg < 1) {
          if (this.player.userData.leftLegPivot) this.player.userData.leftLegPivot.rotation.x = Math.sin(stepProg * Math.PI) * 0.3;
        } else {
          if (this.player.userData.leftLegPivot) this.player.userData.leftLegPivot.rotation.x = 0;
          if (this.player.userData.rightLegPivot) this.player.userData.rightLegPivot.rotation.x = 0;
        }

        // Animated head nod and phone gesture while talking on phone (just like Chachi!)
        if (this.player.userData.headGroup) {
          this.player.userData.headGroup.rotation.x = Math.sin(time * 5) * 0.06;
          this.player.userData.headGroup.rotation.z = -0.06 + Math.sin(time * 3) * 0.03;
        }
        if (this.player.userData.phoneArmGroup) {
          this.player.userData.phoneArmGroup.rotation.x = Math.sin(time * 4) * 0.04;
        }

        if (this.player.userData.leftArmPivot) {
          this.player.userData.leftArmPivot.rotation.x = Math.sin(t * 4) * 0.12;
        }

        // Camera pulled back at comfortable medium-wide angle framing verandah, nameplate, and Chacha
        this.camera.position.set(-3.0, 2.1, 0.8);
        this.camera.lookAt(-6.0, 1.35, -3.6);
      } else if (t < 8.2) {
        // Shot 3B: Call ends! Chacha lowers arm to put phone into pocket
        if (this.cutscenePhase === 2) {
          this.cutscenePhase = 3;
          const speakerTitle = document.getElementById('cutscene-speaker-title');
          const cutsceneText = document.getElementById('cutscene-text');
          if (speakerTitle) speakerTitle.textContent = '🛵 Chacha (Mohalla Verandah)';
          if (cutsceneText) cutsceneText.textContent = '"Chalo, phone jeb me daalta hoon aur nikalti sawaari..."';
        }

        // Lower the phone arm towards pocket
        const lowerProg = Math.min(1, (t - 7.0) / 1.1);
        if (this.player.userData.phoneArmGroup) {
          this.player.userData.phoneArmGroup.rotation.set(
            lowerProg * 0.85,
            -lowerProg * 0.45,
            lowerProg * 0.65
          );
        }
        if (this.player.userData.headGroup) {
          this.player.userData.headGroup.rotation.x = lowerProg * 0.25;
          this.player.userData.headGroup.rotation.z = -lowerProg * 0.15;
        }

        // Maintain crystal-clear elevated wide framing from screenshot (no zooming into ground!)
        this.camera.position.set(-3.0, 2.1, 0.8);
        this.camera.lookAt(-6.0, 1.35, -3.6);
      } else if (t < 9.0) {
        // Shot 3C: SLIP & TUMBLE! Phone slips from hand and drops with 3D gravity physics!
        if (this.cutscenePhase === 3) {
          this.cutscenePhase = 4;
          if (this.player.userData.setPhoneCallPose) this.player.userData.setPhoneCallPose(false);
          if (this.player.userData.rightArmPivot) {
            this.player.userData.rightArmPivot.rotation.set(-0.25, 0.1, 0.35);
          }
          if (this.fallingPhoneMesh) {
            this.fallingPhoneMesh.visible = true;
            this.fallingPhoneMesh.position.set(-5.9, 0.95, -3.4);
            this.fallingPhoneMesh.rotation.set(0, 0, 0);
          }
        }

        const fallProg = Math.min(1, (t - 8.2) / 0.78);
        const curY = 0.95 - fallProg * fallProg * (0.95 - 0.33);

        if (this.fallingPhoneMesh) {
          this.fallingPhoneMesh.position.y = curY;
          this.fallingPhoneMesh.position.x = -5.9 + Math.sin(fallProg * Math.PI * 2) * 0.05;
          this.fallingPhoneMesh.rotation.x += delta * 16;
          this.fallingPhoneMesh.rotation.y += delta * 12;
          this.fallingPhoneMesh.rotation.z += delta * 8;
        }

        // Keep elevated medium framing so Chacha, door, and falling phone are all visible!
        this.camera.position.set(-3.0, 2.1, 0.8);
        this.camera.lookAt(-6.0, 1.35, -3.6);
      } else if (t < 11.2) {
        // Shot 3D: IMPACT & SPLIT! Strictly 2 pieces (Screen & Back Cover)
        if (this.cutscenePhase === 4) {
          this.cutscenePhase = 5;
          if (this.fallingPhoneMesh) this.fallingPhoneMesh.visible = false;

          // Sound of phone hitting stone verandah & splitting
          audio.playPhoneDropSound();

          // Spawn strictly 2 broken pieces on verandah
          if (this.phoneScreenItem) {
            this.phoneScreenItem.position.set(-5.8, 0.32, -3.45);
            this.phoneScreenItem.rotation.set(0, 0.35, 0.02);
            this.phoneScreenItem.visible = true;
          }
          if (this.phoneBackItem) {
            this.phoneBackItem.position.set(-6.15, 0.32, -3.3);
            this.phoneBackItem.rotation.set(Math.PI, 0.8, 0);
            this.phoneBackItem.visible = true;
          }

          const speakerTitle = document.getElementById('cutscene-speaker-title');
          const cutsceneText = document.getElementById('cutscene-text');
          if (speakerTitle) speakerTitle.textContent = '😱 Chacha (Comic Shock!)';
          if (cutsceneText) cutsceneText.textContent = '"Haye daiyya re! Naya-navela phone haath se chhut gaya! Screen alag ho gayi aur back cover alag! Bina phone ke mandap ka rasta kaise milega?!"';
        }

        // Brief subtle focus at break point (t < 9.35s), then immediately zoom back out for Chacha's full shock reaction!
        if (t < 9.35) {
          this.camera.position.lerp(new THREE.Vector3(-3.4, 1.9, 0.4), 0.12);
          this.camera.lookAt(-5.95, 1.0, -3.4);
        } else {
          // Immediately zoom back out to screenshot framing!
          this.camera.position.lerp(new THREE.Vector3(-3.0, 2.1, 0.8), 0.15);
          this.camera.lookAt(-6.0, 1.35, -3.6);
        }

        // COMIC SHOCK POSE: Hands to head/cheeks, mouth open in comic despair, trembling!
        const jitter = Math.sin(time * 30) * 0.025;
        if (this.player.userData.leftArmPivot) {
          this.player.userData.leftArmPivot.rotation.set(-2.2 + jitter, 0.35, -0.65);
        }
        if (this.player.userData.rightArmPivot) {
          this.player.userData.rightArmPivot.rotation.set(-2.2 - jitter, -0.35, 0.65);
        }
        if (this.player.userData.headGroup) {
          this.player.userData.headGroup.rotation.x = 0.25 + jitter * 2;
          this.player.userData.headGroup.rotation.z = jitter * 1.5;
        }
      } else {
        this.endCutscene();
      }

      this.gfx.followCamera(this.camera);
      this.gfx.render(delta);
      return;
    }

    // --- GAME OVER GUARD ---
    if (this.isGameOver) {
      this.gfx.render(delta);
      return;
    }

    // --- GAME TIMER (3 MINUTES / 180s) ---
    if (this.timerRunning && this.gameTimer > 0 && !this.isCutscene && !this.isWeddingWalk && !this.isGameOver) {
      this.gameTimer -= delta;
      if (this.gameTimer <= 0) {
        this.gameTimer = 0;
        this.timerRunning = false;
        this.updateTimerDisplay();
        this.triggerGameOver('⏰ SHUBH MUHURAT NIKAL GAYA! Pandit ji mandap chhod kar chale gaye aur Dulha bina sehre ke reh gaya!');
        this.gfx.render(delta);
        return;
      }
      this.updateTimerDisplay();
    }

    // --- COIN ROTATION, BOBBING & PICKUP CHECK ---
    const activePos = this.isRiding ? this.scooter.position : this.player.position;
    this.coins.forEach((coin, idx) => {
      if (!coin.userData.isCollected) {
        coin.rotation.y += delta * 2.8;
        coin.position.y = coin.userData.initialY + Math.sin(time * 5 + idx) * 0.08;

        const dist = activePos.distanceTo(coin.position);
        if (dist < 1.6) {
          coin.userData.isCollected = true;
          coin.visible = false;
          audio.playCoinChime();
          this.addScore(50, 0);
          this.spawnFloatingScore('+50 SWAG 🪙', coin.position);
        }
      }
    });

    // --- 1. WALKING PLAYER PHYSICS & COLLISION ---
    if (!this.isRiding && this.stage <= 4 && !this.isFalling) {
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

        nextX = Math.max(-11.5, Math.min(82.0, nextX));
        nextZ = Math.max(-4.4, Math.min(3.0, nextZ));

        const colliders = this.getColliders();
        const pR = (this.player.userData && this.player.userData.radius) || 0.35;

        // If Chacha is already overlapping a solid box (e.g. just got off Chetak, or respawned beside it),
        // push him out along the shallowest side first – otherwise every step gets blocked and he looks stuck.
        for (const c of colliders) {
          if (c.type !== 'box') continue;
          const px = this.player.position.x, pz = this.player.position.z;
          const minX = c.minX - pR, maxX = c.maxX + pR, minZ = c.minZ - pR, maxZ = c.maxZ + pR;
          if (px > minX + 0.02 && px < maxX - 0.02 && pz > minZ + 0.02 && pz < maxZ - 0.02) {
            const pen = [
              { d: px - minX, ax: 'x', v: minX - 0.02 },
              { d: maxX - px, ax: 'x', v: maxX + 0.02 },
              { d: pz - minZ, ax: 'z', v: minZ - 0.02 },
              { d: maxZ - pz, ax: 'z', v: maxZ + 0.02 }
            ].sort((a, b) => a.d - b.d)[0];
            if (pen.ax === 'x') { this.player.position.x = pen.v; nextX = pen.v + vx; }
            else { this.player.position.z = pen.v; nextZ = pen.v + vz; }
          }
        }

        // Resolve X movement with solid obstacles (Dynamic Scooter, Cow, Walls, Stalls)
        for (const c of colliders) {
          if (c.type === 'circle') {
            const dx = nextX - c.x;
            const dz = this.player.position.z - c.z;
            const dist = Math.hypot(dx, dz);
            const minDist = c.radius + pR;
            if (dist < minDist && dist > 0.0001) {
              const push = minDist - dist;
              nextX += (dx / dist) * push;
            }
          } else if (c.type === 'box') {
            const curZ = this.player.position.z;
            const prevX = this.player.position.x;
            if (curZ > c.minZ - pR && curZ < c.maxZ + pR) {
              if (vx > 0 && prevX <= c.minX - pR && nextX > c.minX - pR) {
                nextX = c.minX - pR;
              } else if (vx < 0 && prevX >= c.maxX + pR && nextX < c.maxX + pR) {
                nextX = c.maxX + pR;
              }
            }
          }
        }

        // Resolve Z movement with solid obstacles
        for (const c of colliders) {
          if (c.type === 'circle') {
            const dx = nextX - c.x;
            const dz = nextZ - c.z;
            const dist = Math.hypot(dx, dz);
            const minDist = c.radius + pR;
            if (dist < minDist && dist > 0.0001) {
              const push = minDist - dist;
              nextZ += (dz / dist) * push;
            }
          } else if (c.type === 'box') {
            const prevZ = this.player.position.z;
            if (nextX > c.minX - pR && nextX < c.maxX + pR) {
              if (vz > 0 && prevZ <= c.minZ - pR && nextZ > c.minZ - pR) {
                nextZ = c.minZ - pR;
              } else if (vz < 0 && prevZ >= c.maxZ + pR && nextZ < c.maxZ + pR) {
                nextZ = c.maxZ + pR;
              }
            }
          }
        }

        // Dynamic step height for Chacha's verandah and left sidewalk
        if (nextX >= -11.5 && nextX <= -4.5 && nextZ <= -2.2) {
          if (nextZ <= -2.8) {
            this.player.position.y = 0.32;
          } else {
            this.player.position.y = 0.16;
          }
        } else {
          this.player.position.y = 0.0;
        }

        this.player.position.x = nextX;
        this.player.position.z = nextZ;

        // Facing
        const targetAngle = Math.atan2(vx, vz);
        let diff = targetAngle - this.player.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.player.rotation.y += diff * 0.22;

        // Natural walk cycle (steps driven by distance travelled, knees + elbows bend)
        AssetFactory.animateWalk(this.player, this.walkSpeed, delta, !!this.inventory);
        if (this.player.userData.stepped) audio.playFootstep('chappal');
      } else {
        AssetFactory.animateWalk(this.player, 0, delta, !!this.inventory);
      }

      // --- TRENCH CROSSING LOGIC FOR WALKING CHACHA ---
      // Open road pit void exists strictly between road edges (z: -3.3 to 3.3)
      if (this.player.position.x >= 44.0 && this.player.position.x <= 47.6 && this.player.position.z > -3.3 && this.player.position.z < 3.3) {
        let onPlank = false;
        // Check long plank bridge (fully spans 44.0 to 47.6)
        if (this.longPlankPlaced && Math.abs(this.player.position.z - this.longPlankZ) <= this.plankHalfWidth) {
          onPlank = true;
        }
        // Check short plank distractor (only spans halfway up to x = 46.2)
        if (this.shortPlankPlaced && Math.abs(this.player.position.z - this.shortPlankZ) <= this.plankHalfWidth) {
          if (this.player.position.x <= 46.2) {
            onPlank = true;
          }
        }
        // Fallback for older plankPlaced compatibility
        if (this.plankPlaced && !this.longPlankPlaced && Math.abs(this.player.position.z - this.plankZ) <= this.plankHalfWidth) {
          onPlank = true;
        }

        if (onPlank) {
          if (!this.isFalling) this.player.position.y = 0.09;
        } else if (!this.isFalling) {
          this.triggerTrenchFall(false);
        }
      } else {
        if (!this.isFalling) this.player.position.y = 0;
      }

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x + 3.2, 0.06);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 2.4, 0.06);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.player.position.z + 8.8, 0.06);
      const camTargetY = this.isFalling ? THREE.MathUtils.lerp(1.3, -0.4, Math.min(1, Math.max(0, -this.player.position.y / 2.15))) : 1.3;
      this.camera.lookAt(this.player.position.x + 1, camTargetY, this.player.position.z);

      this.updatePrompt();

      // Close Kabaad ka Dher Radial Wheel if Chacha walks away from Kabaad Dher or advances stage
      if (this.radialWheelModal && this.radialWheelModal.style.display === 'flex') {
        const distToJunk = this.player.position.distanceTo(new THREE.Vector3(-9.2, 0.32, -2.8));
        if (distToJunk >= 2.5 || this.stage !== 0) {
          this.closeRadialWheel();
        }
      }
    }

    // 3D Projected Floating Position of Radial Wheel above Kabaad Dher (Top-Left Wall)
    if (this.radialWheelModal && this.radialWheelModal.style.display === 'flex') {
      const junkWorldPos = new THREE.Vector3(-10.8, 3.1, -3.9);
      const proj = junkWorldPos.clone().project(this.camera);
      if (proj.z < 1) {
        const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight + Math.sin(time * 3.5) * 5;
        this.radialWheelModal.style.left = `${sx}px`;
        this.radialWheelModal.style.top = `${sy}px`;
      }
    }



    // --- 2. GAU MATA BEHAVIOR: NATURAL ROTATION & FORWARD WALK TO GRASS ---
    if (this.cow.userData.isDistracted && this.cow.userData.state === 'moving') {
      const targetX = 62.0;
      const targetZ = -2.8;
      const dx = targetX - this.cow.position.x;
      const dz = targetZ - this.cow.position.z;
      const distToGrass = Math.hypot(dx, dz);

      // Calculate angle so cow faces grass head-first (+X local)
      const targetAngle = Math.atan2(-dz, dx);
      this.cow.rotation.y = THREE.MathUtils.lerp(this.cow.rotation.y, targetAngle, 0.08);

      if (distToGrass > 0.85) {
        const moveSpeed = 1.35 * delta;
        this.cow.position.x += Math.cos(this.cow.rotation.y) * moveSpeed;
        this.cow.position.z -= Math.sin(this.cow.rotation.y) * moveSpeed;
        this.cow.position.y = Math.abs(Math.sin(time * 8)) * 0.04; // Gentle walking step
      } else {
        this.cow.userData.state = 'eating';
        this.cow.position.y = 0;
        // (cow collider is dynamic in getColliders(); nothing to remove here)
        if (this.cow.userData.headGroup) {
          this.cow.userData.headGroup.rotation.x = 0.35; // Head lowered directly into grass
        }
      }
    }
    if (this.cow.userData.state === 'eating' && this.cow.userData.headGroup) {
      this.cow.userData.headGroup.rotation.x = 0.35 + Math.sin(time * 4) * 0.08; // Chewing grass
      this.cow.userData.tailGroup.rotation.z = Math.sin(time * 6) * 0.28; // Happy tail wag
    } else if (this.cow.userData.headGroup) {
      this.cow.userData.headGroup.rotation.x = Math.sin(time * 3) * 0.06;
      this.cow.userData.tailGroup.rotation.z = Math.sin(time * 5) * 0.22;
    }

    // --- 3. SCOOTER RIDING & SKILL-BASED TRENCH BRIDGE CROSSING ---
    if (this.isRiding && this.stage <= 3 && !this.isFalling) {
      if (this.stage === 0) {
        // Phone not repaired yet! Cannot accelerate forward without GPS Google Map!
        if (this.keys.right || this.keys.up || this.keys.down) {
          this.scooterSpeed = 0;
          this.promptTip.innerHTML = '⚠️ GPS map nahi chal raha! Pehle toota mobile [E] theek karein!';
        }
      } else {
        if (this.respawnGrace > 0) {
          this.respawnGrace -= delta;
          this.scooterSpeed = 0;
        } else if (this.keys.right) {
          this.scooterSpeed = Math.min(this.maxSpeed, this.scooterSpeed + 9 * delta);
        } else if (this.keys.left) {
          this.scooterSpeed = Math.max(-2, this.scooterSpeed - 8 * delta);
        } else {
          this.scooterSpeed *= 0.96;
        }

        // Steer across road width (Up/W steers left towards curbside VIP parking bay at z = -2.2, Down/S steers right)
        if (this.keys.up) this.scooter.position.z = Math.max(-2.9, this.scooter.position.z - 3.5 * delta);
        if (this.keys.down) this.scooter.position.z = Math.min(2.5, this.scooter.position.z + 3.5 * delta);

        this.scooter.position.x += this.scooterSpeed * delta;
        // Keep Chetak on the map (reversing used to roll him away forever)
        if (this.scooter.position.x < -8) { this.scooter.position.x = -8; this.scooterSpeed = 0; }
        if (this.scooter.position.x > 93) { this.scooter.position.x = 93; this.scooterSpeed = 0; }

        // Wheel rotation
        const wheelRot = (this.scooterSpeed * delta) / 0.34;
        this.scooter.userData.frontWheel.rotation.z -= wheelRot;
        this.scooter.userData.rearWheel.rotation.z -= wheelRot;

        // Gentle suspension bounce
        this.scooter.position.y = Math.abs(Math.sin(time * 16)) * 0.04;

        // Body language: lean into lane changes, nose lifts a touch under throttle
        const steer = (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0);   // +1 = moving towards -z (left)
        const sp = Math.min(1, Math.abs(this.scooterSpeed) / 6);
        const accel = this.keys.right ? 1 : (this.keys.left ? -1 : 0);
        this.scooter.rotation.x = THREE.MathUtils.lerp(this.scooter.rotation.x, -steer * 0.14 * (0.4 + sp), 0.12);
        this.scooter.rotation.y = THREE.MathUtils.lerp(this.scooter.rotation.y, steer * 0.12 * (0.3 + sp), 0.1);
        this.scooter.rotation.z = THREE.MathUtils.lerp(this.scooter.rotation.z, accel * 0.035 * sp, 0.08);

        // Dust kicked up by the rear tyre on the dusty road
        if (Math.abs(this.scooterSpeed) > 3 && Math.random() < 0.35) {
          this.emitTyreDust(this.scooter.localToWorld(new THREE.Vector3(-0.75, 0.05, 0)));
        }
      }

      // Unlock planks when scooter approaches trench zone
      if (this.stage === 1 && !this.trenchEncountered && this.scooter.position.x >= 15.0) {
        this.trenchEncountered = true;
        this.triggerJugaadToast('🛑 SADAK TOOTI HAI! PULL BANANA PADEGA!');
      }

      // Approach warning if approaching trench without plank
      if (this.stage === 1 && !this.plankPlaced && this.scooter.position.x >= 39.5 && this.scooter.position.x < 43.8) {
        this.promptTip.innerHTML = '🛑 Sadak tooti hai! Press <b>[E]</b> to Dismount & Lakdi ka Phatta dhundo!';
      }

      // --- TRENCH CRASH CHECK FOR SCOOTER ---
      if (this.scooter.position.x >= 44.0 && this.scooter.position.x <= 47.6) {
        let onPlank = false;
        // Check long plank bridge (fully spans 44.0 to 47.6)
        if (this.longPlankPlaced && Math.abs(this.scooter.position.z - this.longPlankZ) <= this.plankHalfWidth) {
          onPlank = true;
        }
        // Check short plank distractor (only spans halfway up to x = 46.2)
        if (this.shortPlankPlaced && Math.abs(this.scooter.position.z - this.shortPlankZ) <= this.plankHalfWidth) {
          if (this.scooter.position.x <= 46.2) {
            onPlank = true;
          }
        }
        // Fallback for older plankPlaced compatibility
        if (this.plankPlaced && !this.longPlankPlaced && Math.abs(this.scooter.position.z - this.plankZ) <= this.plankHalfWidth) {
          onPlank = true;
        }

        if (onPlank) {
          if (!this.isFalling) this.scooter.position.y = 0.18;
        } else if (!this.isFalling) {
          this.triggerTrenchFall(true);
        }
      }

      // STAGE 1: Trench roadblock – stop Chetak before the open pit until a plank is placed
      if (this.stage === 1 && !this.longPlankPlaced && (!this.shortPlankPlaced || this.shortPlankFailed) && !this.isFalling) {
        if (this.scooter.position.x >= 39.2) {
          if (this.scooter.position.x > 40.6) {
            this.scooter.position.x = 40.6;
            this.scooterSpeed = 0;
          } else {
            this.scooterSpeed = Math.min(1.8, this.scooterSpeed);
          }
          if (!this.trenchWarned) {
            this.trenchWarned = true;
            audio.playHorn();
            this.showDialogue('Chacha',
              'Arey ruko ruko! Aage 2 meter gehra gaddha khuda hai! Chetak se utro [E] aur building ki deewar se lakdi ka lamba phatta laao!');
            this.questText.textContent = 'Crisis 2: Gehra gaddha! Utro [E], deewar ke paas se LAMBA phatta uthao aur gaddhe par rakho!';
          }
          if (Math.abs(this.scooterSpeed) < 0.6) {
            this.promptTip.innerHTML = '🚧 Aage gaddha! Press <b>[E]</b> to Dismount & fetch a plank!';
          }
        }
      }

      // Progress from Stage 1 to Stage 2 (or Stage 3 if cow already distracted by walking Chacha)
      if (this.stage === 1 && this.plankPlaced && this.scooter.position.x > 48.3) {
        this.addScore(200, 1);
        this.spawnFloatingScore('+200 SWAG 🌉 BRIDGE CROSSED!', this.scooter.position);
        if (this.cow.userData.isDistracted) {
          this.setStage(3);
          this.triggerJugaadToast('✨ TRENCH CROSSED & ROAD IS CLEAR! ✨');
          this.questText.textContent = 'Full throttle bhagao! Sheesh Mahal gate me entry maaro!';
        } else {
          this.setStage(2);
          this.triggerJugaadToast('✨ TRENCH CROSSED! KEEP GOING! ✨');
          this.questText.textContent = 'Aage sadak par dekhein! Gau Mata raste me aaram kar rahi hain!';
        }
      }

      // STAGE 2: Cow Roadblock Warning & Prompt before Cow if NOT distracted
      if (this.stage === 2 && !this.cow.userData.isDistracted) {
        if (this.scooter.position.x >= 53.0 && this.scooter.position.x < 59.5) {
          this.promptTip.innerHTML = '🐮 Gau Mata sadak par baithi hain! Press <b>[E]</b> to Dismount & Taazi Ghaas khilayein!';
        }
      }

      // Progress from Stage 2 to Stage 3 once Cow roadblock is cleared!
      if (this.stage === 2 && this.cow.userData.isDistracted && this.scooter.position.x > 63.5) {
        this.setStage(3);
        this.triggerJugaadToast('✨ ROAD CLEAR! FULL THROTTLE! ✨');
        this.questText.textContent = 'Full throttle bhagao! Sheesh Mahal gate me entry maaro!';
      }

      // --- COW ACCIDENT COLLISION CHECK ---
      const dxCow = Math.abs(this.scooter.position.x - this.cow.position.x);
      const dzCow = Math.abs(this.scooter.position.z - this.cow.position.z);
      const isCowHit = this.cow.userData.isDistracted
        ? (dxCow < 1.8 && dzCow < 1.3) // Direct collision with cow at roadside eating grass
        : (dxCow < 2.2 && dzCow < 1.5); // Roadblock collision in center road
      if (isCowHit && !this.isAccident) {
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
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 2.4, 0.08);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.scooter.position.z + 8.8, 0.08);
      const camTargetY = this.isFalling ? THREE.MathUtils.lerp(1.4, -0.4, Math.min(1, Math.max(0, -this.scooter.position.y / 2.15))) : 1.4;
      this.camera.lookAt(this.scooter.position.x + 2, camTargetY, this.scooter.position.z);

      // --- 4. DESTINATION ARRIVAL: SHEESH MAHAL GATE & VIP ROADSIDE PARKING BAY ---
      if (this.stage === 3) {
        // Gate Barrier: Scooter cannot enter wedding palace gate or red carpet!
        if (this.scooter.position.x > 74.2 && this.scooter.position.z > -1.2) {
          this.scooter.position.x = 74.2;
          this.scooterSpeed = 0;
          this.promptTip.innerHTML = '⛔ <b>Sheesh Mahal Gate:</b> Scooter andar le jana mana hai! Baayein VIP Parking Bay me mod kar lagayein!';
        } else if (this.scooter.position.x > 75.8) {
          this.scooter.position.x = 75.8;
          this.scooterSpeed = 0;
        }

        const inParkingBay = (
          this.scooter.position.x >= 71.8 &&
          this.scooter.position.x <= 76.2 &&
          this.scooter.position.z <= -1.1 &&
          this.scooter.position.z >= -3.3
        );

        if (inParkingBay) {
          this.promptTip.innerHTML = '🅿️ <b>VIP Parking Bay:</b> Chetak park karne ke liye <b>[E]</b> dabayein!';
        } else if (this.scooter.position.x >= 71.0) {
          this.promptTip.innerHTML = '🅿️ Aage baayein VIP Parking Bay hai! Steering modkar slot me le jaayein!';
        } else if (this.scooter.position.x >= 65.0) {
          this.promptTip.innerHTML = 'Sheesh Mahal aa gaya! Sadak ke kinare bane VIP Parking Bay me Chetak park karein!';
        }
      }
    }

    // --- ANIMATE PARKING BAY BOUNCING ARROW ---
    if (this.parkingArrow && this.parkingArrow.visible) {
      this.parkingArrow.position.y = 2.2 + Math.sin(time * 6) * 0.22;
      this.parkingArrow.rotation.y += delta * 2.2;
    }

    // --- 4B. CINEMATIC WEDDING GRAND ENTRY WALK ---
    if (this.isWeddingWalk) {
      this.weddingWalkTimer = (this.weddingWalkTimer || 0) + delta;
      
      // Chacha & Chachi walk side-by-side into Sheesh Mahal doors (+X direction, along red carpet)
      const walkSpeed = 2.0 * delta;
      this.player.position.x += walkSpeed;
      this.player.position.z = THREE.MathUtils.lerp(this.player.position.z, -0.3, 0.08);
      this.chachi.position.x += walkSpeed;
      
      // Face forwards into palace
      this.player.rotation.y = THREE.MathUtils.lerp(this.player.rotation.y, Math.PI / 2, 0.15);
      this.chachi.rotation.y = THREE.MathUtils.lerp(this.chachi.rotation.y, Math.PI / 2, 0.15);
      
      // Walking leg swing cadence for both
      const swing = Math.sin(this.weddingWalkTimer * 9) * 0.42;
      if (this.player.userData.leftLegPivot) {
        this.player.userData.leftLegPivot.rotation.x = swing;
        this.player.userData.rightLegPivot.rotation.x = -swing;
      }
      if (this.chachi.userData.leftLegPivot) {
        this.chachi.userData.leftLegPivot.rotation.x = -swing;
        this.chachi.userData.rightLegPivot.rotation.x = swing;
      }
      
      // Camera smoothly tracks their proud entrance
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x - 2.8, 0.06);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, 7.2, 0.06);
      this.camera.lookAt(this.player.position.x + 2, 1.4, 0);

      if (this.weddingWalkTimer > 2.8) {
        this.isWeddingWalk = false;
        this.timerRunning = false; // Stop timer upon victory

        const timeBonus = Math.max(0, Math.floor(this.gameTimer) * 5);
        const finalRunScore = this.currentRunScore + timeBonus;

        const vRun = document.getElementById('victory-run-score');
        const vTime = document.getElementById('victory-time-bonus');
        const vFinal = document.getElementById('victory-final-score');
        const vHighMsg = document.getElementById('victory-high-score-msg');

        if (vRun) vRun.textContent = `+${this.currentRunScore}`;
        if (vTime) vTime.textContent = `+${timeBonus} (${Math.floor(this.gameTimer)}s left)`;
        if (vFinal) vFinal.textContent = `${finalRunScore} Pts`;

        // Update LocalStorage: Best High Score & Lifetime Total Swag
        const prevHighScore = parseInt(localStorage.getItem('bhopali_high_score') || '0', 10);
        const prevTotalSwag = parseInt(localStorage.getItem('bhopali_total_swag') || localStorage.getItem('bhopali_swag') || '1000', 10);

        const newTotalSwag = prevTotalSwag + finalRunScore;
        localStorage.setItem('bhopali_total_swag', newTotalSwag.toString());

        if (finalRunScore > prevHighScore) {
          localStorage.setItem('bhopali_high_score', finalRunScore.toString());
          if (vHighMsg) vHighMsg.textContent = '🌟 NAYA RECORD! NEW HIGH SCORE! 🏆';
        } else {
          if (vHighMsg) vHighMsg.textContent = `🏆 Best High Score: ${prevHighScore} Pts`;
        }

        // Update Home & HUD badges
        const topScoreEl = document.getElementById('top-score');
        const topHighScoreEl = document.getElementById('top-high-score');
        if (topScoreEl) topScoreEl.textContent = newTotalSwag.toString();
        if (topHighScoreEl) topHighScoreEl.textContent = Math.max(prevHighScore, finalRunScore).toString();

        if (this.victoryModal) this.victoryModal.style.display = 'flex';
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

    // --- TRENCH DEEP PIT FALL PHYSICS (CARRIES TO CENTER x = 11.0, LANDS ON PIT BED y = -2.15m ON WATER & STONES) ---
    if (this.isFalling) {
      const activeObj = this.isRiding ? this.scooter : this.player;

      // Keep camera smoothly framed at elevated height y = 2.4 overlooking the pit
      if (this.isRiding) {
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.scooter.position.x + 4.5, 0.08);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 2.4, 0.08);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.scooter.position.z + 8.8, 0.08);
        const camTargetY = THREE.MathUtils.lerp(1.4, -0.4, Math.min(1, Math.max(0, -this.scooter.position.y / 2.15)));
        this.camera.lookAt(this.scooter.position.x + 2, camTargetY, this.scooter.position.z);
      } else {
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x + 3.2, 0.06);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 2.4, 0.06);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.player.position.z + 8.8, 0.06);
        const camTargetY = THREE.MathUtils.lerp(1.3, -0.4, Math.min(1, Math.max(0, -this.player.position.y / 2.15)));
        this.camera.lookAt(this.player.position.x + 1, camTargetY, this.player.position.z);
      }

      if (!this.trenchLanded) {
        this.trenchFallVel = (this.trenchFallVel || -1.5) - 22.0 * delta;
        activeObj.position.y += this.trenchFallVel * delta;

        // Horizontally carry into the trench center (x = 11.0)
        activeObj.position.x = THREE.MathUtils.lerp(activeObj.position.x, this.trenchTargetX, 0.08);

        // Angled tumble / nose-dive
        if (this.isRiding) {
          this.scooter.rotation.z = THREE.MathUtils.lerp(this.scooter.rotation.z, -0.75, 0.15);
        } else {
          this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, 0.65, 0.15);
        }

        // Check impact at bottom pit floor (water and stone bed at y <= -2.10m)
        if (activeObj.position.y <= -2.10) {
          this.trenchLanded = true;
          activeObj.position.y = -2.15;
          this.trenchFallVel = 0;

          if (this.isRiding) {
            this.scooter.rotation.z = -1.15; // Tilted on stones
            this.scooter.rotation.x = 0.25;
          }

          // 1. Water Splash & Mud Debris particle explosion!
          this.emitWaterSplash(activeObj.position);

          // 2. Audio impacts
          audio.playSplash();
          audio.playBrickThud();
          if (this.isRiding) audio.playHorn();

          // 3. Screen Impact Shake
          this.shakeDuration = 0.45;

          // Deduct 1 Heart for Pit Fall Crash & apply score penalty!
          this.deductLife('Gaddhe ke paani aur pattharon me dharraam se gir gaye! (-1 Heart)');
          this.addScore(-150, 0);
          this.spawnFloatingScore('🌊 -150 SWAG! PIT FALL!', activeObj.position);

          // 4. Toast
          this.triggerJugaadToast('💥 CHHAPAAK! GADDHE MEIN GIRE! (-1 HEART)');

          // 5. Allow player to clearly see Chacha/scooter down in the pit for 1.8 seconds, then safely respawn (only if lives remain)
          setTimeout(() => {
            if (this.lives <= 0) return;
            if (this.shortPlankPlaced && !this.longPlankPlaced) {
              this.shortPlankFailed = true;
              this.questText.textContent = 'Chhota phatta bekaar nikla! Utro [E], deewar ke paas se LAMBA (4.2m) phatta laao!';
              this.showDialogue('Chacha', 'Yeh chhota phatta aadhe gaddhe tak hi hai! Utar ke building ki deewar se LAMBA phatta laao.');
            }
            const respawnZ = this.longPlankPlaced ? this.longPlankZ : (this.shortPlankPlaced ? this.shortPlankZ : 0);
            if (this.isRiding) {
              // Respawn well back from the pit, stopped, with a short grace period so a held key doesn't send him straight back in
              this.scooter.position.set(39.6, 0, respawnZ);
              this.scooterSpeed = 0;
              this.respawnGrace = 1.2;
              this.scooter.rotation.set(0, 0, 0);
              this.scooter.position.y = 0;
              this.scooterSpeed = 0;
              this.respawnGrace = 1.2;
              this.isFalling = false;
              this.trenchLanded = false;
              audio.startScooterEngine();
            } else {
              this.player.position.set(41.5, 0, respawnZ);
              this.player.rotation.set(0, 0, 0);
              this.player.position.y = 0;
              this.isFalling = false;
              this.trenchLanded = false;
            }
          }, 1800);
        }
      }
    }

    // --- WATER SPLASH PARTICLES ---
    if (this.splashParticles) {
      this.splashParticles.forEach(p => {
        if (p.mesh.visible) {
          p.life += delta;
          p.mesh.position.addScaledVector(p.vel, delta);
          p.vel.y -= 14.0 * delta; // Gravity
          p.mesh.scale.setScalar(Math.max(0.05, (1 - p.life / p.maxLife) * 1.2));
          if (p.life >= p.maxLife || p.mesh.position.y < -2.25) {
            p.mesh.visible = false;
          }
        }
      });
    }

    // --- 7. ACCIDENT CAMERA SHAKE & SPINNING STARS ---
    if (this.dazedGuy && this.dazedGuy.visible && this.dazedGuy.userData.starsOrbit) {
      this.dazedGuy.userData.starsOrbit.rotation.y += 0.08;
    }

    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      this.camera.position.x += (Math.random() - 0.5) * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * 0.35;
    }

    if (this.life) this.life.update(delta, time);
    if (this.guide) {
      this.computeGuide();
      this.guide.update(delta, this.isRiding ? this.scooter.position : this.player.position);
    }
    this.updateTyreDust(delta);

    // Keep the sun's shadow box centred on whoever the camera follows
    this.gfx.followSun(this.isRiding ? this.scooter.position : this.player.position);
    this.gfx.render(delta);
  }

  // Decide what the floating guide should point at this frame
  computeGuide() {
    const g = this.guide;
    if (this.isCutscene || this.isGameOver || this.stage >= 5) { g.clear(); g.setObjective(null); return; }
    const p = this.player.position;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const short = (t) => (t || '').replace(/\s*\(.*\)\s*/g, '').trim();
    const itemOf = (type) => this.items.find(it => it.userData && it.userData.type === type);
    const junk = V(-9.2, 0, -2.8);
    const phonePos = this.phoneCurrentPos || V(-5.8, 0.32, -3.4);
    const trenchEdge = V(43.4, 0, Math.max(-2.2, Math.min(2.2, this.scooter.position.z)));
    let target = null;

    if (!this.isRiding && !this.isFalling) {
      if (!this.inventory) {
        if (this.stage === 0 && flat(p, junk) < 2.4) {
          target = { pos: junk, groundY: 0.32, height: 1.7, text: 'Kabaad Dher — jugaad tool chuno', kind: 'use' };
        } else if (this.stage === 0 && this.phoneScreenItem && this.phoneScreenItem.visible && flat(p, phonePos) < 2.6) {
          target = { pos: phonePos, groundY: 0.32, height: 1.2, text: 'Toota phone uthao', kind: 'pick' };
        }
        if (!target) {
          let best = null, bd = 2.8;
          this.items.forEach(it => {
            if (!it.visible || it === this.phoneScreenItem) return;
            const d = flat(p, it.position);
            if (d < bd) { bd = d; best = it; }
          });
          const dScooter = flat(p, this.scooter.position);
          if (best && !(this.stage >= 1 && this.stage < 4 && dScooter < bd)) {
            const isPlank = best.userData.type === 'plank' || best.userData.type === 'short_plank';
            target = (isPlank && !this.trenchEncountered)
              ? { pos: best.position, height: 1.4, text: 'Pehle Chetak chala ke sadak par aao', kind: 'locked' }
              : { pos: best.position, height: Math.max(1.3, best.position.y + 0.9), text: 'Uthao: ' + short(best.userData.title), kind: 'pick' };
          } else if (dScooter < 2.8 && this.stage < 4) {
            target = this.stage === 0
              ? { pos: this.scooter.position, height: 1.9, text: 'Pehle toota phone theek karo', kind: 'locked', ringScale: 1.6 }
              : { pos: this.scooter.position, height: 1.9, text: 'Chetak par baitho', kind: 'use', ringScale: 1.6 };
          }
        }
      } else {
        const t = this.inventory.userData.type;
        if (this.stage === 0 && this.inventory.userData.isPhone && flat(p, junk) < 2.4) {
          target = { pos: junk, groundY: 0.32, height: 1.7, text: 'Tool chuno: rubber band / tape', kind: 'use' };
        } else if (this.stage === 1 && flat(p, this.trench.position) < 3.8) {
          target = { pos: trenchEdge, height: 1.3, text: (t === 'plank' || t === 'short_plank') ? 'Yahan phatta rakho' : 'Isse pull nahi banega', kind: (t === 'plank' || t === 'short_plank') ? 'use' : 'locked', ringScale: 1.4 };
        } else if (this.stage === 2 && flat(p, this.cow.position) < 3.6) {
          target = { pos: this.cow.position, height: 2.4, text: t === 'grass' ? 'Gau Mata ko ghaas khilao' : 'Gau Mata ye nahi khayengi', kind: t === 'grass' ? 'use' : 'locked', ringScale: 1.8 };
        } else if (this.stage === 4 && flat(p, this.scooter.position) < 3.4) {
          target = { pos: this.scooter.position, height: 1.6, text: t === 'brick' ? 'Eent laga ke Chetak khada karo' : 'Isse stand nahi banega', kind: t === 'brick' ? 'use' : 'locked', ringScale: 1.6 };
        }
      }
    }
    if (target) g.set(target); else g.clear();

    // Objective beacon
    let obj = null;
    const inv = this.inventory && this.inventory.userData;
    if (this.stage === 0) {
      obj = (inv && inv.isPhone) ? junk : (this.phoneScreenItem && this.phoneScreenItem.visible ? phonePos : null);
    } else if (this.stage === 1) {
      if (this.plankPlaced) obj = this.isRiding ? null : this.scooter.position;
      else if (!this.trenchEncountered) obj = this.isRiding ? null : this.scooter.position;
      else if (inv && (inv.type === 'plank' || inv.type === 'short_plank')) obj = trenchEdge;
      else if (!this.isRiding) { const pl = itemOf('plank'); obj = pl ? V(pl.position.x, 0, pl.position.z + 1.0) : null; }
    } else if (this.stage === 2 && !this.cow.userData.isDistracted) {
      if (inv && inv.type === 'grass') obj = this.cow.position;
      else if (!this.isRiding) { const gr = itemOf('grass'); obj = gr ? gr.position : null; }
    } else if (this.stage === 3) {
      obj = this.isRiding ? null : this.scooter.position;   // while riding, the game's own VIP-parking arrow guides
    } else if (this.stage === 4) {
      if (inv && inv.type === 'brick') obj = this.scooter.position;
      else { const br = itemOf('brick'); obj = br ? br.position : null; }
    }
    g.setObjective(obj, 2.3);
  }

  updatePrompt() {
    if (this.isCutscene) return;
    const pPos = this.player.position;

    // Check broken phone pieces first (takes precedence over Kabaad Dher prompt)
    if (!this.inventory && this.stage === 0) {
      const phonePos = this.phoneCurrentPos || new THREE.Vector3(-5.8, 0.32, -3.4);
      const distToPhone = pPos.distanceTo(phonePos);
      if (distToPhone < 2.5) {
        this.promptTip.innerHTML = '✨ Press <b>[E]</b> to Pick up Broken Phone Pieces!';
        return;
      }
    }

    // Check distance to Kabaad Dher (strict proximity at junk pile x = -9.2, z = -2.8)
    const distToJunk = pPos.distanceTo(new THREE.Vector3(-9.2, 0.32, -2.8));
    if (this.stage === 0 && distToJunk < 1.8) {
      this.promptTip.innerHTML = '📦 Press <b>[E]</b> to Open Kabaad Dher Tool Selector!';
      return;
    }

    // Check proximity to an already placed plank at trench to pick up or swap
    if (!this.inventory && this.stage === 1) {
      let nearestPlaced = null;
      let minPlacedDist = 2.5;
      [this.longPlankMesh, this.shortPlankMesh, this.placedPlankMesh].forEach(plankMesh => {
        if (plankMesh && plankMesh.parent === this.scene) {
          const dist = Math.hypot(pPos.x - plankMesh.position.x, pPos.z - plankMesh.position.z);
          if (dist < minPlacedDist) {
            minPlacedDist = dist;
            nearestPlaced = plankMesh;
          }
        }
      });
      if (nearestPlaced) {
        this.promptTip.innerHTML = `✨ Press <b>[E]</b> to Pick up Placed ${nearestPlaced.userData.title || 'Phatta'}`;
        return;
      }
    }

    // Check proximity to Footpath Construction Rubble Barrier (x = 45.8, z = -5.0)
    if (!this.inventory && pPos.z <= -3.2 && Math.hypot(pPos.x - 45.8, pPos.z - (-5.0)) < 2.6) {
      this.promptTip.innerHTML = '🛑 <b>Rasta Band Hai!</b> Nagar Nigam ka malba & pipes pade hain!';
      return;
    }

    if (!this.inventory) {
      if (this.stage < 4 && pPos.distanceTo(this.scooter.position) < 3.2) {
        if (this.stage === 0) {
          this.promptTip.innerHTML = '🔒 <b>Chetak Locked</b>: Pehle toota phone repair karein!';
          return;
        }
        this.promptTip.innerHTML = '✨ Press <b>[E]</b> to Kickstart & Mount Chetak Scooter!';
        return;
      }

      let nearestItem = null;
      let minDist = 2.8;
      this.items.forEach(it => {
        const horizDist = Math.hypot(pPos.x - it.position.x, pPos.z - it.position.z);
        const vertDist = Math.abs(pPos.y - it.position.y);
        if (horizDist < minDist && vertDist < 3.2) {
          minDist = horizDist;
          nearestItem = it;
        }
      });

      if (nearestItem && this.stage >= 1 && this.stage < 4 &&
          Math.hypot(pPos.x - this.scooter.position.x, pPos.z - this.scooter.position.z) < minDist) {
        nearestItem = null;
      }

      if (nearestItem) {
        const isPlank = nearestItem.userData.type === 'plank' || nearestItem.userData.type === 'short_plank';
        if (isPlank && this.stage === 0) {
          this.promptTip.innerHTML = '🔒 <b>Lakdi ka Phatta</b> (Abhi iski zaroorat nahi hai)';
          return;
        }
        if (isPlank && !this.trenchEncountered) {
          this.promptTip.innerHTML = '🔒 <b>Lakdi ka Phatta</b> (Pehle Chetak lekar aao)';
          return;
        }
        this.promptTip.innerHTML = `✨ Press <b>[E]</b> to Inspect / Pick up <b>${nearestItem.userData.title}</b>`;
        return;
      }

      if (this.stage === 4 && pPos.distanceTo(this.scooter.position) < 2.0) {
        this.promptTip.innerHTML = '⚠️ Chetak zameen par giri hai! Footpath ke malbe se <b>Laal Eent</b> [E] uthayein!';
        return;
      }

      if (this.stage === 1 && !this.plankPlaced) {
        this.promptTip.innerHTML = this.trenchEncountered
          ? '🪵 Gaddhe se pehle, building ki deewar se lagi <b>lambi lakdi ka phatta</b> uthao <b>[E]</b>'
          : '🛵 Chetak par baitho <b>[E]</b> aur <b>D</b> se aage chalao';
        return;
      }
      if (this.stage === 1 && this.plankPlaced) {
        this.promptTip.innerHTML = '🛵 Chetak par wapas baitho <b>[E]</b> aur <b>W/S</b> se phatte ki line me aake paar karo';
        return;
      }
      if (this.stage === 2 && !this.cow.userData.isDistracted) {
        this.promptTip.innerHTML = '🌿 Gau Mata se pehle footpath par <b>ghaas ki tokri</b> hai — uthao <b>[E]</b> aur unhe khilao';
        return;
      }
      if (this.stage === 3) {
        this.promptTip.innerHTML = '🛵 Rasta saaf! Chetak par baitho <b>[E]</b> aur Sheesh Mahal ke VIP Parking tak jao';
        return;
      }
      if (this.stage === 4) {
        this.promptTip.innerHTML = '🧱 Parking ke paas footpath pe <b>Laal Eent</b> dhundo <b>[E]</b> aur Chetak ke paas le jao';
        return;
      }

      this.promptTip.innerHTML = 'Explore the mohalla with <b>W, A, S, D</b> | Find the right Jugaad objects!';
    } else {
      if (this.stage === 0) {
        const phonePos = this.phoneCurrentPos || new THREE.Vector3(-5.8, 0.32, -3.4);
        if (this.inventory.userData.isPhone) {
          this.promptTip.innerHTML = 'Toota Phone haath me hai! Deewal ke paas Kabaad Dher [E] se tool chunein!';
          return;
        } else if (pPos.distanceTo(phonePos) < 2.8) {
          this.promptTip.innerHTML = `✨ Press <b>[E]</b> to apply <b>${this.inventory.userData.title}</b> to Broken Phone!`;
          return;
        }
      } else if (this.stage === 1 && pPos.distanceTo(this.trench.position) < 3.4) {
        this.promptTip.innerHTML = `✨ Press <b>[E]</b> to place <b>${this.inventory.userData.title}</b> across Trench!`;
      } else if ((this.stage === 1 || this.stage === 2) && pPos.distanceTo(this.cow.position) < 3.6) {
        this.promptTip.innerHTML = `✨ Press <b>[E]</b> to offer <b>${this.inventory.userData.title}</b> to Gau Mata!`;
      } else if (this.stage === 4 && pPos.distanceTo(this.scooter.position) < 3.4) {
        this.promptTip.innerHTML = `✨ Press <b>[E]</b> to prop up Chetak with <b>${this.inventory.userData.title}</b>!`;
      } else {
        this.promptTip.innerHTML = `Carrying: <b>${this.inventory.userData.title}</b> | Press <b>[E]</b> anywhere to drop`;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setupLoadingGate(['btn-start-game', 'btn-bridge-go']);
  const game = new Game();
  if (import.meta.env && import.meta.env.DEV) window.__game = game; // debugging aid
});
