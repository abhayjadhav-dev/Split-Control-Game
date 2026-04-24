export const NETWORK_CONFIG = {
  tickRate: 60,
  stateBroadcastRate: 20,
  physicsSubsteps: 6,
  physicsMaxDeltaSeconds: 1 / 30,
  inputTimeoutMs: 700,
  inputKeepAliveMs: 120,
};

export const CAR_CONFIG = {
  mass: 185,
  size: [1.9, 0.9, 3.2],
  engineForce: 14200,
  brakeForce: 16200,
  reverseForceFactor: 0.45,
  brakeFactorPerSecond: 8.2,
  steerAngularVelocity: 1.62,
  maxYawRate: 0.86,
  steerResponse: 4.4,
  steerSpeedForMaxControl: 22,
  minSteerSpeed: 1.55,
  stationaryYawCutoffSpeed: 0.58,
  maxSpeed: 37,
  maxReverseSpeed: 10,
  lateralGrip: 13.5,
  idleDragPerSecond: 0.5,
  launchAssistForce: 5200,
  stuckImpulse: 520,
  linearDamping: 0.24,
  angularDamping: 0.95,
};

export const ROUND_CONFIG = {
  resetHeight: -12,
  finishTriggerCooldownMs: 1000,
  coinPickupRadius: 0.95,
  manualRestartCooldownMs: 900,
};
