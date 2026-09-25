import * as THREE from 'three';

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
  // 1. Stylized Pixar/Cartoon Boy (Matching Image 1) - Standing / Walking
  static createCartoonBoy() {
    const character = new THREE.Group();
    character.name = "CartoonCharacter";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5c096, roughness: 0.5 });
    const blueShirtMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
    const denimPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
    const whiteShoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Torso Group
    const torsoGroup = new THREE.Group();
    torsoGroup.name = "TorsoGroup";
    torsoGroup.position.set(0, 1.25, 0);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.65, 18), blueShirtMat);
    chest.castShadow = true;
    torsoGroup.add(chest);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), blueShirtMat);
    collar.position.set(0, 0.35, 0);
    collar.rotation.x = Math.PI / 2;
    torsoGroup.add(collar);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 12), skinMat);
    neck.position.set(0, 0.42, 0);
    torsoGroup.add(neck);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);

    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    headGeo.scale(1.0, 1.08, 1.0);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65), hairMat);
    hair.position.set(0, 0.08, -0.04);
    headGroup.add(hair);

    const quiff = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 8), hairMat);
    quiff.rotation.set(-0.4, 0, 0.6);
    quiff.position.set(0.12, 0.32, 0.25);
    headGroup.add(quiff);

    // Eyes
    [-0.14, 0.14].forEach((eyeX, idx) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(eyeX, 0.06, 0.31);

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), eyeWhiteMat);
      sclera.scale.set(1.0, 1.15, 0.5);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.052, 16), irisMat);
      iris.position.set(0, 0, 0.048);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), pupilMat);
      pupil.position.set(0, 0, 0.05);
      eyeGroup.add(pupil);

      const hl = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), highlightMat);
      hl.position.set(0.015, 0.015, 0.052);
      eyeGroup.add(hl);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.03), hairMat);
      brow.position.set(0, 0.14, 0.02);
      brow.rotation.z = idx === 0 ? 0.12 : -0.12;
      eyeGroup.add(brow);

      headGroup.add(eyeGroup);
    });

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), skinMat);
    nose.position.set(0, -0.04, 0.36);
    headGroup.add(nose);

    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 14, 1, false, 0, Math.PI), mouthMat);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(0, -0.16, 0.32);
    headGroup.add(mouth);

    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), teethMat);
    teeth.position.set(0, -0.145, 0.33);
    headGroup.add(teeth);

    [-0.35, 0.35].forEach(earX => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), skinMat);
      ear.scale.set(0.5, 1.2, 0.8);
      ear.position.set(earX, 0.02, 0);
      headGroup.add(ear);
    });

    torsoGroup.add(headGroup);

    // Arms
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0.36, 0.25, 0);
    const armUpperL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.36, 10), blueShirtMat);
    armUpperL.position.y = -0.18;
    leftArmPivot.add(armUpperL);
    const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 10), skinMat);
    forearmL.position.y = -0.48;
    leftArmPivot.add(forearmL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), skinMat);
    handL.position.y = -0.66;
    leftArmPivot.add(handL);
    torsoGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(-0.36, 0.25, 0);
    const armUpperR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.36, 10), blueShirtMat);
    armUpperR.position.y = -0.18;
    rightArmPivot.add(armUpperR);
    const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 10), skinMat);
    forearmR.position.y = -0.48;
    rightArmPivot.add(forearmR);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), skinMat);
    handR.position.y = -0.66;
    rightArmPivot.add(handR);
    torsoGroup.add(rightArmPivot);

    character.add(torsoGroup);

    // Legs
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0.16, 0.95, 0);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 12), denimPantsMat);
    legL.position.y = -0.36;
    leftLegPivot.add(legL);

    const shoeL = new THREE.Group();
    shoeL.position.set(0, -0.76, 0.08);
    shoeL.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.36), whiteShoeMat));
    const upperL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), blueShirtMat);
    upperL.position.set(0, 0.08, -0.02);
    shoeL.add(upperL);
    leftLegPivot.add(shoeL);
    character.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(-0.16, 0.95, 0);
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 12), denimPantsMat);
    legR.position.y = -0.36;
    rightLegPivot.add(legR);

    const shoeR = new THREE.Group();
    shoeR.position.set(0, -0.76, 0.08);
    shoeR.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.36), whiteShoeMat));
    const upperR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), blueShirtMat);
    upperR.position.set(0, 0.08, -0.02);
    shoeR.add(upperR);
    rightLegPivot.add(shoeR);
    character.add(rightLegPivot);

    character.userData = {
      torsoGroup,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      walkPhase: 0,
      radius: 0.5
    };

    return character;
  }

  // 2. Seated Pixar Rider Model Mounted on Scooter
  static createSeatedRider() {
    const rider = new THREE.Group();
    rider.name = "SeatedRider";

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5c096, roughness: 0.5 });
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

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
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

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x831843 }));
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

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5c096, roughness: 0.5 });
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
    const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-3, 0.01, 0.5);
    houseGroup.add(floor);

    const brickTex = TextureGenerator.createBrickTexture();
    brickTex.repeat.set(1.5, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9, color: 0xdddddd });
    
    // Back Wall (z = -2.5)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.2), wallMat);
    backWall.position.set(-3, 2, -2.5);
    houseGroup.add(backWall);
    
    // Window on Back Wall
    const winGeo = new THREE.BoxGeometry(2, 1.5, 0.3);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 });
    const windowMesh = new THREE.Mesh(winGeo, winMat);
    windowMesh.position.set(-3, 2, -2.5);
    houseGroup.add(windowMesh);
    
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
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-6, 1.5, 1.0);
    door.name = "HouseDoor";
    houseGroup.add(door);

    // 🛏️ BED (Jugaad cot/khatiya style)
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
    bedFrame.position.set(-1.5, 0.2, -0.5);
    houseGroup.add(bedFrame);
    
    const bedMattress = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 3.8), new THREE.MeshStandardMaterial({ color: 0xbdc3c7 }));
    bedMattress.position.set(-1.5, 0.5, -0.5);
    houseGroup.add(bedMattress);
    
    const bedPillow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    bedPillow.position.set(-1.5, 0.65, -1.8);
    houseGroup.add(bedPillow);

    // 🪑 TABLE
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    tableTop.position.set(-4.5, 1.0, -1.5);
    houseGroup.add(tableTop);
    
    const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    tableLeg.position.set(-4.5, 0.5, -1.5);
    houseGroup.add(tableLeg);

    return houseGroup;
  }
}
