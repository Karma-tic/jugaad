import * as THREE from 'three';
import { pbrMat } from './materials.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// High-Fidelity Stylized 3D Asset Factory (Pixar/DreamWorks aesthetic)
export 
class TextureGenerator {
  static createNoiseTexture(color1, color2, width=256, height=256, noiseScale=50) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
    
    for (let i = 0; i < (width * height) / 2; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillStyle = color2;
      ctx.globalAlpha = Math.random() * 0.15;
      ctx.fillRect(x, y, Math.random() * noiseScale, Math.random() * noiseScale);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#b0bec5'; // mortar color
    ctx.fillRect(0, 0, 512, 512);
    
    const rows = 16;
    const cols = 8;
    const h = 512 / rows;
    const w = 512 / cols;
    
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2 === 0) ? 0 : w / 2;
      for (let c = -1; c < cols; c++) {
        const x = c * w + offset;
        const y = r * h;
        
        ctx.fillStyle = '#c0392b'; // brick base
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        
        // noise on brick
        ctx.fillStyle = '#a93226';
        ctx.globalAlpha = 0.5;
        for (let i=0; i<10; i++) {
           ctx.fillRect(x + 2 + Math.random()*(w-4), y + 2 + Math.random()*(h-4), 4, 4);
        }
        ctx.globalAlpha = 1.0;
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
}

export class AssetFactory {

