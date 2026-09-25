import re

with open('src/models.js', 'r') as f:
    content = f.read()

# Add a house around the spawn point
house_code = """
    // --- JUGAAD HOUSE INTERIOR ---
    const houseGroup = new THREE.Group();
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-3.5, 0.01, 1.5);
    houseGroup.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 1.0 });
    
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.2), wallMat);
    backWall.position.set(-3.5, 2, -1.5);
    houseGroup.add(backWall);

    const sideWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 6), wallMat);
    sideWall1.position.set(-6.4, 2, 1.5);
    houseGroup.add(sideWall1);

    const sideWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 6), wallMat);
    sideWall2.position.set(-0.6, 2, 1.5);
    houseGroup.add(sideWall2);
    
    // Front Wall with Doorway
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 0.2), wallMat);
    frontWallLeft.position.set(-5.5, 2, 4.4);
    houseGroup.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 0.2), wallMat);
    frontWallRight.position.set(-1.5, 2, 4.4);
    houseGroup.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.2), wallMat);
    frontWallTop.position.set(-3.5, 3.5, 4.4);
    houseGroup.add(frontWallTop);

    // Broken Door
    const doorGeo = new THREE.BoxGeometry(2, 3, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-3.5, 1.5, 4.4);
    door.rotation.y = 0.2; // Slightly open, stuck
    houseGroup.add(door);

    group.add(houseGroup);
"""

content = content.replace("export class AssetFactory {", "export class AssetFactory {\n" + house_code.replace("group.add(houseGroup);", ""))

content = content.replace(
    "const group = new THREE.Group();",
    "const group = new THREE.Group();\n" + house_code.replace("export class AssetFactory {\n", "")
)

with open('src/models.js', 'w') as f:
    f.write(content)
