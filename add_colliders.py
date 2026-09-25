with open('src/main.js', 'r') as f:
    content = f.read()

colliders_str = """    this.colliders = [
      // House Room boundaries (invisible walls to prevent falling out during trailer)
      { minX: -102, maxX: -94, minZ: 3.5, maxZ: 4.5 },   // Front Invisible Wall
      { minX: -102, maxX: -94, minZ: -3.5, maxZ: -2.0 }, // Back Wall
      { minX: -95, maxX: -94, minZ: -3.5, maxZ: 4.5 },   // Right Wall
      { minX: -102, maxX: -100.5, minZ: -3.5, maxZ: 4.5 },// Left Wall
      // Trench
      { minX: 13, maxX: 19, minZ: -10, maxZ: 10 },
      // Chai stall bounds
      { minX: 28, maxX: 33, minZ: -8, maxZ: -1 }
    ];"""

content = content.replace("""    this.colliders = [
      // Trench
      { minX: 13, maxX: 19, minZ: -10, maxZ: 10 },
      // Chai stall bounds
      { minX: 28, maxX: 33, minZ: -8, maxZ: -1 }
    ];""", colliders_str)

with open('src/main.js', 'w') as f:
    f.write(content)
