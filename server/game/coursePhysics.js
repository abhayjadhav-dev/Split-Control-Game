import { COURSE_LAYOUT } from "../../scripts/courseLayout.js";

function normalizeAxis(axis = [1, 0, 0]) {
  const x = Number(axis[0] || 0);
  const z = Number(axis[2] || 0);
  const length = Math.hypot(x, z) || 1;

  return {
    x: x / length,
    z: z / length,
  };
}

function angleToQuaternionY(angle) {
  const half = angle * 0.5;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

function obstacleCollisionSize(descriptor) {
  const size = descriptor.collisionSize || descriptor.size;
  return {
    x: size[0],
    z: size[2],
  };
}

export function buildCourseBodies() {
  const dynamicControllers = [];

  for (const movingPlatform of COURSE_LAYOUT.movingPlatforms) {
    const axis = normalizeAxis(movingPlatform.axis);
    const size = obstacleCollisionSize(movingPlatform);

    dynamicControllers.push({
      id: movingPlatform.id,
      kind: "moving",
      config: movingPlatform,
      axis,
      halfSize: {
        x: size.x * 0.5,
        z: size.z * 0.5,
      },
      state: {
        x: movingPlatform.basePosition[0],
        y: movingPlatform.basePosition[1],
        z: movingPlatform.basePosition[2],
        angle: 0,
        velocityX: 0,
        velocityZ: 0,
        angularVelocity: 0,
      },
    });
  }

  for (const rotatingBeam of COURSE_LAYOUT.rotatingBeams) {
    const size = obstacleCollisionSize(rotatingBeam);

    dynamicControllers.push({
      id: rotatingBeam.id,
      kind: "rotating",
      config: rotatingBeam,
      halfSize: {
        x: size.x * 0.5,
        z: size.z * 0.5,
      },
      state: {
        x: rotatingBeam.center[0],
        y: rotatingBeam.center[1],
        z: rotatingBeam.center[2],
        angle: rotatingBeam.phase,
        velocityX: 0,
        velocityZ: 0,
        angularVelocity: rotatingBeam.angularSpeed,
      },
    });
  }

  return dynamicControllers;
}

export function updateDynamicObstacles(dynamicControllers, elapsedSeconds) {
  for (const item of dynamicControllers) {
    if (item.kind === "moving") {
      const { config, axis, state } = item;
      const phase = elapsedSeconds * config.speed + config.phase;
      const sinTerm = Math.sin(phase);
      const cosTerm = Math.cos(phase);

      state.x = config.basePosition[0] + axis.x * config.amplitude * sinTerm;
      state.z = config.basePosition[2] + axis.z * config.amplitude * sinTerm;
      state.angle = 0;

      state.velocityX = axis.x * config.amplitude * config.speed * cosTerm;
      state.velocityZ = axis.z * config.amplitude * config.speed * cosTerm;
      state.angularVelocity = 0;
      continue;
    }

    if (item.kind === "rotating") {
      const { config, state } = item;
      state.x = config.center[0];
      state.z = config.center[2];
      state.angle = elapsedSeconds * config.angularSpeed + config.phase;
      state.velocityX = 0;
      state.velocityZ = 0;
      state.angularVelocity = config.angularSpeed;
    }
  }
}

export function serializeDynamicObstacles(dynamicControllers) {
  const payload = {};

  for (const item of dynamicControllers) {
    const { state } = item;
    payload[item.id] = {
      position: [state.x, state.y, state.z],
      quaternion: angleToQuaternionY(state.angle),
      velocity: [state.velocityX, 0, state.velocityZ],
      angle: state.angle,
      kind: item.kind,
    };
  }

  return payload;
}