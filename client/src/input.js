import { NETWORK_CONFIG } from "/scripts/sharedConfig.js";

const KEY_TO_ACTION = {
  ArrowUp: "throttle",
  KeyW: "throttle",
  ArrowDown: "brake",
  KeyS: "brake",
  Space: "brake",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const DEFAULT_STATE = {
  throttle: false,
  brake: false,
  left: false,
  right: false,
};

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  );
}

export function createInputController({ onRestart }) {
  const keyboardState = { ...DEFAULT_STATE };
  const virtualState = { ...DEFAULT_STATE };
  const combinedState = { ...DEFAULT_STATE };
  const lastSentByRole = {
    driver: null,
    steerer: null,
    solo: null,
  };
  const lastSentAtByRole = {
    driver: 0,
    steerer: 0,
    solo: 0,
  };

  function recomputeCombinedState() {
    for (const key of Object.keys(DEFAULT_STATE)) {
      combinedState[key] = keyboardState[key] || virtualState[key];
    }
  }

  function setKeyboardAction(action, isPressed) {
    if (!action) {
      return;
    }

    keyboardState[action] = isPressed;
    recomputeCombinedState();
  }

  function onKeyDown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.code === "KeyR") {
      event.preventDefault();
      if (!event.repeat) {
        onRestart?.();
      }
      return;
    }

    const action = KEY_TO_ACTION[event.code];
    if (!action) {
      return;
    }

    event.preventDefault();
    setKeyboardAction(action, true);
  }

  function onKeyUp(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    const action = KEY_TO_ACTION[event.code];
    if (!action) {
      return;
    }

    event.preventDefault();
    setKeyboardAction(action, false);
  }

  function clearActiveControls() {
    for (const key of Object.keys(DEFAULT_STATE)) {
      keyboardState[key] = false;
      virtualState[key] = false;
      combinedState[key] = false;
    }
  }

  function onBlur() {
    clearActiveControls();
    forceResend();
  }

  function onVisibilityChange() {
    if (document.visibilityState !== "hidden") {
      return;
    }

    clearActiveControls();
    forceResend();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  function forceResend() {
    lastSentByRole.driver = null;
    lastSentByRole.steerer = null;
    lastSentByRole.solo = null;
    lastSentAtByRole.driver = 0;
    lastSentAtByRole.steerer = 0;
    lastSentAtByRole.solo = 0;
  }

  function buildPacket(role) {
    let payload = null;

    if (role === "driver") {
      payload = {
        throttle: combinedState.throttle,
        brake: combinedState.brake,
      };
    }

    if (role === "steerer") {
      payload = {
        left: combinedState.left,
        right: combinedState.right,
      };
    }

    if (role === "solo") {
      payload = {
        throttle: combinedState.throttle,
        brake: combinedState.brake,
        left: combinedState.left,
        right: combinedState.right,
      };
    }

    if (!payload) {
      return null;
    }

    const signature = JSON.stringify(payload);
    const now = performance.now();
    const roleKey = role === "solo" ? "solo" : role;
    const stale = now - (lastSentAtByRole[roleKey] || 0) >= NETWORK_CONFIG.inputKeepAliveMs;
    if (lastSentByRole[roleKey] === signature && !stale) {
      return null;
    }

    lastSentByRole[roleKey] = signature;
    lastSentAtByRole[roleKey] = now;
    return payload;
  }

  function setVirtualControl(action, isPressed) {
    if (!(action in virtualState)) {
      return;
    }

    virtualState[action] = isPressed;
    recomputeCombinedState();
  }

  function destroy() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return {
    buildPacket,
    setVirtualControl,
    clearActiveControls,
    forceResend,
    destroy,
  };
}
