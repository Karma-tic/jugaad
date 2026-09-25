import re

with open('src/models.js', 'r') as f:
    content = f.read()

# Add TextureGenerator at the top of models.js
texture_gen = """
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
"""

if "class TextureGenerator" not in content:
    content = content.replace("class AssetFactory {", texture_gen + "\nclass AssetFactory {")

# 1. Upgrade Scooter
scooter_old = r"""  static createVintageScooter\(\) \{
    const scooterGroup = new THREE\.Group\(\);
    
    const bodyMat = new THREE\.MeshStandardMaterial\(\{ color: 0x64748b, roughness: 0\.4, metalness: 0\.6 \}\);
    
    const chassis = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.6, 0\.8, 1\.8\), bodyMat\);
    chassis\.position\.y = 0\.6;
    scooterGroup\.add\(chassis\);
    
    const seatMat = new THREE\.MeshStandardMaterial\(\{ color: 0x1c1917, roughness: 0\.9 \}\);
    const seat = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.62, 0\.15, 0\.8\), seatMat\);
    seat\.position\.set\(0, 1\.05, 0\.2\);
    scooterGroup\.add\(seat\);
    
    // Front panel shield
    const shield = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.7, 0\.9, 0\.1\), bodyMat\);
    shield\.position\.set\(0, 0\.8, -0\.85\);
    shield\.rotation\.x = -0\.2;
    scooterGroup\.add\(shield\);
    
    // Stand placeholder
    const stand = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.1, 0\.4, 0\.1\), new THREE\.MeshStandardMaterial\(\{ color: 0x333333 \}\)\);
    stand\.position\.set\(-0\.2, 0\.2, 0\);
    stand\.rotation\.z = 0\.3;
    scooterGroup\.add\(stand\);"""

scooter_new = r"""  static createVintageScooter() {
    const scooterGroup = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.8 }); // Shiny blue!
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.9 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.8), bodyMat);
    chassis.position.y = 0.6;
    scooterGroup.add(chassis);

    // Front mudguard
    const frontMudguard = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16, 1, false, 0, Math.PI), bodyMat);
    frontMudguard.rotation.z = Math.PI / 2;
    frontMudguard.position.set(0, 0.55, -0.9);
    scooterGroup.add(frontMudguard);
    
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 }); // Leather seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.8), seatMat);
    seat.position.set(0, 0.95, 0.2);
    scooterGroup.add(seat);
    
    // Front panel shield
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.1), bodyMat);
    shield.position.set(0, 0.9, -0.85);
    shield.rotation.x = -0.25;
    scooterGroup.add(shield);
    
    // Handlebar stem & bars
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), darkMetalMat);
    stem.position.set(0, 1.2, -0.85);
    stem.rotation.x = -0.25;
    scooterGroup.add(stem);
    
    const handlebars = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), darkMetalMat);
    handlebars.rotation.z = Math.PI / 2;
    handlebars.position.set(0, 1.5, -0.92);
    scooterGroup.add(handlebars);

    // Hand grips
    const gripL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15), rubberMat);
    gripL.rotation.z = Math.PI / 2;
    gripL.position.set(-0.4, 1.5, -0.92);
    scooterGroup.add(gripL);
    
    const gripR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15), rubberMat);
    gripR.rotation.z = Math.PI / 2;
    gripR.position.set(0.4, 1.5, -0.92);
    scooterGroup.add(gripR);

    // Headlight
    const headlightBox = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.15), bodyMat);
    headlightBox.rotation.x = Math.PI / 2;
    headlightBox.position.set(0, 1.52, -0.98);
    scooterGroup.add(headlightBox);
    
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.5, emissive: 0xffffee, emissiveIntensity: 0.8 });
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), glassMat);
    glass.position.set(0, 1.52, -1.06);
    scooterGroup.add(glass);

    // Wheels
    const createWheel = (z) => {
        const wGroup = new THREE.Group();
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 24), rubberMat);
        tire.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 16), darkMetalMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(tire);
        wGroup.add(rim);
        wGroup.position.set(0, 0.3, z);
        return wGroup;
    };
    
    const frontWheel = createWheel(-0.9);
    const rearWheel = createWheel(0.6);
    scooterGroup.add(frontWheel);
    scooterGroup.add(rearWheel);
    
    // Stand placeholder
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4), darkMetalMat);
    stand.position.set(-0.2, 0.2, 0);
    stand.rotation.z = 0.5;
    scooterGroup.add(stand);"""
content = re.sub(scooter_old, scooter_new, content)

# 2. Upgrade Street Environment Texture
street_old = r"""    const asphaltMat = new THREE\.MeshStandardMaterial\(\{ color: 0x292524, roughness: 0\.92 \}\);"""
street_new = r"""    const asphaltTex = TextureGenerator.createNoiseTexture('#292524', '#3f3f46', 512, 512, 2);
    asphaltTex.repeat.set(10, 3);
    const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 1.0 });"""
content = re.sub(street_old, street_new, content)

# 3. Upgrade House Interior
house_old = r"""    // Floor
    const floorGeo = new THREE\.PlaneGeometry\(6, 6\);
    const floorMat = new THREE\.MeshStandardMaterial\(\{ color: 0x8B4513, roughness: 0\.9 \}\);
    const floor = new THREE\.Mesh\(floorGeo, floorMat\);
    floor\.rotation\.x = -Math\.PI / 2;
    floor\.position\.set\(-3, 0\.01, 0\.5\);
    houseGroup\.add\(floor\);

    const wallMat = new THREE\.MeshStandardMaterial\(\{ color: 0x95a5a6, roughness: 1\.0 \}\);
    
    // Back Wall \(z = -2\.5\)
    const backWall = new THREE\.Mesh\(new THREE\.BoxGeometry\(6, 4, 0\.2\), wallMat\);
    backWall\.position\.set\(-3, 2, -2\.5\);
    houseGroup\.add\(backWall\);"""

house_new = r"""    // Floor
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
    houseGroup.add(backWall);"""
content = re.sub(house_old, house_new, content)

with open('src/models.js', 'w') as f:
    f.write(content)
