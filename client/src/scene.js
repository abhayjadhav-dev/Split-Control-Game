function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothFactor(dt, response) {
  return 1 - Math.exp(-response * dt);
}

function lerpAngle(from, to, t) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

function yawFromQuaternion(quaternion = [0, 0, 0, 1]) {
  const [x, y, z, w] = quaternion;
  const siny = 2 * (w * y + x * z);
  const cosy = 1 - 2 * (y * y + z * z);
  return Math.atan2(siny, cosy);
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5));
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, r);
    return;
  }

  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function createSeededRandom(seedValue = 1) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function colorForTrackSegment(id, fallback = "#647f94") {
  if (!id) {
    return fallback;
  }

  if (id.includes("start")) {
    return "#3f9a74";
  }

  if (id.includes("finish")) {
    return "#77ab62";
  }

  if (id.includes("checkpoint")) {
    return "#8caed0";
  }

  if (id.includes("spinner")) {
    return "#617961";
  }

  if (id.includes("mover")) {
    return "#5f7a8e";
  }

  if (id.includes("narrow") || id.includes("split") || id.includes("zig")) {
    return "#556f8a";
  }

  if (id.includes("seam")) {
    return "#607688";
  }

  return fallback;
}

function strokeForTrackSegment(id) {
  if (!id) {
    return "rgba(236, 247, 255, 0.16)";
  }

  if (id.includes("finish")) {
    return "rgba(255, 244, 197, 0.4)";
  }

  if (id.includes("checkpoint")) {
    return "rgba(228, 242, 255, 0.28)";
  }

  return "rgba(220, 240, 255, 0.19)";
}

function offsetByLocal(x, z, angle, localX, localZ) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return {
    x: x + localX * cosA - localZ * sinA,
    z: z + localX * sinA + localZ * cosA,
  };
}

function rectFromDescriptor(descriptor) {
  const size = descriptor.size;
  const position = descriptor.position || descriptor.basePosition || descriptor.center;
  const rotation = descriptor.rotation || [0, 0, 0];
  const id = descriptor.id || "";
  const fill = colorForTrackSegment(id, descriptor.color || "#647f94");
  const stroke = strokeForTrackSegment(id);
  const hazard =
    id.includes("narrow") ||
    id.includes("mover") ||
    id.includes("spinner") ||
    id.includes("zig") ||
    id.includes("final");
  const flowLane =
    id.includes("lane") ||
    id.includes("runway") ||
    id.includes("checkpoint") ||
    id.includes("finish");

  return {
    id,
    x: position[0],
    z: position[2],
    width: size[0],
    height: size[2],
    angle: rotation[1] || 0,
    fill,
    stroke,
    hazard,
    flowLane,
  };
}

function sizeForDynamicObstacle(descriptor) {
  const size = descriptor.collisionSize || descriptor.size;
  return {
    width: size[0],
    height: size[2],
  };
}

