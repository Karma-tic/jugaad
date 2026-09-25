with open('src/main.js', 'r') as f:
    content = f.read()

old_colliders = """    this.colliders = [
      { type: 'circle', x: -6.0, z: -0.5, radius: 1.2, name: 'Scooter' },
      { type: 'box', minX: 0.6, maxX: 3.4, minZ: -4.8, maxZ: -3.2, name: 'ChaiStall' },
      { type: 'circle', x: 21.5, z: -0.2, radius: 1.5, name: 'Cow' }
    ];"""

new_colliders = """    this.colliders = [
      { type: 'circle', x: -6.0, z: -0.5, radius: 1.2, name: 'Scooter' },
      { type: 'box', minX: 0.6, maxX: 3.4, minZ: -4.8, maxZ: -3.2, name: 'ChaiStall' },
      { type: 'circle', x: 21.5, z: -0.2, radius: 1.5, name: 'Cow' },
      // House Room boundaries (invisible walls to prevent falling out during trailer)
      { type: 'box', minX: -102, maxX: -94, minZ: 3.5, maxZ: 4.5, name: 'WallFront' },   // Front Invisible Wall
      { type: 'box', minX: -102, maxX: -94, minZ: -3.5, maxZ: -2.0, name: 'WallBack' }, // Back Wall
      { type: 'box', minX: -95, maxX: -94, minZ: -3.5, maxZ: 4.5, name: 'WallRight' },   // Right Wall
      { type: 'box', minX: -102, maxX: -100.5, minZ: -3.5, maxZ: 4.5, name: 'WallLeft' }// Left Wall
    ];"""

content = content.replace(old_colliders, new_colliders)
with open('src/main.js', 'w') as f:
    f.write(content)
