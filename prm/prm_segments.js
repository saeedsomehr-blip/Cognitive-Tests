/*
  prm_segments.js
  Richer PRM pattern generator/renderer tuned to feel closer to CANTAB stimuli:
  - curated palettes with 3-tone gradients
  - organic, symmetric templates (wings, rings, crescents, spirals)
  - curved/rotated primitives with round edges and cutouts
  Backwards compatible with legacy rectangular patterns.
*/

class PRMSegmentPatternGenerator {
  constructor() {
    // Only two hues (hot pink, soft green) with slight tonal shifts to keep single-hue look per pattern.
    this.paletteSets = [
      {
        name: "pink",
        primary: "#ff5ccf",
        accent: "#ff73d7",
        pop: "#ff8be0",
        shadow: "rgba(0,0,0,0.45)",
      },
      {
        name: "green",
        primary: "#5cff7a",
        accent: "#74ff91",
        pop: "#8cffab",
        shadow: "rgba(0,0,0,0.45)",
      },
    ];
    this.unit = 1;
    this.templates = this._createTemplates();
    this.recentTemplates = [];
    this.usageCount = new Map();
    this.recentSignatures = [];
  }

  _quantizeAngle(rad) {
    const step = Math.PI / 4; // snap to 45deg
    return Math.round(rad / step) * step;
  }

  _uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  _rand(min, max) {
    return min + Math.random() * (max - min);
  }

