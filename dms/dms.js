// Delayed Matching to Sample with customization hooks + i18n

// ----- Config -----
const DMS_DEFAULT_CONFIG = {
  fixationDurationMs: 500,
  sampleDurationMs: 2000,
  feedbackDurationMs: 700,
  delayMs: 4000,
  delayMsList: [0, 4000, 12000],
  subRectCount: 4,
  sharedQuadrants: 1, // 1..subRectCount
  practiceTrialsTotal: 4,
  mainTrialsTotal: 24,
  practiceTrialsPerCondition: 2,
  mainTrialsPerCondition: 8,
  nChoices: 4, // 1-6
  giveFeedback: true,
  responseDeadlineMs: null, // null => unlimited
};

const clampInt =
  (window.AppSettings && window.AppSettings.clampInt) ||
  ((val, min, max, fallback) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.round(n), min), max);
  });

const clampDelayValue = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.round(n), 0), 20000);
};

const normalizeDelayList =
  (window.AppSettings && window.AppSettings.normalizeDelayList) ||
  ((source, fallback = DMS_DEFAULT_CONFIG.delayMsList) => {
    const values = [];
    const items = Array.isArray(source) ? source : [];
    for (const item of items) {
      const n = clampDelayValue(item);
      if (n == null) continue;
      if (!values.includes(n)) values.push(n);
    }
    if (!values.length) {
      return Array.isArray(fallback) ? fallback.slice().sort((a, b) => a - b) : [];
    }
    return values.sort((a, b) => a - b);
  });

const distributeTrials = (total, slots) => {
  const bucketCount = Math.max(0, Math.floor(slots));
  if (!bucketCount) return [];
  const clampedTotal = Math.max(0, Math.floor(total));
  const base = Math.floor(clampedTotal / bucketCount);
  const remainder = clampedTotal % bucketCount;
  return Array.from({ length: bucketCount }, (_, idx) => base + (idx < remainder ? 1 : 0));
};

const shuffleArray = (arr) => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const T = (key, params) => (window.I18N ? I18N.t(key, params) : key);

function buildDmsConfigFromSettings() {
  const settings = window.AppSettings?.load?.() ?? null;
  const dms = settings?.dms ?? {};
  const cfg = { ...DMS_DEFAULT_CONFIG };

  cfg.sampleDurationMs = clampInt(
    dms.sampleDurationMs ?? cfg.sampleDurationMs,
    300,
    15000,
    cfg.sampleDurationMs
  );
  cfg.delayMs = clampInt(dms.delayMs ?? cfg.delayMs, 0, 20000, cfg.delayMs);
  cfg.nChoices = clampInt(dms.nChoices ?? cfg.nChoices, 1, 6, cfg.nChoices);
  cfg.subRectCount = clampInt(
    dms.subRectCount ?? cfg.subRectCount,
    2,
    6,
    cfg.subRectCount
  );
  const maxShared = Math.max(1, cfg.subRectCount - 1);
  cfg.sharedQuadrants = clampInt(
    dms.sharedQuadrants ?? cfg.sharedQuadrants ?? 1,
    1,
    maxShared,
    Math.min(cfg.sharedQuadrants ?? 1, maxShared)
  );

  const rd = dms.responseDeadlineMs;
  cfg.responseDeadlineMs =
    rd === null || rd === ""
      ? null
      : clampInt(rd, 500, 30000, cfg.responseDeadlineMs ?? null);

  cfg.delayMsList = normalizeDelayList(
    Array.isArray(dms.delayMsList) && dms.delayMsList.length
      ? dms.delayMsList
      : dms.delayMs != null
      ? [dms.delayMs]
      : cfg.delayMsList,
    cfg.delayMsList
  );
  cfg.delayMs =
    cfg.delayMsList.find((value) => value > 0) ?? cfg.delayMsList[0] ?? cfg.delayMs;

  const condCount = Math.max(1, cfg.delayMsList.length);
  const practiceTotal = clampInt(
    dms.practiceTrialsTotal ?? cfg.practiceTrialsTotal ?? 4,
    0,
    200,
    cfg.practiceTrialsTotal ?? 4
  );
  const mainTotal = clampInt(
    dms.mainTrialsTotal ?? cfg.mainTrialsTotal ?? 24,
    1,
    200,
    cfg.mainTrialsTotal ?? 24
  );
  cfg.practiceTrialsTotal = practiceTotal;
  cfg.mainTrialsTotal = mainTotal;
  cfg.practiceDistribution = distributeTrials(practiceTotal, condCount);
  cfg.mainDistribution = distributeTrials(mainTotal, condCount);

  cfg.conditions = cfg.delayMsList.map((delayMs) => ({
    name: delayMs === 0 ? "SIMULTANEOUS" : `DELAY ${delayMs}ms`,
    delayMs,
    simultaneous: delayMs === 0,
    seed: settings?.global?.seed ?? null,
  }));
  cfg.seed = settings?.global?.seed ?? null;

  return cfg;
}

// Canvas sizes for rendering
const CANVAS_SIZES = {
  sample: { width: 225, height: 163 }, // 25% larger for better readability
  choice: { width: 175, height: 125 },
};

