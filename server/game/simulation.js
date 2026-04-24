import { COURSE_LAYOUT } from "../../scripts/courseLayout.js";
import { CAR_CONFIG, NETWORK_CONFIG, ROUND_CONFIG } from "../../scripts/sharedConfig.js";
import {
  buildCourseBodies,
  serializeDynamicObstacles,
  updateDynamicObstacles,
} from "./coursePhysics.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toShortId(socketId) {
  if (!socketId) {
    return "waiting";
  }

  return socketId.slice(0, 6);
}

function yawToQuaternion(angle) {
  const half = angle * 0.5;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function descriptorToRect(descriptor) {
  const position = descriptor.position || descriptor.basePosition || descriptor.center;
  const size = descriptor.size;

  return {
    minX: position[0] - size[0] * 0.5,
    maxX: position[0] + size[0] * 0.5,
    minZ: position[2] - size[2] * 0.5,
    maxZ: position[2] + size[2] * 0.5,
  };
}

function isPointInsideRect(x, z, rect, padding = 0) {
  return (
    x >= rect.minX - padding &&
    x <= rect.maxX + padding &&
    z >= rect.minZ - padding &&
    z <= rect.maxZ + padding
  );
}

function circleIntersectsAabb(cx, cz, radius, rect) {
  const closestX = clamp(cx, rect.minX, rect.maxX);
  const closestZ = clamp(cz, rect.minZ, rect.maxZ);
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return dx * dx + dz * dz <= radius * radius;
}

function circleIntersectsOrientedRect(cx, cz, radius, centerX, centerZ, halfX, halfZ, angle) {
  const dx = cx - centerX;
  const dz = cz - centerZ;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Transform the point into local obstacle space (rotation by -angle).
  const localX = dx * cosA + dz * sinA;
  const localZ = -dx * sinA + dz * cosA;

  const closestX = clamp(localX, -halfX, halfX);
  const closestZ = clamp(localZ, -halfZ, halfZ);
  const diffX = localX - closestX;
  const diffZ = localZ - closestZ;

  return diffX * diffX + diffZ * diffZ <= radius * radius;
}

export class GameSimulation {
  constructor(io) {
    this.io = io;
    this.players = new Map();
    this.roleSlots = {
      driver: null,
      steerer: null,
    };

    this.inputs = {
      driver: {
        throttle: false,
        brake: false,
      },
      steerer: {
        left: false,
        right: false,
      },
    };

    this.lastInputAtMs = {
      driver: Date.now(),
      steerer: Date.now(),
    };

    this.dynamicObstacles = buildCourseBodies();
    this.trackSurfaces = [...COURSE_LAYOUT.staticPlatforms, ...COURSE_LAYOUT.ramps].map(
      descriptorToRect
    );
    this.floorRect = descriptorToRect(COURSE_LAYOUT.floor);
    this.coins = (COURSE_LAYOUT.coins || []).map((coin) => ({
      id: coin.id,
      position: [coin.position[0], coin.position[1] ?? 1.2, coin.position[2]],
      value: Math.max(1, Number(coin.value || 1)),
      collected: false,
    }));
    this.coinPickupRadius = ROUND_CONFIG.coinPickupRadius || 0.95;

    this.carRadius = CAR_CONFIG.size[0] * 0.44;
    this.car = {
      x: 0,
      y: COURSE_LAYOUT.startTransform.position[1],
      z: 0,
      angle: 0,
      velocityX: 0,
      velocityZ: 0,
      yawRate: 0,
    };

    this.elapsedSeconds = 0;
    this.stuckTimerSeconds = 0;
    this.offTrackTimerSeconds = 0;
    this.lastHazardHitAtMs = 0;
    this.hazardHitsTotal = 0;
    this.lastTickMs = Date.now();
    this.lastBroadcastMs = 0;
    this.lastManualRestartAtMs = 0;
    this.tickHandle = null;

    this.round = {
      startedAtMs: Date.now(),
      finished: false,
      finishTimeMs: null,
      bestTimeMs: null,
      coinScore: 0,
      coinsCollected: 0,
      coinsTotal: this.coins.length,
      lastFinishAtMs: 0,
      reason: "initial",
    };

    this.resetRound("initial");
  }

  start() {
    if (this.tickHandle) {
      return;
    }

    const tickDurationMs = 1000 / NETWORK_CONFIG.tickRate;
    this.tickHandle = setInterval(() => this.tick(), tickDurationMs);
  }

  stop() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  assignRole(socketId) {
    let role = "spectator";

    if (!this.roleSlots.driver) {
      this.roleSlots.driver = socketId;
      role = "driver";
      this.inputs.driver.throttle = false;
      this.inputs.driver.brake = false;
      this.lastInputAtMs.driver = Date.now();
    } else if (!this.roleSlots.steerer) {
      this.roleSlots.steerer = socketId;
      role = "steerer";
      this.inputs.steerer.left = false;
      this.inputs.steerer.right = false;
      this.lastInputAtMs.steerer = Date.now();
    }

    this.players.set(socketId, { role });
    return role;
  }

  rebalanceRoles() {
    const promotions = [];

    for (const targetRole of ["driver", "steerer"]) {
      if (this.roleSlots[targetRole]) {
        continue;
      }

      const spectatorEntry = [...this.players.entries()].find(
        (entry) => entry[1].role === "spectator"
      );

      if (!spectatorEntry) {
        continue;
      }

      const [spectatorId, spectator] = spectatorEntry;
      spectator.role = targetRole;
      this.roleSlots[targetRole] = spectatorId;
      this.lastInputAtMs[targetRole] = Date.now();

      if (targetRole === "driver") {
        this.inputs.driver.throttle = false;
        this.inputs.driver.brake = false;
      }

      if (targetRole === "steerer") {
        this.inputs.steerer.left = false;
        this.inputs.steerer.right = false;
      }

      promotions.push({
        socketId: spectatorId,
        role: targetRole,
      });
    }

    return promotions;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) {
      return [];
    }

    if (player.role === "driver") {
      this.roleSlots.driver = null;
      this.inputs.driver.throttle = false;
      this.inputs.driver.brake = false;
      this.lastInputAtMs.driver = 0;
    }

    if (player.role === "steerer") {
      this.roleSlots.steerer = null;
      this.inputs.steerer.left = false;
      this.inputs.steerer.right = false;
      this.lastInputAtMs.steerer = 0;
    }

    this.players.delete(socketId);
    return this.rebalanceRoles();
  }

  getPlayerRole(socketId) {
    return this.players.get(socketId)?.role || "spectator";
  }

  requestManualRestart(socketId, nowMs = Date.now()) {
    const role = this.getPlayerRole(socketId);
    if (role !== "driver" && role !== "steerer") {
      return {
        accepted: false,
        reason: "role-required",
        message: "Only the active Driver or Steerer can restart the round.",
      };
    }

    const cooldownMs = ROUND_CONFIG.manualRestartCooldownMs || 900;
    const elapsedMs = nowMs - this.lastManualRestartAtMs;
    if (elapsedMs < cooldownMs) {
      const remainingSeconds = ((cooldownMs - elapsedMs) / 1000).toFixed(1);
      return {
        accepted: false,
        reason: "cooldown",
        message: `Restart cooldown: wait ${remainingSeconds}s.`,
      };
    }

    this.lastManualRestartAtMs = nowMs;
    this.resetRound("manual-restart");
    return {
      accepted: true,
      role,
    };
  }

  setDriveInput(socketId, payload) {
    const player = this.players.get(socketId);
    if (!player || player.role !== "driver") {
      return;
    }

    this.inputs.driver.throttle = payload?.throttle === true;
    this.inputs.driver.brake = payload?.brake === true;
    this.lastInputAtMs.driver = Date.now();
  }

  setSteerInput(socketId, payload) {
    const player = this.players.get(socketId);
    if (!player || player.role !== "steerer") {
      return;
    }

    this.inputs.steerer.left = payload?.left === true;
    this.inputs.steerer.right = payload?.right === true;
    this.lastInputAtMs.steerer = Date.now();
  }

  resetRound(reason = "manual") {
    const [px, py, pz] = COURSE_LAYOUT.startTransform.position;
    const [, ry] = COURSE_LAYOUT.startTransform.rotation;

    this.car.x = px;
    this.car.y = py;
    this.car.z = pz;
    this.car.angle = ry || 0;
    this.car.velocityX = 0;
    this.car.velocityZ = 0;
    this.car.yawRate = 0;

    this.inputs.driver.throttle = false;
    this.inputs.driver.brake = false;
    this.inputs.steerer.left = false;
    this.inputs.steerer.right = false;

    for (const coin of this.coins) {
      coin.collected = false;
    }

    this.stuckTimerSeconds = 0;
    this.offTrackTimerSeconds = 0;
    this.lastHazardHitAtMs = 0;
    this.lastInputAtMs.driver = Date.now();
    this.lastInputAtMs.steerer = Date.now();

    this.round.startedAtMs = Date.now();
    this.round.finished = false;
    this.round.finishTimeMs = null;
    this.round.coinScore = 0;
    this.round.coinsCollected = 0;
    this.round.coinsTotal = this.coins.length;
    this.round.reason = reason;
  }

  getRoleSnapshot() {
    return {
      driver: toShortId(this.roleSlots.driver),
      steerer: toShortId(this.roleSlots.steerer),
    };
  }

  createStatePayload(nowMs = Date.now()) {
    const currentTimeMs = this.round.finished
      ? this.round.finishTimeMs
      : nowMs - this.round.startedAtMs;

    return {
      serverTime: nowMs,
      car: {
        position: [this.car.x, this.car.y, this.car.z],
        quaternion: yawToQuaternion(this.car.angle),
        velocity: [this.car.velocityX, 0, this.car.velocityZ],
        angle: this.car.angle,
      },
      dynamicObstacles: serializeDynamicObstacles(this.dynamicObstacles),
      coins: {
        collected: this.round.coinsCollected,
        total: this.round.coinsTotal,
        score: this.round.coinScore,
        items: this.coins.map((coin) => ({
          id: coin.id,
          position: coin.position,
          value: coin.value,
          collected: coin.collected,
        })),
      },
      roles: this.getRoleSnapshot(),
      round: {
        startedAtMs: this.round.startedAtMs,
        currentTimeMs,
        finished: this.round.finished,
        finishTimeMs: this.round.finishTimeMs,
        bestTimeMs: this.round.bestTimeMs,
        coinScore: this.round.coinScore,
        coinsCollected: this.round.coinsCollected,
        coinsTotal: this.round.coinsTotal,
        reason: this.round.reason,
      },
    };
  }

  tick() {
    const nowMs = Date.now();
    const dt = clamp(
      (nowMs - this.lastTickMs) / 1000,
      1 / 120,
      NETWORK_CONFIG.physicsMaxDeltaSeconds
    );
    this.lastTickMs = nowMs;
    this.elapsedSeconds += dt;

    this.expireStaleInputs(nowMs);
    updateDynamicObstacles(this.dynamicObstacles, this.elapsedSeconds);
    this.applyCarControls(dt);
    this.applyTrackConstraints(dt);
    this.applyHazardPenalty(nowMs);
    this.collectCoins(nowMs);
    this.handleRoundState(nowMs);

    if (nowMs - this.lastBroadcastMs >= 1000 / NETWORK_CONFIG.stateBroadcastRate) {
      this.io.emit("state", this.createStatePayload(nowMs));
      this.lastBroadcastMs = nowMs;
    }
  }

  expireStaleInputs(nowMs) {
    if (
      this.roleSlots.driver &&
      nowMs - this.lastInputAtMs.driver > NETWORK_CONFIG.inputTimeoutMs
    ) {
      this.inputs.driver.throttle = false;
      this.inputs.driver.brake = false;
    }

    if (
      this.roleSlots.steerer &&
      nowMs - this.lastInputAtMs.steerer > NETWORK_CONFIG.inputTimeoutMs
    ) {
      this.inputs.steerer.left = false;
      this.inputs.steerer.right = false;
    }
  }

  applyCarControls(dt) {
    if (this.round.finished) {
      this.car.velocityX *= Math.exp(-6 * dt);
      this.car.velocityZ *= Math.exp(-6 * dt);
      this.car.yawRate *= Math.exp(-8 * dt);
      this.car.x += this.car.velocityX * dt;
      this.car.z += this.car.velocityZ * dt;
      return;
    }

    const throttleActive = this.inputs.driver.throttle && !this.inputs.driver.brake;
    const brakeActive = this.inputs.driver.brake && !this.inputs.driver.throttle;
    const steerInput =
      (this.inputs.steerer.right ? 1 : 0) - (this.inputs.steerer.left ? 1 : 0);

    const forwardX = Math.sin(this.car.angle);
    const forwardZ = -Math.cos(this.car.angle);
    const rightX = Math.cos(this.car.angle);
    const rightZ = Math.sin(this.car.angle);

    const speedInForward = this.car.velocityX * forwardX + this.car.velocityZ * forwardZ;
    const absForwardSpeed = Math.abs(speedInForward);
    const planarSpeed = Math.hypot(this.car.velocityX, this.car.velocityZ);

    const engineAcceleration = (CAR_CONFIG.engineForce / CAR_CONFIG.mass) * 0.22;
    const brakeAcceleration = (CAR_CONFIG.brakeForce / CAR_CONFIG.mass) * 0.2;
    const reverseAcceleration = engineAcceleration * CAR_CONFIG.reverseForceFactor * 0.75;
    const launchAssistAcceleration = (CAR_CONFIG.launchAssistForce / CAR_CONFIG.mass) * 0.38;

    if (throttleActive) {
      const speedRatio = clamp(Math.max(speedInForward, 0) / CAR_CONFIG.maxSpeed, 0, 1);
      const thrust = engineAcceleration * clamp(1 - speedRatio, 0.2, 1);
      this.car.velocityX += forwardX * thrust * dt;
      this.car.velocityZ += forwardZ * thrust * dt;

      if (planarSpeed < 1.2) {
        this.car.velocityX += forwardX * launchAssistAcceleration * dt;
        this.car.velocityZ += forwardZ * launchAssistAcceleration * dt;
      }
    }

    if (brakeActive) {
      if (speedInForward > 0.6) {
        this.car.velocityX -= forwardX * brakeAcceleration * dt;
        this.car.velocityZ -= forwardZ * brakeAcceleration * dt;
      } else {
        const reverseRatio = clamp(
          Math.abs(Math.min(speedInForward, 0)) / CAR_CONFIG.maxReverseSpeed,
          0,
          1
        );
        const reverseThrust = reverseAcceleration * clamp(1 - reverseRatio, 0.2, 1);
        this.car.velocityX -= forwardX * reverseThrust * dt;
        this.car.velocityZ -= forwardZ * reverseThrust * dt;
      }

      const brakeScale = Math.max(0, 1 - CAR_CONFIG.brakeFactorPerSecond * dt * 0.14);
      this.car.velocityX *= brakeScale;
      this.car.velocityZ *= brakeScale;
    }

    if (steerInput !== 0 && absForwardSpeed >= CAR_CONFIG.minSteerSpeed) {
      const normalizedSpeed = clamp(
        absForwardSpeed / CAR_CONFIG.steerSpeedForMaxControl,
        0,
        1
      );
      const steeringSpeedFactor = clamp(0.92 - normalizedSpeed * 0.48, 0.38, 0.92);
      const movementFactor = clamp(planarSpeed / 7.5, 0.05, 1);
      const desiredYawRate =
        steerInput * CAR_CONFIG.steerAngularVelocity * steeringSpeedFactor * movementFactor;

      const response = 1 - Math.exp(-CAR_CONFIG.steerResponse * dt);
      this.car.yawRate += (desiredYawRate - this.car.yawRate) * response;
    } else {
      this.car.yawRate *= Math.exp(-CAR_CONFIG.steerResponse * dt * 2.2);

      if (planarSpeed < CAR_CONFIG.stationaryYawCutoffSpeed) {
        this.car.yawRate = 0;
      }
    }

    this.car.yawRate = clamp(this.car.yawRate, -CAR_CONFIG.maxYawRate, CAR_CONFIG.maxYawRate);
    this.car.angle = wrapAngle(this.car.angle + this.car.yawRate * dt);

    const stabilizedRightX = Math.cos(this.car.angle);
    const stabilizedRightZ = Math.sin(this.car.angle);
    const lateralSpeed =
      this.car.velocityX * stabilizedRightX + this.car.velocityZ * stabilizedRightZ;

    const lateralGrip = CAR_CONFIG.lateralGrip * 0.16;
    this.car.velocityX -= stabilizedRightX * lateralSpeed * lateralGrip * dt;
    this.car.velocityZ -= stabilizedRightZ * lateralSpeed * lateralGrip * dt;

    let updatedSpeed = Math.hypot(this.car.velocityX, this.car.velocityZ);
    if (updatedSpeed > CAR_CONFIG.maxSpeed) {
      const ratio = CAR_CONFIG.maxSpeed / updatedSpeed;
      this.car.velocityX *= ratio;
      this.car.velocityZ *= ratio;
      updatedSpeed = CAR_CONFIG.maxSpeed;
    }

    if (!throttleActive && !brakeActive) {
      const idleDecay = Math.exp(-CAR_CONFIG.idleDragPerSecond * dt * 1.7);
      this.car.velocityX *= idleDecay;
      this.car.velocityZ *= idleDecay;
    }

    if (throttleActive && updatedSpeed < 0.9) {
      this.stuckTimerSeconds += dt;
    } else {
      this.stuckTimerSeconds = 0;
    }

    if (this.stuckTimerSeconds > 0.9) {
      const unstuckBoost = (CAR_CONFIG.stuckImpulse / CAR_CONFIG.mass) * 0.42;
      this.car.velocityX += Math.sin(this.car.angle) * unstuckBoost;
      this.car.velocityZ += -Math.cos(this.car.angle) * unstuckBoost;
      this.car.yawRate *= 0.55;
      this.stuckTimerSeconds = 0;
    }

    this.car.x += this.car.velocityX * dt;
    this.car.z += this.car.velocityZ * dt;
  }

  collectCoins(nowMs) {
    if (this.round.finished || !this.coins.length) {
      return;
    }

    const pickupRadius = this.carRadius + this.coinPickupRadius;
    const pickupRadiusSq = pickupRadius * pickupRadius;

    for (const coin of this.coins) {
      if (coin.collected) {
        continue;
      }

      const dx = this.car.x - coin.position[0];
      const dz = this.car.z - coin.position[2];
      if (dx * dx + dz * dz > pickupRadiusSq) {
        continue;
      }

      coin.collected = true;
      this.round.coinsCollected += 1;
      this.round.coinScore += coin.value;

      this.io.emit("round:event", {
        type: "coin",
        coinId: coin.id,
        value: coin.value,
        coinsCollected: this.round.coinsCollected,
        coinsTotal: this.round.coinsTotal,
        coinScore: this.round.coinScore,
        serverTime: nowMs,
      });
    }
  }

  applyTrackConstraints(dt) {
    const roadPadding = this.carRadius * 0.44;
    const onTrack = this.trackSurfaces.some((rect) =>
      isPointInsideRect(this.car.x, this.car.z, rect, roadPadding)
    );

    if (onTrack) {
      this.offTrackTimerSeconds = 0;
    } else {
      this.offTrackTimerSeconds += dt;
      this.car.velocityX *= 0.94;
      this.car.velocityZ *= 0.94;
    }

    const farOutsideFloor = !isPointInsideRect(
      this.car.x,
      this.car.z,
      this.floorRect,
      this.carRadius + 5
    );

    if (farOutsideFloor) {
      this.offTrackTimerSeconds = Math.max(this.offTrackTimerSeconds, 0.75);
    }
  }

  applyHazardPenalty(nowMs) {
    if (this.round.finished || nowMs - this.lastHazardHitAtMs < 260) {
      return;
    }

    for (const obstacle of this.dynamicObstacles) {
      const { state, halfSize } = obstacle;
      let isHit = false;

      if (obstacle.kind === "moving") {
        isHit = circleIntersectsAabb(this.car.x, this.car.z, this.carRadius, {
          minX: state.x - halfSize.x,
          maxX: state.x + halfSize.x,
          minZ: state.z - halfSize.z,
          maxZ: state.z + halfSize.z,
        });
      }

      if (obstacle.kind === "rotating") {
        isHit = circleIntersectsOrientedRect(
          this.car.x,
          this.car.z,
          this.carRadius,
          state.x,
          state.z,
          halfSize.x,
          halfSize.z,
          state.angle
        );
      }

      if (!isHit) {
        continue;
      }

      this.lastHazardHitAtMs = nowMs;
      this.hazardHitsTotal += 1;
      this.resetRound("obstacle-hit");
      this.io.emit("round:event", {
        type: "reset",
        reason: "obstacle-hit",
      });
      return;
    }
  }

  handleRoundState(nowMs) {
    if (this.round.finished) {
      return;
    }

    if (this.offTrackTimerSeconds > 0.55) {
      this.resetRound("fall-reset");
      this.io.emit("round:event", {
        type: "reset",
        reason: "fall-reset",
      });
      return;
    }

    const [finishX, , finishZ] = COURSE_LAYOUT.finishZone.position;
    const { radius } = COURSE_LAYOUT.finishZone;
    const dx = this.car.x - finishX;
    const dz = this.car.z - finishZ;
    const inFinishZone = dx * dx + dz * dz <= radius * radius;

    if (!inFinishZone) {
      return;
    }

    const elapsedMs = nowMs - this.round.startedAtMs;
    if (nowMs - this.round.lastFinishAtMs < ROUND_CONFIG.finishTriggerCooldownMs) {
      return;
    }

    this.round.finished = true;
    this.round.finishTimeMs = elapsedMs;
    this.round.lastFinishAtMs = nowMs;

    this.car.velocityX = 0;
    this.car.velocityZ = 0;
    this.car.yawRate = 0;

    if (!this.round.bestTimeMs || elapsedMs < this.round.bestTimeMs) {
      this.round.bestTimeMs = elapsedMs;
    }

    this.io.emit("round:event", {
      type: "finish",
      finishTimeMs: elapsedMs,
      bestTimeMs: this.round.bestTimeMs,
      coinScore: this.round.coinScore,
      coinsCollected: this.round.coinsCollected,
      coinsTotal: this.round.coinsTotal,
    });
  }
}
