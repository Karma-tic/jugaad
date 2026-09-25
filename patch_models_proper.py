import re

with open('src/models.js', 'r') as f:
    content = f.read()

house_method = """
  static createHouseInterior() {
    const houseGroup = new THREE.Group();
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-4, 0.01, 0.5);
    houseGroup.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1.0 });
    
    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.2), wallMat);
    backWall.position.set(-4, 2, -3.5);
    houseGroup.add(backWall);

    // Side Wall Left
    const sideWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 8), wallMat);
    sideWall1.position.set(-8, 2, 0.5);
    houseGroup.add(sideWall1);

    // Side Wall Right
    const sideWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 8), wallMat);
    sideWall2.position.set(0, 2, 0.5);
    houseGroup.add(sideWall2);
    
    // Front Wall with Doorway
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), wallMat);
    frontWallLeft.position.set(-6.5, 2, 4.5);
    houseGroup.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), wallMat);
    frontWallRight.position.set(-1.5, 2, 4.5);
    houseGroup.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.2), wallMat);
    frontWallTop.position.set(-4, 3.5, 4.5);
    houseGroup.add(frontWallTop);

    // Door
    const doorGeo = new THREE.BoxGeometry(2, 3, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-4, 1.5, 4.5);
    door.name = "HouseDoor";
    houseGroup.add(door);

    return houseGroup;
  }
}
"""

content = content.replace("}\n", house_method)
# The replace might affect all closing braces if not careful.
# So I'll do this instead:
