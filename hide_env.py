with open('src/main.js', 'r') as f:
    content = f.read()

# Hide env initially
content = content.replace("this.scene.add(this.env);", "this.scene.add(this.env);\n    this.env.visible = false;\n    this.scooter.visible = false;\n    this.cow.visible = false;\n    this.trench.visible = false;")

# Show env when teleporting
old_teleport = """          // TELEPORT to street level
          setTimeout(() => {
              this.player.position.set(-4, 0, 0.5);
              this.camera.position.set(-4 + 3.2, 4.8, 0.5 + 8.8); // Snap camera
              this.scooter.rotation.x = 0; // Fix scooter stand implicitly
          }, 800);"""

new_teleport = """          // TELEPORT to street level
          setTimeout(() => {
              this.house.visible = false;
              this.env.visible = true;
              this.scooter.visible = true;
              this.cow.visible = true;
              this.trench.visible = true;
              this.player.position.set(-4, 0, 0.5);
              this.camera.position.set(-4 + 3.2, 4.8, 0.5 + 8.8); // Snap camera
              this.scooter.rotation.x = 0; // Fix scooter stand implicitly
          }, 800);"""

content = content.replace(old_teleport, new_teleport)

with open('src/main.js', 'w') as f:
    f.write(content)
