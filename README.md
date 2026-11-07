# Kinetic Portfolio & 3D Desktop Experience

A high-performance, cybernetic personal portfolio built for **Jeet Patel** (`MScIT Student`, `Engineer`, `Researcher`, `Architect`). Features an interactive 3D WebGL desktop stage, a silky-smooth scroll-driven zoom transition, floating non-occluding HUD controls, and a kinetic horizontal architecture rail.

---

## 🌟 Key Features

1. **3D Kinetic Desktop Stage**
   - Built with Three.js WebGL: includes a stylized anime figure typing at a triple-monitor workstation, ahoge hair sway animation, autonomous blinking, companion orb drone, and procedural code screens.
   - Zero intrusive header bar: sleek floating logo and navigation pills leave the 3D scene completely open.

2. **Cinematic Scroll-to-Screen Dive**
   - Natural scroll down triggers a cinematic camera dive directly into the central monitor.
   - Enforced by a speed-limited cubic damping algorithm (`smoothDampWithSpeedLimit`) that guarantees the full zoom animation is visible even on rapid wheel flicks.
   - Zero dead zone: once zoomed in, the monitor expands to become the user's screen, and further scrolling immediately flows into the portfolio sections.
   - Seamless reverse return: clicking `⤺ Return to 3D Desktop` or scrolling up at the top smoothly pulls the camera back out to the wide 3D desk view.

3. **Horizontal Architecture Rail (`Selected Architecture`)**
   - Fast, snap-scroll horizontal carousel featuring system metrics (Throughput, Latency, Uptime), category filters (`Fullstack`, `Systems`, `Infrastructure`, `AI / ML`), and directional chevron navigation.
   - Full architectural specification modal for deep inspections of system primitives.

4. **Applied Artificial Intelligence Core**
   - Real-time neural simulation sandbox visualizing tensor epoch training, loss convergence, and inference telemetry.

5. **Navigation Matrix Overlay**
   - Floating `MENU` trigger opens a dedicated typographic navigation overlay (`[ NAVIGATION_MATRIX // SYSTEM_ROOT ]`) with quick jump anchors and keyboard `ESC` dismissal.

---

## 🏗️ Architecture & Tech Stack

- **Framework**: React 19 (SPA on Vite 8)
- **Language**: TypeScript 5.8+ (Strict type safety)
- **3D Graphics**: Three.js (Physically Based Rendering, Procedural Canvas Textures, Orbit Controls)
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";`)
- **Icons**: Lucide React
- **Testing**: Node.js Native Test Runner (`node:test` via `tsx`)

---

## 📁 Project Structure

```
├── /
│   ├── index.html                 # HTML Entry Point & Meta Tags
│   ├── package.json               # Dependencies & scripts
│   ├── vite.config.ts             # Vite configuration with Tailwind CSS plugin
│   ├── tsconfig.json              # TypeScript compilation configuration
│   ├── README.md                  # System & architecture documentation
│   └── src/
│       ├── main.tsx               # React DOM root entry
│       ├── App.tsx                # Master portfolio application container
│       ├── index.css              # Global styles & Tailwind CSS imports
│       ├── components/
│       │   ├── Navbar.tsx         # Floating logo pill, contact, & navigation matrix
│       │   ├── KineticScrollHero.tsx # Scroll controller & 3D camera zoom transition
│       │   ├── KineticDesktop3D.tsx  # Three.js 3D stage, anime figure, & monitors
│       │   ├── TickerBar.tsx      # Real-time telemetric marquee strip
│       │   ├── ProjectsSection.tsx # Horizontal architecture scroll rail
│       │   ├── AppliedAiSection.tsx # Applied AI research & live neural simulation
│       │   ├── NewsletterSection.tsx # Kinetic Dispatch subscriber stream
│       │   ├── Footer.tsx         # Protocol specifications & network links
│       │   ├── ProjectModal.tsx   # Detailed project architecture modal
│       │   ├── ContactModal.tsx   # Direct telemetric transmission modal
│       │   └── TelemetryModal.tsx # System diagnostics & health telemetry
│       ├── data/
│       │   ├── store.tsx          # Lightweight React context state store
│       │   └── seedData.ts        # Initial systems data & operator profile
│       ├── types/
│       │   └── index.ts           # System interfaces & type definitions
│       └── utils/
│           ├── math.ts            # Speed-limited damping & easing formulas
│           └── math.test.ts       # Automated unit test suite
```

---

## 🚀 Running & Verification

```bash
# Start development server
npm run dev

# Run TypeScript typecheck
npm run lint

# Run unit tests
npx --yes tsx --test src/utils/math.test.ts

# Production build
npm run build
```