  _choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _computeBounds(segments, holes, strokes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of (segments || []).concat(holes || [])) {
      const x = r.x ?? 0, y = r.y ?? 0, w = r.w ?? 0, h = r.h ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    for (const s of strokes || []) {
      if (!Array.isArray(s.points)) continue;
      for (const [px, py] of s.points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    }
    if (!isFinite(minX)) {
      minX = minY = 0; maxX = maxY = 0;
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  _mirror(shapes, axis = "x") {
    return shapes.map((s) => {
      const c = { ...s };
      if (axis === "x") {
        c.x = -(s.x + s.w);
        if (c.rotation) c.rotation = -c.rotation;
      } else {
        c.y = -(s.y + s.h);
        if (c.rotation) c.rotation = -c.rotation;
      }
      return c;
    });
  }

  _paletteStops(p) {
    return [
      { offset: 0, color: p.primary },
      { offset: 0.55, color: p.accent ?? p.primary },
      { offset: 1, color: p.pop ?? p.accent ?? p.primary },
    ];
  }

  _createTemplates() {
    const T = [];

    // --- Simple / maze-like forms (closer to sample pictures) ---

    // Bar with fence-like prongs (line-only, square caps).
    T.push({
      name: "barFence",
      difficulty: 1,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.16;
        const baseLen = this._rand(3.2, 4.2);
        strokes.push({ points: [[0, 0], [baseLen, 0]], width });
        const prongs = this._choice([3, 4]);
        const usedX = [];
        const minGap = 0.35;
        for (let i = 0; i < prongs; i++) {
          let px = null;
          for (let t = 0; t < 8; t++) {
            const cand = this._rand(0.5, baseLen - 0.8);
            if (usedX.every(u => Math.abs(u - cand) >= minGap)) {
              px = cand;
              break;
            }
          }
          if (px === null) px = this._rand(0.5, baseLen - 0.8);
          usedX.push(px);
          const ph = this._rand(0.9, 1.3);
          strokes.push({ points: [[px, 0], [px, -ph]], width });
          if (Math.random() < 0.4) {
            const ext = this._rand(0.4, 0.8);
            strokes.push({ points: [[px, -ph], [px + ext, -ph]], width });
          }
        }
        if (Math.random() < 0.6) {
          const y = this._rand(0.2, 0.5);
          strokes.push({ points: [[baseLen - 1.1, y], [baseLen - 0.1, y]], width });
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: 0 };
      },
    });

    // Compact U/zig (matches sample 2).
    T.push({
      name: "miniZig",
      difficulty: 1,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.16;
        const len1 = this._rand(1.1, 1.4);
        const len2 = this._rand(0.7, 1.0);
        const len3 = this._rand(1.1, 1.4);
        const pts = [
          [0, 0],
          [len1, 0],
          [len1, -len2],
          [len1 - len3, -len2],
        ];
        strokes.push({ points: pts, width });
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: -10 };
      },
    });

    // Ridge line with multiple protrusions + trailing tail (matches sample 1).
    T.push({
      name: "ridgeLine",
      difficulty: 1,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.16;
        const baseLen = this._rand(3.2, 4.0);
        strokes.push({ points: [[0, 0], [baseLen, 0]], width });
        const n = this._choice([3, 4]);
        const used = [];
        const minGap = 0.35;
        for (let i = 0; i < n; i++) {
          let px = null;
          for (let t = 0; t < 8; t++) {
            const cand = this._rand(0.4, baseLen - 0.9);
            if (used.every(u => Math.abs(u - cand) >= minGap)) {
              px = cand; break;
            }
          }
          if (px === null) px = this._rand(0.4, baseLen - 0.9);
          used.push(px);
          const ph = this._rand(0.7, 1.2);
          strokes.push({ points: [[px, 0], [px, -ph]], width });
        }
        // trailing tail
        const tail = this._rand(0.8, 1.3);
        strokes.push({ points: [[baseLen, 0], [baseLen + tail, 0]], width });
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: 0 };
      },
    });

    // Step snake (only orthogonal straight lines).
    T.push({
      name: "stepSnake",
      difficulty: 2,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.22;
        let x = 0;
        let y = 0;
        const turns = this._choice([5, 6]);
        for (let i = 0; i < turns; i++) {
          const len = this._rand(1.0, 1.4);
          const dir = i % 2 === 0 ? 1 : -1;
          strokes.push({ points: [[x, y], [x + dir * len, y]], width });
          x += dir * len;
          const rise = this._rand(0.7, 1.1);
          if (i < turns - 1) {
            strokes.push({ points: [[x, y], [x, y + rise]], width });
            y += rise;
          }
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.02, gradientAngle: -10 };
      },
    });

    // Maze-like serpent (longer zig + random hooks).
    T.push({
      name: "mazeSerpent",
      difficulty: 3,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      weight: 0.5,
      build: () => {
        const strokes = [];
        const width = 0.12;
        const step = this._rand(0.9, 1.2);
        const steps = this._choice([7, 8, 9, 10]);
        const minGap = 0.4;
        const pts = [[0, 0]];
        const segments = [];

        const dirVecs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];

        const intersects = (x1, y1, x2, y2) => {
          for (const s of segments) {
            // ignore if sharing start point
            if (s.x2 === x1 && s.y2 === y1) continue;
            // axis-aligned, check overlap with gap
            if (s.x1 === s.x2 && x1 === x2) {
              if (Math.abs(s.x1 - x1) < minGap) {
                const a1 = Math.min(s.y1, s.y2), a2 = Math.max(s.y1, s.y2);
                const b1 = Math.min(y1, y2), b2 = Math.max(y1, y2);
                if (Math.min(a2, b2) - Math.max(a1, b1) > 0) return true;
              }
            } else if (s.y1 === s.y2 && y1 === y2) {
              if (Math.abs(s.y1 - y1) < minGap) {
                const a1 = Math.min(s.x1, s.x2), a2 = Math.max(s.x1, s.x2);
                const b1 = Math.min(x1, x2), b2 = Math.max(x1, x2);
                if (Math.min(a2, b2) - Math.max(a1, b1) > 0) return true;
              }
            } else {
              // perpendicular intersection
              if (
                ((x1 >= Math.min(s.x1, s.x2) - minGap) && (x1 <= Math.max(s.x1, s.x2) + minGap) &&
                  (s.y1 >= Math.min(y1, y2) - minGap) && (s.y1 <= Math.max(y1, y2) + minGap)) ||
                ((s.x1 >= Math.min(x1, x2) - minGap) && (s.x1 <= Math.max(x1, x2) + minGap) &&
                  (y1 >= Math.min(s.y1, s.y2) - minGap) && (y1 <= Math.max(s.y1, s.y2) + minGap))
              ) {
                return true;
              }
            }
          }
          return false;
        };

        let x = 0, y = 0;
        for (let i = 0; i < steps; i++) {
          const dirs = dirVecs.slice().sort(() => Math.random() - 0.5);
          let moved = false;
          for (const [dx, dy] of dirs) {
            const nx = x + dx * step;
            const ny = y + dy * step;
            if (intersects(x, y, nx, ny)) continue;
            segments.push({ x1: x, y1: y, x2: nx, y2: ny });
            pts.push([nx, ny]);
            x = nx; y = ny;
            moved = true;
            break;
          }
          if (!moved) break;
        }

        strokes.push({ points: pts, width });
        return { segments: [], strokes, holes: [], scaleHint: 1.04, gradientAngle: -15 };
      },
    });

    // Abstract split spines (new category 1).
    T.push({
      name: "splitSpines",
      difficulty: 2,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.16;
        const spineLen = this._rand(2.6, 3.4);
        const offset = this._rand(0.5, 0.9);
        // two vertical spines
        strokes.push({ points: [[0, -spineLen / 2], [0, spineLen / 2]], width });
        strokes.push({ points: [[offset, -spineLen / 2], [offset, spineLen / 2]], width });
        // cross links
        const links = this._choice([2, 3]);
        for (let i = 0; i < links; i++) {
          const y = -spineLen / 2 + (i + 1) * (spineLen / (links + 1));
          const bias = this._rand(-0.3, 0.3);
          strokes.push({ points: [[0, y], [offset + bias, y]], width });
        }
        // small branch
        if (Math.random() < 0.6) {
          const yb = this._rand(-spineLen / 2, spineLen / 2);
          const len = this._rand(0.8, 1.2);
          strokes.push({ points: [[offset, yb], [offset + len, yb]], width });
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: 0 };
      },
    });

    // Abstract fork grid (new category 2).
    T.push({
      name: "forkGrid",
      difficulty: 2,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.15;
        const baseLen = this._rand(3.0, 3.8);
        strokes.push({ points: [[-baseLen / 2, 0], [baseLen / 2, 0]], width });
        const forks = this._choice([3, 4]);
        for (let i = 0; i < forks; i++) {
          const px = -baseLen / 2 + (i + 0.5) * (baseLen / forks);
          const lenUp = this._rand(0.8, 1.3);
          const lenDown = this._rand(0.6, 1.0);
          strokes.push({ points: [[px, 0], [px, lenUp]], width });
          if (Math.random() < 0.8) strokes.push({ points: [[px, 0], [px, -lenDown]], width });
        }
        // slight diagonal connector
        if (Math.random() < 0.5) {
          const dx = this._rand(0.4, 0.8);
          strokes.push({ points: [[-baseLen / 4, 0], [-baseLen / 4 + dx, this._rand(0.4, 0.8)]], width });
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: -10 };
      },
    });

    // Nested stair bars (layered horizontals with vertical connectors).
    T.push({
      name: "nestedStairs",
      difficulty: 2,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.2;
        const rows = this._choice([3, 4]);
        let y = 0;
        for (let i = 0; i < rows; i++) {
          const len = this._rand(2.6, 3.6) - i * 0.25;
          strokes.push({ points: [[i * 0.4, y], [i * 0.4 + len, y]], width });
          if (i < rows - 1) {
            strokes.push({ points: [[i * 0.4 + len, y], [i * 0.4 + len, y + 0.9]], width });
            y += 0.9;
          }
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: 0 };
      },
    });

    // Offset ladder (orthogonal rungs, no curves).
    T.push({
      name: "offsetLadder",
      difficulty: 1,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.2;
        const rails = 2;
        const height = this._rand(2.6, 3.2);
        for (let i = 0; i < rails; i++) {
          strokes.push({ points: [[i * 2.2, 0], [i * 2.2, height]], width });
        }
        const rungs = this._choice([3, 4, 5]);
        for (let i = 0; i < rungs; i++) {
          const y = (i / (rungs - 1)) * (height - width);
          const offset = (i % 2 === 0 ? 0 : 0.6);
          strokes.push({ points: [[offset, y], [rails * 2.2 - offset - 0.1, y]], width });
        }
        return { segments: [], strokes, holes: [], scaleHint: 0.95, gradientAngle: -5 };
      },
    });

    // Box stripes: rectangles and inner bars.
    T.push({
      name: "boxStripes",
      difficulty: 2,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const holes = [];
        const w = this._rand(4.0, 4.6);
        const h = this._rand(2.2, 2.8);
        const width = 0.18;
        strokes.push({ points: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]], width });
        const stripes = this._choice([2, 3]);
        for (let i = 0; i < stripes; i++) {
          const y = -h / 2 + (i + 1) * (h / (stripes + 1));
          strokes.push({ points: [[-w / 2 + 0.3, y], [w / 2 - 0.3, y]], width });
        }
        holes.push({ type: "rect", x: -w * 0.15, y: -0.4, w: w * 0.3, h: 0.8, radius: 0 });
        return { segments: [], strokes, holes, scaleHint: 0.92, gradientAngle: 0 };
      },
    });

    // Bracket maze: alternating long/short bars forming nested brackets.
    T.push({
      name: "bracketMaze",
      difficulty: 2,
      linear: true,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const strokes = [];
        const width = 0.2;
        let x = 0;
        let y = 0;
        const pairs = this._choice([3, 4]);
        for (let i = 0; i < pairs; i++) {
          const lenLong = this._rand(2.6, 3.4);
          const lenShort = lenLong * this._rand(0.45, 0.6);
          strokes.push({ points: [[x, y], [x + lenLong, y]], width });
          y += 0.7;
          strokes.push({ points: [[x + lenLong, y - 0.7], [x + lenLong, y]], width });
          strokes.push({ points: [[x + lenLong - lenShort, y], [x + lenLong, y]], width });
          y += 0.7;
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: 0 };
      },
    });

    // Minimal L with block (screenshot-like).
    T.push({
      name: "microL",
      difficulty: 1,
      build: () => {
        const segs = [];
        const thick = 0.55;
        const baseLen = this._rand(2.6, 3.2);
        segs.push({ type: "rect", x: 0, y: 0, w: thick * 1.6, h: thick * 1.6, tone: "primary" });
        segs.push({ type: "capsule", x: thick * 1.4, y: thick * 0.45, w: baseLen, h: thick, tone: "primary" });
        segs.push({ type: "capsule", x: thick * 0.7, y: thick * -1.0, w: thick, h: baseLen * 0.55, tone: "primary" });
        return { segments: segs, holes: [], scaleHint: 1.0, gradientAngle: -10 };
      },
    });

    // Comb runner: base bar with 3-4 teeth (horizontal spikes).
    T.push({
      name: "combRunner",
      difficulty: 1,
      build: () => {
        const segs = [];
        const thick = 0.5;
        const baseLen = this._rand(3.2, 4.0);
        segs.push({ type: "capsule", x: 0, y: 0, w: baseLen, h: thick, tone: "primary" });
        const nTeeth = this._choice([3, 4]);
        for (let i = 0; i < nTeeth; i++) {
          const tx = this._rand(0.5, baseLen - 0.8);
          const th = this._choice([1.2, 1.5, 1.8]);
          segs.push({ type: "capsule", x: tx, y: -th, w: thick, h: th, tone: "primary" });
        }
        return { segments: segs, holes: [], scaleHint: 1.05, gradientAngle: -5 };
      },
    });

    // Tight maze loop / U-turn chain.
    T.push({
      name: "loopMaze",
      difficulty: 2,
      build: () => {
        const segs = [];
        const thick = 0.55;
        const step = this._choice([1.1, 1.25]);
        let x = 0;
        let y = 0;
        const turns = this._choice([4, 5, 6]);
        for (let i = 0; i < turns; i++) {
          const len = this._rand(1.5, 2.0);
          const dir = i % 2 === 0 ? 1 : -1;
          segs.push({ type: "capsule", x, y, w: len, h: thick, tone: "primary" });
          x += dir * len;
          segs.push({ type: "capsule", x: x - thick, y: y, w: thick, h: step, tone: "primary" });
          y += step;
        }
        segs.push({ type: "capsule", x: x - (turns % 2 ? step : 0), y: y - step, w: step + 0.5, h: thick, tone: "primary" });
        return { segments: segs, holes: [], scaleHint: 1.05, gradientAngle: -40 };
      },
    });

    // Zig-stair with small kinks.
    T.push({
      name: "zigStair",
      difficulty: 2,
      build: () => {
        const segs = [];
        const thick = 0.55;
        let x = 0;
        let y = 0;
        const steps = this._choice([4, 5]);
        for (let i = 0; i < steps; i++) {
          const len = this._rand(1.3, 1.8);
          segs.push({ type: "capsule", x, y, w: len, h: thick, tone: "primary" });
          x += len;
          if (i < steps - 1) {
            const rise = this._choice([0.8, 1.0]);
            segs.push({ type: "capsule", x: x - thick, y: y, w: thick, h: rise, tone: "primary" });
            y += rise;
          }
        }
        return { segments: segs, holes: [], scaleHint: 1.02, gradientAngle: -15 };
      },
    });

    // Bar with twin triangular cutouts (bow-tie).
    T.push({
      name: "bowCutout",
      difficulty: 1,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const segs = [];
        const holes = [];
        const w = this._rand(3.4, 4.6);
        const h = this._rand(0.85, 1.05);
        segs.push({ type: "capsule", x: -w / 2, y: -h / 2, w, h, tone: "primary" });
        const triW = this._rand(0.9, 1.2);
        const triH = this._rand(0.65, 0.85);
        const gap = this._rand(0.15, 0.35);
        holes.push({ type: "triangle", x: -gap - triW, y: -triH / 2, w: triW, h: triH, direction: "right" });
        holes.push({ type: "triangle", x: gap, y: -triH / 2, w: triW, h: triH, direction: "left" });
        if (Math.random() < 0.35) {
          holes.push({ type: "circle", x: -0.35, y: -h * 0.15, w: 0.7, h: 0.7 });
          holes.push({ type: "circle", x: 0.35, y: -h * 0.15, w: 0.7, h: 0.7 });
        }
        return { segments: segs, holes, scaleHint: 1.0, gradientAngle: -5 };
      },
    });

    // Bow cutout variant with layered cutouts.
    T.push({
      name: "bowCutoutPlus",
      difficulty: 2,
      allowRotation: false,
      allowFlip: false,
      build: () => {
        const segs = [];
        const holes = [];
        const w = this._rand(3.8, 4.8);
        const h = this._rand(1.0, 1.3);
        segs.push({ type: "capsule", x: -w / 2, y: -h / 2, w, h, tone: "primary" });
        segs.push({ type: "capsule", x: -w / 2 + 0.4, y: -h / 2 + 0.25, w: w - 0.8, h: h * 0.55, tone: "accent", alpha: 0.9 });
        const triW = this._rand(0.8, 1.1);
        const triH = this._rand(0.6, 0.9);
        const gap = this._rand(0.2, 0.4);
        holes.push({ type: "triangle", x: -gap - triW, y: -triH / 2, w: triW, h: triH, direction: "right" });
        holes.push({ type: "triangle", x: gap, y: -triH / 2, w: triW, h: triH, direction: "left" });
        holes.push({ type: "circle", x: -0.5, y: 0, w: 0.6, h: 0.6 });
        holes.push({ type: "circle", x: 0.5, y: 0, w: 0.6, h: 0.6 });
        if (Math.random() < 0.5) {
          holes.push({ type: "rect", x: -0.6, y: -0.15, w: 1.2, h: 0.3, radius: 0 });
        }
        return { segments: segs, holes, scaleHint: 1.0, gradientAngle: -5 };
      },
    });

    // Rail maze: long horizontal path with alternating offsets.
    T.push({
      name: "railMaze",
      difficulty: 2,
      build: () => {
        const segs = [];
        const thick = 0.5;
        let x = 0;
        let y = 0;
        const runs = this._choice([4, 5, 6]);
        for (let i = 0; i < runs; i++) {
          const len = this._rand(1.6, 2.3);
          segs.push({ type: "capsule", x, y, w: len, h: thick, tone: "primary" });
          x += len;
          if (i < runs - 1) {
            const offset = (i % 2 === 0 ? 1 : -1) * this._choice([0.8, 1.0, 1.2]);
            segs.push({ type: "capsule", x: x - thick, y, w: thick, h: offset, tone: "primary" });
            y += offset;
          }
        }
        return { segments: segs, holes: [], scaleHint: 1.04, gradientAngle: -20 };
      },
    });

    // Multi-branch lines (T / Y hybrid).
    T.push({
      name: "multiBranch",
      difficulty: 2,
      build: () => {
        const strokes = [];
        const width = 0.16;
        const spine = this._rand(2.8, 3.6);
        strokes.push({ points: [[-spine / 2, 0], [spine / 2, 0]], width });
        const branches = this._choice([2, 3, 4]);
        const used = [];
        for (let i = 0; i < branches; i++) {
          let bx = null;
          for (let t = 0; t < 8; t++) {
            const cand = -spine / 2 + this._rand(0.3, spine - 0.4);
            if (used.every((u) => Math.abs(u - cand) >= 0.25)) {
              bx = cand;
              break;
            }
          }
          if (bx === null) bx = -spine / 2 + this._rand(0.3, spine - 0.4);
          used.push(bx);
          const up = i % 2 === 0;
          const len = this._rand(1.3, 1.9);
          strokes.push({ points: [[bx, 0], [bx, up ? -len : len]], width });
        }
        if (Math.random() < 0.3) {
          strokes.push({ points: [[0, -0.8], [0, 0.8]], width });
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.02, gradientAngle: -30 };
      },
    });

    // Compact spiral-like maze.
    T.push({
      name: "spiralMaze",
      difficulty: 2,
      build: () => {
        const segs = [];
        const thick = 0.5;
        let x = 0;
        let y = 0;
        const step = this._rand(1.0, 1.3);
        for (let i = 0; i < 5; i++) {
          const len = Math.max(1.2, step * (2.6 - i * 0.2));
          segs.push({ type: "capsule", x, y, w: len, h: thick, tone: "primary" });
          x += (i % 2 === 0 ? 1 : -1) * len;
          segs.push({ type: "capsule", x: x - thick, y, w: thick, h: step, tone: "primary" });
          y += step;
        }
        return { segments: segs, holes: [], scaleHint: 1.06, gradientAngle: -50 };
      },
    });

    // Multi-part ladder-like.
    T.push({
      name: "ladderMaze",
      difficulty: 1,
      build: () => {
        const segs = [];
        const thick = 0.5;
        const rails = this._choice([2, 3]);
        const height = this._rand(2.4, 3.2);
        for (let i = 0; i < rails; i++) {
          segs.push({ type: "capsule", x: i * 2.4, y: 0, w: thick, h: height, tone: "primary" });
        }
        const rungs = this._choice([3, 4, 5]);
        for (let i = 0; i < rungs; i++) {
          const y = (i / (rungs - 1)) * (height - thick);
          segs.push({ type: "capsule", x: 0, y, w: rails * 2.4 - thick, h: thick, tone: "primary" });
        }
        return { segments: segs, holes: [], scaleHint: 0.95, gradientAngle: -5 };
      },
    });

    // Orthogonal right-angle bars.
    T.push({
      name: "rightAngles",
      difficulty: 1,
      build: () => {
        const segs = [];
        const thick = 0.6;
        const len1 = this._rand(2.2, 3.0);
        const len2 = this._rand(1.8, 2.6);
        segs.push({ type: "capsule", x: 0, y: 0, w: len1, h: thick, tone: "primary" });
        segs.push({ type: "capsule", x: 0, y: -len2 + thick, w: thick, h: len2, tone: "primary" });
        if (Math.random() < 0.6) {
          const len3 = this._rand(1.4, 2.0);
          segs.push({ type: "capsule", x: len1 * 0.35, y: -len2, w: len3, h: thick, tone: "primary" });
        }
        return { segments: segs, holes: [], scaleHint: 1.0, gradientAngle: -15 };
      },
    });

    // Triangle fan (stroke-based triangles).
    T.push({
      name: "triangleFan",
      difficulty: 2,
      linear: true,
      build: () => {
        const strokes = [];
        const count = this._choice([4, 5]);
        const base = this._rand(1.4, 1.9);
        const height = this._rand(1.2, 1.6);
        const width = 0.2;
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI / 7) * (i - (count - 1) / 2);
          const p1 = [-base / 2, height];
          const p2 = [base / 2, height];
          const p3 = [0, -height];
          const rotate = ([x, y]) => {
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            return [x * cos - y * sin, x * sin + y * cos];
          };
          const pts = [p1, p2, p3, p1].map(rotate);
          strokes.push({ points: pts, width });
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.05, gradientAngle: -60 };
      },
    });

    // Trapezoid crown.
    T.push({
      name: "trapezoidCrown",
      difficulty: 2,
      build: () => {
        const strokes = [];
        const baseW = this._rand(3.6, 4.2);
        const h = this._rand(1.6, 2.0);
        const taper = 0.25;
        const topW = baseW * (1 - taper);
        const halfTop = topW / 2;
        const halfBase = baseW / 2;
        const yTop = 0;
        const yBot = h;
        const wStroke = 0.18;
        // Trapezoid outline via stroke path (no prebuilt shape)
        strokes.push({
          points: [
            [-halfBase, yBot],
            [halfBase, yBot],
            [halfTop, yTop],
            [-halfTop, yTop],
            [-halfBase, yBot],
          ],
          width: wStroke,
        });
        // Teeth as stroke rectangles
        const toothW = this._rand(0.6, 0.9);
        const toothH = this._rand(0.8, 1.1);
        const teeth = this._choice([3, 4]);
        for (let i = 0; i < teeth; i++) {
          const cx = -baseW / 2 + (i + 0.5) * (baseW / teeth);
          const left = cx - toothW / 2;
          const right = cx + toothW / 2;
          const top = yTop - toothH;
          strokes.push({
            points: [
              [left, top],
              [right, top],
              [right, yTop],
              [left, yTop],
              [left, top],
            ],
            width: wStroke,
          });
        }
        return { segments: [], strokes, holes: [], scaleHint: 1.0, gradientAngle: -5 };
      },
    });

    // Nested rectangles with diagonal bar.
    T.push({
      name: "nestedRect",
      difficulty: 1,
      build: () => {
        const segs = [];
        const holes = [];
        const outerW = this._rand(4.2, 4.8);
        const outerH = this._rand(2.6, 3.0);
        segs.push({ type: "rect", x: -outerW / 2, y: -outerH / 2, w: outerW, h: outerH, radius: 0.4, tone: "primary" });
        const innerW = outerW * this._rand(0.45, 0.55);
        const innerH = outerH * this._rand(0.35, 0.45);
        holes.push({ type: "rect", x: -innerW / 2, y: -innerH / 2, w: innerW, h: innerH, radius: 0.25 });
        segs.push({ type: "capsule", x: -outerW / 2, y: 0, w: outerW, h: 0.5, rotation: this._choice([0, Math.PI / 4, -Math.PI / 4]), tone: "accent" });
        return { segments: segs, holes, scaleHint: 0.95, gradientAngle: -25 };
      },
    });

    // Offset rectangle maze (orthogonal).
    T.push({
      name: "offsetRectMaze",
      difficulty: 2,
      build: () => {
        const segs = [];
        const thick = 0.55;
        const rows = this._choice([3, 4]);
        let y = 0;
        for (let i = 0; i < rows; i++) {
          const len = this._rand(2.8, 3.6);
          const offset = (i % 2 === 0 ? 1 : -1) * this._rand(0.6, 1.0);
          segs.push({ type: "capsule", x: offset, y, w: len, h: thick, tone: "primary" });
          if (i < rows - 1) {
            segs.push({ type: "capsule", x: offset + len - thick, y, w: thick, h: 1.0, tone: "primary" });
            y += 1.0;
          }
        }
        return { segments: segs, holes: [], scaleHint: 1.0, gradientAngle: -10 };
      },
    });

    // --- Existing organic templates (kept for richness) ---

    // Butterfly-like mask with mirrored wings.
    T.push({
      name: "butterflyMask",
      difficulty: 2,
      build: () => {
        const segs = [];
        const holes = [];
        const spineH = this._rand(3.8, 4.6);
        segs.push({ type: "capsule", x: -0.35, y: -spineH / 2, w: 0.7, h: spineH, tone: "primary" });

        const wingW = this._rand(2.4, 3.0);
        const wingH = this._rand(2.0, 2.6);
        const tilt = this._rand(-0.28, 0.28);

        const leftWings = [
          { type: "ellipse", x: -wingW - 0.3, y: -wingH / 2, w: wingW, h: wingH, rotation: tilt, tone: "accent", alpha: 0.95 },
          { type: "ellipse", x: -wingW * 0.9 - 0.2, y: -wingH * 0.55, w: wingW * 0.85, h: wingH * 0.95, rotation: tilt * 0.25, tone: "primary", alpha: 0.9 },
        ];
        const rightWings = this._mirror(leftWings, "x");
        segs.push(...leftWings, ...rightWings);

        const eyeHoles = [
          { type: "circle", x: -wingW * 0.58, y: -0.25, w: 0.65, h: 0.65 },
          { type: "circle", x: -wingW * 0.58, y: 0.55, w: 0.55, h: 0.55 },
        ];
        holes.push(...eyeHoles, ...this._mirror(eyeHoles, "x"));
        holes.push({ type: "circle", x: -0.5, y: -2.15, w: 1.0, h: 1.0 });

        return { segments: segs, holes, scaleHint: 0.95, gradientAngle: -30 };
      },
    });

    // Orbital ring with cross bars.
    T.push({
      name: "orbitalRing",
      difficulty: 2,
      build: () => {
        const segs = [];
        const holes = [];
        const radius = this._rand(2.3, 2.8);
        segs.push({ type: "circle", x: -radius, y: -radius, w: radius * 2, h: radius * 2, tone: "primary" });
        holes.push({ type: "circle", x: -radius * 0.55, y: -radius * 0.55, w: radius * 1.1, h: radius * 1.1 });

        const barW = this._rand(0.7, 0.95);
        const barLen = radius * 2 + this._rand(0.8, 1.2);
        segs.push({ type: "capsule", x: -barLen / 2, y: -barW / 2, w: barLen, h: barW, rotation: this._rand(-0.15, 0.15), tone: "accent" });
        segs.push({ type: "capsule", x: -barW / 2, y: -barLen / 2, w: barW, h: barLen, rotation: this._rand(-0.22, 0.22), tone: "pop", alpha: 0.9 });

        const orbitLen = this._rand(2.6, 3.2);
        segs.push({ type: "capsule", x: -orbitLen / 2 - 0.6, y: -1.2, w: orbitLen, h: 0.55, rotation: this._rand(0.7, 0.95), tone: "primary", alpha: 0.88 });
        holes.push({ type: "circle", x: radius * 0.35, y: -0.25, w: 0.7, h: 0.7 });

        return { segments: segs, holes, scaleHint: 0.9, gradientAngle: this._rand(-60, -25) };
      },
    });

    // Radial petals / star.
    T.push({
      name: "petalStar",
      difficulty: 2,
      build: () => {
        const segs = [];
        const holes = [];
        const petals = this._choice([5, 6]);
        const armLen = this._rand(2.8, 3.3);
        const armW = this._rand(0.8, 1.0);

        for (let i = 0; i < petals; i++) {
          const ang = (Math.PI * 2 * i) / petals + this._rand(-0.05, 0.05);
          const dist = this._rand(0.65, 1.05);
          const cx = Math.cos(ang) * dist;
          const cy = Math.sin(ang) * dist;
          segs.push({
            type: "capsule",
            x: cx - armLen / 2,
            y: cy - armW / 2,
            w: armLen,
            h: armW,
            rotation: ang,
            tone: i % 2 === 0 ? "accent" : "primary",
            alpha: 0.95,
          });
        }

        holes.push({ type: "circle", x: -0.6, y: -0.6, w: 1.2, h: 1.2 });
        return { segments: segs, holes, scaleHint: 1.0, gradientAngle: -90 };
      },
    });

    // Crescent with bridge cut.
    T.push({
      name: "crescentBridge",
      difficulty: 1,
      build: () => {
        const segs = [];
        const holes = [];
        const mainR = this._rand(2.4, 2.8);
        segs.push({ type: "circle", x: -mainR, y: -mainR, w: mainR * 2, h: mainR * 2, tone: "primary" });

        const holeR = mainR * this._rand(0.45, 0.6);
        holes.push({ type: "circle", x: -holeR + mainR * 0.35, y: -holeR, w: holeR * 2, h: holeR * 2 });

        const bridgeLen = this._rand(3.4, 4.4);
        segs.push({ type: "capsule", x: -bridgeLen / 2, y: mainR * 0.05, w: bridgeLen, h: 0.55, tone: "accent" });
        const notchW = this._rand(0.7, 1.0);
        holes.push({ type: "capsule", x: -notchW / 2, y: mainR * 0.52, w: notchW, h: 0.7 });

        return { segments: segs, holes, scaleHint: 0.92, gradientAngle: -25 };
      },
    });

    // Tilted cross with diagonal arms.
    T.push({
      name: "tiltedCross",
      difficulty: 2,
      build: () => {
        const segs = [];
        const holes = [];
        const armLen = this._rand(3.4, 4.4);
        const armW = this._rand(0.6, 0.85);
        const angles = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4];
        angles.forEach((a, idx) => {
          const len = idx < 2 ? armLen : armLen * 0.72;
          segs.push({
            type: "capsule",
            x: -len / 2,
            y: -armW / 2,
            w: len,
            h: armW,
            rotation: a,
            tone: idx % 2 ? "accent" : "primary",
            alpha: idx > 1 ? 0.9 : 1,
          });
        });
        holes.push({ type: "circle", x: -0.7, y: -0.7, w: 1.4, h: 1.4 });

        return { segments: segs, holes, scaleHint: 1.0, gradientAngle: -70 };
      },
    });

    // Layered waves.
    T.push({
      name: "waveStack",
      difficulty: 1,
      build: () => {
        const segs = [];
        const holes = [];
        const rows = this._choice([3, 4]);
        const baseLen = this._rand(3.8, 4.4);
        const bandH = 0.65;

        for (let i = 0; i < rows; i++) {
          const len = baseLen - i * 0.4 + this._rand(-0.2, 0.2);
          const y = (i - (rows - 1) / 2) * 0.95;
          const rot = (i % 2 === 0 ? 1 : -1) * this._rand(0.12, 0.22);
          segs.push({
            type: "capsule",
            x: -len / 2,
            y,
            w: len,
            h: bandH,
            rotation: rot,
            tone: i % 2 ? "accent" : "primary",
            alpha: 0.92,
          });
        }

        holes.push({ type: "capsule", x: -1, y: -0.3, w: 2, h: 0.45 });
        return { segments: segs, holes, scaleHint: 1.05, gradientAngle: -40 };
      },
    });

    // Mask-like plate with facial cutouts.
    T.push({
      name: "maskPlate",
      difficulty: 2,
      build: () => {
        const segs = [];
        const holes = [];
        const w = this._rand(4.8, 5.6);
        const h = this._rand(2.6, 3.0);
        segs.push({ type: "rect", x: -w / 2, y: -h / 2, w, h, radius: 0.5, tone: "primary" });
        const eyeW = 0.9;
        holes.push({ type: "circle", x: -w * 0.25 - 0.45, y: -0.45, w: eyeW, h: eyeW });
        holes.push({ type: "circle", x: w * 0.25 - 0.45, y: -0.45, w: eyeW, h: eyeW });
        holes.push({ type: "trapezoid", x: -w * 0.22, y: h * 0.05, w: w * 0.44, h: 0.9, taper: 0.35 });
        segs.push({ type: "capsule", x: -w * 0.18, y: -h * 0.45, w: w * 0.36, h: 0.5, tone: "accent" });

        return { segments: segs, holes, scaleHint: 0.95, gradientAngle: -10 };
      },
    });

    // Totem stack with tapered slabs.
    T.push({
      name: "stackedTotem",
      difficulty: 2,
      build: () => {
        const segs = [];
        const holes = [];
        const layers = 3;
        let y = -2.8;

        for (let i = 0; i < layers; i++) {
          const blockH = this._choice([1.0, 1.15]);
          const blockW = this._rand(3.2, 4.0) - i * 0.4;
          segs.push({
            type: "trapezoid",
            x: -blockW / 2,
            y,
            w: blockW,
            h: blockH,
            taper: this._rand(0.15, 0.35),
            tone: i % 2 ? "accent" : "primary",
          });
          holes.push({
            type: "capsule",
            x: -0.5,
            y: y + blockH * 0.22,
            w: 1.0,
            h: 0.45,
            rotation: i % 2 === 0 ? 0.1 : -0.1,
          });
          y += blockH - 0.05;
        }

        segs.push({ type: "capsule", x: -0.35, y: y - 0.4, w: 0.7, h: 3.8, tone: "pop", alpha: 0.85 });
        return { segments: segs, holes, scaleHint: 0.98, gradientAngle: -50 };
      },
    });

    // Dual ring with arms.
    T.push({
      name: "ringedDiad",
      difficulty: 3,
      weight: 0.5,
      build: () => {
        const segs = [];
        const holes = [];
        const coreR = this._rand(1.6, 1.9);
        const baseRot = this._choice([0, Math.PI / 6, Math.PI / 4, -Math.PI / 6, -Math.PI / 4]);
        segs.push({ type: "circle", x: -coreR, y: -coreR, w: coreR * 2, h: coreR * 2, rotation: baseRot });
        holes.push({ type: "circle", x: -coreR * 0.5 + this._rand(-0.2, 0.2), y: -coreR * 0.5 + this._rand(-0.2, 0.2), w: coreR, h: coreR, rotation: baseRot });

        const arms = this._choice([1, 2, 3]);
        for (let i = 0; i < arms; i++) {
          const len = this._rand(2.4, 3.6);
          const h = this._rand(0.4, 0.65) + i * 0.08;
          const ang = baseRot + (i === 0 ? 0 : (i === 1 ? Math.PI / 2 : -Math.PI / 2)) + this._rand(-0.15, 0.15);
          const dist = this._rand(1.0, 1.6);
          const cx = Math.cos(ang) * dist;
          const cy = Math.sin(ang) * dist;
          segs.push({
            type: "capsule",
            x: cx - len / 2,
            y: cy - h / 2,
            w: len,
            h,
            rotation: ang,
            tone: i % 2 ? "accent" : "primary",
          });
        }

        holes.push({ type: "capsule", x: -1.4, y: coreR * 0.7, w: 2.8, h: 0.5, rotation: baseRot + this._rand(-0.25, 0.25) });
        return { segments: segs, holes, scaleHint: 0.96, gradientAngle: -35 };
      },
    });

    return T;
  }

  _transformPattern(baseSegments, baseHoles, baseStrokes = [], scaleHint = 1, opts = {}) {
    const sgs = baseSegments.map((r) => ({ ...r }));
    const hls = baseHoles.map((r) => ({ ...r }));
    const sts = baseStrokes.map((s) => ({ ...s, points: s.points.map((p) => [...p]) }));
    const allRects = sgs.concat(hls);

    const allowRotation = opts.allowRotation ?? true;
    const allowFlip = opts.allowFlip ?? true;
    const flipX = allowFlip ? Math.random() < 0.35 : false;
    const flipY = allowFlip ? Math.random() < 0.15 : false;
    const rot90 = allowRotation ? Math.random() < 0.05 : false;

    const baseScale = this._rand(0.9, 1.12) * scaleHint;
    const jitter = 0.02;

    const applyCornerRotation = (r) => {
      const angle = r.rotation || 0;
      const x = r.x;
      const y = r.y;
      const w = r.w;
      const h = r.h;
      if (!angle) {
        return {
          minX: x,
          minY: y,
          maxX: x + w,
          maxY: y + h,
        };
      }
      const cx = x + w / 2;
      const cy = y + h / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const corners = [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [-w / 2, h / 2],
        [w / 2, h / 2],
      ].map(([px, py]) => {
        const rx = px * cos - py * sin;
        const ry = px * sin + py * cos;
        return [cx + rx, cy + ry];
      });
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      corners.forEach(([px, py]) => {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      });
      return { minX, minY, maxX, maxY };
    };

    for (const r of allRects) {
      if (flipX) {
        r.x = -r.x - r.w;
        if (r.rotation) r.rotation = -r.rotation;
      }
      if (flipY) {
        r.y = -r.y - r.h;
        if (r.rotation) r.rotation = -r.rotation;
      }

      if (rot90) {
        const oldX = r.x;
        const oldW = r.w;
        r.x = r.y;
        r.y = -oldX - r.w;
        r.w = r.h;
        r.h = oldW;
        if (r.rotation) r.rotation += Math.PI / 2;
      }

      r.x *= baseScale;
      r.y *= baseScale;
      r.w *= baseScale;
      r.h *= baseScale;

      r.x += this._rand(-jitter, jitter);
      r.y += this._rand(-jitter, jitter);

      if (r.rotation != null) {
        r.rotation = this._quantizeAngle(r.rotation);
      }

      if (r.w < 0) {
        r.x += r.w;
        r.w = -r.w;
      }
      if (r.h < 0) {
        r.y += r.h;
        r.h = -r.h;
      }
    }

    const transformPoint = (pt) => {
      let [px, py] = pt;
      if (flipX) px = -px;
      if (flipY) py = -py;
      if (rot90) {
        const oldX = px;
        px = py;
        py = -oldX;
      }
      px *= baseScale;
      py *= baseScale;
      px += this._rand(-jitter, jitter);
      py += this._rand(-jitter, jitter);
      return [px, py];
    };

    for (const s of sts) {
      s.points = s.points.map((pt) => transformPoint(pt));
      s.width = (s.width || 0.2) * baseScale;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const r of allRects) {
      const b = applyCornerRotation(r);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
    for (const s of sts) {
      for (const [px, py] of s.points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    for (const r of allRects) {
      r.x -= cx;
      r.y -= cy;
    }
    for (const s of sts) {
      s.points = s.points.map(([px, py]) => [px - cx, py - cy]);
    }

    return { segments: sgs, holes: hls, strokes: sts };
  }

  generatePattern() {
    let attempt = 0;
    while (attempt < 4) {
      const template = this._pickTemplate();
      const palette = this._choice(this.paletteSets);
      const base = template.build(palette);
      const allowRotation = base.allowRotation ?? !template.linear;
      const allowFlip = base.allowFlip ?? true;
      const transformed = this._transformPattern(
        base.segments,
        base.holes || [],
        base.strokes || [],
        base.scaleHint || 1,
        { allowRotation, allowFlip }
      );
      const gradientStops = base.gradientStops || this._paletteStops(palette);
      const bounds = this._computeBounds(transformed.segments, transformed.holes, transformed.strokes);
      const sig = {
        template: template.name,
        segs: (transformed.segments || []).length,
        strokes: (transformed.strokes || []).length,
        w: Math.max(bounds.w, 0.01),
        h: Math.max(bounds.h, 0.01),
      };

      const isSimilar = this.recentSignatures.some((s) => {
        if (s.template !== sig.template) return false;
        if (Math.abs(s.segs - sig.segs) > 1) return false;
        if (Math.abs(s.strokes - sig.strokes) > 1) return false;
        const rw = Math.abs(Math.log(s.w / sig.w));
        const rh = Math.abs(Math.log(s.h / sig.h));
        return rw < 0.18 && rh < 0.18;
      });

      if (isSimilar) {
        attempt++;
        continue;
      }

      this.recentSignatures.push(sig);
      if (this.recentSignatures.length > 8) this.recentSignatures.shift();

      return {
        id: this._uuid(),
        templateName: template.name,
        difficulty: template.difficulty || 2,
        color: palette.primary,
        palette,
        gradientStops,
        gradientAngle: base.gradientAngle ?? -35,
        segments: transformed.segments,
        holes: transformed.holes,
        strokes: transformed.strokes || [],
      };
    }

    // fallback if filtered too many times
    const template = this._pickTemplate();
    const palette = this._choice(this.paletteSets);
    const base = template.build(palette);
    const transformed = this._transformPattern(
      base.segments,
      base.holes || [],
      base.strokes || [],
      base.scaleHint || 1,
      { allowRotation: base.allowRotation ?? !template.linear, allowFlip: base.allowFlip ?? true }
    );
    return {
      id: this._uuid(),
      templateName: template.name,
      difficulty: template.difficulty || 2,
      color: palette.primary,
      palette,
      gradientStops: base.gradientStops || this._paletteStops(palette),
      gradientAngle: base.gradientAngle ?? -35,
      segments: transformed.segments,
      holes: transformed.holes,
      strokes: transformed.strokes || [],
    };
  }

  // Prefer templates that were not just used to reduce visual similarity bursts.
  _pickTemplate() {
    const candidates = this.templates.slice();
    // Try to avoid last 4 templates
    const filtered = candidates.filter((t) => !this.recentTemplates.includes(t.name));
    const pool = (filtered.length ? filtered : candidates).slice();
    // Bias toward templates with lower usage
    const weights = pool.map((t) => {
      const used = this.usageCount.get(t.name) || 0;
      const base = 1 / (1 + used); // less weight if overused
      const linearBoost = t.linear ? 0.6 : 0; // favor straight-line templates per request
      const weight = t.weight ?? 1;
      return (base + linearBoost) * weight;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;
    let acc = 0;
    let chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      acc += weights[i];
      if (r <= acc) {
        chosen = pool[i];
        break;
      }
    }
    this.recentTemplates.push(chosen.name);
    if (this.recentTemplates.length > 4) this.recentTemplates.shift();
    this.usageCount.set(chosen.name, (this.usageCount.get(chosen.name) || 0) + 1);
    return chosen;
  }
}

/* ----------------------------------------------------------
   Renderer
---------------------------------------------------------- */

class PRMSegmentRenderer {
  constructor() {}

  _shapeBounds(r) {
    const x = r.x ?? 0;
    const y = r.y ?? 0;
    const w = r.w ?? 0;
    const h = r.h ?? 0;
    const angle = r.rotation || 0;

    if (!angle) {
      return { minX: x, minY: y, maxX: x + w, maxY: y + h };
    }

    const cx = x + w / 2;
    const cy = y + h / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corners = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [-w / 2, h / 2],
      [w / 2, h / 2],
    ].map(([px, py]) => {
      const rx = px * cos - py * sin;
      const ry = px * sin + py * cos;
      return [cx + rx, cy + ry];
    });

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    corners.forEach(([px, py]) => {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    });
    return { minX, minY, maxX, maxY };
  }

  _derivePalette(color = "#5CFF7A") {
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const hex = color.replace("#", "");
    const r = clamp(parseInt(hex.substring(0, 2), 16) || 90);
    const g = clamp(parseInt(hex.substring(2, 4), 16) || 255);
    const b = clamp(parseInt(hex.substring(4, 6), 16) || 122);
    const tint = (c, delta) => clamp(Math.round(c + delta));
    const toHex = (v) => v.toString(16).padStart(2, "0");
    const makeColor = (rr, gg, bb) => `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;

    return {
      primary: makeColor(r, g, b),
      accent: makeColor(tint(r, 25), tint(g, -10), tint(b, 20)),
      pop: makeColor(tint(r, -30), tint(g, 30), tint(b, 30)),
      shadow: "rgba(0,0,0,0.42)",
    };
  }

  _buildGradient(ctx, cx, cy, size, stops, angleDeg = -35) {
    const ang = (angleDeg * Math.PI) / 180;
    const half = size * 0.8;
    const x0 = cx + Math.cos(ang) * -half;
    const y0 = cy + Math.sin(ang) * -half;
    const x1 = cx + Math.cos(ang) * half;
    const y1 = cy + Math.sin(ang) * half;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s) => g.addColorStop(s.offset ?? 0, s.color));
    return g;
  }

  render(pattern, canvas, size = 140) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!pattern) return;

    const background = pattern.background || "#000";
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "#C0C0C0";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, size - 12, size - 12);

    const innerSize = size * 0.56;
    const cx = size / 2;
    const cy = size / 2;

    const segments = Array.isArray(pattern.segments) ? pattern.segments : [];
    const holes = Array.isArray(pattern.holes) ? pattern.holes : [];
    const strokes = Array.isArray(pattern.strokes) ? pattern.strokes : [];
    const allRects = segments.concat(holes);
    if (!allRects.length && !strokes.length) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const r of allRects) {
      const b = this._shapeBounds(r);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
    for (const s of strokes) {
      if (!Array.isArray(s.points)) continue;
      for (const [px, py] of s.points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const scale = innerSize / Math.max(w, h || 1);

    const palette = pattern.palette || this._derivePalette(pattern.color);
    const gradientStops = pattern.gradientStops || [
      { offset: 0, color: palette.primary },
      { offset: 0.6, color: palette.accent },
      { offset: 1, color: palette.pop },
    ];
    const gradient = this._buildGradient(ctx, cx, cy, innerSize, gradientStops, pattern.gradientAngle || -35);

    const roundRect = (x, y, w1, h1, radius) => {
      const r = Math.max(0, Math.min(radius, Math.min(Math.abs(w1), Math.abs(h1)) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w1 - r, y);
      ctx.quadraticCurveTo(x + w1, y, x + w1, y + r);
      ctx.lineTo(x + w1, y + h1 - r);
      ctx.quadraticCurveTo(x + w1, y + h1, x + w1 - r, y + h1);
      ctx.lineTo(x + r, y + h1);
      ctx.quadraticCurveTo(x, y + h1, x, y + h1 - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const drawShape = (seg, fillStyle) => {
      const px = cx + (seg.x - minX - w / 2) * scale;
      const py = cy + (seg.y - minY - h / 2) * scale;
      const pw = (seg.w || 0) * scale;
      const ph = (seg.h || 0) * scale;
      const angle = seg.rotation || 0;
      const radius =
        seg.radius != null
          ? seg.radius * scale
          : seg.type === "capsule"
          ? Math.min(pw, ph) / 2
          : Math.min(pw, ph) / 4;

      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      if (angle) ctx.rotate(angle);
      ctx.globalAlpha = seg.alpha != null ? seg.alpha : 1;

      ctx.beginPath();
      switch (seg.type) {
        case "circle":
        case "ellipse":
          ctx.ellipse(0, 0, Math.abs(pw) / 2, Math.abs(ph) / 2, 0, 0, Math.PI * 2);
          break;
        case "diamond":
          ctx.moveTo(0, -ph / 2);
          ctx.lineTo(pw / 2, 0);
          ctx.lineTo(0, ph / 2);
          ctx.lineTo(-pw / 2, 0);
          ctx.closePath();
          break;
        case "triangle": {
          const dir = seg.direction || "up";
          if (dir === "left") {
            ctx.moveTo(pw / 2, -ph / 2);
            ctx.lineTo(pw / 2, ph / 2);
            ctx.lineTo(-pw / 2, 0);
          } else if (dir === "right") {
            ctx.moveTo(-pw / 2, -ph / 2);
            ctx.lineTo(-pw / 2, ph / 2);
            ctx.lineTo(pw / 2, 0);
          } else if (dir === "down") {
            ctx.moveTo(-pw / 2, -ph / 2);
            ctx.lineTo(pw / 2, -ph / 2);
            ctx.lineTo(0, ph / 2);
          } else {
            ctx.moveTo(-pw / 2, ph / 2);
            ctx.lineTo(pw / 2, ph / 2);
            ctx.lineTo(0, -ph / 2);
          }
          ctx.closePath();
          break;
        }
        case "trapezoid": {
          const taper = Math.max(-0.7, Math.min(0.7, seg.taper ?? 0.25));
          const topW = pw * (1 - taper);
          const halfTop = topW / 2;
          const halfBottom = pw / 2;
          const halfH = ph / 2;
          ctx.moveTo(-halfBottom, halfH);
          ctx.lineTo(halfBottom, halfH);
          ctx.lineTo(halfTop, -halfH);
          ctx.lineTo(-halfTop, -halfH);
          ctx.closePath();
          break;
        }
        case "capsule":
          roundRect(-pw / 2, -ph / 2, pw, ph, radius);
          break;
        case "rect":
        default:
          roundRect(-pw / 2, -ph / 2, pw, ph, radius);
          break;
      }

      ctx.fillStyle = fillStyle;
      if (seg.shadowColor || pattern.shadowColor || palette.shadow) {
        ctx.shadowColor = seg.shadowColor || pattern.shadowColor || palette.shadow;
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      ctx.fill();
      if (seg.strokeColor) {
        ctx.lineWidth = (seg.strokeWidth || 1) * (scale * 0.6);
        ctx.strokeStyle = seg.strokeColor;
        ctx.stroke();
      }
      ctx.restore();
    };

    const toneColor = (tone) => {
      if (tone === "accent") return palette.accent || palette.primary;
      if (tone === "pop") return palette.pop || palette.accent || palette.primary;
      return palette.primary;
    };

    // strokes (continuous pen-like)
    if (strokes.length) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes) {
        if (!Array.isArray(s.points) || s.points.length < 2) continue;
        const color = s.color || gradient || palette.primary || pattern.color || "#5CFF7A";
        ctx.strokeStyle = color;
        ctx.lineWidth = (s.width || 0.2) * scale;
        ctx.beginPath();
        const [p0x, p0y] = s.points[0];
        ctx.moveTo(cx + (p0x - minX - w / 2) * scale, cy + (p0y - minY - h / 2) * scale);
        for (let i = 1; i < s.points.length; i++) {
          const [px, py] = s.points[i];
          ctx.lineTo(cx + (px - minX - w / 2) * scale, cy + (py - minY - h / 2) * scale);
        }
        ctx.stroke();
      }
    }

    // segments
    for (const r of segments) {
      const fill =
        r.color ||
        (r.tone ? toneColor(r.tone) : null) ||
        gradient ||
        palette.primary ||
        pattern.color ||
        "#5CFF7A";
      drawShape(r, fill);
    }

    // holes
    ctx.shadowBlur = 0;
    for (const r of holes) {
      const px = cx + (r.x - minX - w / 2) * scale;
      const py = cy + (r.y - minY - h / 2) * scale;
      const pw = (r.w || 0) * scale;
      const ph = (r.h || 0) * scale;
      const angle = r.rotation || 0;
      const radius = Math.min(Math.abs(pw), Math.abs(ph)) / 4;

      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      if (angle) ctx.rotate(angle);
      ctx.beginPath();
      switch (r.type) {
        case "circle":
        case "ellipse":
          ctx.ellipse(0, 0, Math.abs(pw) / 2, Math.abs(ph) / 2, 0, 0, Math.PI * 2);
          break;
        case "trapezoid": {
          const taper = Math.max(-0.7, Math.min(0.7, r.taper ?? 0.25));
          const topW = pw * (1 - taper);
          const halfTop = topW / 2;
          const halfBottom = pw / 2;
          const halfH = ph / 2;
          ctx.moveTo(-halfBottom, halfH);
          ctx.lineTo(halfBottom, halfH);
          ctx.lineTo(halfTop, -halfH);
          ctx.lineTo(-halfTop, -halfH);
          ctx.closePath();
          break;
        }
        case "capsule":
          roundRect(-pw / 2, -ph / 2, pw, ph, r.radius != null ? r.radius * scale : radius);
          break;
        case "rect":
        default:
          roundRect(-pw / 2, -ph / 2, pw, ph, r.radius != null ? r.radius * scale : radius);
          break;
      }
      ctx.fillStyle = background;
      ctx.fill();
      ctx.restore();
    }
  }

  createCanvas(pattern, size = 140) {
    const c = document.createElement("canvas");
    this.render(pattern, c, size);
    return c;
  }
}
