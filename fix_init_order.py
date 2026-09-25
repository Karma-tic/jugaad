import re

with open('src/main.js', 'r') as f:
    content = f.read()

bad_init = """    this.env = AssetFactory.createStreetEnvironment();
    this.scene.add(this.env);
    this.env.visible = false;
    this.scooter.visible = false;
    this.cow.visible = false;
    this.trench.visible = false;
    this.house = AssetFactory.createHouseInterior();
    this.house.position.set(-95, 0, 0);
    this.scene.add(this.house);"""

good_init = """    this.env = AssetFactory.createStreetEnvironment();
    this.scene.add(this.env);
    this.house = AssetFactory.createHouseInterior();
    this.house.position.set(-95, 0, 0);
    this.scene.add(this.house);"""

content = content.replace(bad_init, good_init)

# Now put the visibility toggles AT THE END of initScene!
# Let's find the end of initScene, which is before `initExhaustParticles`
end_init = """    this.isAccident = false;
    this.shakeDuration = 0;

    this.initExhaustParticles();
    this.initConfetti();
  }"""

new_end_init = """    this.isAccident = false;
    this.shakeDuration = 0;
    
    // Hide street initially
    this.env.visible = false;
    this.scooter.visible = false;
    this.cow.visible = false;
    this.trench.visible = false;

    this.initExhaustParticles();
    this.initConfetti();
  }"""

content = content.replace(end_init, new_end_init)

with open('src/main.js', 'w') as f:
    f.write(content)
