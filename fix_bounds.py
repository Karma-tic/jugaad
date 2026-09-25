with open('src/main.js', 'r') as f:
    content = f.read()

old_bounds = """        nextX = Math.max(-8, Math.min(38, nextX));
        nextZ = Math.max(-4.2, Math.min(2.8, nextZ));"""

new_bounds = """        // Handle different bounds for House (Stage 0) and Street (Stage > 0)
        if (this.stage === 0) {
            nextX = Math.max(-101, Math.min(-95, nextX));
            nextZ = Math.max(-2.2, Math.min(3.2, nextZ));
        } else {
            nextX = Math.max(-8, Math.min(38, nextX));
            nextZ = Math.max(-4.2, Math.min(2.8, nextZ));
        }"""

content = content.replace(old_bounds, new_bounds)

with open('src/main.js', 'w') as f:
    f.write(content)