// ----- Trial creation -----
function createTrials(config) {
  const practiceTrials = [];
  const mainTrials = [];
  const practiceCounts = config.practiceDistribution || [];
  const mainCounts = config.mainDistribution || [];

  config.conditions.forEach((cond, index) => {
    const practiceCount =
      practiceCounts[index] ??
      config.practiceTrialsPerCondition ??
      0;
    for (let i = 0; i < practiceCount; i++) {
      practiceTrials.push({
        isPractice: true,
        conditionName: cond.name,
        delayMs: cond.delayMs,
        simultaneous: cond.simultaneous,
        sample: null,
        choices: null,
        correctIndex: null,
      });
    }
  });

  config.conditions.forEach((cond, index) => {
    const mainCount =
      mainCounts[index] ??
      config.mainTrialsPerCondition ??
      0;
    for (let i = 0; i < mainCount; i++) {
      mainTrials.push({
        isPractice: false,
        conditionName: cond.name,
        delayMs: cond.delayMs,
        simultaneous: cond.simultaneous,
        sample: null,
        choices: null,
        correctIndex: null,
      });
    }
  });

  const shuffledPractice = shuffleArray(practiceTrials);
  const shuffledMain = shuffleArray(mainTrials);
  return [...shuffledPractice, ...shuffledMain];
}

// ----- Stimulus generation -----
class StimulusGenerator {
  constructor(config) {
    this.config = config;
    this.patternGen = new PatternGenerator({
      segmentCount: config?.subRectCount ?? 4,
      sharedQuadrants: config?.sharedQuadrants ?? 1,
      seed: config?.seed ?? null,
    });
    this.currentDmsTrial = null;
  }

  updateConfig(cfg) {
    this.config = cfg;
    if (typeof cfg?.subRectCount === "number") {
      this.patternGen.setSegmentCount(cfg.subRectCount);
    }
    if (typeof cfg?.sharedQuadrants === "number") {
      this.patternGen.setSharedQuadrants(cfg.sharedQuadrants);
    }
  }

  generateSample() {
    this.currentDmsTrial = this.patternGen.generateDmsTrial(
      this.config.nChoices,
      this.config.sharedQuadrants
    );
    return this.currentDmsTrial.sample;
  }

  generateChoices(samplePattern, nChoices) {
    if (!this.currentDmsTrial || !this.currentDmsTrial.choices) {
      this.currentDmsTrial = this.patternGen.generateDmsTrial(
        nChoices,
        this.config.sharedQuadrants
      );
    }
    return {
      choices: this.currentDmsTrial.choices,
      correctIndex: this.currentDmsTrial.correctIndex,
    };
  }
}

// ----- Renderer -----
class Renderer {
  constructor(statusEl, phaseLabelEl, stimulusAreaEl) {
    this.statusEl = statusEl;
    this.phaseLabelEl = phaseLabelEl;
    this.stimulusAreaEl = stimulusAreaEl;
    this.patternRenderer = new PatternRenderer();
  }

  setStatus(text) {
    this.statusEl.textContent = text;
  }

  setPhaseLabel(text) {
    this.phaseLabelEl.textContent = text;
  }

  clearStimulus() {
    this.stimulusAreaEl.innerHTML = "";
  }

  showFixation() {
    this.clearStimulus();
    const span = document.createElement("span");
    span.textContent = "+";
    span.className = "fixation";
    this.stimulusAreaEl.appendChild(span);
  }

  showSample(pattern) {
    this.clearStimulus();
    const wrapper = document.createElement("div");
    wrapper.className = "sample-box";

    const canvas = document.createElement("canvas");
    this.patternRenderer.render(
      pattern,
      canvas,
      CANVAS_SIZES.sample.width,
      CANVAS_SIZES.sample.height
    );

    wrapper.appendChild(canvas);
    this.stimulusAreaEl.appendChild(wrapper);
  }

  showChoices(choices, onChoiceSelected) {
    this.clearStimulus();

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.justifyContent = "center";
    wrap.style.gap = "32px";

    choices.forEach((pattern, index) => {
      const box = document.createElement("div");
      box.className = "choice-box";

      const canvas = document.createElement("canvas");
      this.patternRenderer.render(
        pattern,
        canvas,
        CANVAS_SIZES.choice.width,
        CANVAS_SIZES.choice.height
      );

      box.appendChild(canvas);
      box.addEventListener("click", () => onChoiceSelected(index, box));
      wrap.appendChild(box);
    });

    this.stimulusAreaEl.appendChild(wrap);
  }

