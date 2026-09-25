with open('src/main.js', 'r') as f:
    content = f.read()

# Replace the setTimeout logic
old_timeout = """          setTimeout(() => {
              this.house.visible = false;
              this.env.visible = true;
              this.scooter.visible = true;
              this.cow.visible = true;
              this.trench.visible = true;
              this.items.forEach(item => item.visible = true);
              this.player.position.set(-4, 0, 0.5);
              this.camera.position.set(-4 + 3.2, 4.8, 0.5 + 8.8); // Snap camera
              this.scooter.rotation.x = 0; // Fix scooter stand implicitly
          }, 800);"""

new_timeout = """          setTimeout(() => {
              try {
                if (this.house) this.house.visible = false;
                if (this.env) this.env.visible = true;
                if (this.scooter) this.scooter.visible = true;
                if (this.cow) this.cow.visible = true;
                if (this.trench) this.trench.visible = true;
                if (this.items) this.items.forEach(item => { if (item) item.visible = true; });
                this.player.position.set(-4, 0, 0.5);
                this.camera.position.set(-4 + 3.2, 4.8, 0.5 + 8.8); // Snap camera
                if (this.scooter) this.scooter.rotation.x = 0; // Fix scooter stand implicitly
              } catch(e) {
                console.error("Teleport error: ", e);
              }
          }, 800);"""

content = content.replace(old_timeout, new_timeout)
with open('src/main.js', 'w') as f:
    f.write(content)