export function createGameScene({ canvas, courseLayout }) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context not available");
  }

  const hardwareThreads = Number(window.navigator.hardwareConcurrency || 8);
  const lowPowerMode = hardwareThreads <= 4;
  const qualityScale = lowPowerMode ? 0.72 : 1;

  const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionScale = reducedMotionMedia.matches ? 0.35 : 1;

  const staticRoad = courseLayout.staticPlatforms.map(rectFromDescriptor);
  const ramps = courseLayout.ramps.map((descriptor) => {
    const rect = rectFromDescriptor(descriptor);
    return {
      ...rect,
      fill: descriptor.color || "#a07951",
      stroke: "rgba(255, 230, 186, 0.28)",
      hazard: false,
      flowLane: false,
    };
  });
  const finishZone = {
    x: courseLayout.finishZone.position[0],
    z: courseLayout.finishZone.position[2],
    radius: courseLayout.finishZone.radius,
  };

  const dynamicDescriptors = new Map();
  for (const movingPlatform of courseLayout.movingPlatforms) {
    const size = sizeForDynamicObstacle(movingPlatform);
    dynamicDescriptors.set(movingPlatform.id, {
      id: movingPlatform.id,
      kind: "moving",
      width: size.width,
      height: size.height,
      color: movingPlatform.color || "#d39d52",
      x: movingPlatform.basePosition[0],
      z: movingPlatform.basePosition[2],
      angle: 0,
    });
  }

  for (const rotatingBeam of courseLayout.rotatingBeams) {
    const size = sizeForDynamicObstacle(rotatingBeam);
    dynamicDescriptors.set(rotatingBeam.id, {
      id: rotatingBeam.id,
      kind: "rotating",
      width: size.width,
      height: size.height,
      color: rotatingBeam.color || "#d3654f",
      x: rotatingBeam.center[0],
      z: rotatingBeam.center[2],
      angle: rotatingBeam.phase || 0,
    });
  }

  const coinDescriptors = new Map();
  for (const coin of courseLayout.coins || []) {
    coinDescriptors.set(coin.id, {
      id: coin.id,
      x: coin.position[0],
      z: coin.position[2],
      value: Math.max(1, Number(coin.value || 1)),
      collected: false,
    });
  }

  const seededRandom = createSeededRandom(90210);
  const nebulaBlobs = [];
  const sparkleDots = [];

  const blobCount = Math.round(20 * qualityScale);
  const dotCount = Math.round(115 * qualityScale);

  for (let index = 0; index < blobCount; index += 1) {
    const useWarmColor = seededRandom() > 0.56;
    nebulaBlobs.push({
      x: (seededRandom() * 2 - 1) * 360,
      z: -360 + seededRandom() * 560,
      radius: 60 + seededRandom() * 170,
      phase: seededRandom() * Math.PI * 2,
      drift: (seededRandom() * 2 - 1) * 0.14,
      color: useWarmColor ? [255, 161, 96] : [98, 182, 255],
      alpha: 0.05 + seededRandom() * 0.11,
      parallax: 0.12 + seededRandom() * 0.23,
    });
  }

  for (let index = 0; index < dotCount; index += 1) {
    sparkleDots.push({
      x: (seededRandom() * 2 - 1) * 390,
      z: -410 + seededRandom() * 620,
      radius: 0.4 + seededRandom() * 1.35,
      alpha: 0.12 + seededRandom() * 0.48,
      parallax: 0.05 + seededRandom() * 0.16,
    });
  }

  const startPosition = courseLayout.startTransform.position;
  const startYaw = courseLayout.startTransform.rotation[1] || 0;

  const targetCar = {
    x: startPosition[0],
    z: startPosition[2],
    angle: startYaw,
    velocityX: 0,
    velocityZ: 0,
  };

  const smoothedCar = {
    x: targetCar.x,
    z: targetCar.z,
    angle: targetCar.angle,
  };

  const dynamicTargets = new Map();
  const dynamicSmoothed = new Map();
  for (const [id, descriptor] of dynamicDescriptors.entries()) {
    dynamicTargets.set(id, {
      x: descriptor.x,
      z: descriptor.z,
      angle: descriptor.angle,
    });
    dynamicSmoothed.set(id, {
      x: descriptor.x,
      z: descriptor.z,
      angle: descriptor.angle,
    });
  }

  const coinStates = new Map();
  for (const [id, descriptor] of coinDescriptors.entries()) {
    coinStates.set(id, {
      collected: descriptor.collected,
    });
  }

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.5 : 2),
  };

  const camera = {
    x: smoothedCar.x,
    z: smoothedCar.z,
    zoom: clamp(Math.min(viewport.width / 50, viewport.height / 34), 8.4, 14.8),
  };

  function worldToScreen(x, z) {
    return {
      x: (x - camera.x) * camera.zoom + viewport.width * 0.5,
      y: (z - camera.z) * camera.zoom + viewport.height * 0.57,
    };
  }

  function worldToParallaxScreen(x, z, parallax) {
    return {
      x: (x - camera.x * parallax) * camera.zoom + viewport.width * 0.5,
      y: (z - camera.z * parallax) * camera.zoom + viewport.height * 0.57,
    };
  }

  function resize() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    viewport.dpr = Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.5 : 2);

    canvas.width = Math.floor(viewport.width * viewport.dpr);
    canvas.height = Math.floor(viewport.height * viewport.dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in context) {
      context.imageSmoothingQuality = "high";
    }
  }

  function drawBackground(timeMs) {
    const animatedTime = timeMs * motionScale;
    const gradient = context.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, "#061a2a");
    gradient.addColorStop(0.5, "#0a2439");
    gradient.addColorStop(1, "#081621");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);

    for (const blob of nebulaBlobs) {
      const position = worldToParallaxScreen(blob.x, blob.z, blob.parallax);
      const driftX = Math.sin(animatedTime * 0.00032 + blob.phase) * 18 * motionScale;
      const driftY = Math.cos(animatedTime * 0.00021 + blob.phase * 1.8) * 12 * motionScale;
      const radiusPx = blob.radius * camera.zoom * 0.35;

      if (
        position.x + radiusPx < -60 ||
        position.x - radiusPx > viewport.width + 60 ||
        position.y + radiusPx < -60 ||
        position.y - radiusPx > viewport.height + 60
      ) {
        continue;
      }

      const glowGradient = context.createRadialGradient(
        position.x + driftX,
        position.y + driftY,
        0,
        position.x + driftX,
        position.y + driftY,
        radiusPx
      );
      glowGradient.addColorStop(
        0,
        `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${blob.alpha.toFixed(3)})`
      );
      glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = glowGradient;
      context.beginPath();
      context.arc(position.x + driftX, position.y + driftY, radiusPx, 0, Math.PI * 2);
      context.fill();
    }

    for (const dot of sparkleDots) {
      const position = worldToParallaxScreen(dot.x, dot.z, dot.parallax);
      if (
        position.x < -10 ||
        position.x > viewport.width + 10 ||
        position.y < -10 ||
        position.y > viewport.height + 10
      ) {
        continue;
      }

      const twinkle = 0.68 + 0.32 * Math.sin(animatedTime * 0.0012 + dot.x * 0.06 + dot.z * 0.03);
      context.fillStyle = `rgba(183, 225, 255, ${(dot.alpha * twinkle).toFixed(3)})`;
      context.beginPath();
      context.arc(position.x, position.y, dot.radius, 0, Math.PI * 2);
      context.fill();
    }

    const worldStep = 12;
    const leftWorld = camera.x - viewport.width / (2 * camera.zoom) - worldStep;
    const rightWorld = camera.x + viewport.width / (2 * camera.zoom) + worldStep;
    const topWorld = camera.z - viewport.height / (2 * camera.zoom) - worldStep;
    const bottomWorld = camera.z + viewport.height / (2 * camera.zoom) + worldStep;

    context.strokeStyle = "rgba(136, 197, 227, 0.08)";
    context.lineWidth = 1;

    const startX = Math.floor(leftWorld / worldStep) * worldStep;
    for (let x = startX; x <= rightWorld; x += worldStep) {
      const a = worldToScreen(x, topWorld);
      const b = worldToScreen(x, bottomWorld);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    const startZ = Math.floor(topWorld / worldStep) * worldStep;
    for (let z = startZ; z <= bottomWorld; z += worldStep) {
      const a = worldToScreen(leftWorld, z);
      const b = worldToScreen(rightWorld, z);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    const vignette = context.createRadialGradient(
      viewport.width * 0.5,
      viewport.height * 0.5,
      viewport.height * 0.2,
      viewport.width * 0.5,
      viewport.height * 0.5,
      viewport.height * 0.78
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.36)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }

  function drawWorldRect(rect, options = {}) {
    const center = worldToScreen(rect.x, rect.z);
    const widthPx = rect.width * camera.zoom;
    const heightPx = rect.height * camera.zoom;
    const angle = options.angle ?? rect.angle ?? 0;

    context.save();
    context.translate(center.x, center.y);
    context.rotate(angle);

    if (options.shadow) {
      context.fillStyle = options.shadow;
      context.fillRect(
        -widthPx * 0.5 + (options.shadowOffsetX || 0),
        -heightPx * 0.5 + (options.shadowOffsetY || 0),
        widthPx,
        heightPx
      );
    }

    context.fillStyle = options.fill || rect.fill || rect.color;
    context.fillRect(-widthPx * 0.5, -heightPx * 0.5, widthPx, heightPx);

    if (options.stroke) {
      context.strokeStyle = options.stroke;
      context.lineWidth = options.lineWidth || 1.1;
      context.strokeRect(-widthPx * 0.5, -heightPx * 0.5, widthPx, heightPx);
    }

    context.restore();
  }

  function drawFlowLine(segment, timeMs) {
    if (!segment.flowLane) {
      return;
    }

    const center = worldToScreen(segment.x, segment.z);
    const alongZ = segment.height >= segment.width;
    const lineLength = (alongZ ? segment.height : segment.width) * camera.zoom * 0.86;
    const dashOffset = -(timeMs * 0.055 * motionScale) % 42;

    context.save();
    context.translate(center.x, center.y);
    context.rotate(segment.angle || 0);
    context.lineWidth = 2.1;
    context.strokeStyle = "rgba(236, 247, 255, 0.35)";
    context.setLineDash([18, 14]);
    context.lineDashOffset = dashOffset;
    context.beginPath();
    if (alongZ) {
      context.moveTo(0, -lineLength * 0.5);
      context.lineTo(0, lineLength * 0.5);
    } else {
      context.moveTo(-lineLength * 0.5, 0);
      context.lineTo(lineLength * 0.5, 0);
    }
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }

  function drawSegmentCurbs(segment, timeMs) {
    if (!segment.hazard) {
      return;
    }

    const alongZ = segment.height >= segment.width;
    const span = alongZ ? segment.width : segment.height;
    const curbWidth = clamp(span * 0.12, 0.25, 0.56);

    if (span <= curbWidth * 2.2) {
      return;
    }

    const sideOffset = span * 0.5 - curbWidth * 0.5;
    for (const side of [-1, 1]) {
      const localX = alongZ ? sideOffset * side : 0;
      const localZ = alongZ ? 0 : sideOffset * side;
      const center = offsetByLocal(segment.x, segment.z, segment.angle || 0, localX, localZ);
      const pulse = 0.6 + 0.4 * Math.sin(timeMs * 0.004 * motionScale + side * 1.9 + segment.x * 0.07);
      const brightness = Math.round(148 + pulse * 56);

      drawWorldRect(
        {
          x: center.x,
          z: center.z,
          width: alongZ ? curbWidth : segment.width * 0.92,
          height: alongZ ? segment.height * 0.92 : curbWidth,
          angle: segment.angle,
        },
        {
          fill: `rgba(255, ${brightness}, 95, 0.34)`,
          stroke: "rgba(255, 229, 188, 0.18)",
          lineWidth: 1,
        }
      );
    }
  }

  function drawTrack(timeMs) {
    for (const segment of staticRoad) {
      drawWorldRect(segment, {
        shadow: "rgba(0, 0, 0, 0.2)",
        shadowOffsetY: 1.5,
      });

      drawWorldRect(segment, {
        fill: segment.fill,
        stroke: segment.stroke,
        lineWidth: 1.2,
      });

      drawFlowLine(segment, timeMs);
      drawSegmentCurbs(segment, timeMs);
    }

    for (const ramp of ramps) {
      drawWorldRect(ramp, {
        shadow: "rgba(0, 0, 0, 0.22)",
        shadowOffsetY: 1.5,
      });
      drawWorldRect(ramp, {
        fill: ramp.fill,
        stroke: ramp.stroke,
        lineWidth: 1.1,
      });
    }

    const pulse = 0.58 + 0.42 * Math.sin(timeMs * 0.0042 * motionScale);
    const finishCenter = worldToScreen(finishZone.x, finishZone.z);
    const outerRadius = finishZone.radius * camera.zoom;

    context.save();
    context.strokeStyle = `rgba(255, 214, 120, ${(0.62 + pulse * 0.22).toFixed(3)})`;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(finishCenter.x, finishCenter.y, outerRadius, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = `rgba(255, 242, 192, ${(0.35 + pulse * 0.28).toFixed(3)})`;
    context.lineWidth = 9;
    context.setLineDash([17, 11]);
    context.lineDashOffset = -(timeMs * 0.07 * motionScale) % 28;
    context.beginPath();
    context.arc(finishCenter.x, finishCenter.y, outerRadius + 7, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = `rgba(255, 229, 158, ${(0.14 + pulse * 0.19).toFixed(3)})`;
    context.beginPath();
    context.arc(finishCenter.x, finishCenter.y, outerRadius + 13, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawDynamicObstacles(timeMs) {
    for (const [id, descriptor] of dynamicDescriptors.entries()) {
      const state = dynamicSmoothed.get(id) || {
        x: descriptor.x,
        z: descriptor.z,
        angle: descriptor.angle,
      };

      drawWorldRect(
        {
          ...descriptor,
          x: state.x,
          z: state.z,
          angle: state.angle,
        },
        {
          shadow: "rgba(0, 0, 0, 0.23)",
          shadowOffsetY: 2,
        }
      );

      drawWorldRect(
        {
          ...descriptor,
          x: state.x,
          z: state.z,
          angle: state.angle,
        },
        {
          fill: descriptor.color,
          stroke: "rgba(255, 247, 234, 0.24)",
          lineWidth: 1.1,
        }
      );

      if (descriptor.kind === "rotating") {
        const center = worldToScreen(state.x, state.z);
        const pulse = 0.3 + 0.28 * Math.sin(timeMs * 0.007 * motionScale + state.angle * 2.5);
        context.fillStyle = `rgba(255, 155, 122, ${pulse.toFixed(3)})`;
        context.beginPath();
        context.arc(center.x, center.y, 8.2, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawCoins(timeMs) {
    let index = 0;
    for (const [id, descriptor] of coinDescriptors.entries()) {
      const state = coinStates.get(id);
      if (!state || state.collected) {
        index += 1;
        continue;
      }

      const center = worldToScreen(descriptor.x, descriptor.z);
      const pulse = 0.65 + 0.35 * Math.sin(timeMs * 0.006 * motionScale + index * 0.73);
      const ringRadius = Math.max(5.2, camera.zoom * (0.41 + descriptor.value * 0.07));

      const gradient = context.createRadialGradient(
        center.x,
        center.y,
        ringRadius * 0.15,
        center.x,
        center.y,
        ringRadius * 1.42
      );
      gradient.addColorStop(0, "rgba(255, 248, 193, 0.95)");
      gradient.addColorStop(1, "rgba(255, 176, 62, 0.03)");

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(center.x, center.y, ringRadius * 1.42, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = `rgba(255, 201, 95, ${(0.56 + pulse * 0.4).toFixed(3)})`;
      context.lineWidth = 2.2;
      context.beginPath();
      context.arc(center.x, center.y, ringRadius, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = "rgba(255, 233, 158, 0.95)";
      context.beginPath();
      context.arc(center.x, center.y, ringRadius * 0.45, 0, Math.PI * 2);
      context.fill();

      if (descriptor.value > 1) {
        context.fillStyle = "rgba(44, 28, 4, 0.92)";
        context.font = `${Math.max(10, Math.floor(camera.zoom * 0.95))}px Rajdhani`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(descriptor.value), center.x, center.y + 0.5);
      }

      index += 1;
    }
  }

  function drawCar(timeMs) {
    const center = worldToScreen(smoothedCar.x, smoothedCar.z);
    const carWidth = 1.9 * camera.zoom;
    const carLength = 3.2 * camera.zoom;
    const underGlow = 0.26 + 0.12 * Math.sin(timeMs * 0.0045 * motionScale);

    context.save();
    context.translate(center.x, center.y);
    context.rotate(smoothedCar.angle);

    context.fillStyle = `rgba(97, 209, 255, ${underGlow.toFixed(3)})`;
    context.fillRect(-carWidth * 0.46, -carLength * 0.42, carWidth * 0.92, carLength * 0.84);

    context.fillStyle = "rgba(0, 0, 0, 0.28)";
    context.fillRect(-carWidth * 0.48, -carLength * 0.5 + 5, carWidth * 0.96, carLength * 0.98);

    context.fillStyle = "#f1703a";
    context.strokeStyle = "rgba(255, 245, 221, 0.55)";
    context.lineWidth = 1.4;
    context.beginPath();
    roundedRectPath(context, -carWidth * 0.5, -carLength * 0.5, carWidth, carLength, 5);
    context.fill();
    context.stroke();

    context.fillStyle = "#c0e1f7";
    context.beginPath();
    roundedRectPath(
      context,
      -carWidth * 0.34,
      -carLength * 0.29,
      carWidth * 0.68,
      carLength * 0.42,
      3.2
    );
    context.fill();

    context.fillStyle = "#ffe8b4";
    context.fillRect(-carWidth * 0.08, -carLength * 0.42, carWidth * 0.16, carLength * 0.62);

    context.fillStyle = "#1d1e23";
    const tireWidth = carWidth * 0.17;
    const tireLength = carLength * 0.22;
    const sideOffset = carWidth * 0.48;
    context.fillRect(-sideOffset, -carLength * 0.35, tireWidth, tireLength);
    context.fillRect(sideOffset - tireWidth, -carLength * 0.35, tireWidth, tireLength);
    context.fillRect(-sideOffset, carLength * 0.13, tireWidth, tireLength);
    context.fillRect(sideOffset - tireWidth, carLength * 0.13, tireWidth, tireLength);

    context.fillStyle = "#ff6e5d";
    context.fillRect(-carWidth * 0.3, carLength * 0.4, carWidth * 0.22, carLength * 0.06);
    context.fillRect(carWidth * 0.08, carLength * 0.4, carWidth * 0.22, carLength * 0.06);

    context.restore();
  }

  function syncState(state) {
    if (!state) {
      return;
    }

    if (state.car?.position) {
      targetCar.x = state.car.position[0];
      targetCar.z = state.car.position[2];
    }

    if (typeof state.car?.angle === "number") {
      targetCar.angle = state.car.angle;
    } else if (state.car?.quaternion) {
      targetCar.angle = yawFromQuaternion(state.car.quaternion);
    }

    if (state.car?.velocity) {
      targetCar.velocityX = state.car.velocity[0] || 0;
      targetCar.velocityZ = state.car.velocity[2] || 0;
    }

    if (!state.dynamicObstacles) {
      if (state.coins?.items) {
        for (const coin of state.coins.items) {
          const coinState = coinStates.get(coin.id);
          if (coinState) {
            coinState.collected = coin.collected === true;
          }
        }
      }
      return;
    }

    for (const [id, transform] of Object.entries(state.dynamicObstacles)) {
      const target = dynamicTargets.get(id);
      if (!target) {
        continue;
      }

      target.x = transform.position?.[0] ?? target.x;
      target.z = transform.position?.[2] ?? target.z;

      if (typeof transform.angle === "number") {
        target.angle = transform.angle;
      } else if (Array.isArray(transform.quaternion)) {
        target.angle = yawFromQuaternion(transform.quaternion);
      }
    }

    if (state.coins?.items) {
      for (const coin of state.coins.items) {
        const coinState = coinStates.get(coin.id);
        if (coinState) {
          coinState.collected = coin.collected === true;
        }
      }
    }
  }

  function render(state, dt) {
    syncState(state);

    const stepDt = clamp(dt, 1 / 120, 0.05);
    const interpolation = smoothFactor(stepDt, 13.8);
    const cameraSmoothing = smoothFactor(stepDt, 8.1);

    // Round resets teleport the car; snap camera to avoid long cross-map interpolation.
    const teleportDistance = Math.hypot(targetCar.x - smoothedCar.x, targetCar.z - smoothedCar.z);
    if (teleportDistance > 32) {
      smoothedCar.x = targetCar.x;
      smoothedCar.z = targetCar.z;
      smoothedCar.angle = targetCar.angle;
      camera.x = targetCar.x;
      camera.z = targetCar.z;
    }

    smoothedCar.x += (targetCar.x - smoothedCar.x) * interpolation;
    smoothedCar.z += (targetCar.z - smoothedCar.z) * interpolation;
    smoothedCar.angle = lerpAngle(smoothedCar.angle, targetCar.angle, interpolation);

    for (const [id, target] of dynamicTargets.entries()) {
      const smoothed = dynamicSmoothed.get(id);
      if (!smoothed) {
        continue;
      }

      smoothed.x += (target.x - smoothed.x) * interpolation;
      smoothed.z += (target.z - smoothed.z) * interpolation;
      smoothed.angle = lerpAngle(smoothed.angle, target.angle, interpolation);
    }

    const speed = Math.hypot(targetCar.velocityX, targetCar.velocityZ);
    const desiredZoom = clamp(
      Math.min(viewport.width / 50, viewport.height / 34) - clamp(speed * 0.082, 0, 2.15),
      8.4,
      14.8
    );
    camera.zoom += (desiredZoom - camera.zoom) * cameraSmoothing;

    const lookAhead = clamp(speed * 0.32, 1.45, 6.4);
    const desiredCameraX = smoothedCar.x + Math.sin(smoothedCar.angle) * lookAhead;
    const desiredCameraZ = smoothedCar.z + -Math.cos(smoothedCar.angle) * lookAhead;
    camera.x += (desiredCameraX - camera.x) * cameraSmoothing;
    camera.z += (desiredCameraZ - camera.z) * cameraSmoothing;

    const now = performance.now();
    drawBackground(now);
    drawTrack(now);
    drawDynamicObstacles(now);
    drawCoins(now);
    drawCar(now);
  }

  function handleMotionPreferenceChange(event) {
    motionScale = event.matches ? 0.35 : 1;
  }

  resize();
  window.addEventListener("resize", resize);

  if (typeof reducedMotionMedia.addEventListener === "function") {
    reducedMotionMedia.addEventListener("change", handleMotionPreferenceChange);
  } else if (typeof reducedMotionMedia.addListener === "function") {
    reducedMotionMedia.addListener(handleMotionPreferenceChange);
  }

  function destroy() {
    window.removeEventListener("resize", resize);

    if (typeof reducedMotionMedia.removeEventListener === "function") {
      reducedMotionMedia.removeEventListener("change", handleMotionPreferenceChange);
    } else if (typeof reducedMotionMedia.removeListener === "function") {
      reducedMotionMedia.removeListener(handleMotionPreferenceChange);
    }
  }

  return {
    render,
    destroy,
  };
}
