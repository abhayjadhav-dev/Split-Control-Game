export const COURSE_LAYOUT = {
  startTransform: {
    position: [0, 1.05, 34],
    rotation: [0, 0, 0],
  },
  finishZone: {
    position: [0, 1.15, -298],
    radius: 5.2,
    yTolerance: 2.8,
  },
  resetHeight: -14,
  floor: {
    size: [620, 2, 660],
    position: [0, -22, -132],
  },
  staticPlatforms: [
    { id: "start_pad", size: [26, 1, 24], position: [0, 0, 34], color: "#4f8a67" },
    { id: "launch_lane", size: [14, 1, 30], position: [0, 0, 12], color: "#6f8899" },
    { id: "chicane_left", size: [11, 1, 22], position: [-6, 0, -10], color: "#5f7794" },
    { id: "chicane_right", size: [10, 1, 22], position: [6, 0, -30], color: "#5d7391" },
    { id: "checkpoint_alpha", size: [16, 1, 12], position: [0, 0, -48], color: "#90aac2" },
    { id: "narrow_bridge_a", size: [8, 1, 24], position: [0, 0, -72], color: "#56768f" },
    { id: "mover_runway", size: [14, 1, 48], position: [0, 0, -108], color: "#6b8598" },
    { id: "split_left", size: [7.4, 1, 20], position: [-7, 0, -138], color: "#587581" },
    { id: "split_right", size: [7.4, 1, 20], position: [7, 0, -138], color: "#587581" },
    { id: "merge_pad", size: [15, 1, 16], position: [0, 0, -154], color: "#8ba4be" },
    { id: "spinner_arena", size: [20, 1, 34], position: [0, 0, -182], color: "#566b56" },
    { id: "zig_left", size: [9.2, 1, 20], position: [-7, 0, -210], color: "#657f90" },
    { id: "zig_right", size: [9.2, 1, 20], position: [7, 0, -230], color: "#657f90" },
    { id: "zig_center", size: [8.4, 1, 18], position: [0, 0, -248], color: "#6f8798" },
    { id: "checkpoint_beta", size: [14, 1, 10], position: [0, 0, -262], color: "#94acc5" },
    { id: "final_lane", size: [10, 1, 24], position: [0, 0, -280], color: "#6f8567" },
    { id: "finish_pad", size: [20, 1, 14], position: [0, 0, -298], color: "#7ca566" },

    // Slightly lower seam plates prevent numerical gaps between adjacent platforms.
    { id: "seam_1", size: [14, 0.8, 4], position: [0, 0.08, 26], color: "#6f7f93" },
    { id: "seam_2", size: [14, 0.8, 4], position: [0, 0.08, -42], color: "#6f7f93" },
    { id: "seam_3", size: [10, 0.8, 4], position: [0, 0.08, -58], color: "#6f7f93" },
    { id: "seam_4", size: [10, 0.8, 4], position: [0, 0.08, -92], color: "#6f7f93" },
    { id: "seam_5", size: [8, 0.8, 4], position: [0, 0.08, -146], color: "#6f7f93" },
    { id: "seam_6", size: [14, 0.8, 4], position: [0, 0.08, -198], color: "#6f7f93" },
    { id: "seam_7", size: [10, 0.8, 4], position: [0, 0.08, -256], color: "#6f7f93" },
    { id: "seam_8", size: [12, 0.8, 4], position: [0, 0.08, -292], color: "#6f7f93" }
  ],
  ramps: [
    {
      id: "ramp_alpha",
      size: [7, 0.8, 14],
      position: [-2, 0.4, -58],
      rotation: [0.06, 0, 0],
      color: "#a17d55"
    },
    {
      id: "ramp_beta",
      size: [7, 0.8, 14],
      position: [2, 0.4, -238],
      rotation: [0.05, 0, 0],
      color: "#a57f54"
    }
  ],
  movingPlatforms: [
    {
      id: "mover_1",
      size: [5.6, 1.0, 7.2],
      collisionSize: [6.2, 1.2, 8.0],
      basePosition: [0, 1.05, -94],
      axis: [1, 0, 0],
      amplitude: 5.6,
      speed: 1.08,
      phase: 0,
      color: "#d0a15a"
    },
    {
      id: "mover_2",
      size: [5.6, 1.0, 7.2],
      collisionSize: [6.2, 1.2, 8.0],
      basePosition: [0, 1.05, -110],
      axis: [1, 0, 0],
      amplitude: 5.9,
      speed: 1.26,
      phase: 1.4,
      color: "#d0a15a"
    },
    {
      id: "mover_3",
      size: [5.6, 1.0, 7.2],
      collisionSize: [6.2, 1.2, 8.0],
      basePosition: [0, 1.05, -126],
      axis: [1, 0, 0],
      amplitude: 5.1,
      speed: 1.38,
      phase: 2.7,
      color: "#d0a15a"
    },
    {
      id: "mover_4",
      size: [4.8, 1.0, 6.4],
      collisionSize: [5.4, 1.2, 7.2],
      basePosition: [0, 1.05, -168],
      axis: [0, 0, 1],
      amplitude: 7.0,
      speed: 0.95,
      phase: 0.8,
      color: "#d0a15a"
    }
  ],
  rotatingBeams: [
    {
      id: "rotator_1",
      size: [11.8, 0.74, 1.4],
      collisionSize: [12.6, 1.02, 2.1],
      center: [0, 1.62, -182],
      angularSpeed: 1.12,
      phase: 0,
      color: "#cb664f"
    },
    {
      id: "rotator_2",
      size: [8.8, 0.7, 1.2],
      collisionSize: [9.6, 0.95, 1.8],
      center: [0, 2.15, -182],
      angularSpeed: -1.48,
      phase: 1.1,
      color: "#cb664f"
    },
    {
      id: "rotator_3",
      size: [10, 0.72, 1.2],
      collisionSize: [10.8, 0.98, 1.9],
      center: [0, 1.95, -248],
      angularSpeed: 1.7,
      phase: 0.6,
      color: "#cb664f"
    },
    {
      id: "rotator_4",
      size: [8.2, 0.72, 1.1],
      collisionSize: [8.9, 0.96, 1.7],
      center: [0, 1.95, -280],
      angularSpeed: -1.92,
      phase: 2.2,
      color: "#cb664f"
    }
  ],
  coins: [
    { id: "coin_01", position: [0, 1.2, 28], value: 1 },
    { id: "coin_02", position: [0, 1.2, 18], value: 1 },
    { id: "coin_03", position: [-5, 1.2, -6], value: 1 },
    { id: "coin_04", position: [5, 1.2, -24], value: 1 },
    { id: "coin_05", position: [0, 1.2, -46], value: 1 },
    { id: "coin_06", position: [-3, 1.2, -62], value: 1 },
    { id: "coin_07", position: [3, 1.2, -78], value: 1 },
    { id: "coin_08", position: [-4, 1.2, -96], value: 1 },
    { id: "coin_09", position: [4, 1.2, -110], value: 1 },
    { id: "coin_10", position: [0, 1.2, -124], value: 1 },
    { id: "coin_11", position: [-7, 1.2, -138], value: 1 },
    { id: "coin_12", position: [7, 1.2, -138], value: 1 },
    { id: "coin_13", position: [0, 1.2, -154], value: 1 },
    { id: "coin_14", position: [-8, 1.2, -182], value: 2 },
    { id: "coin_15", position: [8, 1.2, -182], value: 2 },
    { id: "coin_16", position: [-4, 1.2, -196], value: 1 },
    { id: "coin_17", position: [4, 1.2, -204], value: 1 },
    { id: "coin_18", position: [-7, 1.2, -210], value: 1 },
    { id: "coin_19", position: [7, 1.2, -230], value: 1 },
    { id: "coin_20", position: [0, 1.2, -248], value: 2 },
    { id: "coin_21", position: [-5, 1.2, -262], value: 1 },
    { id: "coin_22", position: [5, 1.2, -272], value: 1 },
    { id: "coin_23", position: [0, 1.2, -288], value: 1 },
    { id: "coin_24", position: [0, 1.2, -298], value: 3 }
  ]
};
