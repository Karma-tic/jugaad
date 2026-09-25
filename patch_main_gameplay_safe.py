with open('src/main.js', 'r') as f:
    content = f.read()

# Add House to Scene
content = content.replace(
    "this.scene.add(this.env);",
    "this.scene.add(this.env);\n    this.house = AssetFactory.createHouseInterior();\n    this.scene.add(this.house);"
)

# Player spawn
content = content.replace(
    "this.player.position.set(-4, 0, 0.5);",
    "this.player.position.set(-2.5, 0, 0.5);"
)

# Brick spawn
content = content.replace(
    "brick.position.set(-1.0, 0, -1.5);",
    "brick.position.set(-1.5, 0, 1.5);"
)

# Update Story and Dialogues
content = content.replace(
    "'Chacha',\n      'Arre miyaan! Scooter ka stand toot gaya! Mohalle me kabaad dhundo aur Laal Eent jaisa koi thos stand banao!'",
    "'Mom',\n      'Beta jaldi uth! Aaj function hai. 10 baje tak pahunchna hai! Par room ka darwaza jam ho gaya hai, koi jugaad lagao darwaza kholne ka!'"
)
content = content.replace(
    "Aage sadak par gehra gaddha hai! Construction pile se lamba lakdi ka phatta dhundo!",
    "Door is propped open. Now take the scooter, but there is a trench ahead! Find a wooden plank!"
)
content = content.replace(
    "Hao miyaan! Laal eent ka stand lag gaya! Ab sadak par dekho, municipal walon ne gehra gaddha khoda hai!",
    "Brick used as door stopper! You are out of the house. Now get on the scooter, but beware of the broken road!"
)
content = content.replace("Chacha", "Mom")
content = content.replace("🎉", "").replace("💥", "").replace("🗣️", "")


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
          this.triggerJugaadToast(' JUGAAD 1: LAAL EENT KA STAND! (+25%)');
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

new_crisis_1 = """      // CRISIS 1: Near House Door (-4.5, 0, 0.5)
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

content = content.replace(old_crisis_1, new_crisis_1)

with open('src/main.js', 'w') as f:
    f.write(content)
