import re

with open('src/models.js', 'r') as f:
    content = f.read()

# We'll completely rewrite the house method to be safe and visually correct (sitcom style, no front wall)
new_house_method = """
  static createHouseInterior() {
    const houseGroup = new THREE.Group();
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-3, 0.01, 0.5);
    houseGroup.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 1.0 });
    
    // Back Wall (z = -2.5)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.2), wallMat);
    backWall.position.set(-3, 2, -2.5);
    houseGroup.add(backWall);
    
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

    return houseGroup;
  }
}
"""

# Replace the existing createHouseInterior method entirely
content = re.sub(r'static createHouseInterior\(\) \{.*^\}$', new_house_method.strip(), content, flags=re.MULTILINE | re.DOTALL)

with open('src/models.js', 'w') as f:
    f.write(content)
