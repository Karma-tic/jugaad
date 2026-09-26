# Bhopali Safar: The Great Desi Jugaad 🛵💨

> **🏆 Official Entry for MP Game Udaan 2026 Hackathon**  
> **Theme:** JUGAAD (Desi Problem Solving, Street Engineering & Comic Hacks)  
> **Setting:** Authentic Streets of Old Bhopal, Madhya Pradesh  
> **Platform:** WebGL / Three.js (Optimized for Laptop & Desktop Widescreen)

---

## 👥 Creators & Team

| Name | Role | Contributions |
| :--- | :--- | :--- |
| **Anoop Shukla** | **Team Head & Lead Game Architect** | Game Concept, Story Planning, 3D Architecture, Systems Design & Coordination |
| **Sujeet P. Singh** | **Core Game Developer & Level Designer** | Three.js Procedural Modeling, Web Audio Synthesis, Physics & Collision Systems |

---

## 📖 The Story: "Guddu Ka Sehra"

Baaraat is standing at the gates of Sheesh Mahal, Bhopal! Pandit ji is furious, the auspicious wedding Muhurat is ticking away, and Guddu (the groom) is missing his wedding **Sehra**! 

Chachi makes an urgent phone call to Chacha. In sheer shock, Chacha drops his phone on the verandah, shattering it into pieces. To make matters worse, his vintage **Bajaj Chetak** scooter has a snapped kickstand!

Armed only with iconic **Desi Jugaad**, Chacha must:
1. **Fix the Broken Phone:** Tape the shattered screen and back cover together.
2. **Prop up the Chetak:** Find a red construction brick to support the broken kickstand.
3. **Cross the Deep Trench:** Build a timber plank bridge across a 3.6m Bhopal Jal Nigam excavation pit.
4. **Befriend Gau Mata:** Lure the sacred cow resting in the middle of the road with fresh green grass & roti from the Sabzi Mandi.
5. **Reach Sheesh Mahal:** Navigate Chetak through old Bhopal streets and park in the VIP mandap bay before the 3-minute Muhurat runs out!

---

## 🎮 Key Features

- **100% Procedural 3D WebGL:** Zero external heavy 3D assets or GLTF blobs. All 20+ stylized Pixar-aesthetic models (Chacha, Bajaj Chetak, Gau Mata, Sheesh Mahal, Jal Nigam Trench) are generated in real-time code.
- **Iconic Desi Jugaad Puzzle Solving:** Solve problems using bricks, planks, and grass with authentic street logic.
- **Web Audio API Sound Engine:** Procedural two-stroke Chetak engine frequency modulation, supersonic paper plane rocket whoosh, and retro Desi chiptune BGM.
- **Interactive Intro Launch:** Supersonic Paper Plane flight that unlocks browser audio per strict Autoplay security policies.
- **3-Mistake Comic Failsafe:** 3 hearts / lives with custom accident respawn mechanics and real-time 3:00 minute countdown clock.
- **Project Info & Controls Modal:** Interactive 3-tab modal covering Controls, Technical Architecture, and Creator Credits.

---

## ⌨️ Controls & Keybindings

> 💻 **Recommended Experience:** Laptop / Desktop with keyboard on a 16:9 widescreen display.

| Action | Primary Key | Secondary Key |
| :--- | :--- | :--- |
| **Explore & Walk** | `W` `A` `S` `D` | `Arrow Keys` |
| **Interact / Pick / Fix / Park** | `E` | Screen Tap / Click |
| **Scooter Accelerate** | `D` | `Right Arrow` |
| **Scooter Brake / Reverse** | `A` | `Left Arrow` |
| **Scooter Lane Steering** | `W` / `S` | `Up` / `Down Arrows` |
| **Desi Scooter Horn** | `Spacebar` | `H` or 📢 Button |

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) **v18 or higher** (LTS recommended) — check with `node -v`
- A modern desktop browser (Chrome / Edge / Safari / Firefox) with WebGL 2

### macOS / Linux 1-Click Launch
```bash
bash start-dev.sh
```

### Windows 1-Click Launch
Double-click `start-dev.bat` in the project root. It installs dependencies if needed, starts the Vite dev server and opens the game.

### Manual Setup (any OS)
```bash
# 1. Clone the repository
git clone https://github.com/Karma-tic/jugaad.git
cd jugaad

# 2. Install the exact dependency versions from package-lock.json
npm ci          # (or: npm install)

# 3. Start the dev server, then open http://localhost:5173
npm run dev

# 4. Optional: production build + preview
npm run build
npm run preview # opens http://localhost:4173
```

> If the page looks old after an update, hard-refresh with **Cmd + Shift + R** (Mac) / **Ctrl + Shift + R** (Windows).

### 🌐 Play Online (GitHub Pages)
Live game: **https://karma-tic.github.io/jugaad/**

Deployment is automatic: every push to `main` runs `.github/workflows/deploy.yml`, which builds the game and publishes `dist/` to GitHub Pages.
One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 🎬 Story Flow (2 Chapters)
| Chapter | Page | What happens |
| :--- | :--- | :--- |
| **Chapter 1 – Guddu ka Kamra** | `index.html` | Room jugaads: fix the charger (timing mini-game), find items, and unlock the door. Leaving the room goes straight to Chapter 2. |
| **Chapter 2 – Chacha ka Safar** | `chapter2.html` | Phone tape, brick kickstand, plank across the trench, grass for Gau Mata, park at Sheesh Mahal before the Muhurat. |

You can also jump to Chapter 2 from the landing screen with the **Chapter 2** button.

### ⚙️ Graphics Quality
Open **Settings → Controls → Graphics Quality**: `Auto` (default, adapts to FPS), `Low`, `Medium`, `High`.
On older laptops pick **Low** or **Medium** for smooth play.

---

## 🛠️ Technical Stack & Architecture

- **Core Engine:** [Three.js](https://threejs.org/) (WebGL rendering, ShadowMap, Procedural Mesh Factory)
- **Tooling & Bundler:** [Vite](https://vitejs.dev/) (Instant Hot Module Replacement & production chunking)
- **Audio Synthesis:** Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, Gain Ramping)
- **Physics & Collision:** Custom deterministic AABB (Axis-Aligned Bounding Box) collision system
- **State Architecture:** Multi-phase Finite State Machine (Cutscenes, Free Walk, Driving, Accidents, Victory)

---

## 📜 License & Hackathon Attribution

Developed for **MP Game Udaan 2026 Hackathon**.  
All rights reserved © 2026 Anoop Shukla & Sujeet P. Singh.
