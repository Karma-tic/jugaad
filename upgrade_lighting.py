import re
with open('src/main.js', 'r') as f:
    content = f.read()

# 1. Enable shadows on renderer
renderer_old = r"""this\.renderer = new THREE\.WebGLRenderer\(\{ antialias: true, alpha: false \}\);
    this\.renderer\.setSize\(window\.innerWidth, window\.innerHeight\);
    this\.renderer\.setPixelRatio\(window\.devicePixelRatio\);"""
renderer_new = r"""this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;"""
content = re.sub(renderer_old, renderer_new, content)

# 2. Upgrade sunlight and add ambient light
light_old = r"""const sunLight = new THREE\.DirectionalLight\(0xf59e0b, 1\.6\);
    sunLight\.position\.set\(12, 24, 18\);
    this\.scene\.add\(sunLight\);"""
light_new = r"""const ambientLight = new THREE.AmbientLight(0xffedd5, 0.6); // Warm morning ambient
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffaa00, 2.0); // Stronger, warmer sun
    sunLight.position.set(20, 30, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.001;
    this.scene.add(sunLight);"""
content = re.sub(light_old, light_new, content)

# 3. Apply cast/receive shadow to all objects in scene graph recursively after init
init_scene_old = r"""this\.initExhaustParticles\(\);
    this\.initConfetti\(\);
  \}"""
init_scene_new = r"""this.initExhaustParticles();
    this.initConfetti();
    
    // Apply shadows to all meshes
    this.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }"""
content = re.sub(init_scene_old, init_scene_new, content)

with open('src/main.js', 'w') as f:
    f.write(content)
