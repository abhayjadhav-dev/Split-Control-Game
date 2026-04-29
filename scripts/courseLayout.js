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
    // ── Zone 1: Start Area (Green/Teal) ──
    { id: "start_pad", size: [28, 1, 26], position: [0, 0, 34], color: "#2d9e6e" },
    { id: "launch_lane", size: [14, 1, 32], position: [0, 0, 12], color: "#3a7e8a" },

    // Decorative guardrails for start area
    { id: "start_rail_l", size: [1.2, 1.4, 26], position: [-14.5, 0.2, 34], color: "#1e6b55" },
    { id: "start_rail_r", size: [1.2, 1.4, 26], position: [14.5, 0.2, 34], color: "#1e6b55" },

    // ── Zone 2: Chicane Section (Blue/Steel) ──
    { id: "chicane_left", size: [12, 1, 24], position: [-6, 0, -10], color: "#3d6d8f" },
    { id: "chicane_right", size: [11, 1, 24], position: [6, 0, -30], color: "#3d6d8f" },

    // Chicane guardrails
    { id: "chicane_rail_l", size: [1, 1.3, 18], position: [-12.5, 0.15, -10], color: "#2b4f6e" },
    { id: "chicane_rail_r", size: [1, 1.3, 18], position: [12, 0.15, -30], color: "#2b4f6e" },

    // ── Zone 3: Checkpoint Alpha (Cyan/Bright) ──
    { id: "checkpoint_alpha", size: [18, 1, 14], position: [0, 0, -48], color: "#5ba8d4" },

    // ── Zone 4: Narrow Bridge (Dark Blue) ──
    { id: "narrow_bridge_a", size: [8, 1, 26], position: [0, 0, -72], color: "#2e5a7f" },

    // Bridge guardrails (thin)
    { id: "bridge_rail_l", size: [0.6, 1.5, 26], position: [-4.5, 0.25, -72], color: "#1e3f5e" },
    { id: "bridge_rail_r", size: [0.6, 1.5, 26], position: [4.5, 0.25, -72], color: "#1e3f5e" },

    // ── Zone 5: Mover Runway (Purple/Steel) ──
    { id: "mover_runway", size: [16, 1, 50], position: [0, 0, -108], color: "#4a5e80" },

    // Runway side markers
    { id: "runway_mark_l", size: [1.2, 1.2, 50], position: [-8.8, 0.1, -108], color: "#3a4a68" },
    { id: "runway_mark_r", size: [1.2, 1.2, 50], position: [8.8, 0.1, -108], color: "#3a4a68" },

    // ── Zone 6: Split Path (Teal pair) ──
    { id: "split_left", size: [8, 1, 22], position: [-7.5, 0, -138], color: "#2a7a7a" },
    { id: "split_right", size: [8, 1, 22], position: [7.5, 0, -138], color: "#2a7a7a" },

    // Split guardrails
    { id: "split_rail_ll", size: [0.6, 1.3, 22], position: [-12, 0.15, -138], color: "#1d5858" },
    { id: "split_rail_rr", size: [0.6, 1.3, 22], position: [12, 0.15, -138], color: "#1d5858" },

    // ── Zone 7: Merge & Spinner Arena (Green/Olive) ──
    { id: "merge_pad", size: [17, 1, 16], position: [0, 0, -154], color: "#4a8a6a" },
    { id: "spinner_arena", size: [22, 1, 36], position: [0, 0, -182], color: "#3a6a4a" },

    // Arena guardrails
    { id: "arena_rail_l", size: [1, 1.4, 36], position: [-12, 0.2, -182], color: "#254a35" },
    { id: "arena_rail_r", size: [1, 1.4, 36], position: [12, 0.2, -182], color: "#254a35" },

    // ── Zone 8: Zigzag Section (Indigo) ──
    { id: "zig_left", size: [10, 1, 22], position: [-7, 0, -210], color: "#4860a0" },
    { id: "zig_right", size: [10, 1, 22], position: [7, 0, -230], color: "#4860a0" },
    { id: "zig_center", size: [9, 1, 20], position: [0, 0, -248], color: "#506aaa" },

    // ── Zone 9: Checkpoint Beta (Bright Blue) ──
    { id: "checkpoint_beta", size: [16, 1, 12], position: [0, 0, -262], color: "#5ba8d4" },

    // ── Zone 10: Final Lane & Finish (Gold/Green) ──
    { id: "final_lane", size: [11, 1, 26], position: [0, 0, -280], color: "#4a8050" },

    // Final guardrails
    { id: "final_rail_l", size: [0.8, 1.3, 26], position: [-6.2, 0.15, -280], color: "#2d5a35" },
    { id: "final_rail_r", size: [0.8, 1.3, 26], position: [6.2, 0.15, -280], color: "#2d5a35" },

    { id: "finish_pad", size: [22, 1, 16], position: [0, 0, -298], color: "#5aaa55" },

    // Finish area decorative edges
    { id: "finish_deco_l", size: [1.5, 1.4, 16], position: [-12.2, 0.2, -298], color: "#3d8a3a" },
    { id: "finish_deco_r", size: [1.5, 1.4, 16], position: [12.2, 0.2, -298], color: "#3d8a3a" },

    // Seam plates prevent numerical gaps
    { id: "seam_1", size: [14, 0.8, 4], position: [0, 0.08, 26], color: "#3a7e8a" },
    { id: "seam_2", size: [14, 0.8, 4], position: [0, 0.08, -42], color: "#3d6d8f" },
    { id: "seam_3", size: [12, 0.8, 4], position: [0, 0.08, -58], color: "#4a7090" },
    { id: "seam_4", size: [10, 0.8, 4], position: [0, 0.08, -92], color: "#3a5a78" },
    { id: "seam_5", size: [10, 0.8, 4], position: [0, 0.08, -146], color: "#3a6a5a" },
    { id: "seam_6", size: [16, 0.8, 4], position: [0, 0.08, -198], color: "#3a6a4a" },
    { id: "seam_7", size: [12, 0.8, 4], position: [0, 0.08, -256], color: "#4a6a90" },
    { id: "seam_8", size: [14, 0.8, 4], position: [0, 0.08, -292], color: "#4a8050" }
  ],
  ramps: [
    {
      id: "ramp_alpha",
      size: [7, 0.8, 14],
      position: [-2, 0.4, -58],
      rotation: [0.06, 0, 0],
      color: "#c49050"
    },
    {
      id: "ramp_beta",
      size: [7, 0.8, 14],
      position: [2, 0.4, -238],
      rotation: [0.05, 0, 0],
      color: "#c49050"
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
      color: "#e0a050"
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
      color: "#e0a050"
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
      color: "#e0a050"
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
      color: "#e0a050"
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
      color: "#e05a4a"
    },
    {
      id: "rotator_2",
      size: [8.8, 0.7, 1.2],
      collisionSize: [9.6, 0.95, 1.8],
      center: [0, 2.15, -182],
      angularSpeed: -1.48,
      phase: 1.1,
      color: "#e05a4a"
    },
    {
      id: "rotator_3",
      size: [10, 0.72, 1.2],
      collisionSize: [10.8, 0.98, 1.9],
      center: [0, 1.95, -248],
      angularSpeed: 1.7,
      phase: 0.6,
      color: "#e05a4a"
    },
    {
      id: "rotator_4",
      size: [8.2, 0.72, 1.1],
      collisionSize: [8.9, 0.96, 1.7],
      center: [0, 1.95, -280],
      angularSpeed: -1.92,
      phase: 2.2,
      color: "#e05a4a"
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
