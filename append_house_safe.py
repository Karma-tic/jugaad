with open('src/models.js', 'r') as f:
    content = f.read()

house_method = """
  static createHouseInterior() {
    const houseGroup = new THREE.Group();
    
    // Floor (x from -0.5 to -4.5, z from -1.5 to 2.5)
    const floorGeo = new THREE.PlaneGeometry(4, 4);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-2.5, 0.01, 0.5);
    houseGroup.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 1.0 });
    
    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.2), wallMat);
    backWall.position.set(-2.5, 2, -1.5);
    houseGroup.add(backWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 4), wallMat);
    rightWall.position.set(-0.5, 2, 0.5);
    houseGroup.add(rightWall);
    
    // Left Wall (with Doorway)
    const leftWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 1), wallMat);
    leftWallFront.position.set(-4.5, 2, 2.0);
    houseGroup.add(leftWallFront);
    
    const leftWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 1), wallMat);
    leftWallBack.position.set(-4.5, 2, -1.0);
    houseGroup.add(leftWallBack);

    const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 2), wallMat);
    leftWallTop.position.set(-4.5, 3.5, 0.5);
    houseGroup.add(leftWallTop);

    // Door
    const doorGeo = new THREE.BoxGeometry(0.1, 3, 2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-4.5, 1.5, 0.5);
    door.name = "HouseDoor";
    houseGroup.add(door);

    return houseGroup;
  }
}
"""

content = content.rstrip()
if content.endswith('}'):
    content = content[:-1] + house_method

with open('src/models.js', 'w') as f:
    f.write(content)
