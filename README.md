# Split Control Obby Car (2D LAN Multiplayer)

A web-based multiplayer **top-down 2D obby racer** where **2 players control 1 car** over LAN:
- **Player 1 (Driver):** acceleration + brake
- **Player 2 (Steerer):** left + right steering

The server is authoritative and runs the simulation. Clients only send role-specific input and render synchronized state snapshots.

## Tech Stack

- Frontend: HTML/CSS, vanilla JS, Canvas 2D renderer
- Backend: Node.js, Express.js
- Real-time: Socket.IO (WebSockets transport)
- Simulation: Deterministic custom 2D physics + obstacle collision logic

## Project Structure

```text
DS-MINI-PROJECT/
├─ server/
│  ├─ index.js
│  └─ game/
│     ├─ coursePhysics.js
│     └─ simulation.js
├─ client/
│  ├─ index.html
│  ├─ styles.css
│  └─ src/
│     ├─ main.js
│     ├─ networking.js
│     ├─ input.js
│     ├─ scene.js
│     └─ ui.js
├─ assets/
│  ├─ README.md
│  └─ textures/
│     └─ grid.svg
├─ scripts/
│  ├─ courseLayout.js
│  ├─ sharedConfig.js
│  └─ find-lan-ip.mjs
├─ package.json
└─ README.md
```

## Gameplay Features

- Split-control teamwork (driver + steerer)
- Authoritative server simulation (anti-desync source of truth)
- Full 2D top-down camera with smooth interpolation of server snapshots
- Cinematic map rendering with parallax atmosphere, polished track lanes, and animated finish zone
- Harder polished obby map with:
   - chicane opening section
   - narrow bridge + split lanes
   - denser moving-platform gauntlet
   - multi-stage rotating beam sections
- Collectible coins with live HUD counter and score sync
- Expanded HUD with live connection state, coin score, and role-aware controls
- Instant elimination on obstacle collision
- Fall/off-track reset system and manual restart (`R` key or HUD button)
- Timer + best-time tracking
- Role-aware mobile touch control buttons
- Distraction-free HUD: compact top bar + toggleable details panel (`M`)
- Resilient reconnect handling with stale-input protection

## Architecture Overview

1. Clients connect to server via Socket.IO.
2. Server assigns roles:
   - first player: `driver`
   - second player: `steerer`
   - others: `spectator`
3. Input flow:
   - driver sends `input:drive` (`throttle`, `brake`)
   - steerer sends `input:steer` (`left`, `right`)
4. Server loop (fixed rate):
   - updates moving/rotating obstacle transforms
   - applies split inputs to one shared car (2D velocity + stable yaw model)
   - applies coin pickup detection and authoritative coin state updates
   - applies instant elimination on obstacle touch + off-track resets + finish detection
   - broadcasts authoritative state (`state` event)
5. Clients render smoothed 2D transforms for car, dynamic obstacles, and collectible coins.

## Run Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Start server

```bash
npm start
```

Or in watch mode:

```bash
npm run dev
```

### 3. Open game on LAN devices

When server starts, it prints URLs like:

```text
Local: http://localhost:3000
LAN URLs:
- en0: http://192.168.x.x:3000
```

On the same WiFi network, open the LAN URL in two different devices/browsers.

## Controls

### Driver role

- `W` / `ArrowUp`: throttle
- `S` / `ArrowDown` / `Space`: brake / reverse
- Driver cannot steer

### Steerer role

- `A` / `ArrowLeft`: steer left
- `D` / `ArrowRight`: steer right
- Steerer cannot control acceleration/brake

### Shared

- `R`: restart round
- `M`: toggle details panel
- HUD restart button: restart round (active driver/steerer only)
- Drive through coin orbs to collect them

On mobile, touch buttons are available in the HUD.

## Multi-Device Testing Guide

1. Start server on host machine.
2. Device A opens LAN URL and becomes **driver**.
3. Device B opens same URL and becomes **steerer**.
4. Verify split behavior:
   - only Device A changes speed
   - only Device B changes steering
5. Add Device C to confirm spectator mode.
6. Disconnect Device A or B and verify spectator promotion to open role.
7. Trigger fall/reset and manual restart to verify timer reset and control resync.

## Scripts

- `npm start`: run production server
- `npm run dev`: run server with Node watch mode
- `npm run check`: syntax-check all main JS modules
- `npm run find-lan-ip`: print LAN addresses helper

## Improvement Ideas

1. Add minimap and ghost trail for time-trial practice.
2. Add team race mode (multiple shared-control cars).
3. Add named rooms so multiple LAN teams can play simultaneously.
4. Add replay export/import for competitive runs.
5. Add adaptive obstacle difficulty based on team finish times.