  // Natural walk cycle shared by every standing character.
  // speed = world units / second actually travelled (0 when idle). Legs are driven by distance,
  // so the steps always match the ground speed instead of the frame rate.
  static animateWalk(ch, speed, delta, carrying = false) {
    const u = ch.userData;
    if (!u || !u.leftLegPivot) return;
    const moving = speed > 0.05;
    u.walkBlend = THREE.MathUtils.damp(u.walkBlend || 0, moving ? 1 : 0, moving ? 7 : 5, delta);
    const STRIDE = 2.3; // world units covered by one full left+right step cycle
    const prevStep = Math.floor((u.walkPhase || 0) / Math.PI);
    if (moving) u.walkPhase = (u.walkPhase || 0) + (speed * delta / STRIDE) * Math.PI * 2;
    u.stepped = moving && Math.floor(u.walkPhase / Math.PI) !== prevStep; // a foot just touched down
    const p = u.walkPhase || 0;
    const w = u.walkBlend;
    const t = performance.now() * 0.001;

    // Hips: +x swings the leg back, -x forward
    const hipL = Math.sin(p) * 0.4 * w;
    const hipR = -hipL;
    u.leftLegPivot.rotation.x = hipL;
    u.rightLegPivot.rotation.x = hipR;
    // Knees bend while the leg swings forward (foot clears the ground), almost straight on contact
    const kneeFor = (ph) => (Math.max(0, -Math.cos(ph)) * 0.8 + 0.05) * w;
    const kL = kneeFor(p), kR = kneeFor(p + Math.PI);
    if (u.leftKnee) u.leftKnee.rotation.x = kL;
    if (u.rightKnee) u.rightKnee.rotation.x = kR;
    // Keep the soles roughly parallel to the ground
    if (u.leftFoot) u.leftFoot.rotation.x = -(hipL + kL) * 0.55;
    if (u.rightFoot) u.rightFoot.rotation.x = -(hipR + kR) * 0.55;

    // Body: soft bob twice per cycle, slight forward lean, gentle counter-twist, idle breathing
    const bob = (Math.abs(Math.cos(p)) - 0.5) * 0.035 * w;
    const breathe = Math.sin(t * 1.6) * 0.006 * (1 - w);
    u.torsoGroup.position.y = 1.25 + bob + breathe;
    u.torsoGroup.rotation.x = 0.05 * w;
    u.torsoGroup.rotation.y = Math.sin(p) * 0.07 * w;
    u.torsoGroup.rotation.z = Math.sin(p) * 0.02 * w;
    const hem = u.torsoGroup.userData.kurtaHem;
    if (hem) {
      // kurta hem swings a little behind the stride
      hem.rotation.x = Math.sin(p * 2 - 0.6) * 0.04 * w - 0.03 * w;
      hem.rotation.z = Math.sin(p - 0.5) * 0.05 * w;
    }

    if (carrying) {
      const hold = Math.sin(p * 2) * 0.02 * w;
      u.leftArmPivot.rotation.set(-1.2 + hold, -0.15, -0.2);
      u.rightArmPivot.rotation.set(-1.2 - hold, 0.15, 0.2);
      if (u.leftElbow) u.leftElbow.rotation.x = -0.35;
      if (u.rightElbow) u.rightElbow.rotation.x = -0.35;
      return;
    }
    // Arms swing opposite to the legs with a relaxed elbow bend
    const armL = -hipL * 0.8, armR = -hipR * 0.8;
    u.leftArmPivot.rotation.set(armL, 0, -0.07 - 0.02 * (1 - w));
    u.rightArmPivot.rotation.set(armR, 0, 0.07 + 0.02 * (1 - w));
    if (u.leftElbow) u.leftElbow.rotation.x = -0.12 - Math.max(0, -armL) * 0.6 - 0.1 * w;
    if (u.rightElbow) u.rightElbow.rotation.x = -0.12 - Math.max(0, -armR) * 0.6 - 0.1 * w;
  }
  // 1. Stylized Pixar/Cartoon Boy (Matching Image 1) - Standing / Walking
  // style: 'boy' (Chapter 1: shirt + jeans) | 'chacha' (Chapter 2: kurta-pyjama, moustache, chappals)
  static createCartoonBoy(opts = {}) {
    const chacha = opts.style === 'chacha';
    const character = new THREE.Group();
    character.name = "CartoonCharacter";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68a64, roughness: 0.62 });
    const skinShadeMat = new THREE.MeshStandardMaterial({ color: 0x8f5a3c, roughness: 0.8 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xb87c57, roughness: 0.7 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x8e5040, roughness: 0.55 });
    const lipLowerMat = new THREE.MeshStandardMaterial({ color: 0x9d5a47, roughness: 0.5 });
    const lipLineMat = new THREE.MeshBasicMaterial({ color: 0x4a2419 });
    // Clothes use the woven fabric texture so they read as cloth, not plastic
    const shoeUpperMat = chacha
      ? new THREE.MeshStandardMaterial({ color: 0x5a3320, roughness: 0.55 })   // leather chappal strap
      : new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const blueShirtMat = chacha
      ? pbrMat('fabric', { color: 0xf0e4c8, tile: 0.45 })                     // cream cotton kurta
      : pbrMat('fabric', { color: 0x2d52b8, tile: 0.45 });                    // blue cotton shirt
    const denimPantsMat = chacha
      ? pbrMat('fabric', { color: 0xf7f3ea, tile: 0.45 })                     // white pyjama
      : pbrMat('fabric', { color: 0x2a3f6e, tile: 0.35, normalScale: 0.9 });  // denim
    const hairMat = new THREE.MeshStandardMaterial({ color: chacha ? 0x2b2622 : 0x1c1410, roughness: 0.9 });
    const whiteShoeMat = chacha
      ? new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 })   // leather sole
      : new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.5 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf4efe8 });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x4a2c17 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Torso Group
    const torsoGroup = new THREE.Group();
    torsoGroup.name = "TorsoGroup";
    torsoGroup.position.set(0, 1.25, 0);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.31, chacha ? 0.31 : 0.27, 0.65, 24), blueShirtMat);
    chest.castShadow = true;
    torsoGroup.add(chest);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), blueShirtMat);
    collar.position.set(0, 0.35, 0);
    collar.rotation.x = Math.PI / 2;
    torsoGroup.add(collar);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 12), skinMat);
    neck.position.set(0, 0.42, 0);
    torsoGroup.add(neck);

    if (chacha) {
      // Kurta falls to mid-thigh with a gentle flare
      const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.37, 0.5, 24, 1, true), blueShirtMat);
      hem.position.set(0, -0.57, 0);
      hem.material.side = THREE.DoubleSide;
      torsoGroup.add(hem);
      torsoGroup.userData.kurtaHem = hem;
      // Button placket + three small buttons
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.012), new THREE.MeshStandardMaterial({ color: 0xe6d7b4, roughness: 0.9 }));
      placket.position.set(0, 0.13, 0.305);
      torsoGroup.add(placket);
      const btnMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.4, metalness: 0.3 });
      [0.24, 0.14, 0.04].forEach(by => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), btnMat);
        b.position.set(0, by, 0.314);
        torsoGroup.add(b);
      });
      // Mandarin (band) collar
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.07, 20, 1, true), blueShirtMat);
      band.position.set(0, 0.37, 0);
      torsoGroup.add(band);
    }

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);

    const headGeo = new THREE.SphereGeometry(0.33, 32, 24);
    headGeo.scale(0.94, 1.12, 0.98);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Short, neat hair: crown cap sits above the forehead, back cap follows the skull down to the nape
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.335, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.44), hairMat);
    hair.scale.set(0.97, 1.12, 1.0);
    hair.position.set(0, 0.075, -0.012);
    hair.rotation.x = -0.12;
    headGroup.add(hair);

    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
    backHair.scale.set(0.97, 1.12, 1.0);
    backHair.position.set(0, 0.02, -0.03);
    backHair.rotation.x = -0.9;
    headGroup.add(backHair);

    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
    fringe.scale.set(1.5, 0.3, 0.9);
    fringe.rotation.set(0.35, 0.15, -0.12);
    fringe.position.set(0.05, 0.25, 0.2);
    headGroup.add(fringe);

    // Eyes – smaller, almond-shaped, warm brown irises (natural look)
    [-0.12, 0.12].forEach((eyeX, idx) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(eyeX, 0.05, 0.295);
      eyeGroup.rotation.y = eyeX * 0.9; // follow the curve of the face

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), eyeWhiteMat);
      sclera.scale.set(1.0, 0.62, 0.45);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), irisMat);
      iris.position.set(0, -0.002, 0.027);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.015, 14), pupilMat);
      pupil.position.set(0, -0.002, 0.028);
      eyeGroup.add(pupil);

      const hl = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), highlightMat);
      hl.position.set(0.009, 0.008, 0.029);
      eyeGroup.add(hl);

      // Upper eyelid – skin-coloured cap gives a relaxed, natural gaze
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.061, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), lidMat);
      lid.scale.set(1.0, 0.66, 0.5);
      lid.position.set(0, 0.004, 0.002);
      eyeGroup.add(lid);

      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.075, 4, 8), hairMat);
      brow.rotation.z = Math.PI / 2 + (idx === 0 ? -0.1 : 0.1);
      brow.position.set(idx === 0 ? -0.005 : 0.005, 0.068, 0.012);
      eyeGroup.add(brow);

      headGroup.add(eyeGroup);
    });

    // Nose – small bridge + rounded tip
    const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.07, 4, 8), skinMat);
    noseBridge.rotation.x = 0.4;
    noseBridge.position.set(0, -0.01, 0.322);
    headGroup.add(noseBridge);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), skinMat);
    nose.scale.set(1.25, 0.9, 0.9);
    nose.position.set(0, -0.058, 0.338);
    headGroup.add(nose);
    [-0.028, 0.028].forEach(nx => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), skinShadeMat);
      nostril.scale.set(1.2, 0.6, 1);
      nostril.position.set(nx * 0.85, -0.068, 0.329);
      headGroup.add(nostril);
    });

    // Lips – thin, muted and closed in a relaxed expression
    const upperLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.075, 4, 10), lipMat);
    upperLip.rotation.z = Math.PI / 2;
    upperLip.position.set(0, -0.128, 0.316);
    headGroup.add(upperLip);
    const lowerLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06, 4, 10), lipLowerMat);
    lowerLip.rotation.z = Math.PI / 2;
    lowerLip.position.set(0, -0.148, 0.31);
    headGroup.add(lowerLip);
    const mouthLine = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.004, 0.004), lipLineMat);
    mouthLine.position.set(0, -0.137, 0.322);
    headGroup.add(mouthLine);
    if (chacha) {
      // Classic thick moustache + greying temples
      const mo = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 4, 10), hairMat);
      mo.rotation.z = Math.PI / 2;
      mo.position.set(0, -0.098, 0.325);
      mo.scale.set(1, 1, 0.8);
      headGroup.add(mo);
      [-1, 1].forEach(side => {
        const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.04, 4, 8), hairMat);
        tip.position.set(side * 0.075, -0.115, 0.31);
        tip.rotation.z = side * 0.9;
        headGroup.add(tip);
        const grey = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9a948c, roughness: 0.9 }));
        grey.scale.set(0.35, 1.0, 0.9);
        grey.position.set(side * 0.305, 0.07, 0.02);
        headGroup.add(grey);
      });
    }
    // Chin & jaw definition
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), skinMat);
    chin.scale.set(1.2, 0.7, 0.7);
    chin.position.set(0, -0.215, 0.215);
    headGroup.add(chin);

    [-0.33, 0.33].forEach(earX => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
      ear.scale.set(0.45, 1.15, 0.75);
      ear.position.set(earX, 0.0, -0.01);
      headGroup.add(ear);
    });

    torsoGroup.add(headGroup);

    // Arms – shoulder pivot + elbow joint so arms swing and bend naturally
    const makeArm = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.25, 0);
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), blueShirtMat);
      pivot.add(shoulder);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.064, 0.34, 12), blueShirtMat);
      upper.position.y = -0.17;
      pivot.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.34;
      const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 10), skinMat);
      elbow.add(elbowCap);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, 0.3, 12), skinMat);
      fore.position.y = -0.15;
      elbow.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), skinMat);
      hand.scale.set(0.8, 1.2, 0.95);
      hand.position.y = -0.34;
      elbow.add(hand);
      pivot.add(elbow);
      pivot.userData.elbow = elbow;
      return pivot;
    };
    const leftArmPivot = makeArm(0.36);
    torsoGroup.add(leftArmPivot);

    const rightArmPivot = makeArm(-0.36);
    torsoGroup.add(rightArmPivot);

    character.add(torsoGroup);

    // Legs – hip pivot + knee joint for a natural heel-to-toe walk
    const makeLeg = (x) => {
      const hip = new THREE.Group();
      hip.position.set(x, 0.95, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.4, 12), denimPantsMat);
      thigh.position.y = -0.2;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.38;
      const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), denimPantsMat);
      knee.add(kneeCap);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.068, 0.36, 12), denimPantsMat);
      shin.position.y = -0.18;
      knee.add(shin);
      const shoe = new THREE.Group();
      shoe.position.set(0, -0.38, 0.06);
      if (chacha) {
        // Bare foot on a leather chappal with a cross strap
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.32), whiteShoeMat);
        sole.position.y = -0.02;
        shoe.add(sole);
        const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.16, 4, 8), skinMat);
        foot.rotation.x = Math.PI / 2;
        foot.position.set(0, 0.03, 0.01);
        shoe.add(foot);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 14, Math.PI), shoeUpperMat);
        strap.position.set(0, 0.0, 0.06);
        shoe.add(strap);
      } else {
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.32), whiteShoeMat);
        shoe.add(sole);
        const upperShoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.14, 4, 8), shoeUpperMat);
        upperShoe.rotation.x = Math.PI / 2;
        upperShoe.position.set(0, 0.05, 0.0);
        shoe.add(upperShoe);
        const laces = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.1), new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.8 }));
        laces.position.set(0, 0.115, 0.03);
        shoe.add(laces);
      }
      knee.add(shoe);
      hip.add(knee);
      hip.userData.knee = knee;
      hip.userData.foot = shoe;
      return hip;
    };
    if (!chacha) {
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.07, 24), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.5 }));
      belt.position.set(0, 0.93, 0);
      character.add(belt);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xc9b37a, metalness: 0.8, roughness: 0.3 }));
      buckle.position.set(0, 0.93, 0.285);
      character.add(buckle);
      const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.2, 20), denimPantsMat);
      hips.position.set(0, 0.84, 0);
      character.add(hips);
    } else {
      const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.2, 20), denimPantsMat);
      hips.position.set(0, 0.84, 0);
      character.add(hips);
    }
    const leftLegPivot = makeLeg(0.15);
    character.add(leftLegPivot);
    const rightLegPivot = makeLeg(-0.15);
    character.add(rightLegPivot);

    character.userData = {
      torsoGroup,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      leftElbow: leftArmPivot.userData.elbow,
      rightElbow: rightArmPivot.userData.elbow,
      leftKnee: leftLegPivot.userData.knee,
      rightKnee: rightLegPivot.userData.knee,
      leftFoot: leftLegPivot.userData.foot,
      rightFoot: rightLegPivot.userData.foot,
      walkPhase: 0,
      walkBlend: 0,
      radius: 0.5
    };

    return character;
  }

  // 2. Seated Pixar Rider Model Mounted on Scooter
  static createSeatedRider() {
    const rider = new THREE.Group();
    rider.name = "SeatedRider";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68a64, roughness: 0.62 });
    const blueShirtMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
    const denimPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
    const whiteShoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

    // Torso sitting on seat (x = -0.2, y = 1.35)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.6, 16), blueShirtMat);
    torso.position.set(-0.2, 1.45, 0);
    torso.rotation.z = -0.15; // Leaning slightly forward towards handlebar
    rider.add(torso);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(-0.1, 1.95, 0);

    const headGeo = new THREE.SphereGeometry(0.32, 22, 22);
    headGeo.scale(1.0, 1.08, 1.0);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.65), hairMat);
    hair.position.set(0, 0.08, -0.04);
    headGroup.add(hair);

    const quiff = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 8), hairMat);
    quiff.rotation.set(-0.4, 0, 0.6);
    quiff.position.set(0.12, 0.3, 0.22);
    headGroup.add(quiff);

    // Expressive cartoon eyes facing forward (+X)
    [-0.12, 0.12].forEach(eyeZ => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.scale.set(0.5, 1, 1);
      eye.position.set(0.26, 0.06, eyeZ);
      headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0x3b2314 }));
      pupil.position.set(0.3, 0.06, eyeZ);
      headGroup.add(pupil);

      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(0.32, 0.08, eyeZ + 0.015);
      headGroup.add(hl);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.11), hairMat);
      brow.position.set(0.25, 0.14, eyeZ);
      headGroup.add(brow);
    });

    // Button nose & smile
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), skinMat);
    nose.position.set(0.32, -0.02, 0);
    headGroup.add(nose);

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6b3426 }));
    smile.position.set(0.28, -0.12, 0);
    smile.rotation.y = Math.PI / 2;
    headGroup.add(smile);

    rider.add(headGroup);

    // Arms reaching forward to grip the handlebars (Handlebar at x = 0.75, y = 1.58)
    [-0.32, 0.32].forEach(armZ => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.75, 8), blueShirtMat);
      arm.position.set(0.25, 1.55, armZ);
      arm.rotation.set(0, 0, -1.05); // Angled forward to handlebar grips
      rider.add(arm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), skinMat);
      hand.position.set(0.65, 1.58, armZ);
      rider.add(hand);
    });

    // Seated bent legs resting on floorboard
    [-0.22, 0.22].forEach(legZ => {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.18), denimPantsMat);
      thigh.position.set(0.12, 1.1, legZ);
      rider.add(thigh);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), denimPantsMat);
      shin.position.set(0.38, 0.75, legZ);
      rider.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.18), whiteShoeMat);
      shoe.position.set(0.42, 0.45, legZ);
      rider.add(shoe);
    });

    return rider;
  }

  // 3. Dazed Character after Accident (Sitting on road with spinning stars)
  static createDazedCharacter() {
    const group = new THREE.Group();
    group.name = "DazedAccidentCharacter";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68a64, roughness: 0.62 });
    const blueShirtMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
    const denimPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
    const whiteShoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Torso sitting tilted on ground
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.6, 16), blueShirtMat);
    torso.position.set(0, 0.45, 0);
    torso.rotation.z = 0.25; // Slumped back
    group.add(torso);

    // Head tilted
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), skinMat);
    head.position.set(-0.1, 0.95, 0);
    head.rotation.z = 0.3;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65), hairMat);
    hair.position.set(-0.1, 1.02, -0.04);
    group.add(hair);

    // Comic Dizzy Swirly Eyes (Crosses: + +)
    const eyeCrossMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    [-0.1, 0.1].forEach(eZ => {
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), eyeCrossMat);
      bar1.position.set(0.22, 0.98, eZ);
      bar1.rotation.y = Math.PI / 2;
      bar1.rotation.z = Math.PI / 4;
      group.add(bar1);

      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), eyeCrossMat);
      bar2.position.set(0.22, 0.98, eZ);
      bar2.rotation.y = Math.PI / 2;
      bar2.rotation.z = -Math.PI / 4;
      group.add(bar2);
    });

    // Dazed open mouth "O"
    const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 12), new THREE.MeshBasicMaterial({ color: 0x831843 }));
    mouthO.position.set(0.22, 0.82, 0);
    mouthO.rotation.y = Math.PI / 2;
    group.add(mouthO);

    // Arm rubbing head in pain
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.5, 8), blueShirtMat);
    armL.position.set(0.12, 0.8, 0.25);
    armL.rotation.set(0.8, 0, -1.1);
    group.add(armL);

    // Outstretched legs on the road
    [-0.2, 0.2].forEach(lZ => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.16), denimPantsMat);
      leg.position.set(0.4, 0.12, lZ);
      leg.rotation.z = -0.15;
      group.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.16), whiteShoeMat);
      shoe.position.set(0.75, 0.15, lZ);
      group.add(shoe);
    });

    // Halo of 3 Spinning Yellow Stars above head
    const starsOrbit = new THREE.Group();
    starsOrbit.name = "StarsOrbit";
    starsOrbit.position.set(-0.1, 1.45, 0);
    for (let s = 0; s < 3; s++) {
      const angle = (s / 3) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 5), starMat);
      star.position.set(Math.cos(angle) * 0.45, 0, Math.sin(angle) * 0.45);
      starsOrbit.add(star);
    }
    group.add(starsOrbit);

    group.userData = { starsOrbit };
    return group;
  }

  // 3. Vintage Classic Scooter (Matching Image 5) with Seated Rider Ready
  static createVintageScooter() {
    const group = new THREE.Group();
    group.name = "VintageScooter";

    const paintMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.3, metalness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.85 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65 });

    // Floorboard
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 0.75), paintMat);
    floor.position.set(0, 0.35, 0);
    floor.castShadow = true;
    group.add(floor);

    // Front Apron
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 0.95), paintMat);
    apron.position.set(0.85, 0.95, 0);
    apron.rotation.z = -0.14;
    apron.castShadow = true;
    group.add(apron);

    // Mudguard
    const mud = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI), paintMat);
    mud.position.set(0.95, 0.55, 0);
    mud.rotation.x = Math.PI / 2;
    group.add(mud);

    // Headlight & Mirrors
    const headlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8 })
    );
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(0.98, 1.55, 0);
    group.add(headlight);

    [-0.38, 0.38].forEach(mZ => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), chromeMat);
      rod.position.set(0.72, 1.75, mZ);
      rod.rotation.z = 0.2;
      group.add(rod);

      const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), chromeMat);
      mirror.rotation.x = Math.PI / 2;
      mirror.position.set(0.75, 1.92, mZ);
      group.add(mirror);
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 8), chromeMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.75, 1.58, 0);
    group.add(handle);

    // Bulbous Rear Cowl
    const cowlGeo = new THREE.SphereGeometry(0.72, 24, 18);
    cowlGeo.scale(1.5, 0.85, 0.82);
    const cowl = new THREE.Mesh(cowlGeo, paintMat);
    cowl.position.set(-0.55, 0.65, 0);
    cowl.castShadow = true;
    group.add(cowl);

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 0.58), seatMat);
    seat.position.set(-0.25, 1.05, 0);
    seat.castShadow = true;
    group.add(seat);

    // Spare Wheel
    const spare = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 12, 24), rubberMat);
    spare.position.set(-1.32, 0.85, 0);
    spare.rotation.y = Math.PI / 2;
    group.add(spare);

    // Wheels
    const wheelGeo = new THREE.TorusGeometry(0.34, 0.12, 16, 28);
    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16);
    
    const fw = new THREE.Group();
    fw.add(new THREE.Mesh(wheelGeo, rubberMat));
    const fwRim = new THREE.Mesh(rimGeo, chromeMat);
    fwRim.rotation.x = Math.PI / 2;
    fw.add(fwRim);
    fw.position.set(0.95, 0.35, 0);
    group.add(fw);

    const rw = new THREE.Group();
    rw.add(new THREE.Mesh(wheelGeo, rubberMat));
    const rwRim = new THREE.Mesh(rimGeo, chromeMat);
    rwRim.rotation.x = Math.PI / 2;
    rw.add(rwRim);
    rw.position.set(-0.65, 0.35, 0);
    group.add(rw);

    // Exhaust
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), chromeMat);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-1.15, 0.28, -0.32);
    group.add(exhaust);

    // ATTACH SEATED PIXAR RIDER (Hidden when not riding)
    const rider = AssetFactory.createSeatedRider();
    rider.name = "ScooterRiderMesh";
    rider.visible = false;
    group.add(rider);

    group.userData = {
      frontWheel: fw,
      rearWheel: rw,
      riderMesh: rider,
      exhaustPos: new THREE.Vector3(-1.45, 0.28, -0.32),
      radius: 1.2
    };

    return group;
  }

  // 4. Cute Cartoon Cow (Matching Image 4)
  static createCartoonCow() {
    const cowGroup = new THREE.Group();
    cowGroup.name = "CartoonCow";

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.55 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.2 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

    const bodyGeo = new THREE.SphereGeometry(0.7, 24, 20);
    bodyGeo.scale(1.4, 1.05, 1.05);
    const body = new THREE.Mesh(bodyGeo, whiteMat);
    body.position.set(0, 0.85, 0);
    body.castShadow = true;
    cowGroup.add(body);

    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), spotMat);
    s1.scale.set(1.2, 0.8, 0.2);
    s1.position.set(-0.3, 1.1, 0.65);
    cowGroup.add(s1);

    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), spotMat);
    s2.scale.set(1.1, 0.9, 0.2);
    s2.position.set(0.35, 0.85, -0.65);
    cowGroup.add(s2);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 20), collarMat);
    collar.position.set(0.68, 1.1, 0);
    collar.rotation.y = Math.PI / 2;
    cowGroup.add(collar);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.16, 12), bellMat);
    bell.position.set(0.72, 0.75, 0);
    cowGroup.add(bell);

    const headGroup = new THREE.Group();
    headGroup.position.set(1.0, 1.35, 0);

    const headGeo = new THREE.SphereGeometry(0.48, 20, 20);
    headGeo.scale(1.0, 1.15, 0.95);
    const head = new THREE.Mesh(headGeo, whiteMat);
    head.castShadow = true;
    headGroup.add(head);

    const headSpot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), spotMat);
    headSpot.scale.set(0.8, 1.0, 0.5);
    headSpot.position.set(-0.05, 0.2, 0.32);
    headGroup.add(headSpot);

    [-0.2, 0.2].forEach(eyeZ => {
      const eyeGeo = new THREE.SphereGeometry(0.12, 14, 14);
      eyeGeo.scale(0.5, 1.1, 1.0);
      const sclera = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sclera.position.set(0.25, 0.16, eyeZ);
      headGroup.add(sclera);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), new THREE.MeshBasicMaterial({ color: 0x18181b }));
      pupil.position.set(0.31, 0.16, eyeZ);
      headGroup.add(pupil);

      const eyeHl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eyeHl.position.set(0.34, 0.19, eyeZ + 0.02);
      headGroup.add(eyeHl);
    });

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 16), pinkMat);
    muzzle.scale.set(1.1, 0.75, 1.15);
    muzzle.position.set(0.38, -0.12, 0);
    headGroup.add(muzzle);

    [-0.12, 0.12].forEach(nZ => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0x475569 }));
      nostril.position.set(0.68, -0.08, nZ);
      headGroup.add(nostril);
    });

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x831843 }));
    smile.position.set(0.42, -0.25, 0);
    smile.rotation.y = Math.PI / 2;
    headGroup.add(smile);

    [-0.24, 0.24].forEach((hZ, i) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 10), hornMat);
      horn.position.set(-0.06, 0.52, hZ);
      horn.rotation.z = -0.3;
      horn.rotation.x = i === 0 ? -0.4 : 0.4;
      headGroup.add(horn);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), whiteMat);
      ear.scale.set(1.2, 1, 0.4);
      ear.position.set(-0.16, 0.25, hZ * 1.5);
      ear.rotation.set(i === 0 ? -1.2 : 1.2, 0, -0.3);
      headGroup.add(ear);
    });

    cowGroup.add(headGroup);

    [
      [0.6, 0.25, 0.55],
      [0.6, 0.25, -0.55],
      [-0.6, 0.25, 0.55],
      [-0.6, 0.25, -0.55]
    ].forEach(pos => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.55, 12), whiteMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      cowGroup.add(leg);

      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.18, 12), hoofMat);
      hoof.position.set(pos[0], pos[1] - 0.2, pos[2]);
      cowGroup.add(hoof);
    });

    const tailGroup = new THREE.Group();
    tailGroup.position.set(-1.0, 0.8, 0);
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), whiteMat);
    tailMesh.position.y = -0.35;
    tailMesh.rotation.z = 0.25;
    tailGroup.add(tailMesh);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 8), spotMat);
    tuft.position.set(0.15, -0.75, 0);
    tailGroup.add(tuft);
    cowGroup.add(tailGroup);

    cowGroup.userData = {
      headGroup,
      tailGroup,
      isDistracted: false,
      state: "sitting",
      radius: 1.4
    };

    return cowGroup;
  }

  // 5. Realistic 3D Excavated Chasm & Deep Road Pit (True 3D Void, Depth = -2.2m)
  static createRoadTrench() {
    const trenchGroup = new THREE.Group();
    trenchGroup.name = "RoadExcavationTrench";

    const pitBottomMat = new THREE.MeshStandardMaterial({ color: 0x221711, roughness: 0.98 });
    const mudPuddleMat = new THREE.MeshStandardMaterial({ color: 0x140e0b, roughness: 0.15, metalness: 0.3 });
    const earthWallMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
    const asphaltCrustMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
    const stoneStrataMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.65, roughness: 0.35 });
    const pipeBandMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.3 });
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.7, roughness: 0.4 });
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.95 });
    const coneOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 });
    const coneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    // --- A. DEEP PIT FLOOR AT y = -2.2m (3.6m wide along X, 7.2m across Z) ---
    const pitFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 7.2), pitBottomMat);
    pitFloor.position.set(0, -2.35, 0);
    pitFloor.receiveShadow = true;
    trenchGroup.add(pitFloor);

    // Muddy water puddle in the bottom
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.8), mudPuddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0.1, -2.19, 0);
    puddle.receiveShadow = true;
    trenchGroup.add(puddle);

    // --- B. VERTICAL EXCAVATION WALLS WITH GEOLOGICAL STRATA ---
    [-1, 1].forEach(side => {
      const wallX = side * 1.8;

      // Bottom red clay/mud layer (y: -2.2 to -0.4)
      const clayWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 7.2), earthWallMat);
      clayWall.position.set(wallX, -1.3, 0);
      clayWall.receiveShadow = true;
      trenchGroup.add(clayWall);

      // Sub-base gravel/aggregate layer (y: -0.4 to -0.15)
      const stoneWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 7.2), stoneStrataMat);
      stoneWall.position.set(wallX, -0.275, 0);
      stoneWall.receiveShadow = true;
      trenchGroup.add(stoneWall);

      // Top asphalt crust layer (y: -0.15 to 0.0)
      const asphaltLip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 7.2), asphaltCrustMat);
      asphaltLip.position.set(wallX, -0.075, 0);
      asphaltLip.receiveShadow = true;
      trenchGroup.add(asphaltLip);

      // --- C. JAGGED BROKEN ASPHALT EDGES & PROTRUDING CHUNKS ---
      for (let z = -3.2; z <= 3.2; z += 0.45) {
        const chunkLen = 0.2 + (Math.sin(z * 4.2 + side) * 0.5 + 0.5) * 0.35;
        const chunkGeo = new THREE.BoxGeometry(chunkLen, 0.14, 0.4);
        const chunk = new THREE.Mesh(chunkGeo, asphaltCrustMat);
        // Jutting inwards into the void
        chunk.position.set(wallX - side * (chunkLen / 2 - 0.05), -0.07, z + (Math.random() - 0.5) * 0.1);
        chunk.rotation.y = (Math.random() - 0.5) * 0.2;
        chunk.castShadow = true;
        trenchGroup.add(chunk);

        // Exposed rusty iron rebar wire jutting out of broken concrete
        if (Math.random() > 0.4) {
          const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), rebarMat);
          rebar.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
          rebar.rotation.y = (Math.random() - 0.5) * 0.4;
          rebar.position.set(wallX - side * 0.25, -0.12, z);
          trenchGroup.add(rebar);
        }
      }
    });

    // --- D. UNDERGROUND UTILITY PIPES (Bhopal Jal Nigam Water Main Pipe) ---
    // Large 0.65m diameter pipe spanning across chasm at y = -1.5m
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 7.2, 18), pipeMat);
    pipe.position.set(0.35, -1.5, 0);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    trenchGroup.add(pipe);

    // Pipe joint rings
    for (let pz = -2.8; pz <= 2.8; pz += 1.8) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 18), pipeBandMat);
      ring.position.set(0.35, -1.5, pz);
      trenchGroup.add(ring);
    }

    // Secondary Electrical Cable Conduit (Black corrugated pipe)
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.2, 12), new THREE.MeshStandardMaterial({ color: 0x09090b }));
    cable.position.set(-1.45, -0.9, 0);
    trenchGroup.add(cable);

    // --- E. RUBBLE HEAPS, CONCRETE BLOCKS & STONES IN PIT BOTTOM ---
    for (let i = 0; i < 35; i++) {
      const gX = (Math.random() - 0.5) * 3.0;
      const gZ = (Math.random() - 0.5) * 6.5;
      const isBlock = i % 4 === 0;
      const rockGeo = isBlock
        ? new THREE.BoxGeometry(0.35 + Math.random() * 0.3, 0.25 + Math.random() * 0.2, 0.35 + Math.random() * 0.3)
        : new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2);
      const rock = new THREE.Mesh(rockGeo, isBlock ? stoneStrataMat : gravelMat);
      rock.position.set(gX, -2.15 + Math.random() * 0.15, gZ);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      trenchGroup.add(rock);
    }

    // Pickaxe embedded in dirt heap at bottom
    const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    pickHandle.position.set(0.7, -1.6, 1.3);
    pickHandle.rotation.set(0.2, 0, -0.4);
    trenchGroup.add(pickHandle);

    const pickHead = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85 }));
    pickHead.position.set(0.95, -1.1, 1.4);
    pickHead.rotation.z = Math.PI / 2;
    trenchGroup.add(pickHead);

    // --- F. SURFACE TRAFFIC WARNING CONES ON BOTH ROAD EDGES ---
    [
      [-1.95, -3.1], [-1.95, 3.1],
      [1.95, -3.1], [1.95, 3.1]
    ].forEach(([cx, cz]) => {
      const coneGroup = new THREE.Group();
      coneGroup.position.set(cx, 0, cz);

      // Base
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), coneOrangeMat);
      base.position.y = 0.025;
      coneGroup.add(base);

      // Orange cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 14), coneOrangeMat);
      cone.position.y = 0.35;
      coneGroup.add(cone);

      // Reflective white stripe
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.18, 14), coneWhiteMat);
      stripe.position.y = 0.36;
      coneGroup.add(stripe);

      trenchGroup.add(coneGroup);
    });

    return trenchGroup;
  }

  // --- PUZZLE ITEMS ---
  static createBrick() {
    const group = new THREE.Group();
    group.name = "Item_Brick";
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.9 }));
    mesh.position.y = 0.175;
    mesh.castShadow = true;
    group.add(mesh);
    group.userData = { type: 'brick', isCorrect: true, title: 'Laal Eent (Heavy Brick)' };
    return group;
  }

  static createBroom() {
    const group = new THREE.Group();
    group.name = "Item_Broom";
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xa16207 }));
    handle.rotation.z = Math.PI / 2.5;
    handle.position.set(0, 0.1, 0);
    group.add(handle);
    const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 }));
    bristles.position.set(0.5, 0.1, 0);
    bristles.rotation.z = -Math.PI / 2;
    group.add(bristles);
    group.userData = { type: 'broom', isCorrect: false, title: 'Purani Jhadu (Broom)', rejectMsg: 'Arre miyaan, jhadu se scooter khadi karoge toh toot jayegi! Koi bhari eent chahiye!' };
    return group;
  }

  static createPlasticBottle() {
    const group = new THREE.Group();
    group.name = "Item_Bottle";
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }));
    bottle.rotation.z = Math.PI / 2;
    bottle.position.y = 0.1;
    group.add(bottle);
    group.userData = { type: 'bottle', isCorrect: false, title: 'Plastic Bottle', rejectMsg: 'Plastic bottle se scooter ka bojh kaise rukega? Dab jayegi!' };
    return group;
  }

  // 4.2m Heavy Timber Plank Bridge (Spans across 3.6m chasm from Platform 1 to Platform 2)
  static createTimberPlank() {
    const group = new THREE.Group();
    group.name = "Item_Plank";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.8, roughness: 0.3 });

    // 4 thick timber balks side-by-side (Length: 4.2m, Total Width: 1.8m, Thickness: 0.18m)
    for (let i = 0; i < 4; i++) {
      const balkZ = -0.675 + i * 0.45;
      const balk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.42), woodMat);
      balk.position.set(0, 0.09, balkZ);
      balk.castShadow = true;
      balk.receiveShadow = true;
      group.add(balk);
    }

    // Steel tie-plates and cross braces on both ends
    [-1.9, 1.9, 0].forEach(bx => {
      const tiePlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 1.84), steelMat);
      tiePlate.position.set(bx, 0.095, 0);
      group.add(tiePlate);
    });

    group.userData = {
      type: 'plank',
      isCorrect: true,
      title: 'Bhari Lakdi ka Phatta (Timber Plank Bridge)',
      widthZ: 1.8,
      lengthX: 4.2
    };
    return group;
  }

  static createCardboard() {
    const group = new THREE.Group();
    group.name = "Item_Cardboard";
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 1.4), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 }));
    mesh.position.y = 0.02;
    group.add(mesh);
    group.userData = { type: 'cardboard', isCorrect: false, title: 'Patla Gatta (Cardboard)', rejectMsg: 'Yeh patla gatta gaddhe par rakha toh scooter seedha kichad me dhas jayegi! Bhari lakdi ka phatta dalo!' };
    return group;
  }

  static createGrassRotiBasket() {
    const group = new THREE.Group();
    group.name = "Item_Grass";
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    basket.position.y = 0.15;
    group.add(basket);

    const grass = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    grass.position.y = 0.28;
    group.add(grass);

    const roti = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    roti.position.set(0.05, 0.42, 0.05);
    group.add(roti);

    group.userData = { type: 'grass', isCorrect: true, title: 'Taazi Ghaas & Garma-Garam Roti' };
    return group;
  }

  static createOldTyre() {
    const group = new THREE.Group();
    group.name = "Item_Tyre";
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 10, 20), new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 }));
    tyre.rotation.x = Math.PI / 2;
    tyre.position.y = 0.12;
    group.add(tyre);
    group.userData = { type: 'tyre', isCorrect: false, title: 'Purana Cycle Tyre', rejectMsg: 'Gau Mata tyre dekh kar nahi hilengi miyaan! Unko taazi ghaas ya roti do!' };
    return group;
  }

  // Street Environment & Grand Finish Arch
  static createStreetEnvironment() {
    const envGroup = new THREE.Group();

    // --- 1. TWO SEPARATE SOLID ROAD PLATFORMS WITH REAL 3.6m PHYSICAL VOID CHASM ---
    const asphaltTex = TextureGenerator.createNoiseTexture('#292524', '#3f3f46', 512, 512, 2);
    asphaltTex.repeat.set(10, 3);
    const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 1.0 });
    const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // PLATFORM 1: APPROACH ROAD (x: -16.0 to 9.2, Solid elevated road at y = 0.0)
    const roadPlat1 = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.4, 7.0), asphaltMat);
    roadPlat1.position.set(-3.4, -0.2, 0);
    roadPlat1.receiveShadow = true;
    envGroup.add(roadPlat1);

    // Dashed center road line on Platform 1
    for (let cx = -14; cx <= 7.5; cx += 2.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), lineWhiteMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(cx, 0.005, 0);
      envGroup.add(dash);
    }

    // PLATFORM 2: DESTINATION ROAD (x: 12.8 to 46.0, Solid elevated road at y = 0.0)
    const roadPlat2 = new THREE.Mesh(new THREE.BoxGeometry(33.2, 0.4, 7.0), asphaltMat);
    roadPlat2.position.set(29.4, -0.2, 0);
    roadPlat2.receiveShadow = true;
    envGroup.add(roadPlat2);

    // Dashed center road line on Platform 2
    for (let cx = 14.5; cx <= 44; cx += 2.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), lineWhiteMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(cx, 0.005, 0);
      envGroup.add(dash);
    }
    // [REAL 3D VOID]: Between x = 9.2 and x = 12.8 there is NO road floor.
    // The deep chasm descends 2.2 meters down to the mud floor below!

    // Sidewalk
    const walk = new THREE.Mesh(new THREE.BoxGeometry(65, 0.35, 3.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }));
    walk.position.set(15, 0.08, -5.2);
    walk.receiveShadow = true;
    envGroup.add(walk);

    // Railing
    const rail = new THREE.Mesh(new THREE.BoxGeometry(65, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x475569 }));
    rail.position.set(15, 0.1, 3.6);
    envGroup.add(rail);

    // Buildings
    const bColors = [0xfef08a, 0xfca5a5, 0x93c5fd, 0x86efac, 0xfde047, 0xf9a8d4];
    for (let i = 0; i < 9; i++) {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 7.0 + (i % 3) * 2, 4.0), new THREE.MeshStandardMaterial({ color: bColors[i % bColors.length], roughness: 0.85 }));
      bMesh.position.set(-10 + i * 6.8, (7.0 + (i % 3) * 2) / 2, -7.2);
      bMesh.castShadow = true;
      envGroup.add(bMesh);

      const balc = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      balc.position.set(-10 + i * 6.8, 3.5, -5.0);
      envGroup.add(balc);
    }

    // Chai Stall
    const stallGroup = new THREE.Group();
    stallGroup.position.set(2, 0.2, -4.0);
    const stall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x9a3412 }));
    stall.position.y = 0.55;
    stallGroup.add(stall);

    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.45, 14), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.75, roughness: 0.2 }));
    kettle.position.set(0.6, 1.32, 0);
    stallGroup.add(kettle);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    roof.position.set(0, 2.6, 0);
    roof.rotation.y = Math.PI / 4;
    stallGroup.add(roof);
    envGroup.add(stallGroup);

    // Lamp Posts
    for (let x = -8; x <= 38; x += 12) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 }));
      pole.position.set(x, 2.25, -3.8);
      envGroup.add(pole);

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lamp.position.set(x, 4.4, -3.6);
      envGroup.add(lamp);

      const light = new THREE.PointLight(0xfde047, 1.2, 10);
      light.position.set(x, 4.2, -3.4);
      envGroup.add(light);
    }

    // --- GRAND FINISH ARCHWAY & CHECKERED LINE (x = 38) ---
    const finishArch = new THREE.Group();
    finishArch.position.set(38, 0, 0);

    // Checkered Finish Strip across road
    for (let cz = -3.2; cz <= 3.2; cz += 0.8) {
      for (let cx = -0.4; cx <= 0.4; cx += 0.4) {
        const isBlack = (Math.round(cx * 10) + Math.round(cz * 10)) % 2 === 0;
        const square = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.8),
          new THREE.MeshBasicMaterial({ color: isBlack ? 0x09090b : 0xf8fafc })
        );
        square.rotation.x = -Math.PI / 2;
        square.position.set(cx, 0.015, cz);
        finishArch.add(square);
      }
    }

    // Two Golden Arch Pillars
    const archPillarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.3 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 6.0, 12), archPillarMat);
    p1.position.set(0, 3.0, -3.6);
    finishArch.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 6.0, 12), archPillarMat);
    p2.position.set(0, 3.0, 3.6);
    finishArch.add(p2);

    // Glowing Arch Header Board
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.6, 7.6),
      new THREE.MeshStandardMaterial({ color: 0x047857, emissive: 0x065f46, emissiveIntensity: 0.4 })
    );
    board.position.set(0, 5.2, 0);
    finishArch.add(board);

    // Canvas Texture for Finish Line Text
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 1004, 236);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁 FINISH: VIP ROAD BHOPAL 🏁', 512, 105);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('★ MP GAME UDAAN 2026 - JUGAAD SAFAR ★', 512, 185);

    const textTex = new THREE.CanvasTexture(canvas);
    const signPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 1.4),
      new THREE.MeshBasicMaterial({ map: textTex, transparent: true })
    );
    signPlane.rotation.y = -Math.PI / 2;
    signPlane.position.set(-0.21, 5.2, 0);
    finishArch.add(signPlane);

    envGroup.add(finishArch);

    return envGroup;
  }

  static createHouseInterior() {
    const houseGroup = new THREE.Group();
    
    // Floor
    const woodTex = TextureGenerator.createNoiseTexture('#8B4513', '#5D4037', 512, 512, 100);
    woodTex.repeat.set(2, 2);
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = pbrMat('hardwood', { color: 0xd8b89a, tile: 2.2, roughness: 0.75 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-3, 0.01, 0.5);
    houseGroup.add(floor);

    const brickTex = TextureGenerator.createBrickTexture();
    brickTex.repeat.set(1.5, 1);
    const wallMat = pbrMat('brick', { color: 0xf0d0c0, tile: 1.5, bumpScale: 3 });
    
    // Back Wall (z = -2.5)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.2), wallMat);
    backWall.position.set(-3, 2, -2.5);
    houseGroup.add(backWall);
    
    // Window on Back Wall
    const winGeo = new THREE.BoxGeometry(2, 1.5, 0.3);
    // Frosted glass window glowing with morning light
    const winMat = new THREE.MeshStandardMaterial({ color: 0xcfe6f2, emissive: 0xffe9c4, emissiveIntensity: 0.75, roughness: 0.2, transparent: true, opacity: 0.95 });
    const windowMesh = new THREE.Mesh(winGeo, winMat);
    windowMesh.position.set(-3, 2, -2.5);
    houseGroup.add(windowMesh);

    // Window frame + classic iron grill bars
    const frameMat = pbrMat('hardwood', { color: 0x5a3a24, tile: 1.0, roughness: 0.6 });
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.7, roughness: 0.45 });
    [[0, 0.8, 2.2, 0.12], [0, -0.8, 2.2, 0.12]].forEach(([x, y, w, h]) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), frameMat);
      bar.position.set(-3 + x, 2 + y, -2.36);
      houseGroup.add(bar);
    });
    [-1.06, 1.06].forEach(x => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.72, 0.18), frameMat);
      side.position.set(-3 + x, 2, -2.36);
      houseGroup.add(side);
    });
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.1), frameMat);
    mullion.position.set(-3, 2, -2.33);
    houseGroup.add(mullion);
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 8), grillMat);
      rod.position.set(-3 + i * 0.27, 2, -2.3);
      houseGroup.add(rod);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.32), pbrMat('sandstone', { color: 0xd8cfc4, tile: 1.0 }));
    sill.position.set(-3, 1.2, -2.3);
    houseGroup.add(sill);
    
    // Right Wall (x = 0)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 6), wallMat);
    rightWall.position.set(0, 2, 0.5);
    houseGroup.add(rightWall);

    // Left Wall with Doorway (x = -6)
    const leftWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 1), wallMat);
    leftWallFront.position.set(-6, 2, 3.0);
    houseGroup.add(leftWallFront);
    
    const leftWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 2), wallMat);
    leftWallBack.position.set(-6, 2, -1.5);
    houseGroup.add(leftWallBack);

    const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 3), wallMat);
    leftWallTop.position.set(-6, 3.5, 1.0);
    houseGroup.add(leftWallTop);

    // Door on the Left Wall
    const doorGeo = new THREE.BoxGeometry(0.1, 3, 3);
    const doorMat = pbrMat('hardwood', { color: 0x8a5a3a, tile: 1.4, roughness: 0.7 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-6, 1.5, 1.0);
    door.name = "HouseDoor";
    houseGroup.add(door);

    // 🛏️ BED (Jugaad cot/khatiya style)
    const bedFrame = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.4, 4, 3, 0.05), pbrMat('hardwood', { color: 0x7a4c30, tile: 1.4, roughness: 0.65 }));
    bedFrame.position.set(-1.5, 0.2, -0.5);
    houseGroup.add(bedFrame);
    
    const bedMattress = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.22, 3.8, 4, 0.09), pbrMat('fabric', { color: 0xe9e4da, tile: 0.5 }));
    bedMattress.position.set(-1.5, 0.5, -0.5);
    houseGroup.add(bedMattress);
    
    const bedPillow = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.2, 0.8, 4, 0.09), pbrMat('fabric', { color: 0xf7f3ea, tile: 0.4 }));
    bedPillow.position.set(-1.5, 0.65, -1.8);
    houseGroup.add(bedPillow);

    // 🪑 TABLE
    const tableTop = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.1, 1.5, 2, 0.03), pbrMat('hardwood', { color: 0x6a4028, tile: 1.2, roughness: 0.55 }));
    tableTop.position.set(-4.5, 1.0, -1.5);
    houseGroup.add(tableTop);
    
    const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), pbrMat('hardwood', { color: 0x6a4028, tile: 1.2, roughness: 0.55 }));
    tableLeg.position.set(-4.5, 0.5, -1.5);
    houseGroup.add(tableLeg);

    houseGroup.add(AssetFactory.createRoomDecor());

    // Warm tubelight so the room has its own light + soft shadows
    const roomLight = new THREE.PointLight(0xfff4e0, 26, 14, 1.6);
    roomLight.position.set(-3, 3.2, 0.6);
    roomLight.castShadow = true;
    roomLight.shadow.mapSize.set(1024, 1024);
    roomLight.shadow.bias = -0.002;
    roomLight.name = 'RoomLight';
    houseGroup.add(roomLight);

    return houseGroup;
  }

  // =====================================================================
  // ROOM JUGAAD PROPS (Level 0 – "Taiyaari" puzzles before leaving home)
  // =====================================================================
  static _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts });
  }

  // --- Pickable items ---
  static createSafetyPin() {
    const group = new THREE.Group();
    group.name = 'Item_SafetyPin';
    const steel = AssetFactory._mat(0xe5e7eb, { metalness: 0.9, roughness: 0.25 });
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 20), AssetFactory._mat(0xdc2626, { metalness: 0.4 }));
    tin.position.y = 0.04;
    group.add(tin);
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 20), steel);
    pin.rotation.x = Math.PI / 2;
    pin.scale.set(1.6, 0.6, 1);
    pin.position.y = 0.09;
    group.add(pin);
    group.userData = { type: 'safetypin', title: 'Mummy ki Safety Pin', icon: '📌',
      rejectMsg: 'Safety pin se yeh kaam nahi hoga beta!' };
    return group;
  }

  static createRubberBand() {
    const group = new THREE.Group();
    group.name = 'Item_RubberBand';
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 24), AssetFactory._mat(0xf59e0b, { roughness: 0.8 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.03;
    group.add(band);
    const band2 = band.clone();
    band2.material = AssetFactory._mat(0x16a34a, { roughness: 0.8 });
    band2.position.set(0.12, 0.05, 0.05);
    group.add(band2);
    group.userData = { type: 'rubberband', title: 'Rubber Band', icon: '➰',
      rejectMsg: 'Rubber band se kya hoga? Do kadam me phir toot jayega!' };
    return group;
  }

  static createSteelLota() {
    const group = new THREE.Group();
    group.name = 'Item_Lota';
    const steel = AssetFactory._mat(0xd1d5db, { metalness: 0.95, roughness: 0.18 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), steel);
    body.scale.set(1, 0.85, 1);
    body.position.y = 0.18;
    group.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 20), steel);
    neck.position.y = 0.36;
    group.add(neck);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 20), steel);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.42;
    group.add(lip);
    // Steam (visible only when hot)
    const steam = new THREE.Group();
    steam.name = 'Steam';
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06 + i * 0.02, 8, 8), steamMat);
      puff.position.set((i - 1) * 0.04, 0.5 + i * 0.12, 0);
      steam.add(puff);
    }
    steam.visible = false;
    group.add(steam);
    group.userData = { type: 'lota', title: 'Steel ka Lota', icon: '🥛', steam,
      rejectMsg: 'Lota yahan kisi kaam ka nahi. Isko garam karke kuch press karo!' };
    return group;
  }

  static createPhoneCharger() {
    const group = new THREE.Group();
    group.name = 'Item_Charger';
    const white = AssetFactory._mat(0xf8fafc, { roughness: 0.4 });
    const brick = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.14), white);
    brick.position.y = 0.06;
    group.add(brick);
    // Tangled wire loops
    const wireMat = AssetFactory._mat(0xf1f5f9, { roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.12 + i * 0.03, 0.012, 6, 24), wireMat);
      loop.rotation.x = Math.PI / 2;
      loop.position.set(0.2, 0.015 + i * 0.012, 0.02 * i);
      group.add(loop);
    }
    // Taped joint – the famous jugaad
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10), AssetFactory._mat(0x111827));
    tape.rotation.z = Math.PI / 2;
    tape.position.set(0.34, 0.03, 0);
    group.add(tape);
    group.userData = { type: 'charger', title: 'Dheela Charger (Tape wala)', icon: '🔌',
      rejectMsg: 'Charger ko socket me lagao, phone ke paas!' };
    return group;
  }

  static createBelan() {
    const group = new THREE.Group();
    group.name = 'Item_Belan';
    const wood = AssetFactory._mat(0xd4a373, { roughness: 0.75 });
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 16), wood);
    roll.rotation.z = Math.PI / 2;
    roll.position.y = 0.07;
    group.add(roll);
    [-0.33, 0.33].forEach(x => {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 10), AssetFactory._mat(0xa16207));
      h.rotation.z = Math.PI / 2;
      h.position.set(x, 0.07, 0);
      group.add(h);
    });
    group.userData = { type: 'belan', title: 'Belan (Rolling Pin)', icon: '🪵',
      rejectMsg: 'Belan se yeh nahi hoga! Par kuch aur squeeze kar sakta hai...' };
    return group;
  }

  // --- Stations (fixed things you use items ON) ---
  static createBrokenChappal() {
    const group = new THREE.Group();
    group.name = 'Station_Chappal';
    const soleMat = AssetFactory._mat(0x78350f, { roughness: 0.9 });
    const strapMat = AssetFactory._mat(0x1d4ed8, { roughness: 0.6 });
    const makeChappal = (x, broken) => {
      const c = new THREE.Group();
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.62), soleMat);
      sole.position.y = 0.02;
      c.add(sole);
      const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.26), strapMat);
      strapL.position.set(-0.08, 0.07, -0.02);
      strapL.rotation.y = 0.35;
      c.add(strapL);
      const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.26), strapMat);
      strapR.position.set(0.08, 0.07, -0.02);
      strapR.rotation.y = -0.35;
      if (broken) {
        strapR.rotation.set(0, -1.2, 1.3);
        strapR.position.set(0.2, 0.03, 0.05);
      }
      c.add(strapR);
      c.position.x = x;
      c.userData.strapR = strapR;
      return c;
    };
    group.add(makeChappal(-0.18, false));
    const brokenOne = makeChappal(0.18, true);
    brokenOne.rotation.y = 0.25;
    group.add(brokenOne);
    group.userData = { brokenStrap: brokenOne.userData.strapR };
    return group;
  }

  static fixChappal(chappal) {
    const s = chappal.userData.brokenStrap;
    if (!s) return;
    s.rotation.set(0, -0.35, 0);
    s.position.set(0.08, 0.07, -0.02);
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12),
      AssetFactory._mat(0xf8fafc, { metalness: 0.9, roughness: 0.2 }));
    pin.position.set(0.08, 0.12, -0.05);
    s.parent.add(pin);
  }

  static createKettleStove() {
    const group = new THREE.Group();
    group.name = 'Station_Kettle';
    // Small gas stove
    const stove = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.4), AssetFactory._mat(0x1f2937, { metalness: 0.6, roughness: 0.4 }));
    stove.position.y = 0.05;
    group.add(stove);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 12),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.8 }));
    flame.position.y = 0.16;
    group.add(flame);
    // Kettle
    const steel = AssetFactory._mat(0xcbd5e1, { metalness: 0.9, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.24, 20), steel);
    body.position.y = 0.26;
    group.add(body);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel);
    lid.position.y = 0.38;
    group.add(lid);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.2, 10), steel);
    spout.position.set(0.2, 0.32, 0);
    spout.rotation.z = -0.9;
    group.add(spout);
    group.userData = { flame };
    return group;
  }

  static createToothpaste() {
    const group = new THREE.Group();
    group.name = 'Station_Toothpaste';
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 12), AssetFactory._mat(0xef4444, { roughness: 0.4 }));
    tube.rotation.z = Math.PI / 2;
    tube.scale.set(1, 1, 0.35); // squeezed flat – almost khatam!
    tube.position.y = 0.03;
    group.add(tube);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), AssetFactory._mat(0xffffff));
    cap.rotation.z = Math.PI / 2;
    cap.position.set(0.2, 0.03, 0);
    group.add(cap);
    const brush = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.035), AssetFactory._mat(0x22c55e));
    brush.position.set(0, 0.02, 0.12);
    group.add(brush);
    const paste = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.07, 4, 8), AssetFactory._mat(0xf8fafc));
    paste.rotation.z = Math.PI / 2;
    paste.position.set(0.08, 0.05, 0.12);
    paste.visible = false;
    group.add(paste);
    group.userData = { paste };
    return group;
  }

  static createCrumpledKurta() {
    const group = new THREE.Group();
    group.name = 'Station_Kurta';
    const cloth = AssetFactory._mat(0xfbbf24, { roughness: 0.95 });
    const crumpled = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), cloth);
      lump.position.set((Math.random() - 0.5) * 0.7, 0.08, (Math.random() - 0.5) * 0.5);
      lump.scale.set(1.2, 0.35, 1);
      lump.rotation.set(Math.random(), Math.random(), Math.random());
      crumpled.add(lump);
    }
    group.add(crumpled);
    // Neatly pressed version (hidden until jugaad)
    const pressed = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 1.0), cloth);
    torso.position.y = 0.02;
    pressed.add(torso);
    [-0.5, 0.5].forEach(x => {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.2), cloth);
      sleeve.position.set(x, 0.02, -0.3);
      sleeve.rotation.y = x > 0 ? -0.4 : 0.4;
      pressed.add(sleeve);
    });
    const buttonMat = AssetFactory._mat(0x7c2d12);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), buttonMat);
      b.position.set(0, 0.045, -0.35 + i * 0.13);
      pressed.add(b);
    }
    pressed.visible = false;
    group.add(pressed);
    group.userData = { crumpled, pressed };
    return group;
  }

  static createPhoneAndSocket() {
    const group = new THREE.Group();
    group.name = 'Station_Phone';
    // Wall switchboard (sits against the right wall)
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.5), AssetFactory._mat(0xf8fafc, { roughness: 0.5 }));
    board.position.set(0.35, 0.9, 0);
    group.add(board);
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.1), AssetFactory._mat(0x111827));
    socket.position.set(0.31, 0.86, 0.1);
    group.add(socket);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), AssetFactory._mat(0xef4444));
    sw.position.set(0.31, 0.95, -0.12);
    group.add(sw);
    // Phone lying on a stool
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.45, 16), AssetFactory._mat(0x7c3aed, { roughness: 0.7 }));
    stool.position.set(-0.1, 0.225, 0);
    group.add(stool);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.3), AssetFactory._mat(0x0f172a, { metalness: 0.4, roughness: 0.3 }));
    phone.position.set(-0.1, 0.46, 0);
    group.add(phone);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.26), screenMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(-0.1, 0.472, 0);
    group.add(screen);
    // Plugged cable (hidden until jugaad)
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 0.86, 0.1), new THREE.Vector3(0.15, 0.5, 0.15),
      new THREE.Vector3(0.05, 0.47, 0.08), new THREE.Vector3(-0.1, 0.47, 0.15)
    ]), 20, 0.012, 6), AssetFactory._mat(0xf8fafc));
    cable.visible = false;
    group.add(cable);
    group.userData = { screenMat, cable };
    return group;
  }

  // Decorative desi room props (non-interactive)
  static createRoomDecor() {
    const group = new THREE.Group();
    group.name = 'RoomDecor';
    // Dhurrie rug
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256; rugCanvas.height = 256;
    const ctx = rugCanvas.getContext('2d');
    const cols = ['#b91c1c', '#f59e0b', '#1d4ed8', '#f59e0b', '#b91c1c'];
    for (let i = 0; i < 16; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(0, i * 16, 256, 16); }
    ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 240, 240);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(rugCanvas), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-3.6, 0.02, 1.6);
    group.add(rug);

    // Tubelight on back wall
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8ee, emissiveIntensity: 5 }));
    tube.rotation.z = Math.PI / 2;
    tube.position.set(-3, 3.4, -2.3);
    group.add(tube);
    const holder = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), AssetFactory._mat(0xe5e7eb));
    holder.position.set(-3, 3.4, -2.36);
    group.add(holder);

    // Wall clock – "10 baje tak pahunchna hai!"
    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 128; clockCanvas.height = 128;
    const c2 = clockCanvas.getContext('2d');
    c2.fillStyle = '#fffbeb'; c2.beginPath(); c2.arc(64, 64, 60, 0, Math.PI * 2); c2.fill();
    c2.lineWidth = 8; c2.strokeStyle = '#b45309'; c2.stroke();
    c2.fillStyle = '#1f2937';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c2.fillRect(64 + Math.sin(a) * 48 - 3, 64 - Math.cos(a) * 48 - 3, 6, 6);
    }
    c2.lineCap = 'round';
    c2.lineWidth = 6; c2.beginPath(); c2.moveTo(64, 64); c2.lineTo(64 + Math.sin(-0.52) * 30, 64 - Math.cos(-0.52) * 30); c2.stroke(); // hour ~9:30
    c2.lineWidth = 4; c2.beginPath(); c2.moveTo(64, 64); c2.lineTo(64, 106); c2.stroke();
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(clockCanvas), roughness: 0.6 }));
    clock.position.set(-0.8, 2.9, -2.38);
    group.add(clock);

    // Calendar with a festive photo
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), AssetFactory._mat(0xfef3c7));
    cal.position.set(-5.2, 2.4, -2.38);
    group.add(cal);
    const calPic = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), AssetFactory._mat(0xea580c));
    calPic.position.set(-5.2, 2.55, -2.37);
    group.add(calPic);

    // Table legs (proper 4 legs)
    const legMat = pbrMat('hardwood', { color: 0x6a4028, tile: 1.2, roughness: 0.55 });
    [[-5.1, -2.1], [-3.9, -2.1], [-5.1, -0.9], [-3.9, -0.9]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), legMat);
      leg.position.set(x, 0.5, z);
      group.add(leg);
    });
    return group;
  }
}
