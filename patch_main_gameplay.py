with open('src/main.js', 'r') as f:
    content = f.read()

# Add House to Scene
content = content.replace(
    "this.scene.add(this.env);",
    "this.scene.add(this.env);\n    this.house = AssetFactory.createHouseInterior();\n    this.scene.add(this.house);"
)

# Move brick into the house
content = content.replace(
    "brick.position.set(-1.0, 0, -1.5);",
    "brick.position.set(-2.0, 0, 2.5);"
)

# Add door opening logic in handleAction
# The original logic checks: "if (this.stage === 0 && distToScooter < 2.8) {"
# Let's replace the whole Crisis 1 with Door logic
old_crisis_1 = """      // CRISIS 1: Near Scooter (-6, 0, -0.5)
      const distToScooter = pPos.distanceTo(this.scooter.position);
      if (this.stage === 0 && distToScooter < 2.8) {
        if (carried.userData.type === 'brick') {
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(-6.1, 0, -0.9);
          this.scooter.rotation.x = 0; // Stands upright!
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
          this.showDialogue('Mom', carried.userData.rejectMsg || 'Yeh cheez scooter ka stand nahi ban sakti!');
          return;
        }
      }"""

new_crisis_1 = """      // CRISIS 1: Near House Door (-4, 0, 4.5)
      const distToDoor = pPos.distanceTo(new THREE.Vector3(-4, 0, 4.5));
      if (this.stage === 0 && distToDoor < 2.5) {
        if (carried.userData.type === 'brick') {
          this.player.remove(carried);
          this.scene.add(carried);
          carried.position.set(-4.5, 0, 4.3);
          
          // Open door
          this.house.children.forEach(child => {
             if(child.name === 'HouseDoor') child.rotation.y = -Math.PI / 2;
          });
          
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

content = content.replace(old_crisis_1, new_crisis_1)

with open('src/main.js', 'w') as f:
    f.write(content)
