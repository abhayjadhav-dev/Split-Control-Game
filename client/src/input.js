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
    tag === "SELECT" ||
    tag === "BUTTON"
  );
}

export function createInputController({ onRestart }) {
  const keyboardState = { ...DEFAULT_STATE };
  const virtualState = { ...DEFAULT_STATE };
  const combinedState = { ...DEFAULT_STATE };
  const lastSentByRole = {
    driver: null,
    steerer: null,
  };
  const lastSentAtByRole = {
    driver: 0,
    steerer: 0,
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
    lastSentAtByRole.driver = 0;
    lastSentAtByRole.steerer = 0;
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

    if (!payload) {
      return null;
    }

    const signature = JSON.stringify(payload);
    const now = performance.now();
    const stale = now - lastSentAtByRole[role] >= NETWORK_CONFIG.inputKeepAliveMs;
    if (lastSentByRole[role] === signature && !stale) {
      return null;
    }

    lastSentByRole[role] = signature;
    lastSentAtByRole[role] = now;
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
