# 🎬 Chain Reaction Studio (ピタゴラ・チェインリアクション)

[日本語版はこちら (README.ja.md)](README.ja.md)

[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.20-red)](https://brm.io/matter-js/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Chain Reaction Studio** is an interactive, browser-based 2D physics sandbox inspired by NHK's famous *PitagoraSwitch* (ピタゴラスイッチ) and classic Rube Goldberg machines.

Build, experiment with, and trigger delightful physical chain reactions using a rich variety of everyday items—marbles, wooden planks, dominoes, springs, seesaws, paper cups, toilet paper tubes, rubber bands, string pendulums, fans, magnets, rotary paddle wheels, chimes, funnels, catapults, pulley buckets, running faucets, and accumulating floor water!

---

## ✨ Key Features

### 1. 🛠️ 19+ Rich Physics Gimmicks & Everyday Items
Build elaborate contraptions with finely-tuned physical properties (density, friction, restitution, fluid dynamics, and mass):

| Category | Item | Description |
| :--- | :--- | :--- |
| **Balls & Triggers** | 🔵 **Marble** | Core glass marble with natural rolling friction, bounce, and rotational sound. |
| | 🏁 **Start Gate** | Mechanical start gate that securely releases the marble upon simulation start. |
| | 🚩 **Goal Flag** | Target flag that detects goal completion, triggers celebratory chimes, and launches confetti. |
| **Foundations** | 🪵 **Wooden Plank** | Fundamental slope and platform element for ramps, bridges, and rolling tracks. |
| | 🧱 **Heavy Brick** | Solid ceramic brick (`density: 0.012`, mass ~31.1) for counterweights, seesaws, and pulley systems. |
| | 🀄 **Dominoes** | Golden-ratio dominoes (11×54px) designed for smooth, reliable chain-reaction cascades. |
| **Impulse & Motion** | 🌀 **Spring Bouncer** | High-restitution launcher pad (`restitution: 1.65`) with dynamic spring compression animation and boing SFX. |
| | ⚖️ **Seesaw** | Revolute-joint balance beam with ±23° travel limiters, static fulcrum friction, and resting stabilization. |
| | 🥄 **Catapult** | Lever spoon mechanism that launches marbles into high parabolic arcs when struck by falling weights. |
| | ➰ **Rubber Band** | Elastic trampoline-style band that repels and bounces objects with high velocity. |
| **Containers & Tubes**| 🥤 **Paper Cup** | Ultra-lightweight container (`density: 0.0008`) that catches water and marbles, tilts, and floats on water. |
| | 🧻 **Paper Tube** | Hollow tunnel with ultra-low internal friction and curved entrance/exit guide ramps. |
| | 🌀 **Funnel / Swirl Bowl** | Centrifugal deceleration bowl where balls spiral gracefully before dropping through the central hole. |
| | 🏗️ **Pulley Buckets** | Counterweighted dual-bucket elevator suspended on string; carries bricks, catches marbles, and holds/spills water. |
| **Forces & Acoustics**| 🌪️ **Electric Fan** | Aerodynamic wind stream with cone dispersion and exponential falloff; blows lightweight objects and spins wheels. |
| | 🧲 **Magnet** | Clamped inverse-square magnetic field (attract or repel) acting on metal marbles and dominoes. |
| | 🔔 **Tuned Bell** | Desk bell / xylophone plate that rings with pristine tuned bell pitches (8 selectable notes: C to High C). |
| | ⚙️ **Paddle Wheel** | Rotary waterwheel spun by marble collisions, fan airflows, or running water streams. |
| **Fluids & Water** | 🚰 **Water Faucet** | Retro brass-and-chrome faucet continuously pouring physics water droplets (`water_drop`). |
| | 🌊 **Floor Water & Pool** | Natural fluid accumulation on the floor; features rising water level, surface waves, Archimedean buoyancy, and viscous drag. |

---

### 2. 🌊 Realistic Fluid Mechanics & Floor Water Accumulation
- **Dynamic Water Absorption**: Droplets pouring from faucets or overflowing from cups/buckets accumulate on the floor, raising the room's water level steadily.
- **Ripples & Wave Dynamics**: Expanding concentric impact ripples upon drop arrival, accompanied by organic dual-sine wave surface undulation and capillary wall meniscus.
- **Archimedean Buoyancy & Viscous Drag**: Submerged objects experience depth-proportional buoyancy and fluid damping—paper cups bob and float, while marbles and bricks sink smoothly.
- **Engraved Wall Depth Gauge**: A laboratory-style millimeter ruler etched on the left wall with real-time water depth markers (`mm`).
- **One-Click Drainage**: A dedicated **"💧 Drain"** button in the toolbar allows instant drying of floor water without resetting gadget layouts.

---

### 3. 🎵 Procedural Web Audio Sound Engine
Zero external audio files required—every sound effect is synthesized dynamically in real time using the **Web Audio API**:
- **Rolling Marbles**: Real-time velocity-modulated pitch and friction resonance.
- **Collisions**: Distinct physical sound profiles for wood, metal, brick, dominoes, springs, and water splashes.
- **Acoustic Instruments**: High-purity resonant chimes across 8 diatonic notes (C4 through C5).
- **Ambient & Mechanical**: Wind turbine hum, mechanical faucet snaps, and soothing water drip rhythms.

---

### 4. 📱 Touch-First & Tablet Multi-Touch Support
Fully responsive across desktop mice, trackpads, and multi-touch tablets (e.g., iPad):
- **Pinch-to-Zoom**: Smooth midpoint-centered zooming (0.35x – 3.0x).
- **Two-Finger Panning**: Intuitive two-finger canvas navigation.
- **Extended Touch Targets**: Enlarged rotation rings and control handles with explicit angular feedback badges.
- **Quick Action Bar**: Contextual floating action bar positioned directly above selected gadgets for single-tap **Duplicate**, **Rotate ±15°**, **Flip Horizontal**, and **Delete**.
- **Smart Docking Property Inspector**: Automatically docks to the opposite side of the screen (left or right) based on object position, ensuring objects are never obstructed.
- **Snapping & Continuous Placement**:
  - 🧲 **15° Rotation & 20px Grid Snapping** for effortless alignment.
  - 📌 **Continuous Placement Mode** for stamping multiple dominoes, planks, or bells with single clicks.

---

### 5. 💾 Preset Stages & JSON Import/Export
- **4 Built-in Demonstration Courses**:
  1. **Basic Ramps & Domino Cascade**: Slopes, dominoes, seesaw, bell, and goal.
  2. **Springs & Tubes Aerial Jumps**: High-speed bounce pads, tunnel transit, catapult launch.
  3. **Wind, Water & Magnet Contraption**: Dynamic aerodynamic wind, magnetic attraction, and faucet-powered seesaws.
  4. **The Ultimate Machine**: Rotary paddle wheels, musical bells, spiral funnel, lever catapult, and counterweighted pulley elevator.
- **Course Save / Load**: Export custom courses to `.json` files and import them anytime. Camera viewport bounds are automatically saved and restored.

---

## 🕹️ Controls & Shortcuts

### Mouse & Touch
- **Left Click / Tap**: Select gadget, place new tool, or drag objects.
- **Right Click Drag / Space + Drag / Two-Finger Drag**: Pan camera viewport.
- **Mouse Wheel / Pinch**: Zoom in and out.
- **Rotation Ring**: Drag the outer circular handle to rotate gadgets smoothly (snaps to 15° when Snap is enabled).

### Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` | Start / Pause simulation (or Switch to Play Mode) |
| `R` | Reset course to initial state |
| `Backspace` / `Delete` | Delete selected gadget |
| `G` | Toggle grid lines |
| `S` | Toggle 15° rotation & 20px grid snapping |
| `C` | Toggle continuous placement mode |
| `F` | Toggle camera ball-tracking mode |
| `+` / `-` | Zoom in / Zoom out |
| `0` | Reset zoom and pan to 100% |

---

## 🏗️ Architecture & Tech Stack

```
chain-reaction/
├── src/
│   ├── audio/
│   │   └── SoundEngine.ts          # Procedural Web Audio synthesizer (rolling, impacts, bells, water)
│   ├── components/
│   │   ├── Header.tsx              # Top navigation bar (courses, save/load, volume, help)
│   │   ├── Toolbar.tsx             # Simulation playback, speed, snapping, zoom, drain controls
│   │   ├── GadgetPalette.tsx       # Sidebar tool palette categorized by function
│   │   ├── PhysicsCanvas.tsx       # Interactive Canvas, gesture handlers, and event binding
│   │   ├── QuickActionBar.tsx      # Contextual on-canvas floating action bar
│   │   ├── PropertyInspector.tsx   # Smart-docking parameter editor (mass, angles, sounds, water)
│   │   ├── GoalModal.tsx           # Celebratory goal clearance dialog
│   │   └── HelpModal.tsx           # Quick reference & shortcut guide
│   ├── physics/
│   │   ├── PhysicsEngine.ts        # Matter.js simulation loop, fluid buoyancy, drag, wind, magnets
│   │   └── GadgetFactory.ts        # Factory for 19+ physical composite bundles
│   ├── rendering/
│   │   └── CanvasRenderer.ts       # 60 FPS Canvas2D renderer (wood grain, water caustics, depth gauge)
│   ├── presets/
│   │   └── defaultCourses.ts       # 4 Preconfigured demonstration courses
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces and gadget data models
│   ├── utils/
│   │   └── viewport.ts             # Camera transforms, zoom mathematics, bounding box calculations
│   ├── App.tsx                     # Top-level application state & layout orchestrator
│   └── main.tsx                    # Application entry point
├── dist/                           # Production build output
├── public/                         # Static assets
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- npm or pnpm or yarn

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/chain-reaction.git
cd chain-reaction

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Production Build
```bash
# Type check and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to build your own custom contraptions and share your courses!