  showSampleAndChoices(samplePattern, choices, onChoiceSelected) {
    this.clearStimulus();

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.gap = "32px";

    const sampleBox = document.createElement("div");
    sampleBox.className = "sample-box";
    const sampleCanvas = document.createElement("canvas");
    this.patternRenderer.render(
      samplePattern,
      sampleCanvas,
      CANVAS_SIZES.sample.width,
      CANVAS_SIZES.sample.height
    );
    sampleBox.appendChild(sampleCanvas);

    const choicesRow = document.createElement("div");
    choicesRow.style.display = "flex";
    choicesRow.style.gap = "32px";
    choicesRow.style.flexWrap = "wrap";
    choicesRow.style.justifyContent = "center";

    choices.forEach((pattern, index) => {
      const box = document.createElement("div");
      box.className = "choice-box";
      const canvas = document.createElement("canvas");
      this.patternRenderer.render(
        pattern,
        canvas,
        CANVAS_SIZES.choice.width,
        CANVAS_SIZES.choice.height
      );
      box.appendChild(canvas);
      box.addEventListener("click", () => onChoiceSelected(index, box));
      choicesRow.appendChild(box);
    });

    container.appendChild(sampleBox);
    container.appendChild(choicesRow);
    this.stimulusAreaEl.appendChild(container);
  }

  showFeedback(result) {
    this.clearStimulus();
    const p = document.createElement("p");
    p.style.fontSize = "24px";
    p.style.fontWeight = "bold";
    if (result.timedOut) {
      p.textContent = T("dms.feedbackTimeout");
    } else {
      p.textContent = result.correct ? T("dms.feedbackCorrect") : T("dms.feedbackWrong");
    }
    this.stimulusAreaEl.appendChild(p);
  }

  showEndScreen(content) {
    this.clearStimulus();
    const wrap = document.createElement("div");
    wrap.style.fontSize = "16px";
    if (content && typeof content === "object" && content.nodeType) {
      wrap.appendChild(content);
    } else {
      wrap.textContent = content ?? "";
    }
    this.stimulusAreaEl.appendChild(wrap);
  }
}

// ----- Data logger -----
class DataLogger {
  constructor() {
    this.trials = [];
    this.taskStartTime = null;
    this.taskEndTime = null;
    this.sessionId = "";
    this.sessionStartIso = "";
    this.mode = "main";
    this.configSnapshot = {};
    this.participantId = "";
  }

