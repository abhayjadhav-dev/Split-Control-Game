import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

import express from "express";
import { Server } from "socket.io";

import { COURSE_LAYOUT } from "../scripts/courseLayout.js";
import { GameSimulation } from "./game/simulation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT || 3000);
const SHUTDOWN_GRACE_MS = 1800;
let isShuttingDown = false;

app.use("/client", express.static(path.join(rootDir, "client")));
app.use("/assets", express.static(path.join(rootDir, "assets")));
app.use("/scripts", express.static(path.join(rootDir, "scripts")));
app.use("/vendor/three", express.static(path.join(rootDir, "node_modules", "three")));

app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "client", "index.html"));
});

app.get("/favicon.ico", (req, res) => {
  res.redirect("/client/favicon.svg");
});

const simulation = new GameSimulation(io);
simulation.start();

io.on("connection", (socket) => {
  const role = simulation.assignRole(socket.id);

  socket.emit("session", {
    socketId: socket.id,
    role,
    courseLayout: COURSE_LAYOUT,
    state: simulation.createStatePayload(),
  });

  io.emit("roles", simulation.getRoleSnapshot());

  socket.on("input:drive", (payload) => {
    simulation.setDriveInput(socket.id, payload);
  });

  socket.on("input:steer", (payload) => {
    simulation.setSteerInput(socket.id, payload);
  });

  socket.on("request:restart", () => {
    const restartResult = simulation.requestManualRestart(socket.id);
    if (!restartResult.accepted) {
      io.to(socket.id).emit("round:event", {
        type: "notice",
        reason: restartResult.reason,
        message: restartResult.message,
      });
      return;
    }

    io.emit("round:event", {
      type: "reset",
      reason: "manual-restart",
      by: restartResult.role,
    });
    io.emit("state", simulation.createStatePayload());
  });

  socket.on("disconnect", () => {
    const promotions = simulation.removePlayer(socket.id);

    for (const promotion of promotions) {
      io.to(promotion.socketId).emit("role:update", {
        role: promotion.role,
      });
    }

    io.emit("roles", simulation.getRoleSnapshot());
  });
});

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const ifaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifaceName] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push({ ifaceName, address: iface.address });
      }
    }
  }

  return addresses;
}

function closeGracefully(signalName) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signalName} received. Closing server...`);
  simulation.stop();

  const forceCloseTimer = setTimeout(() => {
    console.warn("Forced shutdown after timeout.");
    process.exit(0);
  }, SHUTDOWN_GRACE_MS);

  io.close(() => {
    server.close(() => {
      clearTimeout(forceCloseTimer);
      process.exit(0);
    });
  });
}

function handleServerError(error) {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error("Stop the process using this port, or run with a different PORT value.");
    process.exit(1);
    return;
  }

  console.error("Server failed to start:", error);
  process.exit(1);
}

server.on("error", handleServerError);

server.listen(PORT, "0.0.0.0", () => {
  console.log("Split Control Obby server running.");
  console.log(`Local: http://localhost:${PORT}`);

  const lanAddresses = getLanAddresses();
  if (!lanAddresses.length) {
    console.log("LAN: No IPv4 interface found.");
    return;
  }

  console.log("LAN URLs:");
  for (const item of lanAddresses) {
    console.log(`- ${item.ifaceName}: http://${item.address}:${PORT}`);
  }
});

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));
