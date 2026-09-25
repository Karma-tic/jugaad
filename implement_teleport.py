import re

with open('src/main.js', 'r') as f:
    content = f.read()

# 1. Spawn player and brick in the trailer room (x = -100)
content = content.replace("this.player.position.set(-2.5, 0, 0.5);", "this.player.position.set(-98, 0, 0.5);")
content = content.replace("brick.position.set(-1.5, 0, 1.5);", "brick.position.set(-97, 0, 1.5);")

# 2. Place house at x = -100
content = content.replace(
    "this.scene.add(this.env);\n    this.house = AssetFactory.createHouseInterior();\n    this.scene.add(this.house);",
    "this.scene.add(this.env);\n    this.house = AssetFactory.createHouseInterior();\n    this.house.position.set(-95, 0, 0);\n    this.scene.add(this.house);"
)

# 3. Handle Crisis 1 logic (Teleport)
old_door_crisis = """      // CRISIS 1: Near House Door (-4.5, 0, 0.5)
      const distToDoor = pPos.distanceTo(new THREE.Vector3(-4.5, 0, 0.5));
      if (this.stage === 0 && distToDoor < 2.5) {
        if (carried.userData.type === 'brick') {
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(-4.3, 0, 1.2); // Wedge brick near door
          
          // Open door
          if(this.house) {
            this.house.children.forEach(child => {
               if(child.name === 'HouseDoor') child.rotation.y = -Math.PI / 2.5;
            });
          }
          this.scooter.rotation.x = 0; // Fix scooter stand implicitly
          
          this.inventory = null;
          this.stage = 1;
          this.updateMeter(25);
          audio.playBrickThud();
          this.triggerJugaadToast('JUGAAD 1: DOOR OPENED! (+25%)');
          this.showDialogue(
            'Mom',
            'Brick used as door stopper! You are out of the house. Now get on the scooter, but beware of the broken road!'
          );
          this.questText.textContent = 'Door is propped open. Now take the scooter, but there is a trench ahead! Find a wooden plank!';
          return;
        } else {
          this.showDialogue('Mom', carried.userData.rejectMsg || 'Yeh darwaza nahi khol sakta!');
          return;
        }
      }"""

new_door_crisis = """      // CRISIS 1: Near House Door in Trailer Level (x=-101)
      const distToDoor = pPos.distanceTo(new THREE.Vector3(-101, 0, 0.5));
      if (this.stage === 0 && distToDoor < 3.5) {
        if (carried.userData.type === 'brick') {
          this.player.remove(carried);
          // Don't add brick back, just destroy it
          
          // Open door animation
          if(this.house) {
            this.house.children.forEach(child => {
               if(child.name === 'HouseDoor') child.rotation.y = Math.PI / 2.5;
            });
          }
          
          // TELEPORT to street level
          setTimeout(() => {
              this.player.position.set(-4, 0, 0.5);
              this.camera.position.set(-4 + 3.2, 4.8, 0.5 + 8.8); // Snap camera
              this.scooter.rotation.x = 0; // Fix scooter stand implicitly
          }, 800);

          this.inventory = null;
          this.stage = 1;
          this.updateMeter(25);
          audio.playBrickThud();
          this.triggerJugaadToast('JUGAAD 1: DOOR OPENED! (+25%)');
          this.showDialogue(
            'Mom',
            'Brick used as door stopper! You are out of the house. Now get on the scooter, but beware of the broken road!'
          );
          this.questText.textContent = 'Get on the scooter [E], but there is a trench ahead! Find a wooden plank!';
          return;
        } else {
          this.showDialogue('Mom', carried.userData.rejectMsg || 'Yeh darwaza nahi khol sakta!');
          return;
        }
      }"""

content = content.replace(old_door_crisis, new_door_crisis)

# Snap camera initially to the trailer level
content = content.replace(
    "this.camera.position.set(-4, 4.8, 9.5);",
    "this.camera.position.set(-98 + 3.2, 4.8, 0.5 + 8.8);"
)

with open('src/main.js', 'w') as f:
    f.write(content)
