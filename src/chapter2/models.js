import * as THREE from 'three';
import { pbrMat } from '../materials.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// High-Fidelity Stylized 3D Asset Factory (Pixar/DreamWorks aesthetic)
export class AssetFactory {
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
  // 1. Stylized Pixar/Cartoon Boy (Matching Image 1) - Standing / Walking
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

    // 1. Regular Walking / Carrying Right Arm
    const rightArmPivot = makeArm(-0.36);
    rightArmPivot.name = "RightArmPivot";
    torsoGroup.add(rightArmPivot);

    // 2. Dedicated Continuous Phone-to-Ear Arm (Seamless bent elbow, zero gaps, smartphone pressed to ear)
    const phoneArmGroup = new THREE.Group();
    phoneArmGroup.name = "PhoneArmGroup";
    phoneArmGroup.position.set(-0.36, 0.25, 0);
    phoneArmGroup.visible = false;

    // Helper to generate a seamless continuous cylinder segment between two 3D vector points
    const createBoneSegment = (pA, pB, rTop, rBot, mat) => {
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(rBot, rTop, len, 14);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pA).addScaledVector(dir, 0.5);
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
      mesh.quaternion.copy(quat);
      mesh.castShadow = true;
      return mesh;
    };

    const pShoulder = new THREE.Vector3(0, 0, 0);
    const pElbow = new THREE.Vector3(-0.08, -0.16, 0.18);
    const pWrist = new THREE.Vector3(0.01, 0.42, 0.06);
    const pHand = new THREE.Vector3(0.01, 0.47, 0.03);
    const pPhone = new THREE.Vector3(0.02, 0.49, 0.01);

    // Shoulder cap
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.076, 12, 12), blueShirtMat);
    shoulderCap.position.copy(pShoulder);
    phoneArmGroup.add(shoulderCap);

    // Upper arm (Sleeve) connecting shoulder to elbow
    const upperArm = createBoneSegment(pShoulder, pElbow, 0.076, 0.066, blueShirtMat);
    phoneArmGroup.add(upperArm);

    // Solid seamless elbow joint bridging upper arm and forearm
    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.066, 14, 14), skinMat);
    elbowJoint.position.copy(pElbow);
    phoneArmGroup.add(elbowJoint);

    // Forearm connecting elbow up to wrist
    const forearm = createBoneSegment(pElbow, pWrist, 0.065, 0.055, skinMat);
    phoneArmGroup.add(forearm);

    // Wrist joint
    const wristJoint = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), skinMat);
    wristJoint.position.copy(pWrist);
    phoneArmGroup.add(wristJoint);

    // Hand holding phone
    const phoneHand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), skinMat);
    phoneHand.position.copy(pHand);
    phoneArmGroup.add(phoneHand);

    // Smartphone pressed flush to right ear
    const phoneMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.15, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 })
    );
    phoneMesh.position.copy(pPhone);
    phoneMesh.rotation.set(-0.10, 0.25, 0.05);
    phoneArmGroup.add(phoneMesh);

    // Smartphone Glowing Screen
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.065, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    phoneScreen.position.set(pPhone.x, pPhone.y, pPhone.z + 0.011);
    phoneScreen.rotation.set(-0.10, 0.25, 0.05);
    phoneArmGroup.add(phoneScreen);

    torsoGroup.add(phoneArmGroup);

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
      headGroup,
      leftArmPivot,
      rightArmPivot,
      phoneArmGroup,
      setPhoneCallPose: (active) => {
        if (active) {
          rightArmPivot.visible = false;
          phoneArmGroup.visible = true;
        } else {
          phoneArmGroup.visible = false;
          rightArmPivot.visible = true;
          rightArmPivot.rotation.set(0, 0, 0);
          if (headGroup) headGroup.rotation.set(0, 0, 0);
        }
      },
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
    // Chacha's kurta-pyjama look (matches the walking model)
    const blueShirtMat = pbrMat('fabric', { color: 0xf0e4c8, tile: 0.45 });
    const denimPantsMat = pbrMat('fabric', { color: 0xf7f3ea, tile: 0.45 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.9 });
    const whiteShoeMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 });

    // Torso sitting on seat (x = -0.2, y = 1.42)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.58, 16), blueShirtMat);
    torso.position.set(-0.2, 1.42, 0);
    torso.rotation.z = -0.15; // Leaning slightly forward towards handlebar
    rider.add(torso);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(-0.1, 1.92, 0);

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

    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    teeth.position.set(0.30, -0.12, 0);
    headGroup.add(teeth);

    rider.add(headGroup);

    // Arms reaching forward to grip the handlebars (Handlebar at x = 0.75, y = 1.58)
    [-0.32, 0.32].forEach(armZ => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.75, 8), blueShirtMat);
      arm.position.set(0.32, 1.57, armZ);
      arm.rotation.set(0, 0, -1.52); // Reaching cleanly forward to handlebar grips
      rider.add(arm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), skinMat);
      hand.position.set(0.72, 1.58, armZ);
      rider.add(hand);
    });

    // Seated bent legs resting flush on seat cushion (surface y = 1.04) and floorboard
    [-0.22, 0.22].forEach(legZ => {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.18), denimPantsMat);
      thigh.position.set(0.12, 1.13, legZ); // Bottom sits at y = 1.04, perfectly flush on seat top surface
      rider.add(thigh);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.64, 0.18), denimPantsMat);
      shin.position.set(0.38, 0.76, legZ);
      rider.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.18), whiteShoeMat);
      shoe.position.set(0.42, 0.44, legZ);
      rider.add(shoe);
    });

    return rider;
  }

  // 3. Dazed Character after Accident (Sitting on road with spinning stars)
  static createDazedCharacter() {
    const group = new THREE.Group();
    group.name = "DazedAccidentCharacter";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68a64, roughness: 0.62 });
    // Chacha's kurta-pyjama look (matches the walking model)
    const blueShirtMat = pbrMat('fabric', { color: 0xf0e4c8, tile: 0.45 });
    const denimPantsMat = pbrMat('fabric', { color: 0xf7f3ea, tile: 0.45 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.9 });
    const whiteShoeMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 });
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

  // 3. Vintage Classic Scooter (Bajaj Chetak Style) with Real Fallen Pose & Detailed Wheels/Seat
  static createVintageScooter() {
    const group = new THREE.Group();
    group.name = "VintageScooter";

    // Vintage Chetak: pale-blue enamel with a glossy clear-coat
    const paintMat = new THREE.MeshPhysicalMaterial({ color: 0x7ea6c8, roughness: 0.42, metalness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.18 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.9 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.7 });
    const seatLeatherMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.6 });
    const seatTanMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
    const seamPipingMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const brickMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.9 });

    // Floorboard & Chassis
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.76), paintMat);
    floor.position.set(0, 0.35, 0);
    floor.castShadow = true;
    group.add(floor);

    // Rubber Grip Strips on Floorboard
    [-0.2, 0, 0.2].forEach(fz => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.05), rubberMat);
      strip.position.set(0.1, 0.43, fz);
      group.add(strip);
    });

    // Front Apron / Legshield
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.28, 0.98), paintMat);
    apron.position.set(0.85, 0.95, 0);
    apron.rotation.z = -0.14;
    apron.castShadow = true;
    group.add(apron);

    // Front Mudguard
    const mud = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 14, 0, Math.PI), paintMat);
    mud.position.set(0.95, 0.55, 0);
    mud.rotation.x = Math.PI / 2;
    group.add(mud);

    // Chrome Bezel Headlight
    const headlightBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.06, 20), chromeMat);
    headlightBezel.rotation.z = Math.PI / 2;
    headlightBezel.position.set(1.02, 1.55, 0);
    group.add(headlightBezel);

    const headlightLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.85 })
    );
    headlightLens.rotation.z = Math.PI / 2;
    headlightLens.position.set(1.04, 1.55, 0);
    group.add(headlightLens);

    // Rearview Mirrors
    [-0.40, 0.40].forEach(mZ => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), chromeMat);
      rod.position.set(0.72, 1.75, mZ);
      rod.rotation.z = 0.2;
      group.add(rod);

      const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), chromeMat);
      mirror.rotation.x = Math.PI / 2;
      mirror.position.set(0.75, 1.92, mZ);
      group.add(mirror);
    });

    // Handlebar & Grips
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.18, 12), chromeMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.75, 1.58, 0);
    group.add(handle);

    [-0.56, 0.56].forEach(gZ => {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), rubberMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(0.75, 1.58, gZ);
      group.add(grip);
    });

    // --- REAR BODY & ENGINE COWL (Bajaj Chetak Iconic Full-Body Contours) ---
    // 1. Central Body Core: Solidly connects floorboard (y=0.42) to underside of seat (y=0.88) with ZERO gap!
    const bodyCore = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.46, 0.52), paintMat);
    bodyCore.position.set(-0.30, 0.65, 0);
    bodyCore.castShadow = true;
    group.add(bodyCore);

    // 2. Sculpted Bulbous Engine Cowls (Curved Chetak Side Pods covering rear mechanics)
    const cowlGeo = new THREE.SphereGeometry(0.52, 24, 20);
    cowlGeo.scale(1.26, 0.78, 0.82);
    const cowl = new THREE.Mesh(cowlGeo, paintMat);
    cowl.position.set(-0.34, 0.64, 0);
    cowl.castShadow = true;
    group.add(cowl);

    // Rear curved inner mudguard arch
    const rearFender = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.32, 16, 1, true, 0, Math.PI), paintMat);
    rearFender.rotation.z = Math.PI / 2;
    rearFender.rotation.y = Math.PI / 2;
    rearFender.position.set(-0.76, 0.40, 0);
    group.add(rearFender);

    // --- CURVED BAJAJ CHETAK DUAL-TONE SEAT (Flush on top of body: base at y=0.88, cushion at y=0.96) ---
    const seatGroup = new THREE.Group();
    seatGroup.position.set(-0.20, 0.96, 0);

    // Main contoured seat cushion
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.16, 0.56), seatLeatherMat);
    seatBase.castShadow = true;
    seatGroup.add(seatBase);

    // Raised pillion contour at back
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.52), seatTanMat);
    seatBack.position.set(-0.28, 0.08, 0);
    seatGroup.add(seatBack);

    // Golden Piping Seam Edge around seat
    const piping = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.02, 0.58), seamPipingMat);
    piping.position.y = 0.01;
    seatGroup.add(piping);

    // Chrome Pillion Grab-Rail (Iconic Chetak handle securely hugging the rear of seat)
    const grabRail = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 22, Math.PI), chromeMat);
    grabRail.rotation.y = Math.PI / 2;
    grabRail.rotation.x = Math.PI / 2;
    grabRail.position.set(-0.62, 0.04, 0);
    seatGroup.add(grabRail);

    // Solid chrome mounting brackets anchoring handle directly into seat metal base
    [-0.22, 0.22].forEach(gz => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.03), chromeMat);
      bracket.position.set(-0.58, 0.02, gz);
      seatGroup.add(bracket);
    });

    group.add(seatGroup);

    // --- WHEEL FACTORY (PREVENT TYRE SINKING: Bottom of tyre touches y = 0.00 exactly) ---
    // Outer radius = 0.24 + 0.10 = 0.34m, so wheel center y = 0.34m -> tyre bottom = 0.00m!
    const createVisibleWheel = (xPos) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(xPos, 0.34, 0);

      // Deep Black Rubber Tyre
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.10, 16, 28), rubberMat);
      wGroup.add(tyre);

      // Metallic Split Alloy Rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.14, 18), rimMat);
      rim.rotation.x = Math.PI / 2;
      wGroup.add(rim);

      // Center Chrome Hubcap
      const hubL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, Math.PI), chromeMat);
      hubL.rotation.y = Math.PI / 2;
      hubL.position.z = 0.07;
      wGroup.add(hubL);

      const hubR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, Math.PI), chromeMat);
      hubR.rotation.y = -Math.PI / 2;
      hubR.position.z = -0.07;
      wGroup.add(hubR);

      // Orange Brake Drum Accent
      const brakeDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.15, 12), hubMat);
      brakeDrum.rotation.x = Math.PI / 2;
      wGroup.add(brakeDrum);

      return wGroup;
    };

    // FRONT WHEEL: at x = 0.95
    const fw = createVisibleWheel(0.95);
    group.add(fw);

    // REAR WHEEL: perfectly centered on rear axle at x = -0.76 (CLEARLY VISIBLE OUTSIDE BODY)
    const rw = createVisibleWheel(-0.76);
    group.add(rw);

    // --- EXTERNAL REAR TAIL RACK & STEPNEY (SPARE WHEEL) ---
    // Mounted completely externally behind the rear body shell on a chrome tubular carrier
    const rackGroup = new THREE.Group();
    rackGroup.position.set(-1.08, 0.68, 0);

    // Chrome Carrier Bars extending from chassis to spare wheel
    [-0.12, 0.12].forEach(rz => {
      const rackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.30, 8), chromeMat);
      rackBar.rotation.z = Math.PI / 3;
      rackBar.position.set(-0.06, 0.04, rz);
      rackGroup.add(rackBar);
    });

    // Stepney / Spare Wheel mounted externally on carrier
    const spareTyre = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.09, 14, 24), rubberMat);
    spareTyre.rotation.y = Math.PI / 2;
    spareTyre.position.set(-0.20, 0.06, 0);
    rackGroup.add(spareTyre);

    const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.10, 16), rimMat);
    spareRim.rotation.z = Math.PI / 2;
    spareRim.position.set(-0.20, 0.06, 0);
    rackGroup.add(spareRim);

    group.add(rackGroup);

    // Chrome Exhaust Pipe (Tucked neatly below engine on right side)
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10), chromeMat);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-1.05, 0.22, -0.32);
    group.add(exhaust);

    // --- BROKEN KICKSTAND VISUAL DETAIL ---
    const standGroup = new THREE.Group();
    standGroup.name = "BrokenKickstand";
    standGroup.position.set(-0.05, 0.26, 0);

    // Mount bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.28), chromeMat);
    standGroup.add(bracket);

    // Broken dangling stand rod (snapped off at jagged angle)
    const danglingRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), chromeMat);
    danglingRod.rotation.z = 0.7;
    danglingRod.rotation.x = 0.4;
    danglingRod.position.set(-0.04, -0.10, -0.10);
    standGroup.add(danglingRod);

    // Exposed fractured red metal tip
    const fractureTip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    fractureTip.position.set(-0.12, -0.18, -0.15);
    standGroup.add(fractureTip);

    group.add(standGroup);

    // --- BRICK JUGAAD PROP MESH (Visible when stand is fixed with brick) ---
    const brickSupport = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.34), brickMat);
    brickSupport.name = "BrickPropSupport";
    brickSupport.position.set(-0.42, 0.17, -0.42);
    brickSupport.rotation.y = 0.25;
    brickSupport.visible = false; // Initially hidden, turns true when Jugaad applied
    group.add(brickSupport);

    // ATTACH SEATED PIXAR RIDER (Hidden when not riding)
    const rider = AssetFactory.createSeatedRider();
    rider.name = "ScooterRiderMesh";
    rider.visible = false;
    group.add(rider);

    // Method to apply authentic ground fallen pose vs upright driving pose
    const setFallenState = (isFallen) => {
      if (isFallen) {
        // Naturally resting on road asphalt on its side cowl
        group.position.y = 0.22;
        group.rotation.set(0.18, 0, -1.35);
        brickSupport.visible = false;
        rider.visible = false;
      } else {
        // Upright supported by brick / kickstand
        group.position.y = 0;
        group.rotation.set(0, 0, 0);
        brickSupport.visible = true;
      }
    };

    group.userData = {
      frontWheel: fw,
      rearWheel: rw,
      riderMesh: rider,
      brickSupport,
      standGroup,
      setFallenState,
      exhaustPos: new THREE.Vector3(-1.48, 0.28, -0.32),
      radius: 1.2
    };

    return group;
  }

  // 4. Cute Cartoon Cow (Gau Mata) with Connected Leg Joints & Expressive Face
  static createCartoonCow() {
    const cowGroup = new THREE.Group();
    cowGroup.name = "CartoonCow";

    const whiteMat = pbrMat('fabric', { color: 0xe8e1d6, tile: 0.35, normalScale: 0.35, roughness: 0.9 }); // short-hair hide
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3e, roughness: 0.9 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0x9a7068, roughness: 0.45 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 0.5 });
    const collarMat = pbrMat('fabric', { color: 0xb3261e, tile: 0.2 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.75, roughness: 0.2 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.75 });

    // Main Body
    const bodyGeo = new THREE.SphereGeometry(0.72, 24, 20);
    bodyGeo.scale(1.42, 1.05, 1.05);
    const body = new THREE.Mesh(bodyGeo, whiteMat);
    body.position.set(0, 0.90, 0);
    body.castShadow = true;
    cowGroup.add(body);

    // Natural Cow Patches / Spots
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), spotMat);
    s1.scale.set(1.2, 0.8, 0.2);
    s1.position.set(-0.35, 1.15, 0.65);
    cowGroup.add(s1);

    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), spotMat);
    s2.scale.set(1.1, 0.9, 0.2);
    s2.position.set(0.30, 0.90, -0.65);
    cowGroup.add(s2);

    // Auspicious Red Ribbon Collar with Golden Brass Bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.06, 8, 20), collarMat);
    collar.position.set(0.70, 1.12, 0);
    collar.rotation.y = Math.PI / 2;
    cowGroup.add(collar);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.16, 12), bellMat);
    bell.position.set(0.74, 0.74, 0);
    cowGroup.add(bell);

    // Head Group facing forward (+X)
    const headGroup = new THREE.Group();
    headGroup.position.set(1.02, 1.35, 0);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 22), whiteMat);
    head.scale.set(1.05, 1.10, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // Cute Dark Patch on one eye
    const eyePatch = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), spotMat);
    eyePatch.scale.set(0.8, 1.0, 0.4);
    eyePatch.position.set(0.12, 0.18, 0.30);
    headGroup.add(eyePatch);

    // Big Cute Cartoon Eyes
    [-0.20, 0.20].forEach(eyeZ => {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sclera.position.set(0.28, 0.14, eyeZ);
      headGroup.add(sclera);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshBasicMaterial({ color: 0x1c1917 }));
      pupil.position.set(0.34, 0.14, eyeZ);
      headGroup.add(pupil);

      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glint.position.set(0.36, 0.16, eyeZ + 0.02);
      headGroup.add(glint);
    });

    // Friendly Pink Muzzle / Snout
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 16), pinkMat);
    muzzle.scale.set(1.15, 0.72, 1.12);
    muzzle.position.set(0.42, -0.14, 0);
    headGroup.add(muzzle);

    // Dark Nostrils
    [-0.10, 0.10].forEach(nZ => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x374151 }));
      nostril.position.set(0.72, -0.10, nZ);
      headGroup.add(nostril);
    });

    // Golden Curved Horns
    [-0.24, 0.24].forEach((hZ, i) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.32, 10), hornMat);
      horn.position.set(-0.06, 0.50, hZ);
      horn.rotation.z = -0.35;
      horn.rotation.x = i === 0 ? -0.35 : 0.35;
      headGroup.add(horn);

      // Drooping Cute Ears
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 8), whiteMat);
      ear.scale.set(1.1, 1, 0.4);
      ear.position.set(-0.14, 0.22, hZ * 1.4);
      ear.rotation.set(i === 0 ? -1.1 : 1.1, 0, -0.3);
      headGroup.add(ear);
    });

    cowGroup.add(headGroup);

    // --- 4 SOLID LEGS WITH INTEGRATED SHOULDER/HIP JOINTS (NO FLOATING STICKS) ---
    [
      [0.62, 0.54],   // Front Right
      [0.62, -0.54],  // Front Left
      [-0.62, 0.54],  // Rear Right
      [-0.62, -0.54]  // Rear Left
    ].forEach(([lx, lz]) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, 0, lz);

      // Anatomical rounded shoulder/hip joint connecting leg seamlessly into body
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), whiteMat);
      joint.position.y = 0.65;
      legGroup.add(joint);

      // Main upper leg
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.48, 12), whiteMat);
      legMesh.position.y = 0.38;
      legMesh.castShadow = true;
      legGroup.add(legMesh);

      // Dark brown hoof resting firmly on ground (y = 0.0)
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 12), hoofMat);
      hoof.position.y = 0.07;
      legGroup.add(hoof);

      cowGroup.add(legGroup);
    });

    // Animated Wagging Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(-1.0, 0.85, 0);
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), whiteMat);
    tailMesh.position.y = -0.32;
    tailMesh.rotation.z = 0.22;
    tailGroup.add(tailMesh);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), spotMat);
    tuft.position.set(0.14, -0.70, 0);
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

    const pitBottomMat = pbrMat('mud', { color: 0x9a8070, tile: 2.0 });
    const mudPuddleMat = new THREE.MeshStandardMaterial({ color: 0x140e0b, roughness: 0.15, metalness: 0.3 });
    const earthWallMat = pbrMat('mud', { color: 0xb07a52, tile: 1.6 });
    const asphaltCrustMat = pbrMat('asphalt', { color: 0xc8c4c0, tile: 3.0 });
    const stoneStrataMat = pbrMat('sandstone', { color: 0x9c948c, tile: 1.4 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.65, roughness: 0.35 });
    const pipeBandMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.3 });
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.7, roughness: 0.4 });
    const gravelMat = pbrMat('mud', { color: 0x807870, tile: 1.2 });
    const coneOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 });
    const coneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    // --- A. DEEP PIT FLOOR AT y = -2.2m (3.6m wide along X, 7.2m across Z) ---
    const pitFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 7.2), pitBottomMat);
    pitFloor.position.set(0, -2.35, 0);

    // Earth walls closing the pit's front and back so you never see into empty space
    [-3.62, 3.62].forEach(wz => {
      const endWall = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.45, 0.24), earthWallMat);
      endWall.position.set(0, -1.2, wz);
      trenchGroup.add(endWall);
    });
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
      }
    });

    // --- E. REAL BLUE WATER SURFACE AT ACTUAL PIT BOTTOM (y = -2.18) ---
    const waterGeo = new THREE.PlaneGeometry(3.55, 6.95);
    // Muddy rain-water: dark, murky, glossy (reflects the sky) instead of pool-blue
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x4a3f2e,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    });
    const waterNormal = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'assets/textures/Water_1_M_Normal.jpg');
    waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;
    waterNormal.repeat.set(2, 2);
    waterMat.normalMap = waterNormal;
    waterMat.normalScale.set(0.35, 0.35);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -2.18, 0);
    water.receiveShadow = true;
    trenchGroup.add(water);

    // --- F. RUBBLE HEAPS, CONCRETE BLOCKS & STONES IN PIT BOTTOM ---
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
  static createFootpathRubble() {
    const group = new THREE.Group();
    group.name = "FootpathConstructionRubble";

    const earthMat = pbrMat('mud', { color: 0xb07a52, tile: 1.5 });
    const concreteMat = pbrMat('plaster', { color: 0x9c948c, tile: 1.2 });
    const gravelMat = pbrMat('mud', { color: 0x807870, tile: 1.2 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.4 });
    const pipeBandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });

    // 1. Excavated earth mounds across sidewalk
    const moundGeo1 = new THREE.ConeGeometry(1.6, 0.9, 10);
    const mound1 = new THREE.Mesh(moundGeo1, earthMat);
    mound1.position.set(-0.6, 0.45, -0.3);
    mound1.scale.set(1.4, 1.0, 1.1);
    mound1.castShadow = true;
    mound1.receiveShadow = true;
    group.add(mound1);

    const moundGeo2 = new THREE.ConeGeometry(1.5, 0.85, 10);
    const mound2 = new THREE.Mesh(moundGeo2, earthMat);
    mound2.position.set(0.7, 0.42, 0.3);
    mound2.scale.set(1.3, 1.0, 1.2);
    mound2.castShadow = true;
    mound2.receiveShadow = true;
    group.add(mound2);

    const moundGeo3 = new THREE.ConeGeometry(1.2, 0.65, 8);
    const mound3 = new THREE.Mesh(moundGeo3, gravelMat);
    mound3.position.set(0.1, 0.32, -0.7);
    mound3.scale.set(1.2, 1.0, 0.9);
    mound3.castShadow = true;
    mound3.receiveShadow = true;
    group.add(mound3);

    // 2. Heavy concrete blocks & shattered curb slabs
    const block1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), concreteMat);
    block1.position.set(-1.0, 0.28, 0.5);
    block1.rotation.set(0.15, 0.4, 0.1);
    block1.castShadow = true;
    group.add(block1);

    const block2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.5), concreteMat);
    block2.position.set(1.1, 0.22, -0.4);
    block2.rotation.set(-0.2, 0.6, -0.15);
    block2.castShadow = true;
    group.add(block2);

    const slab1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.7), concreteMat);
    slab1.position.set(-0.2, 0.55, 0.4);
    slab1.rotation.set(0.3, -0.2, -0.25);
    slab1.castShadow = true;
    group.add(slab1);

    // Scattered debris stones
    for (let i = 0; i < 18; i++) {
      const sx = (Math.random() - 0.5) * 3.4;
      const sz = (Math.random() - 0.5) * 2.2;
      const sGeo = new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15);
      const stone = new THREE.Mesh(sGeo, i % 2 === 0 ? concreteMat : gravelMat);
      stone.position.set(sx, 0.1 + Math.random() * 0.2, sz);
      stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      stone.castShadow = true;
      group.add(stone);
    }

    // 3. Large blue PVC drainage pipes stacked
    const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.2, 16), pipeMat);
    pipe1.rotation.z = Math.PI / 2;
    pipe1.position.set(0, 0.28, 0.95);
    pipe1.castShadow = true;
    group.add(pipe1);

    [-1.2, 0, 1.2].forEach(px => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 16), pipeBandMat);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(px, 0.28, 0.95);
      group.add(ring);
    });

    const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.6, 16), pipeMat);
    pipe2.rotation.set(0.12, 0.15, Math.PI / 2 + 0.1);
    pipe2.position.set(0.2, 0.68, 0.65);
    pipe2.castShadow = true;
    group.add(pipe2);

    // 4. Municipal Caution A-Frame Barricades facing approaching pedestrians from left (x = -1.6) and right (x = 1.6)
    [-1.55, 1.55].forEach((bx) => {
      const barGroup = new THREE.Group();
      barGroup.position.set(bx, 0, -0.3);

      // Steel legs (A-frame)
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), steelMat);
      legL.position.set(0, 0.52, -0.4);
      legL.rotation.x = 0.25;
      barGroup.add(legL);

      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), steelMat);
      legR.position.set(0, 0.52, 0.4);
      legR.rotation.x = -0.25;
      barGroup.add(legR);

      // Crossbars with yellow/black diagonal warning stripes
      for (let barY of [0.45, 0.78]) {
        const barBoard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 1.05), yellowMat);
        barBoard.position.set(0, barY, 0);
        barGroup.add(barBoard);

        // Black hazard stripes
        for (let s = -0.38; s <= 0.38; s += 0.18) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.18, 0.07), blackMat);
          stripe.position.set(0, barY, s);
          stripe.rotation.x = 0.35;
          barGroup.add(stripe);
        }
      }

      // Small warning light / flasher on top
      const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), steelMat);
      lampStand.position.set(0, 0.94, 0);
      barGroup.add(lampStand);

      const warningLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.6
      }));
      warningLamp.position.set(0, 1.02, 0);
      barGroup.add(warningLamp);

      group.add(barGroup);
    });

    return group;
  }

  // 5C. VIP Roadside Scooter Parking Bay & Animated Downward Floating Indicator Arrow
  static createParkingBay() {
    const group = new THREE.Group();
    group.name = "SheeshMahalParkingBay";

    const lineMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xf2c73a, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });

    // 1. White painted curbside parking box boundary lines on road surface (X: 3.2m, Z: 2.0m)
    // Left divider line
    const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.0), lineMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(-1.6, 0.005, 0);
    group.add(leftLine);

    // Right divider line
    const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.0), lineMat);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(1.6, 0.005, 0);
    group.add(rightLine);

    // Center divider dividing into two scooter slots
    const centerDivider = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.8), lineMat);
    centerDivider.rotation.x = -Math.PI / 2;
    centerDivider.position.set(0, 0.005, 0);
    group.add(centerDivider);

    // Outer road lane border (demarcating parking from driving lane)
    const frontLine = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.12), lineMat);
    frontLine.rotation.x = -Math.PI / 2;
    frontLine.position.set(0, 0.005, 1.0);
    group.add(frontLine);

    // Inner sidewalk curb border
    const backLine = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.12), lineMat);
    backLine.rotation.x = -Math.PI / 2;
    backLine.position.set(0, 0.005, -1.0);
    group.add(backLine);

    // 2. Yellow Diagonal Safety Corner Stripes
    [-1.35, 1.35].forEach(cx => {
      const cornerMark = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.08), yellowLineMat);
      cornerMark.rotation.x = -Math.PI / 2;
      cornerMark.rotation.z = Math.PI / 4;
      cornerMark.position.set(cx, 0.006, 0.6);
      group.add(cornerMark);
    });

    // 3. Stencil "P" for Parking painted on left slot center
    const pStem = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.5), lineMat);
    pStem.rotation.x = -Math.PI / 2;
    pStem.position.set(-0.85, 0.007, 0);
    group.add(pStem);

    const pLoopTop = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.07), lineMat);
    pLoopTop.rotation.x = -Math.PI / 2;
    pLoopTop.position.set(-0.73, 0.007, -0.18);
    group.add(pLoopTop);

    const pLoopSide = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.18), lineMat);
    pLoopSide.rotation.x = -Math.PI / 2;
    pLoopSide.position.set(-0.64, 0.007, -0.10);
    group.add(pLoopSide);

    const pLoopBot = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.07), lineMat);
    pLoopBot.rotation.x = -Math.PI / 2;
    pLoopBot.position.set(-0.73, 0.007, -0.02);
    group.add(pLoopBot);

    // 4. Floating 3D Downward-Pointing Animated Arrow
    const arrowGroup = new THREE.Group();
    arrowGroup.position.set(0, 2.3, 0);

    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.8,
      metalness: 0.2,
      roughness: 0.3
    });

    // Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 12), arrowMat);
    shaft.position.y = 0.35;
    arrowGroup.add(shaft);

    // Downward cone tip
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 14), arrowMat);
    cone.rotation.x = Math.PI; // Point downwards
    cone.position.y = -0.15;
    arrowGroup.add(cone);

    group.add(arrowGroup);
    group.userData = { arrow: arrowGroup };

    return group;
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

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.85 });
    const wireMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }); // Red wire binding for authentic desi look

    // Sturdy Bamboo Handle lying along X-axis
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 10), woodMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.2, 0.12, 0);
    handle.castShadow = true;
    group.add(handle);

    // Thick bound straw bristles bundle extending from the handle along X-axis
    const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 14), strawMat);
    bristles.rotation.z = -Math.PI / 2;
    bristles.position.set(0.62, 0.12, 0);
    bristles.castShadow = true;
    group.add(bristles);

    // Desi Red Twine binding collars wrapping around the straw base
    [-0.06, 0.06].forEach(offX => {
      const binding = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), wireMat);
      binding.rotation.z = Math.PI / 2;
      binding.position.set(0.38 + offX, 0.12, 0);
      group.add(binding);
    });

    group.userData = {
      type: 'broom',
      isCorrect: false,
      title: 'Desi Phool Jhadu (Broom)',
      rejectMsg: '⚠️ CRACK! Jhadu toot gayi — Scooter ka wazan nahi sambhal payi!'
    };
    return group;
  }

  // --- 1. PHONE PIECES & RUBBER BAND JUGAAD ITEMS ---
  static createBrokenPhoneScreen() {
    const group = new THREE.Group();
    group.name = "Item_PhoneScreen";
    
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 512);
    // Cracked spider-web pattern
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 256);
    ctx.lineTo(40, 90); ctx.lineTo(128, 256);
    ctx.lineTo(220, 110); ctx.lineTo(128, 256);
    ctx.lineTo(30, 420); ctx.lineTo(128, 256);
    ctx.lineTo(210, 400); ctx.stroke();
    
    const tex = new THREE.CanvasTexture(canvas);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.34),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, metalness: 0.8 })
    );
    glass.position.y = 0.01;
    glass.castShadow = true;
    group.add(glass);
    group.userData = { type: 'phone_screen', title: 'Toota Hua Phone Screen', isPhonePart: true };
    return group;
  }

  static createBrokenPhoneBack() {
    const group = new THREE.Group();
    group.name = "Item_PhoneBack";
    const backMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.022, 0.35), backMat);
    body.position.y = 0.011;
    body.castShadow = true;
    group.add(body);
    // Camera bump
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12), new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.9 }));
    cam.position.set(0.04, 0.025, -0.11);
    group.add(cam);
    group.userData = { type: 'phone_back', title: 'Phone Ka Back Cover', isPhonePart: true };
    return group;
  }

  static createPhoneBattery() {
    const group = new THREE.Group();
    group.name = "Item_PhoneBattery";
    const batMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.016, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.3 })
    );
    batMesh.position.y = 0.008;
    batMesh.castShadow = true;
    group.add(batMesh);
    // Gold contacts
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.012), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 }));
    pin.position.set(0, 0.009, -0.09);
    group.add(pin);
    group.userData = { type: 'phone_battery', title: 'Phone Ki Battery', isPhonePart: true };
    return group;
  }

  static createMithaiRubberBand() {
    const group = new THREE.Group();
    group.name = "Item_RubberBand";
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.09 + i * 0.015, 0.012, 8, 20), bandMat);
      loop.rotation.x = Math.PI / 2 + (i - 1) * 0.2;
      loop.rotation.y = (i - 1) * 0.3;
      loop.position.y = 0.03 + i * 0.01;
      loop.castShadow = true;
      group.add(loop);
    }
    const redLoop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 20), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    redLoop.rotation.x = Math.PI / 2;
    redLoop.position.y = 0.045;
    group.add(redLoop);

    group.userData = { type: 'rubber_band', isCorrect: true, title: 'Mithai Wali Rubber Band' };
    return group;
  }

  static createThickRope() {
    const group = new THREE.Group();
    group.name = "Item_ThickRope";
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.95 });
    for (let r = 0; r < 3; r++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18 + r * 0.08, 0.035, 10, 24), ropeMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.04 + r * 0.02;
      coil.castShadow = true;
      group.add(coil);
    }
    group.userData = {
      type: 'rope',
      isCorrect: false,
      title: 'Bhari Jute Ki Rassi',
      rejectMsg: 'Miyaan! Itni moti rassi se mobile baandhoge toh jeb me kaise ghusega? Koi patli rubber band dhundo!'
    };
    return group;
  }

  static createFixedRubberBandPhone() {
    const group = new THREE.Group();
    group.name = "Item_FixedPhone";

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.03, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
    body.position.y = 0.015;
    group.add(body);

    // Active glowing screen
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 100% JUGAAD', 128, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Sheesh Mahal Map', 128, 220);
    ctx.fillText('📍 Navigating...', 128, 280);
    ctx.fillStyle = '#facc15';
    ctx.fillText('Guddu Weds Rani 💍', 128, 380);

    const tex = new THREE.CanvasTexture(canvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.32), new THREE.MeshBasicMaterial({ map: tex }));
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.032, 0);
    group.add(screen);

    // Two bright yellow/orange rubber bands wrapped around the phone horizontally
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    [-0.08, 0.08].forEach(bz => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.036, 0.024), bandMat);
      band.position.set(0, 0.016, bz);
      group.add(band);
    });

    group.userData = { type: 'fixed_phone', title: 'Rubber Band Se Juda Naya Phone', score: 300 };
    return group;
  }

  // 1. Heavy Desi Cast-Iron Hammer (Disaster tool if used on phone!)
  static createHammerItem() {
    const group = new THREE.Group();
    group.name = "Item_Hammer";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.75 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.25 });

    // Wooden handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.42, 10), woodMat);
    handle.position.y = 0.16;
    handle.castShadow = true;
    group.add(handle);

    // Cast iron rectangular hammer head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.085, 0.085), ironMat);
    head.position.set(0, 0.35, 0);
    head.castShadow = true;
    group.add(head);

    // Striking face bevels
    const face1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.075, 0.075), ironMat);
    face1.position.set(0.075, 0.35, 0);
    group.add(face1);

    const face2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.075, 0.075), ironMat);
    face2.position.set(-0.075, 0.35, 0);
    group.add(face2);

    group.userData = {
      type: 'hammer',
      isCorrect: false,
      isDisaster: true,
      title: 'Bhari Desi Hathoda',
      desc: 'Heavy cast-iron hammer'
    };
    return group;
  }

  // 2. Chupkaoo Cello Tape (Alternative Jugaad: works, but lower score!)
  static createCelloTapeItem() {
    const group = new THREE.Group();
    group.name = "Item_CelloTape";

    const tapeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });

    // Inner cardboard spool core
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.048, 16), coreMat);
    core.rotation.x = Math.PI / 2;
    core.position.y = 0.035;
    group.add(core);

    // Outer wound tape ring
    const tapeRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 10, 24), tapeMat);
    tapeRing.rotation.x = Math.PI / 2;
    tapeRing.position.y = 0.035;
    tapeRing.castShadow = true;
    group.add(tapeRing);

    group.userData = {
      type: 'cello_tape',
      isCorrect: true,
      isLowScore: true,
      title: 'Chupkaoo Cello Tape',
      score: 100
    };
    return group;
  }

  // 3. Reassembled Phone Wrapped in Criss-Cross Cello Tape (Alternative OK Jugaad)
  static createFixedTapePhone() {
    const group = new THREE.Group();
    group.name = "Item_FixedTapePhone";

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.03, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
    body.position.y = 0.015;
    group.add(body);

    // Active glowing screen
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🩹 TAPE JUGAAD', 128, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Screen Thodi Dhundhli', 128, 220);
    ctx.fillText('📍 GPS: Sheesh Mahal', 128, 280);
    ctx.fillStyle = '#facc15';
    ctx.fillText('Kam Score (+100 Pts)', 128, 380);

    const tex = new THREE.CanvasTexture(canvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.32), new THREE.MeshBasicMaterial({ map: tex }));
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.032, 0);
    group.add(screen);

    // Translucent criss-cross tape strips wrapping across the phone
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, transparent: true, opacity: 0.65, roughness: 0.2 });
    [-0.07, 0.0, 0.07].forEach((tz, idx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.034, 0.038), tapeMat);
      strip.position.set(0, 0.016, tz);
      strip.rotation.y = (idx - 1) * 0.15;
      group.add(strip);
    });

    group.userData = { type: 'fixed_tape_phone', title: 'Cello Tape Se Juda Phone', score: 100 };
    return group;
  }

  // 4. Crushed & Pulverized Smashed Phone (Spawned after Hammer strike!)
  static createSmashedPhoneDebris() {
    const group = new THREE.Group();
    group.name = "Item_SmashedPhone";

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
    const glassShardMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.75 });

    // Crushed flattened pancake chassis
    const flatChassis = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.006, 0.42), ironMat);
    flatChassis.position.y = 0.003;
    flatChassis.rotation.y = 0.25;
    group.add(flatChassis);

    // Shattered glass pieces radiating outward
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist = 0.12 + Math.random() * 0.18;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.02 + Math.random() * 0.02, 0.04, 3), glassShardMat);
      shard.position.set(Math.cos(angle) * dist, 0.005, Math.sin(angle) * dist);
      shard.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      group.add(shard);
    }

    group.userData = { type: 'smashed_debris', title: 'Puri Tarah Pista Hua Phone' };
    return group;
  }

  // 5. Authentic Desi Kabaad ka Dher (Junk / Tool Corner on Verandah next to House Wall)
  static createJunkToolCorner() {
    const group = new THREE.Group();
    group.name = "JunkToolCorner";

    const woodMat = pbrMat('hardwood', { color: 0x8a6040, tile: 1.2 });
    const rustyMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.6, roughness: 0.7 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });

    // Weathered wooden kabaad crate
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.55), woodMat);
    crate.position.set(0, 0.21, 0);
    crate.castShadow = true;
    crate.receiveShadow = true;
    group.add(crate);

    // Small metal scrap box stacked on crate
    const scrapBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.28), rustyMat);
    scrapBox.position.set(-0.16, 0.51, 0.05);
    scrapBox.rotation.y = 0.15;
    group.add(scrapBox);

    // Old vintage oil can
    const oilCan = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.24, 10), rustyMat);
    oilCan.position.set(0.24, 0.54, 0.08);
    group.add(oilCan);

    // Desi Hathoda propped up on the crate
    const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.38, 8), woodMat);
    hammerHandle.position.set(0.38, 0.22, 0.26);
    hammerHandle.rotation.set(0.4, 0.2, 0.5);
    group.add(hammerHandle);
    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.07), steelMat);
    hammerHead.position.set(0.48, 0.38, 0.32);
    hammerHead.rotation.set(0.4, 0.2, 0.5);
    group.add(hammerHead);

    // Bright yellow rubber band bundle on crate
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const rubberRings = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 8, 16), bandMat);
    rubberRings.rotation.x = Math.PI / 2;
    rubberRings.position.set(-0.25, 0.43, -0.12);
    group.add(rubberRings);

    // Roll of Cello Tape on crate
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 });
    const tapeMesh = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 16), tapeMat);
    tapeMesh.rotation.x = Math.PI / 2;
    tapeMesh.position.set(0.12, 0.43, -0.10);
    group.add(tapeMesh);

    // Coiled Jute Rope resting at base of crate
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.95 });
    const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.038, 8, 20), ropeMat);
    ropeCoil.rotation.x = Math.PI / 2;
    ropeCoil.position.set(0.36, 0.04, -0.22);
    group.add(ropeCoil);

    // Pulsing 3D Ground Hologram / Marker: "📦 KABAAD KA DHER [E]"
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const cctx = canvas.getContext('2d');
    cctx.fillStyle = '#f59e0b';
    cctx.font = 'bold 26px sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('📦 KABAAD DHER', 128, 50);
    cctx.fillStyle = '#ffffff';
    cctx.font = 'bold 22px sans-serif';
    cctx.fillText('Press [E] for Tools', 128, 90);

    const labelTex = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.45),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    labelMesh.position.set(0, 0.82, 0);
    group.add(labelMesh);

    group.userData = {
      type: 'junk_pile',
      title: 'Kabaad Ka Dher (Tools & Scrap)',
      isJunkPile: true,
      labelMesh
    };

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
      title: 'Lakdi ka Phatta',
      widthZ: 1.8,
      lengthX: 4.2
    };
    return group;
  }

  // 2.2m Short Timber Plank (Distractor leaning against Grey Wall)
  static createShortPlank() {
    const group = new THREE.Group();
    group.name = "Item_ShortPlank";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.7, roughness: 0.4 });

    // 3 timber balks side-by-side (Length: 2.2m, Width: 1.26m, Thickness: 0.16m)
    for (let i = 0; i < 3; i++) {
      const balkZ = -0.42 + i * 0.42;
      const balk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.38), woodMat);
      balk.position.set(0, 0.08, balkZ);
      balk.castShadow = true;
      balk.receiveShadow = true;
      group.add(balk);
    }

    [-0.95, 0.95].forEach(bx => {
      const tiePlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 1.30), steelMat);
      tiePlate.position.set(bx, 0.085, 0);
      group.add(tiePlate);
    });

    group.userData = {
      type: 'short_plank',
      isCorrect: false,
      title: 'Lakdi ka Phatta',
      rejectMsg: 'Yeh phatta gaddhe se chhota pad gaya! Dono kinaron par tik hi nahi paya!'
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
    const asphaltMat = pbrMat('asphalt', { color: new THREE.Color(1.55, 1.5, 1.45), tile: 4.5 });
    const lineWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });

    // PLATFORM 1: EXTENDED 50m APPROACH ROAD (x: -16.0 to 44.0, Solid elevated road at y = 0.0)
    const roadPlat1 = new THREE.Mesh(new THREE.BoxGeometry(60.0, 0.4, 7.0), asphaltMat);
    roadPlat1.position.set(14.0, -0.2, 0);
    roadPlat1.receiveShadow = true;
    envGroup.add(roadPlat1);

    // Dashed center road line on Platform 1
    for (let cx = -14; cx <= 41.5; cx += 2.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), lineWhiteMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(cx, 0.005, 0);
      envGroup.add(dash);
    }

    // PLATFORM 2: DESTINATION ROAD (x: 47.6 to 94.0, Solid elevated road at y = 0.0)
    const roadPlat2 = new THREE.Mesh(new THREE.BoxGeometry(46.4, 0.4, 7.0), asphaltMat);
    roadPlat2.position.set(70.8, -0.2, 0);
    roadPlat2.receiveShadow = true;
    envGroup.add(roadPlat2);

    // Dashed center road line on Platform 2
    for (let cx = 49.5; cx <= 91.5; cx += 2.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), lineWhiteMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(cx, 0.005, 0);
      envGroup.add(dash);
    }
    // [REAL 3D VOID]: Between x = 44.0 and x = 47.6 there is NO road floor.
    // The deep chasm descends 2.2 meters down to the mud floor below!

    // Sidewalk
    const walk = new THREE.Mesh(new THREE.BoxGeometry(110, 0.35, 3.5), pbrMat('pavers', { color: 0xd6d3d1, tile: 2.0 }));
    walk.position.set(39, 0.08, -5.2);
    walk.receiveShadow = true;
    envGroup.add(walk);

    // Front Street Curb / Railing (BROKEN & OPEN at Excavated Trench between x = 44.0 and 47.6)
    const railMat = pbrMat('plaster', { color: 0x9ca3af, tile: 1.5 });
    const brokenCurbMat = pbrMat('plaster', { color: 0x6b7280, tile: 1.0 });

    // Curb Section 1 (Approach Road: x = -16.0 to 44.0)
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(60.0, 0.3, 0.4), railMat);
    rail1.position.set(14.0, 0.1, 3.6);
    rail1.receiveShadow = true;
    envGroup.add(rail1);

    // Broken / Jagged cracked curb end on left trench lip (x = 44.0)
    const breakLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.42), brokenCurbMat);
    breakLeft.position.set(44.05, 0.04, 3.6);
    breakLeft.rotation.z = -0.35; // Drooping down into pit
    envGroup.add(breakLeft);

    // Curb Section 2 (Destination Road: x = 47.6 to 94.0)
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(46.4, 0.3, 0.4), railMat);
    rail2.position.set(70.8, 0.1, 3.6);
    rail2.receiveShadow = true;
    envGroup.add(rail2);

    // Broken / Jagged cracked curb end on right trench lip (x = 47.6)
    const breakRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.42), brokenCurbMat);
    breakRight.position.set(47.55, 0.04, 3.6);
    breakRight.rotation.z = 0.35; // Drooping down into pit
    envGroup.add(breakRight);

    // Fallen shattered curb chunks in the trench bottom at z = 3.4
    const fallenChunk1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.35), brokenCurbMat);
    fallenChunk1.position.set(45.0, -2.12, 3.4);
    fallenChunk1.rotation.set(0.4, 0.3, -0.6);
    envGroup.add(fallenChunk1);

    const fallenChunk2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.3), brokenCurbMat);
    fallenChunk2.position.set(46.6, -2.14, 3.3);
    fallenChunk2.rotation.set(-0.3, 0.6, 0.4);
    envGroup.add(fallenChunk2);

    // Buildings along the street (extended across the 110m mohalla)
    const bColors = [0xf2dd9a, 0xe9b2a2, 0xa9c6dc, 0xb7d3a8, 0xf0cf7a, 0xe7b8c8];
    for (let i = 0; i < 15; i++) {
      // Reserve dedicated space at x = -6.0 for Chacha's Ancestral Home!
      if (i === 1) continue;

      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 7.0 + (i % 3) * 2, 4.0), pbrMat('plaster', { color: bColors[i % bColors.length], tile: 3.0 }));
      bMesh.position.set(-10 + i * 6.8, (7.0 + (i % 3) * 2) / 2, -7.2);
      bMesh.castShadow = true;
      envGroup.add(bMesh);

      if (i === 7) {
        // Building right before trench (i=7, center = 37.6): place compact balcony on left so right wall (38.0 to 40.6) is completely clear for the long timber plank
        const balc = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.8), pbrMat('plaster', { color: 0xc9853a, tile: 1.5 }));
        balc.position.set(36.0, 3.5, -5.0);
        envGroup.add(balc);
      } else {
        const balc = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 0.8), pbrMat('plaster', { color: 0xc9853a, tile: 1.5 }));
        balc.position.set(-10 + i * 6.8, 3.5, -5.0);
        envGroup.add(balc);
      }
    }

    // Chai Stall (positioned nicely along the 50m approach road at x = 18.0)
    const stallGroup = new THREE.Group();
    stallGroup.position.set(18.0, 0.2, -4.0);
    const stall = new THREE.Mesh(new RoundedBoxGeometry(2.8, 1.1, 1.4, 3, 0.06), pbrMat('hardwood', { color: 0xb0603a, tile: 1.6 }));
    stall.position.y = 0.55;
    stallGroup.add(stall);

    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.45, 14), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.75, roughness: 0.2 }));
    kettle.position.set(0.6, 1.32, 0);
    stallGroup.add(kettle);

    // 4 Solid Bamboo / Timber Support Pillars holding up the roof
    const poleMat = pbrMat('hardwood', { color: 0x8a5a36, tile: 1.0 });
    [
      [-1.25, -0.60],
      [1.25, -0.60],
      [-1.25, 0.60],
      [1.25, 0.60]
    ].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.5, 8), poleMat);
      pole.position.set(px, 1.25, pz);
      pole.castShadow = true;
      stallGroup.add(pole);
    });

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.7, 4), pbrMat('fabric', { color: 0x2f5fb8, tile: 0.8 }));
    roof.position.set(0, 2.6, 0);
    roof.rotation.y = Math.PI / 4;
    stallGroup.add(roof);
    envGroup.add(stallGroup);

    // Lamp Posts along the 100m street
    for (let x = -8; x <= 86; x += 12) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 }));
      pole.position.set(x, 2.25, -3.8);
      envGroup.add(pole);

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe7a8).multiplyScalar(3.5) }));
      lamp.userData.noShadow = true;
      lamp.position.set(x, 4.4, -3.6);
      envGroup.add(lamp);

    }

    // --- SHEESH MAHAL: COMPACT ROYAL PALACE WEDDING FACADE (x = 80.0, Height = 3.8m) ---
    const sheeshMahal = new THREE.Group();
    sheeshMahal.name = "SheeshMahalWeddingVenue";
    sheeshMahal.position.set(80.0, 0, 0);

    const stoneMat = pbrMat('sandstone', { color: 0xffe2c2, tile: 2.0 });
    const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.6 });
    const royalRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
    const carpetMat = pbrMat('fabric', { color: 0x9f1239, tile: 0.8 });

    // 1. Red Carpet centered on road leading straight through the gate
    const redCarpet = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 2.8), carpetMat);
    redCarpet.rotation.x = -Math.PI / 2;
    redCarpet.position.set(-0.2, 0.015, 0);
    redCarpet.receiveShadow = true;
    sheeshMahal.add(redCarpet);

    [-1.4, 1.4].forEach(cz => {
      const border = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 0.14), trimGoldMat);
      border.rotation.x = -Math.PI / 2;
      border.position.set(-0.2, 0.02, cz);
      sheeshMahal.add(border);
    });

    // 2. Palace Sandstone Facade Wall (Height: 3.8m, Width: 8.6m)
    // Left Wing Wall (z: -4.3 to -1.45)
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.8, 2.85), stoneMat);
    wallLeft.position.set(0, 1.90, -2.88);
    wallLeft.castShadow = true;
    sheeshMahal.add(wallLeft);

    // Right Wing Wall (z: 1.45 to 4.3)
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.8, 2.85), stoneMat);
    wallRight.position.set(0, 1.90, 2.88);
    wallRight.castShadow = true;
    sheeshMahal.add(wallRight);

    // Top Arch Lintel above central gate (connecting the two walls at y: 3.0 to 3.8m)
    const archLintel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.80, 2.9), stoneMat);
    archLintel.position.set(0, 3.40, 0);
    archLintel.castShadow = true;
    sheeshMahal.add(archLintel);

    // Ornamental Palace Cornice / Parapet along the top of wall (y = 3.85m)
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 8.8), trimGoldMat);
    parapet.position.set(0, 3.91, 0);
    sheeshMahal.add(parapet);

    // 3. Decorative Gate Pillars framing the 2.8m central opening
    [-1.45, 1.45].forEach(pz => {
      const pCol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 3.8, 14), trimGoldMat);
      pCol.position.set(0.04, 1.90, pz);
      pCol.castShadow = true;
      sheeshMahal.add(pCol);

      // Miniature corner decorative chhatri / dome at y = 4.15m
      const chhatri = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.7), trimGoldMat);
      chhatri.position.set(0, 4.15, pz);
      sheeshMahal.add(chhatri);
    });

    // 4. Tasteful Marigold Flower Garlands (Genda Phool) framing the central gate
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.8 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 });

    // Horizontal garland across the gate top
    for (let gz = -1.35; gz <= 1.35; gz += 0.22) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), Math.round(gz * 10) % 2 === 0 ? orangeMat : yellowMat);
      bead.position.set(-0.24, 2.95, gz);
      sheeshMahal.add(bead);
    }
    // Vertical hanging garland strings along both sides of gate
    [-1.42, 1.42].forEach(gz => {
      for (let gy = 0.6; gy <= 2.9; gy += 0.26) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), Math.round(gy * 10) % 2 === 0 ? orangeMat : yellowMat);
        bead.position.set(-0.24, gy, gz);
        sheeshMahal.add(bead);
      }
    });

    // 5. Wedding Shamiana Canopy behind the gate (x = 1.6, y = 4.1)
    const canopyRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.1, 4), royalRedMat);
    canopyRoof.position.set(1.6, 4.35, 0);
    canopyRoof.rotation.y = Math.PI / 4;
    sheeshMahal.add(canopyRoof);

    // Warm Festive Fairy Lights
    const fairyLight = new THREE.PointLight(0xfef08a, 1.8, 9.0);
    fairyLight.position.set(-0.2, 3.2, 0);
    sheeshMahal.add(fairyLight);

    // 6. High-Contrast Readable Wedding Signboard (Angled for camera visibility)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a0418';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 1008, 240);

    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.font = 'bold 62px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('🌸 SHEESH MAHAL: GUDDU KI BAARAAT 🌸', 512, 102);
    ctx.fillText('🌸 SHEESH MAHAL: GUDDU KI BAARAAT 🌸', 512, 102);

    ctx.fillStyle = '#ffffff';
    ctx.strokeText('★ DULHE KA SEHRA MANDAP ★', 512, 185);
    ctx.fillText('★ DULHE KA SEHRA MANDAP ★', 512, 185);

    const textTex = new THREE.CanvasTexture(canvas);
    const signPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.85),
      new THREE.MeshBasicMaterial({ map: textTex, transparent: true })
    );
    // Angled slightly toward camera (+Z) for clear diagonal reading!
    signPlane.rotation.y = -Math.PI / 2 + 0.35;
    signPlane.position.set(-0.25, 3.38, 0.15);
    sheeshMahal.add(signPlane);

    envGroup.add(sheeshMahal);

    // Dusty ground around the road so the world doesn't end in empty space.
    // A hole is cut where the trench is, so the pit stays open.
    const groundShape = new THREE.Shape();
    groundShape.moveTo(-90, -90); groundShape.lineTo(190, -90); groundShape.lineTo(190, 90); groundShape.lineTo(-90, 90); groundShape.lineTo(-90, -90);
    const hole = new THREE.Path();
    // (shape is in XY; after rotating -90deg about X, y maps to -z)
    hole.moveTo(44.0, -3.6); hole.lineTo(44.0, 3.45); hole.lineTo(47.6, 3.45); hole.lineTo(47.6, -3.6); hole.lineTo(44.0, -3.6);
    groundShape.holes.push(hole);
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(groundShape), pbrMat('dirt', { color: 0xffffff, tile: 4.0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    ground.name = 'DustyGround';
    envGroup.add(ground);

    // Rain puddles on the broken road near the dig site – glossy, reflect the sunset sky
    const puddleNormal = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'assets/textures/Water_1_M_Normal.jpg');
    puddleNormal.wrapS = puddleNormal.wrapT = THREE.RepeatWrapping;
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x16130f, roughness: 0.05, metalness: 0.0, normalMap: puddleNormal,
      normalScale: new THREE.Vector2(0.15, 0.15), transparent: true, opacity: 0.7,
      polygonOffset: true, polygonOffsetFactor: -3
    });
    [[42.2, 2.2, 1.1, 0.7, 0.4], [49.4, -2.3, 1.4, 0.8, -0.3], [40.4, -1.2, 0.7, 0.45, 1.1], [26.5, 2.4, 1.0, 0.6, 0.2], [66.0, 2.1, 0.9, 0.5, 0.7]].forEach(([px, pz, sx, sz, rot]) => {
      const pud = new THREE.Mesh(new THREE.CircleGeometry(1, 28), puddleMat);
      pud.scale.set(sx, sz, 1);
      pud.rotation.set(-Math.PI / 2, 0, rot);
      pud.position.set(px, 0.006, pz);
      pud.receiveShadow = true;
      pud.userData.noShadow = true;
      envGroup.add(pud);
    });

    return envGroup;
  }

  // 13. Shiny Golden Desi Rupee Coin (Collectible with '₹' symbol)
  static createDesiCoin() {
    const coinGroup = new THREE.Group();
    coinGroup.name = "DesiCoin";

    // Create Canvas Texture with gold rim and Indian Rupee Symbol
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Shiny gold circle background
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    // Concentric gold border
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed '₹' text
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78350f';
    ctx.fillText('₹', 130, 132);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('₹', 126, 126);

    const coinTex = new THREE.CanvasTexture(canvas);

    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.85,
      roughness: 0.25,
      map: coinTex
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.3
    });

    // Cylinder with custom face materials
    const coinMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24),
      [edgeMat, coinMat, coinMat]
    );
    coinMesh.rotation.x = Math.PI / 2;
    coinMesh.castShadow = true;
    coinGroup.add(coinMesh);

    // Subtle gentle golden glow pointlight

    coinGroup.userData = {
      isCollected: false,
      initialY: 0.65,
      rotSpeed: 2.8
    };
    coinGroup.position.y = 0.65;

    return coinGroup;
  }

  // 14. Road Excavation Warning Barrier ("SAVDHAN! AAGE GADDHA HAI")
  static createWarningBarrier() {
    const barrier = new THREE.Group();
    barrier.name = "WarningBarrier";

    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const coneOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

    // 2 Striped Road Cones
    [-1.6, 1.6].forEach(cz => {
      const cone = new THREE.Group();
      cone.position.set(0, 0, cz);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), postMat);
      base.position.y = 0.025;
      cone.add(base);

      const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 14), coneOrangeMat);
      coneMesh.position.y = 0.35;
      cone.add(coneMesh);

      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 14), whiteStripeMat);
      stripe.position.y = 0.34;
      cone.add(stripe);

      barrier.add(cone);
    });

    // Warning Signboard Banner across road
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Yellow / Black warning diagonal background
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#111827';
    ctx.fillRect(10, 10, 492, 108);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ SAVDHAN! AAGE GADDHA HAI ⚠️', 256, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('ROAD WORK IN PROGRESS (JUGAAD REQUIRED)', 256, 88);

    const signTex = new THREE.CanvasTexture(canvas);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.55, 2.8),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 })
    );
    signBoard.position.set(0, 0.72, 0);
    barrier.add(signBoard);

    // Two support legs
    [-1.25, 1.25].forEach(lz => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), postMat);
      leg.position.set(0, 0.375, lz);
      barrier.add(leg);
    });

    return barrier;
  }

  // 15. Stylized Pixar Indian Chachi (Auntie at Sheesh Mahal talking urgently on phone)
  static createCartoonChachi() {
    const chachi = new THREE.Group();
    chachi.name = "CartoonChachi";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3bd94, roughness: 0.5 });
    const sareePinkMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.65 }); // Royal Magenta Pink
    const blouseMat = new THREE.MeshStandardMaterial({ color: 0x9d174d, roughness: 0.55 });
    const zariGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.25 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
    const gajraWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const phoneMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Torso / Saree Drape
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.22, 0);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.60, 16), blouseMat);
    torsoGroup.add(chest);

    // Diagonal Saree Pallu across chest
    const pallu = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.32), sareePinkMat);
    pallu.rotation.z = -0.35;
    pallu.position.set(0.04, 0.02, 0.05);
    torsoGroup.add(pallu);

    // Gold Zari border on pallu
    const palluBorder = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.66, 0.33), zariGoldMat);
    palluBorder.rotation.z = -0.35;
    palluBorder.position.set(0.11, 0.02, 0.05);
    torsoGroup.add(palluBorder);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.18, 12), skinMat);
    neck.position.set(0, 0.38, 0);
    torsoGroup.add(neck);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.66, 0);

    const headGeo = new THREE.SphereGeometry(0.32, 22, 22);
    headGeo.scale(1.0, 1.05, 1.0);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Neat hair parted in middle
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.68), hairMat);
    hair.position.set(0, 0.06, -0.04);
    headGroup.add(hair);

    // Traditional Bun (Juda) at back of head
    const juda = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), hairMat);
    juda.position.set(0, -0.05, -0.34);
    headGroup.add(juda);

    // White Jasmine Flower Garland (Gajra) wrapped around Juda
    const gajra = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 8, 16), gajraWhiteMat);
    gajra.position.set(0, -0.05, -0.34);
    headGroup.add(gajra);

    // Traditional Red Bindi on forehead
    const bindi = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), new THREE.MeshBasicMaterial({ color: 0xbe123c }));
    bindi.position.set(0, 0.11, 0.33);
    headGroup.add(bindi);

    // Expressive cartoon eyes
    [-0.11, 0.11].forEach(eZ => {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sclera.scale.set(1.0, 1.15, 0.5);
      sclera.position.set(eZ, 0.04, 0.29);
      headGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.042, 12), new THREE.MeshBasicMaterial({ color: 0x451a03 }));
      iris.position.set(eZ, 0.04, 0.33);
      headGroup.add(iris);

      const hl = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(eZ + 0.01, 0.055, 0.332);
      headGroup.add(hl);
    });

    // Gold Jhumka Earrings
    [-0.32, 0.32].forEach(jZ => {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), zariGoldMat);
      stud.position.set(jZ, 0.02, 0);
      headGroup.add(stud);

      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 10), zariGoldMat);
      bell.position.set(jZ, -0.06, 0);
      headGroup.add(bell);
    });

    // Nose & clean white smile (no red block)
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
    nose.position.set(0, -0.04, 0.33);
    headGroup.add(nose);

    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    teeth.position.set(0, -0.14, 0.31);
    headGroup.add(teeth);

    torsoGroup.add(headGroup);

    // Left Arm resting naturally by side with gold bangles
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0.32, 0.22, 0);
    const armUpperL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.35, 10), blouseMat);
    armUpperL.position.y = -0.17;
    leftArmPivot.add(armUpperL);
    const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 10), skinMat);
    forearmL.position.y = -0.48;
    leftArmPivot.add(forearmL);
    const banglesL = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), zariGoldMat);
    banglesL.position.y = -0.58;
    banglesL.rotation.x = Math.PI / 2;
    leftArmPivot.add(banglesL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), skinMat);
    handL.position.y = -0.66;
    leftArmPivot.add(handL);
    torsoGroup.add(leftArmPivot);

    // RIGHT ARM: CONTINUOUS BENT ARM HOLDING PHONE TO EAR (Seamless curved elbow, zero cuts)
    const phoneArmPivot = new THREE.Group();
    phoneArmPivot.name = "PhoneArmPivot";
    phoneArmPivot.position.set(-0.32, 0.22, 0);

    const createChachiBone = (pA, pB, rTop, rBot, mat) => {
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(rBot, rTop, len, 14);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pA).addScaledVector(dir, 0.5);
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
      mesh.quaternion.copy(quat);
      mesh.castShadow = true;
      return mesh;
    };

    const pShoulderC = new THREE.Vector3(0, 0, 0);
    const pElbowC = new THREE.Vector3(-0.06, -0.14, 0.16);
    const pWristC = new THREE.Vector3(0.01, 0.36, 0.05);
    const pHandC = new THREE.Vector3(0.01, 0.40, 0.02);
    const pPhoneC = new THREE.Vector3(0.02, 0.43, 0.01);

    // Shoulder cap
    const shoulderCapC = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), blouseMat);
    shoulderCapC.position.copy(pShoulderC);
    phoneArmPivot.add(shoulderCapC);

    // Blouse upper sleeve connecting shoulder to elbow
    const upperArmC = createChachiBone(pShoulderC, pElbowC, 0.068, 0.058, blouseMat);
    phoneArmPivot.add(upperArmC);

    // Smooth seamless elbow joint bridging upper arm and forearm
    const elbowJointC = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 14), skinMat);
    elbowJointC.position.copy(pElbowC);
    phoneArmPivot.add(elbowJointC);

    // Forearm connecting elbow up to wrist
    const forearmC = createChachiBone(pElbowC, pWristC, 0.057, 0.048, skinMat);
    phoneArmPivot.add(forearmC);

    // Wrist joint
    const wristJointC = new THREE.Mesh(new THREE.SphereGeometry(0.050, 12, 12), skinMat);
    wristJointC.position.copy(pWristC);
    phoneArmPivot.add(wristJointC);

    // Traditional Gold Bangles at wrist
    const banglesC = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.015, 6, 14), zariGoldMat);
    banglesC.position.copy(pWristC);
    banglesC.rotation.x = Math.PI / 2;
    phoneArmPivot.add(banglesC);

    // Hand holding phone
    const handMeshC = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), skinMat);
    handMeshC.position.copy(pHandC);
    phoneArmPivot.add(handMeshC);

    // Smartphone pressed flush to right ear
    const phoneC = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.15, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 })
    );
    phoneC.position.copy(pPhoneC);
    phoneC.rotation.set(-0.10, 0.25, 0.05);
    phoneArmPivot.add(phoneC);

    // Smartphone screen
    const screenC = new THREE.Mesh(
      new THREE.PlaneGeometry(0.065, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screenC.position.set(pPhoneC.x, pPhoneC.y, pPhoneC.z + 0.011);
    screenC.rotation.set(-0.10, 0.25, 0.05);
    phoneArmPivot.add(screenC);

    torsoGroup.add(phoneArmPivot);
    chachi.add(torsoGroup);

    // Flowing Long Saree Skirt & Pleats
    const sareeSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 0.95, 18), sareePinkMat);
    sareeSkirt.position.set(0, 0.48, 0);
    sareeSkirt.castShadow = true;
    chachi.add(sareeSkirt);

    // Gold Zari Border along the bottom of the saree
    const bottomZari = new THREE.Mesh(new THREE.CylinderGeometry(0.382, 0.385, 0.08, 18), zariGoldMat);
    bottomZari.position.set(0, 0.05, 0);
    chachi.add(bottomZari);

    // Saree Pleats in front
    const pleats = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.08), sareePinkMat);
    pleats.position.set(0, 0.45, 0.32);
    chachi.add(pleats);

    chachi.userData = {
      headGroup,
      phoneArmPivot,
      torsoGroup
    };

    return chachi;
  }

  // 16. Chacha's Traditional Bhopali Ancestral Home (With Carved Double Doors, Ootla Verandah, Tulsi, Bicycle & Steps)
  static createChachaHome() {
    const home = new THREE.Group();
    home.name = "ChachaHome";

    const wallMat = pbrMat('plaster', { color: 0xf3d78a, tile: 2.5 }); // Warm ochre lime wash
    const brickTrimMat = pbrMat('brick', { color: 0xe0a080, tile: 1.4 });
    const woodMat = pbrMat('hardwood', { color: 0x7a4a2a, tile: 1.6, roughness: 0.8 }); // Teakwood
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 }); // Terracotta khaprail
    const stonePlinthMat = pbrMat('sandstone', { color: 0xb0a89e, tile: 1.4 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.25 });
    const cycleMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.5, roughness: 0.5 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

    // 1. Main House Wall Block (Width: 6.6m, Height: 7.2m, Depth: 3.5m)
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 7.2, 3.5), wallMat);
    wall.position.set(0, 3.6, -1.75);
    wall.castShadow = true;
    home.add(wall);

    // Decorative Plaster Cornice below roof
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.28, 0.4), brickTrimMat);
    cornice.position.set(0, 7.1, 0.1);
    home.add(cornice);

    // Terracotta Clay Tile Slanted Overhang Roof (Khaprail Chhat)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.24, 1.4), roofTileMat);
    roof.rotation.x = 0.35;
    roof.position.set(0, 7.3, 0.45);
    home.add(roof);

    // 2. Raised Stone Verandah Plinth (Ootla / Chhabootra)
    const ootla = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.32, 2.0), stonePlinthMat);
    ootla.position.set(0, 0.16, 1.0);
    ootla.receiveShadow = true;
    home.add(ootla);

    // 2 Stone Steps leading down to street driveway
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.5), stonePlinthMat);
    step1.position.set(0, 0.08, 2.25);
    step1.receiveShadow = true;
    home.add(step1);

    // 3. Antique Carved Teakwood Door Frame (Archway)
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.22), woodMat);
    frameLeft.position.set(-1.0, 1.45, 0.05);
    home.add(frameLeft);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.22), woodMat);
    frameRight.position.set(1.0, 1.45, 0.05);
    home.add(frameRight);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 0.24), woodMat);
    frameTop.position.set(0, 2.75, 0.05);
    home.add(frameTop);

    // 4. Carved Double Door Leaves (Pivoting Outward)
    const doorPivotL = new THREE.Group();
    doorPivotL.position.set(-0.91, 1.45, 0.05);
    const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(0.88, 2.4, 0.06), woodMat);
    doorLeafL.position.set(0.44, 0, 0);
    doorPivotL.add(doorLeafL);
    // Brass handle knocker
    const knockerL = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), brassMat);
    knockerL.position.set(0.78, 0, 0.04);
    doorPivotL.add(knockerL);
    home.add(doorPivotL);

    const doorPivotR = new THREE.Group();
    doorPivotR.position.set(0.91, 1.45, 0.05);
    const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(0.88, 2.4, 0.06), woodMat);
    doorLeafR.position.set(-0.44, 0, 0);
    doorPivotR.add(doorLeafR);
    // Brass handle knocker
    const knockerR = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), brassMat);
    knockerR.position.set(-0.78, 0, 0.04);
    doorPivotR.add(knockerR);
    home.add(doorPivotR);

    // Dark Doorway Interior Void (seen when doors open)
    const doorwayVoid = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.5), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    doorwayVoid.position.set(0, 1.45, 0.01);
    home.add(doorwayVoid);

    // 5. Hand-Painted Traditional Wooden Nameplate: "चाचा का निवास"
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠 चाचा का निवास 🏠', 256, 42);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('(लाला का बाड़ा, पुराना भोपाल)', 256, 88);

    const nameplateTex = new THREE.CanvasTexture(canvas);
    const nameplate = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.48, 0.05),
      new THREE.MeshStandardMaterial({ map: nameplateTex, roughness: 0.6 })
    );
    nameplate.position.set(0, 3.25, 0.12);
    home.add(nameplate);

    // Hanging Brass Lantern (Laalten) with warm ambient light
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.28, 8), brassMat);
    lantern.position.set(1.4, 2.8, 0.35);
    home.add(lantern);

    const lanternLight = new THREE.PointLight(0xfef08a, 1.2, 5.0);
    lanternLight.position.set(1.4, 2.65, 0.45);
    home.add(lanternLight);

    // 6. Sacred Tulsi Vrindavan / Potted Tulsi Plant on Ootla
    const tulsiPot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), brickTrimMat);
    tulsiPot.position.set(2.4, 0.53, 1.4);
    home.add(tulsiPot);

    const tulsiLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), leafMat);
    tulsiLeaves.position.set(2.4, 0.88, 1.4);
    home.add(tulsiLeaves);



    home.userData = {
      doorPivotL,
      doorPivotR,
      openDoors: () => {
        doorPivotL.rotation.y = -Math.PI * 0.45;
        doorPivotR.rotation.y = Math.PI * 0.45;
      },
      closeDoors: () => {
        doorPivotL.rotation.y = 0;
        doorPivotR.rotation.y = 0;
      }
    };

    return home;
  }
}