  _makeSessionId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `dms_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  startTask({ mode = "main", config = {}, participantId = "" } = {}) {
    this.trials = [];
    this.taskStartTime = performance.now();
    this.taskEndTime = this.taskStartTime;
    this.taskStartEpochMs = Date.now();
    this.sessionId = this._makeSessionId();
    this.sessionStartIso = new Date().toISOString();
    this.mode = mode;
    this.participantId = participantId;
    this.configSnapshot = {
      nChoices: config.nChoices,
      sampleDurationMs: config.sampleDurationMs,
      delayMsList: Array.isArray(config.delayMsList) ? config.delayMsList.join("|") : "",
      responseDeadlineMs: config.responseDeadlineMs,
      giveFeedback: config.giveFeedback,
      practiceTrialsTotal: config.practiceTrialsTotal,
      mainTrialsTotal: config.mainTrialsTotal,
      subRectCount: config.subRectCount,
      sharedQuadrants: config.sharedQuadrants,
      seed: config.seed ?? null,
    };
  }

  endTask() {
    this.taskEndTime = performance.now();
  }

  logTrial(trialData) {
    this.trials.push({ ...trialData, mode: this.mode });
  }

  getSummary() {
    const total = this.trials.length;
    const correctTrials = this.trials.filter((t) => t.correct);
    const nCorrect = correctTrials.length;
    const accuracy = total > 0 ? (nCorrect / total) * 100 : 0;

    const rtSamples = correctTrials
      .map((t) => t.rtMs)
      .filter((rt) => rt != null);
    const meanRT = rtSamples.length
      ? rtSamples.reduce((acc, t) => acc + t, 0) / rtSamples.length
      : 0;
    const timeouts = this.trials.filter((t) => t.timedOut).length;
    const eventualCorrectTrials = this.trials.filter((t) => t.correctOnAnyTry);
    const choiceCounts = this.trials
      .map((t) =>
        typeof t.choiceNumberCorrect === "number" ? t.choiceNumberCorrect : null
      )
      .filter((v) => Number.isFinite(v));
    const meanChoicesToCorrect = choiceCounts.length
      ? choiceCounts.reduce((acc, v) => acc + v, 0) / choiceCounts.length
      : 0;

    return {
      total,
      nCorrect,
      accuracy,
      meanRT,
      timeouts,
      eventualCorrect: eventualCorrectTrials.length,
      meanChoicesToCorrect,
    };
  }

  getConditionBreakdown() {
    const map = new Map();
    this.trials.forEach((t) => {
      const key = t.conditionName || `delay_${t.delayMs ?? "na"}`;
      if (!map.has(key)) {
        map.set(key, {
          condition: key,
          delayMs: t.delayMs ?? "",
          total: 0,
          correct: 0,
          correctOnAnyTry: 0,
          rtSum: 0,
          rtCount: 0,
          timeouts: 0,
          choicesToCorrectSum: 0,
          choicesToCorrectCount: 0,
        });
      }
      const entry = map.get(key);
      entry.total += 1;
      if (t.correct) entry.correct += 1;
      if (t.correctOnAnyTry) entry.correctOnAnyTry += 1;
      if (t.correct && t.rtMs != null) {
        entry.rtSum += t.rtMs;
        entry.rtCount += 1;
      }
      if (t.timedOut) entry.timeouts += 1;
      if (typeof t.choiceNumberCorrect === "number") {
        entry.choicesToCorrectSum += t.choiceNumberCorrect;
        entry.choicesToCorrectCount += 1;
      }
    });

    return Array.from(map.values()).map((entry) => ({
      condition: entry.condition,
      delayMs: entry.delayMs,
      total: entry.total,
      correct: entry.correct,
      accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0,
      meanRtCorrectMs: entry.rtCount ? Math.round(entry.rtSum / entry.rtCount) : 0,
      timeouts: entry.timeouts,
      eventualCorrect: entry.correctOnAnyTry,
      meanChoicesToCorrect: entry.choicesToCorrectCount
        ? entry.choicesToCorrectSum / entry.choicesToCorrectCount
        : 0,
    }));
  }

  summaryAsDOM() {
    const s = this.getSummary();
    const root = document.createElement("div");
    root.style.textAlign = "center";

    const title = document.createElement("h3");
    title.style.marginBottom = "8px";
    title.textContent = T("dms.summaryTitle");
    root.appendChild(title);

    const stats = document.createElement("div");
    stats.style.lineHeight = "1.8";

    const addLine = (label, value) => {
      const div = document.createElement("div");
      div.textContent = `${label}: ${value}`;
      stats.appendChild(div);
    };

    addLine(T("dms.summaryTotal"), s.total);
    addLine(T("dms.summaryCorrect"), s.nCorrect);
    addLine(T("dms.summaryAccuracy"), `${s.accuracy.toFixed(1)}%`);
    addLine(T("dms.summaryMeanRt"), `${s.meanRT.toFixed(0)} ms`);
    root.appendChild(stats);

    const chartWrap = document.createElement("div");
    chartWrap.style.marginTop = "16px";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 260;
    chartWrap.appendChild(canvas);
    root.appendChild(chartWrap);

    return { root, canvas };
  }

  getTrials() {
    return this.trials.slice();
  }

  toHumanCSV() {
    return window.DMS_CSV && typeof DMS_CSV.toHumanCSV === "function"
      ? DMS_CSV.toHumanCSV(this)
      : "";
  }

  toMachineCSV() {
    return window.DMS_CSV && typeof DMS_CSV.toMachineCSV === "function"
      ? DMS_CSV.toMachineCSV(this)
      : "";
  }

  // Backwards compatibility
  toCSV() {
    return this.toMachineCSV();
  }
}

// ----- Task controller -----
class DMSTask {
  constructor(config, renderer, stimGen, dataLogger, opts = {}) {
    this.config = config;
    this.renderer = renderer;
    this.stimGen = stimGen;
    this.logger = dataLogger;
    this.visibilityHiddenDuringTrial = false;
    this.participantId = "";
    this.setStatus = opts.setStatus || renderer.setStatus.bind(renderer);
    this.setPhase = opts.setPhase || renderer.setPhaseLabel.bind(renderer);

    this.trials = createTrials(config);
    this.currentTrialIndex = 0;
    this.state = "IDLE";
    this.currentTrial = null;
    this.choiceStartTime = null;
    this.choiceTimeoutId = null;
    this.responseLocked = false;
    this.onFinishCallback = null;

    this._resetResponseTracking();

    document.addEventListener("visibilitychange", () => {
      if (this.state === "CHOICES" && document.hidden) {
        this.visibilityHiddenDuringTrial = true;
      }
    });
  }

  start(onFinish, options = {}) {
    this.onFinishCallback = onFinish;
    const mode = options.mode || "main";
    this.participantId = options.participantId || "";
    this.mode = mode;
    const allTrials = createTrials(this.config);
    const trials =
      mode === "practice"
        ? allTrials.filter((t) => t.isPractice)
        : allTrials.filter((t) => !t.isPractice);
    this.trials = trials;
    this.currentTrialIndex = 0;
    this.logger.startTask({
      mode,
      config: this.config,
      participantId: this.participantId,
    });
    this._resetResponseTracking();
    this._runNextTrial();
  }

  _resetResponseTracking() {
    this.trialResponseCount = 0;
    this.firstChoiceMade = false;
    this.firstChoiceCorrect = null;
    this.rtFirstChoice = null;
    this.rtCorrectChoice = null;
    this.choiceEvents = [];
    this.choiceNumberCorrect = null;
    this.responseLocked = false;
  }

  _clonePatternForLog(pattern) {
    if (!pattern) return null;
    try {
      return JSON.parse(JSON.stringify(pattern));
    } catch (err) {
      console.warn("Failed to clone pattern for log", err);
      return null;
    }
  }

  _runNextTrial() {
    if (this.currentTrialIndex >= this.trials.length) {
      this._endTask();
      return;
    }
    this.visibilityHiddenDuringTrial = false;
    this.currentTrialStartMs = performance.now();

    this.currentTrial = this.trials[this.currentTrialIndex];
    this._resetResponseTracking();

    const phaseText = this.currentTrial.isPractice
      ? T("dms.phasePractice", { name: this.currentTrial.conditionName })
      : T("dms.phaseMain", { name: this.currentTrial.conditionName });
    this.setStatus("");
    this.setPhase(phaseText);

    this.state = "FIXATION";
    this.renderer.showFixation();

    setTimeout(() => {
      this._showSamplePhase();
    }, this.config.fixationDurationMs);
  }

  _showSamplePhase() {
    this.state = "SAMPLE";

    const sample = this.stimGen.generateSample();
    const { choices, correctIndex } = this.stimGen.generateChoices(
      sample,
      this.config.nChoices
    );

    this.currentTrial.sample = sample;
    this.currentTrial.choices = choices;
    this.currentTrial.correctIndex = correctIndex;

    const phaseText = this.currentTrial.isPractice
      ? T("dms.phasePractice", { name: this.currentTrial.conditionName })
      : T("dms.phaseMain", { name: this.currentTrial.conditionName });

    if (this.currentTrial.simultaneous) {
      this.setStatus(T("dms.simultaneous"));
      this.setPhase(phaseText);
      this._resetResponseTracking();
      this.state = "CHOICES_PRERENDER";
      this.renderer.showSampleAndChoices(sample, choices, (chosenIndex, boxEl) =>
        this._handleChoice(chosenIndex, boxEl)
      );
      requestAnimationFrame(() => {
        this.choiceStartTime = performance.now();
        this.state = "CHOICES";
        this._startChoiceTimer();
      });
    } else {
      this.setStatus(T("dms.rememberSample"));
      this.renderer.showSample(sample);

      setTimeout(() => {
        this._showDelayPhase();
      }, this.config.sampleDurationMs);
    }
  }

  _showDelayPhase() {
    this.state = "DELAY";
    this.setStatus(T("dms.waiting"));
    this.renderer.clearStimulus();

    setTimeout(() => {
      this._showChoicesPhase();
    }, this.currentTrial.delayMs);
  }

  _showChoicesPhase() {
    this.state = "CHOICES_PRERENDER";
    this.setStatus(T("dms.chooseNow"));

    this.renderer.showChoices(this.currentTrial.choices, (chosenIndex, boxEl) =>
      this._handleChoice(chosenIndex, boxEl)
    );

    requestAnimationFrame(() => {
      this.choiceStartTime = performance.now();
      this.state = "CHOICES";
      this._startChoiceTimer();
    });
  }

  _startChoiceTimer() {
    this._clearChoiceTimer();
    if (!this.config.responseDeadlineMs) return;
    this.choiceTimeoutId = setTimeout(
      () => this._handleTimeout(),
      this.config.responseDeadlineMs
    );
  }

  _clearChoiceTimer() {
    if (this.choiceTimeoutId) {
      clearTimeout(this.choiceTimeoutId);
      this.choiceTimeoutId = null;
    }
  }

  _handleChoice(chosenIndex, choiceBox) {
    if (this.state !== "CHOICES" || this.responseLocked) return;

    const now = performance.now();
    const rtFromOnset = now - this.choiceStartTime;
    const attemptNumber = this.trialResponseCount + 1;
    const correct = chosenIndex === this.currentTrial.correctIndex;

    this.choiceEvents.push({
      attempt: attemptNumber,
      chosenIndex,
      correct,
      rtMs: rtFromOnset,
      absoluteTimeMs: now,
    });

    if (!this.firstChoiceMade) {
      this.firstChoiceMade = true;
      this.firstChoiceCorrect = correct;
      this.rtFirstChoice = rtFromOnset;
    }

    this.trialResponseCount += 1;

    if (!correct) {
      if (choiceBox) {
        choiceBox.classList.add("choice-disabled");
        choiceBox.style.pointerEvents = "none";
        choiceBox.style.opacity = "0.4";
        choiceBox.style.position = "relative";
        const cross = document.createElement("span");
        cross.textContent = "✕";
        cross.style.position = "absolute";
        cross.style.color = "#ff5c5c";
        cross.style.fontSize = "48px";
        cross.style.fontWeight = "bold";
        cross.style.lineHeight = "1";
        choiceBox.appendChild(cross);
      }
      this.setStatus("");
      return;
    }

    this._clearChoiceTimer();
    if (this.rtCorrectChoice === null) {
      this.rtCorrectChoice = rtFromOnset;
    }

    if (this.choiceNumberCorrect === null) {
      this.choiceNumberCorrect = attemptNumber;
    }

    const scoredCorrect = attemptNumber === 1;
    this.responseLocked = true;

    this._finishTrial({
      correct: scoredCorrect,
      correctOnAnyTry: true,
      timedOut: false,
      chosenIndex,
      rtMs: rtFromOnset,
      absoluteTime: now,
      choiceNumberCorrect: this.choiceNumberCorrect,
      choiceEvents: this.choiceEvents,
    });
  }

  _handleTimeout() {
    if (this.state !== "CHOICES" || this.responseLocked) return;
    this.responseLocked = true;
    this.state = "TIMEOUT";
    this.setStatus(T("dms.timeout"));
    this._finishTrial({
      correct: false,
      correctOnAnyTry: false,
      timedOut: true,
      chosenIndex: null,
      rtMs: this.config.responseDeadlineMs,
      absoluteTime: performance.now(),
      choiceNumberCorrect: this.choiceNumberCorrect,
      choiceEvents: this.choiceEvents,
    });
  }

  _finishTrial({
    correct,
    correctOnAnyTry,
    timedOut,
    chosenIndex,
    rtMs,
    absoluteTime,
    choiceNumberCorrect,
    choiceEvents,
  }) {
    this.state = "FEEDBACK";
    const samplePattern = this.currentTrial.sample;
    const now = absoluteTime ?? performance.now();
    const correctAny = correctOnAnyTry != null ? correctOnAnyTry : correct;
    const feedbackCorrect = correctAny;
    const choicePatterns = Array.isArray(this.currentTrial.choices)
      ? this.currentTrial.choices.map((p) => this._clonePatternForLog(p))
      : [];

    const trialEndMs = now;
    const trialStartMs = this.currentTrialStartMs ?? this.taskStartTime ?? now;
    const startEpoch =
      typeof this.logger.taskStartEpochMs === "number"
        ? this.logger.taskStartEpochMs + (trialStartMs - this.logger.taskStartTime)
        : null;
    const endEpoch =
      typeof this.logger.taskStartEpochMs === "number"
        ? this.logger.taskStartEpochMs + (trialEndMs - this.logger.taskStartTime)
        : null;
    this.logger.logTrial({
      trialIndex: this.currentTrialIndex,
      isPractice: this.currentTrial.isPractice,
      conditionName: this.currentTrial.conditionName,
      delayMs: this.currentTrial.delayMs,
      simultaneous: this.currentTrial.simultaneous,
      sampleId: samplePattern.id,
      sampleTemplateId: samplePattern.templateId,
      sampleSegmentCount: samplePattern.segmentCount,
      sampleColors: (samplePattern.colors || []).join("|"),
      samplePattern: this._clonePatternForLog(samplePattern),
      choicePatterns,
      nChoices: this.currentTrial.choices.length,
      correctIndex: this.currentTrial.correctIndex,
      chosenIndex: chosenIndex ?? "",
      correct,
      correctOnAnyTry: !!correctAny,
      choiceNumberCorrect: choiceNumberCorrect ?? this.choiceNumberCorrect,
      firstChoiceCorrect: this.firstChoiceCorrect,
      nResponsesThisTrial: this.trialResponseCount,
      rtFirstChoiceMs: this.rtFirstChoice,
      rtCorrectChoiceMs: correctAny ? this.rtCorrectChoice : null,
      rtMs: rtMs ?? null,
      timedOut: !!timedOut,
      responseDeadlineMs: this.config.responseDeadlineMs,
      absoluteTimeMs: now,
      choiceEvents: Array.isArray(choiceEvents) ? choiceEvents : this.choiceEvents,
      sharedQuadrants: this.config.sharedQuadrants,
      visibilityHidden: this.visibilityHiddenDuringTrial,
      trialStartMs,
      trialEndMs,
      trialStartEpochMs: startEpoch,
      trialEndEpochMs: endEpoch,
      trialStartMs,
      elapsedMs: trialEndMs - trialStartMs,
    });

    if (this.config.giveFeedback) {
      this.renderer.showFeedback({ correct: feedbackCorrect, timedOut });
      setTimeout(() => {
        this.currentTrialIndex++;
        this._runNextTrial();
      }, this.config.feedbackDurationMs);
    } else {
      this.currentTrialIndex++;
      this._runNextTrial();
    }
  }

  _endTask() {
    this.state = "END";
    this._clearChoiceTimer();
    this.logger.endTask();
    this.setStatus(T("dms.endStatus"));
    this.setPhase("");
    const summary = this.logger.summaryAsDOM();
    this.renderer.showEndScreen(summary.root);
    renderDmsResultsChart(this.logger.getTrials(), summary.canvas);

    if (window.TestHistory) {
      const summary = this.logger.getSummary();
      const csvHuman = this.logger.toHumanCSV();
      const csvMachine = this.logger.toMachineCSV();
      const humanWb = window.DMS_REPORT?.buildWorkbook
        ? DMS_REPORT.buildWorkbook(this.logger)
        : null;
      const humanBase64 = humanWb
        ? XLSX.write(humanWb, { bookType: "xlsx", type: "base64" })
        : "";
      TestHistory.add({
        testType: "dms",
        participantId: this.participantId || "",
        mode: this.mode || "main",
        timestampIso: new Date().toISOString(),
        summary,
        csvHuman,
        csvMachine,
        humanBase64,
        sessionId: this.logger.sessionId,
      });
    }

    if (this.onFinishCallback) {
      this.onFinishCallback();
    }
  }
}

function renderDmsResultsChart(trials, canvasOverride) {
  const canvas = canvasOverride || document.getElementById("dms-chart");
  if (!canvas || !trials?.length) return;
  const ctx = canvas.getContext("2d");
  const padding = 40;
  const chartHeight = canvas.height - padding * 2;
  const chartWidth = canvas.width - padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const maxRt = Math.max(...trials.map((t) => Number(t.rtMs) || 0), 500);
  const barWidth = Math.max(
    8,
    Math.min(24, chartWidth / Math.max(trials.length, 1) - 6)
  );
  const gap = Math.max(
    4,
    (chartWidth - trials.length * barWidth) / Math.max(trials.length - 1, 1)
  );

  const points = [];
  trials.forEach((t, i) => {
    const x = padding + i * (barWidth + gap);
    const baseY = canvas.height - padding;
    const barH = chartHeight * 0.6 * (t.correct ? 1 : 0.2);

    ctx.fillStyle = t.correct ? "#43a047" : "#e53935";
    ctx.fillRect(x, baseY - barH, barWidth, barH);

    ctx.fillStyle = "#bbb";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i + 1, x + barWidth / 2, baseY + 14);

    const rt = Number(t.rtMs) || 0;
    const y = baseY - (rt / maxRt) * chartHeight;
    points.push({ x: x + barWidth / 2, y });
  });

  ctx.strokeStyle = "#64b5f6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  ctx.fillStyle = "#eee";
  ctx.textAlign = "right";
  ctx.font = "12px sans-serif";
  ctx.fillText(T("common.rtMs"), canvas.width - padding, padding - 8);
  ctx.textAlign = "left";
  ctx.fillText(T("common.correctIncorrect"), padding, padding - 8);
}

// ----- Bootstrap -----
document.addEventListener("DOMContentLoaded", () => {
  const settings = window.AppSettings?.load?.() ?? null;
  const lang = settings?.global?.language || "fa";
  if (window.AppSettings?.applyThemeAndLanguage) {
    AppSettings.applyThemeAndLanguage(settings);
  }
  if (window.I18N?.translatePage) {
    I18N.translatePage(lang);
  }

  const statusEl = document.getElementById("status");
  const phaseLabelEl = document.getElementById("phase-label");
  const stimulusAreaEl = document.getElementById("stimulus-area");
  const titleEl = document.querySelector("#app h1");
  const controlsEl = document.getElementById("controls");
  const downloadBtn = document.getElementById("download-btn");
  const backBtn = document.getElementById("back-btn");
  const instructionsScreen = document.getElementById("instructions-screen");
  const instructionSampleEl = document.getElementById("instruction-sample");
  const menuScreen = document.getElementById("menu-screen");
  const menuInstructionsBtn = document.getElementById("menu-instructions-btn");
  const menuPracticeBtn = document.getElementById("menu-practice-btn");
  const menuStartBtn = document.getElementById("menu-start-btn");
  const instructionsPracticeBtn = document.getElementById("instructions-practice-btn");
  const instructionsStartBtn = document.getElementById("instructions-start-btn");

  const dmsConfig = buildDmsConfigFromSettings();

  const renderer = new Renderer(statusEl, phaseLabelEl, stimulusAreaEl);
  const stimGen = new StimulusGenerator(dmsConfig);
  const logger = new DataLogger();

  const shouldShowInstructions = settings?.global?.showInstructions ?? true;
  if (!shouldShowInstructions) {
    const origStatus = renderer.setStatus.bind(renderer);
    const origPhase = renderer.setPhaseLabel.bind(renderer);
    renderer.setStatus = () => origStatus("");
    renderer.setPhaseLabel = () => origPhase("");
  }
  const setStatus = (txt) =>
    renderer.setStatus(shouldShowInstructions ? txt : "");
  const setPhase = (txt) =>
    renderer.setPhaseLabel(shouldShowInstructions ? txt : "");
  const task = new DMSTask(dmsConfig, renderer, stimGen, logger, {
    setStatus,
      setPhase,
    });
    let state = "idle";
    let isRunning = false;

  if (instructionSampleEl) {
    const previewGen = new PatternGenerator({
          segmentCount: dmsConfig.subRectCount,
          sharedQuadrants: dmsConfig.sharedQuadrants,
        });
        const previewRenderer = new PatternRenderer();
        const previewPattern = previewGen.generatePattern();
    const canvas = document.createElement("canvas");
    previewRenderer.render(previewPattern, canvas, 150, 150);
    instructionSampleEl.appendChild(canvas);
  }

  setStatus(T("dms.statusReady"));
  downloadBtn.textContent = T("dms.downloadBtn");
  if (titleEl) titleEl.textContent = T("dms.title");
  if (backBtn) backBtn.textContent = T("common.back");
  downloadBtn.classList.add("hidden");

  const showMenu = () => menuScreen?.classList.remove("hidden");
  const hideMenu = () => menuScreen?.classList.add("hidden");
  const ensureIdModalStyle = (() => {
    let injected = false;
    return () => {
      if (injected) return;
      injected = true;
      const style = document.createElement("style");
      style.textContent = `
        .id-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .id-modal {
          background: #1c1f2a;
          color: #fff;
          border-radius: 14px;
          padding: 18px;
          width: min(420px, 90vw);
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 18px 40px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .id-modal h3 {
          margin: 0 0 12px;
          font-size: 17px;
          text-align: inherit;
        }
        .id-modal input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          color: #fff;
          outline: none;
          box-sizing: border-box;
          margin-top: 2px;
        }
        .id-modal input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96,165,250,0.35);
        }
        .id-modal-actions {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .id-modal button {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 700;
        }
        .id-modal .primary {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff;
        }
        .id-modal .ghost {
          background: rgba(255,255,255,0.08);
          color: #e5e7eb;
        }
      `;
      document.head.appendChild(style);
    };
  })();

  const promptParticipantId = () => {
    ensureIdModalStyle();
    const fallback = "شماره آزمودنی را وارد کنید";
    const label =
      T("common.enterParticipantId", { defaultValue: fallback }) || fallback;
    const confirmText = T("common.confirm") || "OK";
    const cancelText = T("common.cancel") || "Cancel";
    const last = localStorage.getItem("cantab_last_participant_id") || "";
    const dir = document.body.dir || "rtl";

    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "id-modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "id-modal";
      modal.dir = dir;

      const title = document.createElement("h3");
      title.textContent = label;
      modal.appendChild(title);

      const input = document.createElement("input");
      input.type = "text";
      input.value = last;
      input.placeholder = label;
      modal.appendChild(input);

      const actions = document.createElement("div");
      actions.className = "id-modal-actions";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ghost";
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => {
        document.body.removeChild(backdrop);
        resolve(null);
      };

      const okBtn = document.createElement("button");
      okBtn.className = "primary";
      okBtn.textContent = confirmText;
      okBtn.onclick = () => {
        const val = input.value.trim();
        if (!val) {
          input.focus();
          return;
        }
        localStorage.setItem("cantab_last_participant_id", val);
        document.body.removeChild(backdrop);
        resolve(val);
      };

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      modal.appendChild(actions);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      setTimeout(() => input.focus(), 30);
    });
  };
  const showInstructions = () => {
    hideMenu();
    instructionsScreen?.classList.remove("hidden");
  };
  const hideInstructions = () => instructionsScreen?.classList.add("hidden");

  const updateChromeVisibility = () => {
    if (isRunning) {
      titleEl?.classList.add("hidden");
      controlsEl?.classList.add("hidden");
      phaseLabelEl?.classList.add("hidden");
      backBtn?.classList.add("hidden");
    } else {
      titleEl?.classList.remove("hidden");
      controlsEl?.classList.remove("hidden");
      phaseLabelEl?.classList.remove("hidden");
      backBtn?.classList.remove("hidden");
    }
  };

  updateChromeVisibility();

  const beginTask = async (options) => {
    const participantId = await promptParticipantId();
    if (!participantId) {
      showMenu();
      backBtn?.classList.remove("hidden");
       updateChromeVisibility();
      return;
    }

    const startOpts = { ...options, participantId };
    hideMenu();
    hideInstructions();
    isRunning = true;
    state = startOpts.mode === "practice" ? "running-practice" : "running-main";
    downloadBtn.disabled = true;
    downloadBtn.classList.add("hidden");
    backBtn?.classList.add("hidden");
    updateChromeVisibility();

      task.start(
        () => {
          isRunning = false;
          state = "idle";
          if (startOpts.mode === "main") {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove("hidden");
          } else {
            downloadBtn.disabled = true;
            downloadBtn.classList.add("hidden");
          }
          backBtn?.classList.remove("hidden");
          setStatus(T("dms.statusReady"));
          showMenu();
          updateChromeVisibility();
        },
        startOpts
      );
  };

  const startPractice = () => beginTask({ mode: "practice" });
  const startMain = () => beginTask({ mode: "main" });

  menuInstructionsBtn?.addEventListener("click", () => showInstructions());
  menuPracticeBtn?.addEventListener("click", () => startPractice());
  menuStartBtn?.addEventListener("click", () => startMain());
  instructionsPracticeBtn?.addEventListener("click", () => startPractice());
  instructionsStartBtn?.addEventListener("click", () => startMain());

  showMenu();

  downloadBtn.addEventListener("click", () => {
    const humanWb = window.DMS_REPORT?.buildWorkbook
      ? DMS_REPORT.buildWorkbook(logger)
      : null;
    const machineCsv = logger.toMachineCSV();
    const pid = CSV_UTILS.sanitizeFilenameSegment(task.participantId || "");
    const sess = CSV_UTILS.sanitizeFilenameSegment(logger.sessionId || "session");
    const humanName = `DMS_Report_${pid || "participant"}_${sess}.xlsx`;
    const machineName = `DMS_Data_${pid || "participant"}_${sess}.csv`;
    const zipName = `DMS_Export_${pid || "participant"}_${sess}.zip`;
    const zip = new JSZip();
    if (humanWb) {
      const humanArray = XLSX.write(humanWb, { bookType: "xlsx", type: "array" });
      zip.file(humanName, humanArray);
    }
    zip.file(machineName, CSV_UTILS.addBom(machineCsv));
    zip.generateAsync({ type: "blob" }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (isRunning) return;
      if (instructionsScreen && !instructionsScreen.classList.contains("hidden")) {
        hideInstructions();
        showMenu();
        updateChromeVisibility();
        return;
      }
      window.history.back();
    });
  }
});
