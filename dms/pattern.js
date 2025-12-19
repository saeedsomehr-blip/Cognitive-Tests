// pattern.js
// Pattern generation and rendering for CANTAB-like 4-rectangle stimuli.

// ---------- PatternGenerator ----------

class PatternGenerator {
  constructor(options = {}) {
    this.templates = this._createTemplates();
    this.palette = this._createPalette();
    this._nextId = 1;
    this.segmentCount = this._clampSegmentCount(options.segmentCount ?? 4);
    this.sharedQuadrants = Math.max(
      1,
      Math.min(this.segmentCount - 1, options.sharedQuadrants ?? 1)
    );
    this._rng =
      typeof options.seed === "number"
        ? this._mulberry32(options.seed)
        : () => Math.random();
  }

  _clampSegmentCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 4;
    return Math.min(Math.max(Math.round(n), 1), 6);
  }

  setSegmentCount(value) {
    this.segmentCount = this._clampSegmentCount(value ?? this.segmentCount);
    this.sharedQuadrants = Math.max(
      1,
      Math.min(this.segmentCount - 1, this.sharedQuadrants)
    );
  }

  setSharedQuadrants(value) {
    const val = Number(value);
    if (!Number.isFinite(val)) return;
    this.sharedQuadrants = Math.max(
      1,
      Math.min(this.segmentCount - 1, Math.round(val))
    );
  }

  _calculateLayout(count) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.max(1, Math.ceil(count / cols));
    return { rows, cols };
  }

  _buildSegments(template, colors, count, patternId) {
    const textures =
      Array.isArray(template.quadrants) && template.quadrants.length
        ? template.quadrants
        : ["diag"];
    const colorList = Array.isArray(colors) ? colors : ["#fff"];
    const textureLen = textures.length;
    const colorLen = colorList.length;
    const textureOffset = this._randInt(textureLen);
    const colorOffset = this._randInt(colorLen);
    const segments = [];
    const usedCombos = new Set();

    for (let i = 0; i < count; i++) {
      const texture = textures[(textureOffset + i) % textureLen];
      let color = colorList[(colorOffset + i) % colorLen];
      let comboKey = `${texture}-${color}`;

      // Ensure no repeated texture/color combination within a pattern
      if (usedCombos.has(comboKey)) {
        const alt = this.palette.find(
          (c) => !usedCombos.has(`${texture}-${c}`)
        );
        if (alt) {
          color = alt;
          comboKey = `${texture}-${color}`;
        }
      }
      usedCombos.add(comboKey);

      const segment = { texture, color };
      if (texture === "dots") {
        const seed = patternId * 10 + i;
        segment.details = {
          seed,
          dots: this._makeDotsData(seed),
        };
      }
      segments.push(segment);
    }
    return segments;
  }

  // Templates define the texture used in each quadrant.
  _createTemplates() {
    // Quadrant order: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right.
    const templates = [
      // Simple starter combinations.
      { id: 0,  quadrants: ["solid",  "stripes", "holes",   "checker"] },
      { id: 1,  quadrants: ["stripes","solid",   "checker", "holes"  ] },
      { id: 2,  quadrants: ["holes",  "checker", "solid",   "stripes"] },
      { id: 3,  quadrants: ["checker","holes",   "stripes", "solid"  ] },
      { id: 4,  quadrants: ["solid",  "solid",   "stripes", "holes" ] },
      { id: 5,  quadrants: ["stripes","holes",   "solid",   "checker"] },

      // More complex templates with additional textures.
      { id: 6,  quadrants: ["dots",   "stripes", "holes",   "checker"] },
      { id: 7,  quadrants: ["diag",   "dots",    "solid",   "checker"] },
      { id: 8,  quadrants: ["cross",  "diag",    "holes",   "solid"  ] },
      { id: 9,  quadrants: ["dots",   "cross",   "stripes", "holes"  ] },
      { id: 10, quadrants: ["checker","diag",    "dots",    "solid"  ] },
      { id: 11, quadrants: ["solid",  "cross",   "diag",    "dots"   ] },
      { id: 12, quadrants: ["diag",   "stripes", "dots",    "holes"  ] },
      { id: 13, quadrants: ["holes",  "dots",    "cross",   "checker"] },
      { id: 14, quadrants: ["stripes","checker", "diag",    "dots"   ] },
      { id: 15, quadrants: ["cross",  "solid",   "checker", "diag"   ] },
    ];
    templates.forEach((tpl) => {
      if (!Array.isArray(tpl.quadrants)) return;
      tpl.quadrants = tpl.quadrants.map((q) => (q === "solid" ? "diag" : q));
    });
    return templates;
  }

  // Palette (HSL) for a pleasant, varied set of colors.
  _createPalette() {
    const hues = [0, 40, 80, 120, 160, 200, 240, 280, 320];
    return hues.map(h => `hsl(${h}, 70%, 55%)`);
  }

  _randInt(max) {
    return Math.floor(this._rng() * max);
  }

  _sampleDistinct(arr, k) {
    const copy = arr.slice();
    const out = [];
    while (out.length < k && copy.length > 0) {
      const idx = this._randInt(copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  _mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = seed + 0x6d2b79f5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  _makeDotsData(seed, nDots = 14) {
    const rand = this._mulberry32(seed);
    const dots = [];
    const rBaseNorm = 1 / 12; // Base radius normalized to canvas size.
    for (let i = 0; i < nDots; i++) {
      const rNorm = rBaseNorm * (0.7 + rand() * 0.6);
      const margin = rNorm;
      const cxNorm = margin + rand() * (1 - 2 * margin);
      const cyNorm = margin + rand() * (1 - 2 * margin);
      dots.push({ x: cxNorm, y: cyNorm, r: rNorm });
    }
    return dots;
  }

  _pickTemplate(excludeIds = []) {
    const candidates = this.templates.filter(t => !excludeIds.includes(t.id));
    return candidates[this._randInt(candidates.length)];
  }

  _pickColorSet(count = 4) {
    // pick several distinct palette colors (at least 1)
    const desired = Math.max(
      1,
      Math.min(Math.round(count ?? 4) || 4, this.palette.length)
    );
    return this._sampleDistinct(this.palette, desired);
  }

  _makePattern(template, colors, segmentCount) {
    const patternId = this._nextId++;
    const safeColors = Array.isArray(colors) && colors.length ? colors : ["#fff"];
    const count = this._clampSegmentCount(segmentCount ?? this.segmentCount);
    const segments = this._buildSegments(template, safeColors, count, patternId);
    const layout = this._calculateLayout(count);
    const normalizedColors = Array.from(
      { length: count },
      (_, idx) => safeColors[idx % safeColors.length]
    );
    return {
      id: patternId,
      templateId: template.id,
      colors: normalizedColors,
      quadrants: segments,
      segmentCount: count,
      layout,
    };
  }

  _clonePattern(pattern) {
    return JSON.parse(JSON.stringify(pattern));
  }

  // ---------- "Shared quadrant" rule ----------

  _hasSharedQuadrant(pattern, samplePattern) {
    const limit = Math.min(
      pattern.quadrants.length,
      samplePattern.quadrants.length
    );
    for (let i = 0; i < limit; i++) {
      const qT = pattern.quadrants[i];
      const qS = samplePattern.quadrants[i];
      if (!qT || !qS) continue;
      if (qT.texture === qS.texture && qT.color === qS.color) {
        return true;
      }
    }
    return false;
  }

  _ensureSharedQuadrants(pattern, samplePattern, count = 1, forcedIndices = null) {
    const limit = Math.min(
      pattern.quadrants.length,
      samplePattern.quadrants.length
    );
    if (!limit) return;
    const desired = Math.max(1, Math.min(Math.floor(count), limit));
    let selected = [];
    if (Array.isArray(forcedIndices) && forcedIndices.length) {
      selected = forcedIndices
        .map((v) => Math.max(0, Math.min(limit - 1, Math.floor(v))))
        .slice(0, desired);
    }
    if (!selected.length) {
      const availableIdx = Array.from({ length: limit }, (_, i) => i);
      for (let i = availableIdx.length - 1; i > 0; i--) {
        const j = this._randInt(i + 1);
        [availableIdx[i], availableIdx[j]] = [availableIdx[j], availableIdx[i]];
      }
      selected = availableIdx.slice(0, desired);
    }
    selected.forEach((idx) => {
      if (!pattern.quadrants[idx] || !samplePattern.quadrants[idx]) return;
      pattern.quadrants[idx].texture = samplePattern.quadrants[idx].texture;
      pattern.quadrants[idx].color = samplePattern.quadrants[idx].color;
      if (Array.isArray(pattern.colors) && Array.isArray(samplePattern.colors)) {
        pattern.colors[idx] = samplePattern.colors[idx];
      }
    });
  }

  _buildSharedIndexSets(totalChoices, sharedCount, segmentCount) {
    const limit = Math.max(1, Math.min(segmentCount, sharedCount));
    const indices = Array.from({ length: segmentCount }, (_, i) => i);
    const start = this._randInt(segmentCount);
    const sets = [];
    for (let c = 0; c < totalChoices; c++) {
      const offset = (start + c) % segmentCount;
      const rotated = indices
        .slice(offset)
        .concat(indices.slice(0, offset));
      sets.push(rotated.slice(0, limit));
    }
    return sets;
  }

  _dedupeQuadrants(pattern, protectedIndices = []) {
    if (!Array.isArray(pattern.quadrants)) return;
    const textures = ["stripes", "holes", "checker", "dots", "diag", "cross"];
    const protectedSet = new Set(
      Array.isArray(protectedIndices) ? protectedIndices : []
    );

    const seenTextures = new Set();
    pattern.quadrants.forEach((q, idx) => {
      if (!q) return;
      if (protectedSet.has(idx)) {
        seenTextures.add(q.texture);
      }
    });

    pattern.quadrants.forEach((q, idx) => {
      if (!q) return;
      if (protectedSet.has(idx)) return;
      const tex = q.texture;
      if (!seenTextures.has(tex)) {
        seenTextures.add(tex);
        return;
      }

      if (protectedSet.has(idx)) {
        return;
      }

      const available = textures.find((t) => !seenTextures.has(t));
      if (!available) {
        return;
      }
      q.texture = available;
      const color = this.palette.find((c) => c !== q.color) || q.color;
      q.color = color;
      if (available === "dots") {
        const seed = idx + 1 + Math.floor(this._rng() * 1000);
        q.details = { seed, dots: this._makeDotsData(seed) };
      } else {
        delete q.details;
      }
      if (Array.isArray(pattern.colors)) {
        pattern.colors[idx] = color;
      }
      seenTextures.add(available);
    });
  }

  _breakGlobalUniformity(choices, samplePattern) {
    if (!Array.isArray(choices) || !choices.length) return;
    const length = Math.min(
      ...choices.map((p) => (Array.isArray(p.quadrants) ? p.quadrants.length : 0))
    );
    const palette = this.palette;
    for (let idx = 0; idx < length; idx++) {
      const first = choices[0]?.quadrants?.[idx];
      if (!first) continue;
      const same = choices.every((p) => {
        const q = p?.quadrants?.[idx];
        return q && q.texture === first.texture && q.color === first.color;
      });
      if (!same) continue;
      // change one distractor (not the samplePattern) at this index
      const target = choices.find((p) => p !== samplePattern);
      if (!target || !target.quadrants?.[idx]) continue;
      const q = target.quadrants[idx];
      const altColor = palette.find((c) => c !== q.color) || q.color;
      q.color = altColor;
      if (Array.isArray(target.colors)) {
        target.colors[idx] = altColor;
      }
    }
  }

  /**
   * Generate a single pattern (e.g., for PRM or standalone preview).
   */
  generatePattern() {
    const template = this._pickTemplate();
    const colors = this._pickColorSet(this.segmentCount);
    return this._makePattern(template, colors, this.segmentCount);
  }

  /**
   * Generate a full DMS trial:
   *  sample: target pattern
   *  choices: list of options
   *  correctIndex: index of the correct option
   *
   * CANTAB-inspired structure (conceptual):
   *  - exact sample
   *  - novel (but with at least one shared quadrant)
   *  - shape(sample) + colors(distractor)
   *  - shape(distractor) + colors(sample)
   * Ensures each option shares at least one quadrant with the sample.
   */

  generateDmsTrial(nChoices = 4, sharedQuadrants = this.sharedQuadrants) {
    if (nChoices < 1 || nChoices > 6) {
      throw new Error("DMS choices must be between 1 and 6.");
    }

  const sampleTemplate = this._pickTemplate();
  const segmentCount = this.segmentCount;
  const sampleColors   = this._pickColorSet(segmentCount);
  const samplePattern  = this._makePattern(sampleTemplate, sampleColors, segmentCount);

  const distractTemplate = this._pickTemplate([sampleTemplate.id]);
  const distractColors   = this._pickColorSet(segmentCount);

  const novelTemplate = this._pickTemplate([sampleTemplate.id, distractTemplate.id]);
  const novelColors   = this._pickColorSet(segmentCount);
  const novelPattern  = this._makePattern(novelTemplate, novelColors, segmentCount);

  const sampleShape_distractColors =
    this._makePattern(sampleTemplate, distractColors, segmentCount);

  const distractShape_sampleColors =
    this._makePattern(distractTemplate, sampleColors, segmentCount);

  const baseChoices = [
    samplePattern,
    novelPattern,
    sampleShape_distractColors,
    distractShape_sampleColors
  ];

  this._dedupeQuadrants(samplePattern);
  const sharedSets = this._buildSharedIndexSets(baseChoices.length, sharedQuadrants, segmentCount);
  baseChoices.forEach((p, idx) => {
    this._ensureSharedQuadrants(p, samplePattern, sharedQuadrants, sharedSets[idx]);
    this._dedupeQuadrants(p, sharedSets[idx]);
  });
  this._breakGlobalUniformity(baseChoices, samplePattern);

  while (baseChoices.length < nChoices) {
    const extraTemplate = this._pickTemplate([sampleTemplate.id]);
    const extraColors = this._pickColorSet(segmentCount);
    const extra = this._makePattern(extraTemplate, extraColors, segmentCount);
    const sharedIdx = this._buildSharedIndexSets(1, sharedQuadrants, segmentCount)[0];
    this._ensureSharedQuadrants(extra, samplePattern, sharedQuadrants, sharedIdx);
    this._dedupeQuadrants(extra, sharedIdx);
    baseChoices.push(extra);
  }
  this._breakGlobalUniformity(baseChoices, samplePattern);

  const order = [...baseChoices.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = this._randInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  let shuffled = order.map(idx => baseChoices[idx]);
  if (shuffled.length > nChoices) {
    shuffled = shuffled.slice(0, nChoices);
  }

  let correctIndex = shuffled.findIndex(p => p === samplePattern);
  if (correctIndex === -1) {
    shuffled[0] = samplePattern;
    correctIndex = 0;
  }

  return { sample: samplePattern, choices: shuffled, correctIndex };
}

}


// ---------- PatternRenderer ----------

class PatternRenderer {
  constructor(options = {}) {
    this.bgColor = options.bgColor || "black";
    this.borderColor = options.borderColor || "#cccccc";
  }
  /**
   * Render a pattern into a canvas.
   * @param {Object} pattern  Pattern object
   * @param {HTMLCanvasElement} canvas  Target canvas
   * @param {number} width  Width (px)
   * @param {number|null} height  Height; if null, use a square
   */
  render(pattern, canvas, width = 140, height = null) {
    const ctx = canvas.getContext("2d");
    const totalW = width;
    const totalH = height ?? width;
    canvas.width  = totalW;
    // Clear background.
    ctx.clearRect(0, 0, totalW, totalH);

    const innerMargin = 16;
    const segments = Array.isArray(pattern.quadrants) ? pattern.quadrants : [];
    const layout = this._deriveLayout(pattern);
    const cols = Math.max(1, layout.cols);
    const rows = Math.max(1, layout.rows);
    const cellW = (totalW - 2 * innerMargin) / cols;
    const cellH = (totalH - 2 * innerMargin) / rows;

    segments.forEach((quad, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = innerMargin + col * cellW;
      const y = innerMargin + row * cellH;
      this._drawQuadrant(ctx, quad, x, y, cellW, cellH);
    });
  }
  /**
   * Convenience: create a new canvas and render the pattern into it.
   */
  createCanvas(pattern, width = 140, height = null) {
    const canvas = document.createElement("canvas");
    this.render(pattern, canvas, width, height);
    return canvas;
  }

  _mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = seed + 0x6d2b79f5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  _makeFallbackDots(seed = 1, nDots = 14) {
    const rand = this._mulberry32(seed);
    const dots = [];
    const rBaseNorm = 1 / 12;
    for (let i = 0; i < nDots; i++) {
      const rNorm = rBaseNorm * (0.7 + rand() * 0.6);
      const margin = rNorm;
      const cxNorm = margin + rand() * (1 - 2 * margin);
      const cyNorm = margin + rand() * (1 - 2 * margin);
      dots.push({ x: cxNorm, y: cyNorm, r: rNorm });
    }
    return dots;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
  }

  _deriveLayout(pattern) {
    const layout = pattern.layout;
    if (layout && layout.rows && layout.cols) {
      return layout;
    }
    const count =
      pattern.segmentCount ?? (Array.isArray(pattern.quadrants) ? pattern.quadrants.length : 0);
    const target = Math.max(1, count || 1);
    const cols = Math.max(1, Math.ceil(Math.sqrt(target)));
    const rows = Math.max(1, Math.ceil(target / cols));
    return { rows, cols };
  }
  _drawQuadrant(ctx, quad, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    let type = quad.texture;
    if (type === "solid") type = "diag";
    const color = quad.color || "#fff";
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    switch (type) {
      case "solid":
        break;
      case "holes": {
        const rows = 4;
        const cols = 4;
        const cellW = w / cols;
        const cellH = h / rows;
        const holeW = cellW * 0.5;
        const holeH = cellH * 0.5;
        ctx.fillStyle = this.bgColor;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cx = x + c * cellW + (cellW - holeW) / 2;
            const cy = y + r * cellH + (cellH - holeH) / 2;
            ctx.fillRect(cx, cy, holeW, holeH);
          }
        }
        break;
      }
      case "stripes": {
        ctx.fillStyle = this.bgColor;
        const stripeCount = 12;
        const stripeStep = w / stripeCount;
        const stripeWidth = stripeStep * 0.45;
        for (let i = 0; i < stripeCount; i += 2) {
          const sx = x + i * stripeStep + (stripeStep - stripeWidth) / 2;
          ctx.fillRect(sx, y, stripeWidth, h);
        }
        break;
      }
      case "checker": {
        ctx.fillStyle = this.bgColor;
        const rows = 5;
        const cols = 5;
        const cellW = w / cols;
        const cellH = h / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 == 0) continue;
            ctx.fillRect(x + c * cellW, y + r * cellH, cellW, cellH);
          }
        }
        break;
      }
      case "dots": {
        ctx.fillStyle = this.bgColor;
        const dotsData =
          quad.details?.dots?.length
            ? quad.details.dots
            : this._makeFallbackDots(quad.details?.seed ?? 1);
        const minSide = Math.min(w, h);
        for (const d of dotsData) {
          const r = d.r * minSide;
          const cx = x + d.x * w;
          const cy = y + d.y * h;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "diag": {
        ctx.strokeStyle = this.bgColor;
        ctx.lineWidth = Math.max(1.5, w / 22);
        const step = w / 8;
        for (let d = -w; d < w * 2; d += step) {
          ctx.beginPath();
          ctx.moveTo(x + d, y);
          ctx.lineTo(x + d - h, y + h);
          ctx.stroke();
        }
        break;
      }
      case "cross": {
        ctx.fillStyle = this.bgColor;
        const barW = w / 5;
        const barH = h / 5;
        const cx = x + w / 2 - barW / 2;
        ctx.fillRect(cx, y + h * 0.1, barW, h * 0.8);
        const cy = y + h / 2 - barH / 2;
        ctx.fillRect(x + w * 0.1, cy, w * 0.8, barH);
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }
}

