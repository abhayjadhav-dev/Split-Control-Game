import { COURSE_LAYOUT } from "/scripts/courseLayout.js";

import { createGameScene } from "./scene.js";
import { createHud } from "./ui.js";
import { createInputController } from "./input.js";
import { createNetworkClient } from "./networking.js";

function roleStatus(role) {
  if (role === "driver") {
    return "Role locked: Driver. Control acceleration and braking (W/S, Up/Down, Space).";
  }

  if (role === "steerer") {
    return "Role locked: Steerer. Control left and right steering.";
  }

  if (role === "solo") {
    return "Solo Mode: You control both speed (W/S) and steering (A/D).";
  }

  return "Spectating. Join from another device to get control when a slot frees up.";
}

function eventStatus(event, formatTime) {
  if (!event) {
    return null;
  }

  if (event.type === "finish") {
    const coinsText =
      typeof event.coinsCollected === "number" && typeof event.coinsTotal === "number"
        ? ` | Coins ${event.coinsCollected}/${event.coinsTotal}`
        : "";
    return `Finish! Time ${formatTime(event.finishTimeMs)} | Best ${formatTime(event.bestTimeMs)}${coinsText}`;
  }

  if (event.type === "coin") {
    const total = `${event.coinsCollected ?? 0}/${event.coinsTotal ?? 0}`;
    return `Coin collected (+${event.value ?? 1}) | ${total}`;
  }

  if (event.type === "reset") {
    if (event.reason === "obstacle-hit") {
      return "Eliminated! Obstacle contact detected. Round restarted.";
    }

    if (event.reason === "fall-reset") {
      return "Eliminated! You left the track bounds. Round restarted.";
    }

    if (event.reason === "manual-restart" && event.by) {
      const by = event.by === "driver" ? "Driver" : event.by === "solo" ? "Solo" : "Steerer";
      return `${by} restarted the round.`;
    }

    return "Round restarted. Coordinate your split controls and push again.";
  }

  if (event.type === "notice" && event.message) {
    return event.message;
  }

  return null;
}

const canvas = document.querySelector("#game-canvas");
const scene = createGameScene({ canvas, courseLayout: COURSE_LAYOUT });
const hud = createHud();

let networkClient = null;
let latestState = null;
let role = "spectator";
let isConnected = false;
let baseStatus = "Connecting to server...";

function setBaseStatus(message) {
  baseStatus = message;
  hud.setStatusText(baseStatus);
}

function refreshBaseStatus() {
  if (!isConnected) {
    setBaseStatus("Connection lost. Reconnecting to host...");
    return;
  }

  setBaseStatus(roleStatus(role));
}

const input = createInputController({
  onRestart: () => {
    networkClient?.requestRestart();
  },
});

hud.bindRestart(() => {
  networkClient?.requestRestart();
});

hud.bindSolo(() => {
  networkClient?.requestSolo();
});

hud.bindKick((targetSocketId) => {
  networkClient?.requestKick(targetSocketId);
});

hud.bindMobileControls((action, isPressed) => {
  input.setVirtualControl(action, isPressed);
});

networkClient = createNetworkClient({
  onConnectionChange: (connected) => {
    if (connected === true) {
      isConnected = true;
      hud.setConnectionState(true);
      refreshBaseStatus();
      return;
    }

    isConnected = false;
    input.clearActiveControls();
    input.forceResend();
    hud.setConnectionState(false);
    refreshBaseStatus();
  },

  onSession: (payload) => {
    role = payload.role || "spectator";
    latestState = payload.state || latestState;
    input.forceResend();

    hud.setMySocketId(payload.socketId);
    hud.setRole(role);
    refreshBaseStatus();

    if (latestState?.roles) {
      hud.setRoles(latestState.roles);
    }

    if (latestState?.round) {
      hud.setRound(latestState.round);
    }
  },

  onRoleUpdate: (payload) => {
    role = payload?.role || role;
    input.forceResend();
    hud.setRole(role);
    refreshBaseStatus();
  },

  onRoles: (roles) => {
    hud.setRoles(roles);
    refreshBaseStatus();
  },

  onState: (state) => {
    latestState = state;

    if (state.round) {
      hud.setRound(state.round);
    }

    if (state.roles) {
      hud.setRoles(state.roles);
    }
  },

  onRoundEvent: (event) => {
    if (event?.type === "reset") {
      input.clearActiveControls();
      input.forceResend();
    }

    const status = eventStatus(event, hud.formatTimeMs);
    if (status) {
      hud.showEventBanner(status);
    }
  },

  onConnectionError: (message) => {
    hud.showEventBanner(message, 1800);
  },

  onReconnectAttempt: (attempt) => {
    if (!isConnected) {
      setBaseStatus(`Reconnecting... attempt ${attempt}`);
    }
  },

  onReconnected: () => {
    hud.showEventBanner("Reconnected. Syncing session...", 1600);
  },

  onKicked: () => {
    hud.showEventBanner("You have been removed from the session.", 4000);
    role = "spectator";
    hud.setRole(role);
    input.clearActiveControls();
  },

  onPlayers: (players) => {
    hud.setPlayers(players);
  },
});

networkClient.connect();

let lastFrameTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  const inputPacket = input.buildPacket(role);
  if (inputPacket) {
    networkClient.sendInput(role, inputPacket);
  }

  scene.render(latestState, dt);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener("beforeunload", () => {
  input.destroy();
  hud.destroy?.();
  scene.destroy?.();
  networkClient.disconnect();
});
