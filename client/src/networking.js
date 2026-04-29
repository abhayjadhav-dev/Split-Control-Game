export function createNetworkClient(handlers = {}) {
  let socket = null;

  function connect() {
    if (socket) {
      return;
    }

    socket = window.io({
      timeout: 7000,
      reconnection: true,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2200,
    });

    socket.on("connect", () => {
      handlers.onConnectionChange?.(true);
    });

    socket.on("disconnect", () => {
      handlers.onConnectionChange?.(false);
    });

    socket.on("connect_error", (error) => {
      handlers.onConnectionError?.(error?.message || "Unable to reach server.");
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      handlers.onReconnectAttempt?.(attempt);
    });

    socket.io.on("reconnect", (attempt) => {
      handlers.onReconnected?.(attempt);
    });

    socket.on("session", (payload) => {
      handlers.onSession?.(payload);
    });

    socket.on("role:update", (payload) => {
      handlers.onRoleUpdate?.(payload);
    });

    socket.on("roles", (payload) => {
      handlers.onRoles?.(payload);
    });

    socket.on("state", (payload) => {
      handlers.onState?.(payload);
    });

    socket.on("round:event", (payload) => {
      handlers.onRoundEvent?.(payload);
    });

    socket.on("player:kicked", () => {
      handlers.onKicked?.();
    });

    socket.on("players", (payload) => {
      handlers.onPlayers?.(payload);
    });
  }

  function sendInput(role, payload) {
    if (!socket || !socket.connected || !payload) {
      return;
    }

    if (role === "driver") {
      socket.volatile.emit("input:drive", payload);
      return;
    }

    if (role === "steerer") {
      socket.volatile.emit("input:steer", payload);
      return;
    }

    if (role === "solo") {
      // Send as reliable emit (not volatile) to avoid dropped steer packets
      socket.emit("input:solo", payload);
    }
  }

  function requestRestart() {
    if (!socket || !socket.connected) {
      return;
    }

    socket.emit("request:restart");
  }

  function requestSolo() {
    if (!socket || !socket.connected) {
      return;
    }
    socket.emit("request:solo");
  }

  function requestKick(targetSocketId) {
    if (!socket || !socket.connected) {
      return;
    }
    socket.emit("request:kick", { targetSocketId });
  }

  function disconnect() {
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
  }

  function isConnected() {
    return Boolean(socket?.connected);
  }

  return {
    connect,
    sendInput,
    requestRestart,
    requestSolo,
    requestKick,
    disconnect,
    isConnected,
  };
}
