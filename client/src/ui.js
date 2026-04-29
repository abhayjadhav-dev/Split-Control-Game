const DETAILS_STORAGE_KEY = "splitControlObby.detailsOpen";

function formatTimeMs(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  const totalMs = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(
    milliseconds
  ).padStart(3, "0")}`;
}

function roleDescription(role) {
  if (role === "driver") {
    return "Driver controls speed: W/Up = throttle, S/Down/Space = brake/reverse.";
  }

  if (role === "steerer") {
    return "Steerer controls direction: A/Left and D/Right.";
  }

  if (role === "solo") {
    return "Solo Mode: You control both speed and direction.";
  }

  return "Spectator mode. Join from another device to take an open role.";
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON"
  );
}

const ROLE_ACTIONS = {
  driver: new Set(["throttle", "brake"]),
  steerer: new Set(["left", "right"]),
  solo: new Set(["throttle", "brake", "left", "right"]),
  spectator: new Set(),
};

export function createHud() {
  const statusText = document.querySelector("#status-text");
  const connectionChip = document.querySelector("#connection-chip");
  const roleBadge = document.querySelector("#role-badge");
  const timerValue = document.querySelector("#timer-value");
  const bestValue = document.querySelector("#best-value");
  const coinsValue = document.querySelector("#coins-value");
  const scoreValue = document.querySelector("#score-value");
  const driverSlot = document.querySelector("#driver-slot");
  const steererSlot = document.querySelector("#steerer-slot");
  const controlHelp = document.querySelector("#control-help");
  const restartButton = document.querySelector("#restart-button");
  const soloButton = document.querySelector("#solo-button");
  const detailsPanel = document.querySelector("#details-panel");
  const detailsToggle = document.querySelector("#details-toggle");
  const detailsClose = document.querySelector("#details-close");
  const eventBanner = document.querySelector("#event-banner");
  const mobileButtons = Array.from(document.querySelectorAll("#mobile-controls button"));
  const qrCanvas = document.querySelector("#qr-code");
  const playerListContainer = document.querySelector("#player-list");

  if (window.QRCode && qrCanvas) {
    window.QRCode.toCanvas(qrCanvas, window.location.href, {
      width: 140,
      margin: 1,
      color: {
        dark: "#09111a",
        light: "#ffffff"
      }
    }).catch(console.error);
  }

  let currentRole = "spectator";
  let isConnected = false;
  let hasConnectedOnce = false;
  let detailsOpen = false;
  let mobileControlHandler = null;
  let bannerTimeout = null;
  let kickHandler = null;
  let mySocketId = null;

  const activeMobileActions = new Set();

  function readStoredDetailsState() {
    try {
      const raw = window.localStorage.getItem(DETAILS_STORAGE_KEY);
      if (raw === "true") {
        return true;
      }
      if (raw === "false") {
        return false;
      }
    } catch {
      // Ignore storage access issues.
    }

    return false;
  }

  function persistDetailsState() {
    try {
      window.localStorage.setItem(DETAILS_STORAGE_KEY, String(detailsOpen));
    } catch {
      // Ignore storage access issues.
    }
  }

  function applyDetailsState() {
    detailsPanel.classList.toggle("is-open", detailsOpen);
    detailsPanel.dataset.open = String(detailsOpen);
    detailsToggle.setAttribute("aria-expanded", String(detailsOpen));
  }

  function setDetailsOpen(nextOpen) {
    detailsOpen = Boolean(nextOpen);
    applyDetailsState();
    persistDetailsState();
  }

  function toggleDetails() {
    setDetailsOpen(!detailsOpen);
  }

  function releaseAllMobileActions() {
    if (typeof mobileControlHandler !== "function") {
      activeMobileActions.clear();
      for (const button of mobileButtons) {
        button.classList.remove("pressed");
      }
      return;
    }

    for (const action of activeMobileActions) {
      mobileControlHandler(action, false);
    }

    activeMobileActions.clear();
    for (const button of mobileButtons) {
      button.classList.remove("pressed");
    }
  }

  function refreshRolePresentation() {
    roleBadge.textContent = currentRole;
    roleBadge.dataset.role = currentRole;
    controlHelp.textContent = roleDescription(currentRole);

    const allowedActions = ROLE_ACTIONS[currentRole] || ROLE_ACTIONS.spectator;
    for (const button of mobileButtons) {
      const canUse = isConnected && allowedActions.has(button.dataset.action);
      button.disabled = !canUse;
      button.classList.toggle("inactive", !canUse);
    }

    const canRestart = isConnected && currentRole !== "spectator";
    restartButton.disabled = !canRestart;
    restartButton.classList.toggle("inactive", !canRestart);

    soloButton.disabled = !isConnected;
    soloButton.classList.toggle("inactive", !isConnected);
  }

  function setStatusText(message) {
    statusText.textContent = message;
  }

  function showEventBanner(message, durationMs = 2200) {
    if (!message) {
      return;
    }

    eventBanner.textContent = message;
    eventBanner.classList.add("is-visible");

    if (bannerTimeout) {
      window.clearTimeout(bannerTimeout);
    }

    bannerTimeout = window.setTimeout(() => {
      bannerTimeout = null;
      eventBanner.classList.remove("is-visible");
    }, durationMs);
  }

  function setRole(role) {
    currentRole = role || "spectator";

    if (window.matchMedia("(max-width: 860px)").matches && currentRole !== "spectator") {
      setDetailsOpen(false);
    }

    refreshRolePresentation();
  }

  function setRound(round) {
    timerValue.textContent = formatTimeMs(round?.currentTimeMs ?? 0);
    bestValue.textContent = formatTimeMs(round?.bestTimeMs);

    const collected = Number(round?.coinsCollected ?? 0);
    const total = Number(round?.coinsTotal ?? 0);
    const score = Number(round?.coinScore ?? 0);

    coinsValue.textContent = `${collected}/${total}`;
    scoreValue.textContent = String(score);
  }

  function setRoles(roles) {
    if (!roles) {
      return;
    }

    driverSlot.textContent = roles.driver || "waiting";
    steererSlot.textContent = roles.steerer || "waiting";
  }

  function bindRestart(handler) {
    restartButton.addEventListener("click", () => {
      if (restartButton.disabled) {
        return;
      }
      handler();
    });
  }

  function bindSolo(handler) {
    soloButton.addEventListener("click", () => {
      if (soloButton.disabled) return;
      handler();
    });
  }

  function bindKick(handler) {
    kickHandler = handler;
  }

  function setMySocketId(id) {
    mySocketId = id;
  }

  function setPlayers(players) {
    if (!playerListContainer) return;
    playerListContainer.innerHTML = "";

    if (!players || players.length === 0) {
      playerListContainer.innerHTML = '<p style="color: var(--text-soft); font-size: 0.82rem;">No players connected.</p>';
      return;
    }

    for (const player of players) {
      const row = document.createElement("div");
      row.className = "team-row";
      row.style.marginBottom = "4px";

      const isMe = player.socketId === mySocketId;
      const roleColors = {
        driver: "var(--accent-cyan)",
        steerer: "var(--accent-gold)",
        solo: "var(--accent-purple)",
        spectator: "var(--text-soft)",
      };

      const label = document.createElement("span");
      label.style.color = roleColors[player.role] || "var(--text-soft)";
      label.textContent = `${player.shortId} ${isMe ? "(you)" : ""}`;

      const roleSpan = document.createElement("strong");
      roleSpan.textContent = player.role;
      roleSpan.style.color = roleColors[player.role] || "#e8edff";

      row.appendChild(label);
      row.appendChild(roleSpan);

      if (!isMe && currentRole !== "spectator" && kickHandler) {
        const kickBtn = document.createElement("button");
        kickBtn.textContent = "✕";
        kickBtn.title = "Kick player";
        kickBtn.style.cssText = "padding: 3px 8px; font-size: 0.7rem; min-width: 0; margin-left: 6px; border-radius: 6px; background: rgba(255,80,80,0.6); border: 1px solid rgba(255,80,80,0.8); color: #fff;";
        kickBtn.addEventListener("click", () => {
          kickHandler(player.socketId);
        });
        row.appendChild(kickBtn);
      }

      playerListContainer.appendChild(row);
    }
  }

  function bindMobileControls(handler) {
    mobileControlHandler = handler;

    function setPressed(button, action, isPressed) {
      if (isPressed) {
        if (button.disabled || activeMobileActions.has(action)) {
          return;
        }

        activeMobileActions.add(action);
        button.classList.add("pressed");
        mobileControlHandler?.(action, true);
        return;
      }

      if (!activeMobileActions.has(action)) {
        return;
      }

      activeMobileActions.delete(action);
      button.classList.remove("pressed");
      mobileControlHandler?.(action, false);
    }

    for (const button of mobileButtons) {
      const action = button.dataset.action;

      // Prevent ALL default touch behaviors (copy, select, magnifier)
      button.addEventListener("touchstart", (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
      button.addEventListener("touchmove", (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
      button.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
      button.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); });
      button.addEventListener("selectstart", (e) => { e.preventDefault(); });

      const press = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (typeof button.setPointerCapture === "function" && event.pointerId != null) {
          try {
            button.setPointerCapture(event.pointerId);
          } catch {
            // Ignore pointer capture failures on older browsers.
          }
        }

        setPressed(button, action, true);
      };

      const release = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setPressed(button, action, false);
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    }
  }

  function setConnectionState(connected) {
    isConnected = connected === true;
    if (isConnected) {
      hasConnectedOnce = true;
    }

    connectionChip.textContent = isConnected
      ? "connected"
      : hasConnectedOnce
        ? "reconnecting"
        : "connecting";
    connectionChip.classList.toggle("is-online", isConnected);
    connectionChip.classList.toggle("is-offline", !isConnected);
    refreshRolePresentation();

    if (!isConnected) {
      releaseAllMobileActions();
    }
  }

  function onWindowBlur() {
    releaseAllMobileActions();
  }

  function onWindowKeydown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.code === "KeyM") {
      event.preventDefault();
      toggleDetails();
      return;
    }

    if (event.code === "KeyT" && !soloButton.disabled) {
      event.preventDefault();
      soloButton.click();
      return;
    }

    if (event.code === "Escape" && detailsOpen) {
      event.preventDefault();
      setDetailsOpen(false);
    }
  }

  detailsToggle.addEventListener("click", () => toggleDetails());
  detailsClose.addEventListener("click", () => setDetailsOpen(false));
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("keydown", onWindowKeydown);

  detailsOpen = readStoredDetailsState();
  applyDetailsState();
  setConnectionState(false);

  function destroy() {
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("keydown", onWindowKeydown);

    if (bannerTimeout) {
      window.clearTimeout(bannerTimeout);
      bannerTimeout = null;
    }
  }

  return {
    setStatusText,
    showEventBanner,
    setRole,
    setRound,
    setRoles,
    bindRestart,
    bindSolo,
    bindKick,
    bindMobileControls,
    setConnectionState,
    setMySocketId,
    setPlayers,
    formatTimeMs,
    destroy,
  };
}
