import * as THREE from 'three';
import { audio } from './audio.js';
import { AssetFactory } from './models.js';

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
    this.camera.position.set(-98 + 3.2, 4.8, 0.5 + 8.8);
    this.camera.lookAt(-2, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Sunset Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x78350f, 0.75);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 1.6);
    sunLight.position.set(12, 24, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    // Street Environment
    this.env = AssetFactory.createStreetEnvironment();
    this.scene.add(this.env);
    this.env.visible = false;
    this.scooter.visible = false;
    this.cow.visible = false;
    this.trench.visible = false;
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
    this.player.position.set(-98, 0, 0.5);
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
    brick.position.set(-97, 0, 1.5);
    this.scene.add(brick);
    this.items.push(brick);

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
      { type: 'circle', x: 21.5, z: -0.2, radius: 1.5, name: 'Cow' }
    ];

    // Dazed Character (Spawned after accident)
    this.dazedGuy = AssetFactory.createDazedCharacter();
    this.dazedGuy.visible = false;
    this.scene.add(this.dazedGuy);

    this.isAccident = false;
    this.shakeDuration = 0;

    this.initExhaustParticles();
    this.initConfetti();
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
    this.promptTip = document.getElementById('prompt-text');
    this.jugaadPopup = document.getElementById('jugaad-popup');
    this.victoryModal = document.getElementById('victory-modal');

    this.showDialogue(
      'Mom',
      'Beta jaldi uth! Aaj function hai. 10 baje tak pahunchna hai! Par room ka darwaza jam ho gaya hai, koi jugaad lagao darwaza kholne ka!'
    );
  }

  showDialogue(speaker, text) {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.dialogueSpeaker.textContent = ` ${speaker}`;
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

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      audio.init();
      if (!audio.musicPlaying) audio.startDesiBGM();

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = true;

      if (e.code === 'KeyE') this.handleAction();
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

      // 1. Start flight immediately on page load (0ms delay)
      requestAnimationFrame(stepFlight);

      // 2. Play supersonic plane whoosh audio ONLY for the flight
      audio.playPlaneWhoosh();

      // If browser autoplay policy initially suspended audio on page reload,
      // allow first click to resume it ONLY while plane is still airborne!
      const unlockDuringFlight = () => {
        if (!flightEnded) {
          audio.init();
          audio.playPlaneWhoosh();
        }
        window.removeEventListener('pointerdown', unlockDuringFlight);
      };
      window.addEventListener('pointerdown', unlockDuringFlight);
    }

    // 2. Landing Screen & Sound Toggle
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    if (btnToggleSound) {
      btnToggleSound.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMuted = audio.toggleMute();
        btnToggleSound.textContent = isMuted ? 'Sound Off' : 'Sound On';
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
        alert(" DESI JUGAAD HACK #1 (Bhopal Scooter Secret):\n\n'Agar scooter ki kick jam ho jaye ya subah thand me start na ho — gaadi ko 45° right tilt karke 3 second ruko, phir single kick maaro, 100% start!'\n\n Bonus: +150 Desi Swag Points Added!");
      });
    }

    const giftBox2 = document.getElementById('gift-box-2');
    if (giftBox2) {
      giftBox2.addEventListener('click', () => {
        audio.init();
        audio.playJugaadSuccess();
        this.addScore(150, 0);
        alert(" DESI JUGAAD HACK #2 (Universal Desi Rule):\n\n'Gaadi ka fuse udd jaye toh mohalle ke paan wale se safety pin ya cigarette silver foil lo aur socket bypass karo! Desi jugaad zindabad!'\n\n Bonus: +150 Desi Swag Points Added!");
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
    };

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
  }

  initStats() {
    let savedStars = localStorage.getItem('bhopali_stars') || '3';
    let savedScore = localStorage.getItem('bhopali_swag') || '1000';
    const topStars = document.getElementById('top-stars');
    const topScore = document.getElementById('top-score');
    if (topStars) topStars.textContent = savedStars;
    if (topScore) topScore.textContent = savedScore;
  }

  addScore(points, stars = 0) {
    let currentScore = parseInt(localStorage.getItem('bhopali_swag') || '1000', 10);
    let currentStars = parseInt(localStorage.getItem('bhopali_stars') || '3', 10);
    currentScore += points;
    currentStars = Math.min(12, currentStars + stars);
    localStorage.setItem('bhopali_swag', currentScore.toString());
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
        audio.playBrickThud();
        this.promptTip.innerHTML = `Carrying: <b>${nearestItem.userData.title}</b>. Press [E] to use or drop!`;
        return;
      }
    }

    // 2. Carrying an item: Test / Use / Place
    if (this.inventory) {
      const carried = this.inventory;

      // CRISIS 1: Near House Door in Trailer Level (x=-101)
      const distToDoor = pPos.distanceTo(new THREE.Vector3(-101, 0, 0.5));
      if (this.stage === 0 && distToDoor < 3.5) {
        if (carried.userData.type === 'brick') {
          this.player.remove(carried);
          // Don't add brick back, just destroy it
          
          // Open door animation
          if(this.house) {
            this.house.children.forEach(child => {
               if(child.name === 'HouseDoor') child.rotation.y = Math.PI / 2.5;
            });
          }
          
          // TELEPORT to street level
          setTimeout(() => {
              this.house.visible = false;
              this.items.forEach(item => item.visible = true);
              this.env.visible = true;
              this.scooter.visible = true;
              this.cow.visible = true;
              this.trench.visible = true;
              this.player.position.set(-4, 0, 0.5);
              this.camera.position.set(-4 + 3.2, 4.8, 0.5 + 8.8); // Snap camera
              this.scooter.rotation.x = 0; // Fix scooter stand implicitly
          }, 800);

          this.inventory = null;
          this.stage = 1;
          this.updateMeter(25);
          audio.playBrickThud();
          this.triggerJugaadToast('JUGAAD 1: DOOR OPENED! (+25%)');
          this.showDialogue(
            'Mom',
            'Brick used as door stopper! You are out of the house. Now get on the scooter, but beware of the broken road!'
          );
          this.questText.textContent = 'Get on the scooter [E], but there is a trench ahead! Find a wooden plank!';
          return;
        } else {
          this.showDialogue('Mom', carried.userData.rejectMsg || 'Yeh darwaza nahi khol sakta!');
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

      // Drop item anywhere
      this.player.remove(carried);
      this.scene.add(carried);
      carried.position.set(pPos.x, 0, pPos.z);
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

    const delta = 0.016;
    const time = performance.now() * 0.002;

    // --- 1. WALKING PLAYER PHYSICS & COLLISION ---
    if (!this.isRiding && this.stage < 4 && !this.isFalling) {
      let vx = 0;
      let vz = 0;

      if (this.keys.left) vx -= 1;
      if (this.keys.right) vx += 1;
      if (this.keys.up) vz -= 1;
      if (this.keys.down) vz += 1;

      const moveLen = Math.hypot(vx, vz);

      if (moveLen > 0.01) {
        vx = (vx / moveLen) * 4.5 * delta;
        vz = (vz / moveLen) * 4.5 * delta;

        let nextX = this.player.position.x + vx;
        let nextZ = this.player.position.z + vz;

        nextX = Math.max(-8, Math.min(38, nextX));
        nextZ = Math.max(-4.2, Math.min(2.8, nextZ));

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

        // Walk cycle
        this.player.userData.walkPhase += moveLen * 3.8;
        const swing = Math.sin(this.player.userData.walkPhase) * 0.65;
        this.player.userData.leftLegPivot.rotation.x = swing;
        this.player.userData.rightLegPivot.rotation.x = -swing;
        this.player.userData.leftArmPivot.rotation.x = -swing * 0.75;
        this.player.userData.rightArmPivot.rotation.x = swing * 0.75;
        this.player.userData.torsoGroup.position.y = 1.25 + Math.abs(Math.sin(this.player.userData.walkPhase * 2)) * 0.05;
      } else {
        this.player.userData.leftLegPivot.rotation.x *= 0.8;
        this.player.userData.rightLegPivot.rotation.x *= 0.8;
        this.player.userData.leftArmPivot.rotation.x *= 0.8;
        this.player.userData.rightArmPivot.rotation.x *= 0.8;
        this.player.userData.torsoGroup.position.y = THREE.MathUtils.lerp(this.player.userData.torsoGroup.position.y, 1.25, 0.1);
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
    }

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
        this.addScore(500, 1);

        this.triggerJugaadToast(' VICTORY: LEVEL 1 CLEARED! ');
        this.showDialogue(
          'Mom',
          'Wah Miyaan! Bada Talab VIP Road pahunch gaye! Bhopal me koi mushkil nahi jo Jugaad se na suljhe!'
        );
        this.questText.textContent = '🌟 CONGRATULATIONS! You mastered the Bhopal Mohalla Jugaad!';
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

    this.renderer.render(this.scene, this.camera);
  }

  updatePrompt() {
    const pPos = this.player.position;

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
        this.promptTip.innerHTML = ` Press <b>[E]</b> to Inspect / Pick up <b>${nearestItem.userData.title}</b>`;
        return;
      }

      if (this.stage === 3) {
        if (pPos.distanceTo(this.scooter.position) < 2.8) {
          this.promptTip.innerHTML = ' Press <b>[E]</b> to Kickstart & Mount Scooter!';
          return;
        }
      }

      this.promptTip.innerHTML = 'Explore the mohalla with <b>W, A, S, D</b> | Find the right Jugaad objects!';
    } else {
      if (this.stage === 0 && pPos.distanceTo(this.scooter.position) < 2.8) {
        this.promptTip.innerHTML = ` Press <b>[E]</b> to test <b>${this.inventory.userData.title}</b> as Scooter Stand!`;
      } else if (this.stage === 1 && pPos.distanceTo(this.trench.position) < 3.4) {
        this.promptTip.innerHTML = ` Press <b>[E]</b> to place <b>${this.inventory.userData.title}</b> across Trench!`;
      } else if (this.stage === 2 && pPos.distanceTo(this.cow.position) < 3.6) {
        this.promptTip.innerHTML = ` Press <b>[E]</b> to offer <b>${this.inventory.userData.title}</b> to Gau Mata!`;
      } else {
        this.promptTip.innerHTML = `Carrying: <b>${this.inventory.userData.title}</b> | Press <b>[E]</b> anywhere to drop`;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
