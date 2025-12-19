/* ===========================================================
   PRM - Pattern Recognition Memory (customizable, JSON library)
   =========================================================== */

const PRM_DEFAULT_CONFIG = {
  nStudyPatterns: 12,         // number of study-phase patterns (classic CANTAB style)
  sampleDurationMs: 2500,     // display time per study item
  isiMs: 500,                 // inter-stimulus interval
  feedbackDurationMs: 600,    // feedback duration when enabled
  giveFeedback: false,        // standard PRM typically runs without feedback
  nChoices: 2,                // choices in test phase (2?4; default 2 like CANTAB)
  responseDeadlineMs: null,   // null = no time limit
  practiceTrialsTotal: 4,
  mainTrialsTotal: 24,
};

const clampInt =
  (window.AppSettings && window.AppSettings.clampInt) ||
  ((val, min, max, fallback) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.round(n), min), max);
  });

const T = (key, params) => (window.I18N ? I18N.t(key, params) : key);

/* -----------------------------------------------------------
   تنظیمات از AppSettings
----------------------------------------------------------- */
function buildPrmConfigFromSettings() {
  const settings = window.AppSettings?.load?.() ?? null;
  const prm = settings?.prm ?? {};
  const cfg = { ...PRM_DEFAULT_CONFIG };

  // Sample display time
  cfg.sampleDurationMs = clampInt(
    prm.sampleDurationMs ?? cfg.sampleDurationMs,
    300,
    15000,
    cfg.sampleDurationMs
  );

  // ISI
  cfg.isiMs = clampInt(
    prm.isiMs ?? cfg.isiMs,
    0,
    10000,
    cfg.isiMs
  );

  // Number of choices (2 to 4)
  cfg.nChoices = clampInt(
    prm.nChoices ?? cfg.nChoices,
    2,
    4,
    cfg.nChoices
  );

  // Deadline (null/empty => unlimited)
  const rd = prm.responseDeadlineMs;
  cfg.responseDeadlineMs =
    rd === null || rd === "" || rd === undefined
      ? null
      : clampInt(rd, 500, 30000, cfg.responseDeadlineMs ?? null);
  cfg.practiceTrialsTotal = clampInt(
    prm.practiceTrialsTotal ?? cfg.practiceTrialsTotal,
    1,
    200,
    cfg.practiceTrialsTotal ?? 4
  );
  cfg.mainTrialsTotal = clampInt(
    prm.mainTrialsTotal ?? cfg.mainTrialsTotal,
    1,
    200,
    cfg.mainTrialsTotal ?? 24
  );

  return cfg;
}

/* ===========================================================
   Renderer
=========================================================== */

class PRMRenderer {
  constructor(statusEl, phaseLabelEl, stimulusAreaEl) {
    this.statusEl = statusEl;
    this.phaseLabelEl = phaseLabelEl;
    this.stimulusArea = stimulusAreaEl;
    this.patternRenderer = new PRMSegmentRenderer();
  }

  setStatus(t) {
    this.statusEl.textContent = t;
  }

  setPhaseLabel(t) {
    this.phaseLabelEl.textContent = t;
  }

  clear() {
    this.stimulusArea.innerHTML = "";
  }

  showStudySample(pattern, index, total) {
    this.clear();
    this.setStatus(T("prm.studyLabel", { i: index + 1, total }));
    this.setPhaseLabel(T("prm.remember"));

    const box = document.createElement("div");
    box.className = "sample-box";

    const canvas = document.createElement("canvas");
    this.patternRenderer.render(pattern, canvas, 160);
    box.appendChild(canvas);

    this.stimulusArea.appendChild(box);
  }

  showFixation() {
    this.clear();
    const x = document.createElement("span");
    x.textContent = "+";
    x.className = "fixation";
    this.stimulusArea.appendChild(x);
  }

  showTestOptions(patterns, onChoice) {
    this.clear();
    this.setPhaseLabel(T("prm.pickOld"));

    const c = document.createElement("div");
    c.style.display = "flex";
    c.style.justifyContent = "center";
    c.style.gap = "18px";
    c.style.flexWrap = "wrap";

    patterns.forEach((pattern, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "choice-box";
      const canvas = document.createElement("canvas");
      this.patternRenderer.render(pattern, canvas, 150);
      wrap.appendChild(canvas);
      wrap.onclick = () => onChoice(idx, wrap);
      c.appendChild(wrap);
    });

    this.stimulusArea.appendChild(c);
  }

  showMessage(content) {
    this.clear();
    const wrapper = document.createElement("div");
    wrapper.style.fontSize = "16px";
    if (content && typeof content === "object" && content.nodeType) {
      wrapper.appendChild(content);
    } else {
      wrapper.textContent = content ?? "";
    }
    this.stimulusArea.appendChild(wrapper);
  }

  showFeedback(result) {
    this.clear();
    const p = document.createElement("p");
    p.style.fontSize = "24px";
    p.textContent = result.timedOut
      ? T("prm.timeout")
      : result.correct
      ? T("prm.feedbackCorrect")
      : T("prm.feedbackWrong");
    this.stimulusArea.appendChild(p);
  }
}

/* ===========================================================
   Logger
=========================================================== */

class PRMLogger {
  constructor() {
    this.studyRows = [];
    this.testRows = [];
    this.taskStart = 0;
    this.taskEnd = 0;
    this.sessionId = "";
    this.startedAtIso = "";
    this.taskStartEpochMs = 0;
    this.mode = "main";
    this.configSnapshot = {};
    this.participantId = "";
  }

  _makeSessionId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `prm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  start({ mode = "main", config = {}, participantId = "" } = {}) {
    this.studyRows = [];
    this.testRows = [];
    this.taskStart = performance.now();
    this.taskStartEpochMs = Date.now();
    this.taskEnd = this.taskStart;
    this.sessionId = this._makeSessionId();
    this.startedAtIso = new Date().toISOString();
    this.mode = mode;
    this.participantId = participantId;
    this.configSnapshot = {
      nChoices: config.nChoices,
      sampleDurationMs: config.sampleDurationMs,
      isiMs: config.isiMs,
      responseDeadlineMs: config.responseDeadlineMs,
      practiceTrialsTotal: config.practiceTrialsTotal,
      mainTrialsTotal: config.mainTrialsTotal,
      libraryName: config.libraryName || "",
    };
  }

  logStudy(i, id) {
    this.studyRows.push({
      phase: "study",
      index: i,
      patternId: id,
      mode: this.mode,
      t: performance.now() - this.taskStart,
    });
  }

  logTest({
    index,
    oldId,
    distractorIds,
    optionIdsOrdered,
    correctIndex,
    chosenIndex,
    correct,
    rt,
    nChoices,
    timedOut,
    responseDeadlineMs,
    visibilityHidden,
    trialStartMs,
    trialEndMs,
  }) {
    const trialStartEpochMs =
      typeof this.taskStartEpochMs === "number" && typeof trialStartMs === "number"
        ? this.taskStartEpochMs + (trialStartMs - this.taskStart)
        : null;
    const trialEndEpochMs =
      typeof this.taskStartEpochMs === "number" && typeof trialEndMs === "number"
        ? this.taskStartEpochMs + (trialEndMs - this.taskStart)
        : null;
    this.testRows.push({
      phase: "test",
      index,
      patternId: oldId,
      distractorIds: Array.isArray(distractorIds) ? distractorIds.join("|") : distractorIds,
      optionIdsOrdered: optionIdsOrdered ?? "",
      correctIndex,
      chosenIndex: chosenIndex ?? "",
      correct: correct ? 1 : 0,
      rt: rt != null ? Math.round(rt) : "",
      nChoices,
      timedOut: timedOut ? 1 : 0,
      responseDeadlineMs: responseDeadlineMs ?? "",
      visibilityHidden: visibilityHidden ? 1 : 0,
      isPractice: this.mode === "practice" ? 1 : 0,
      mode: this.mode,
      t: performance.now() - this.taskStart,
      trialStartMs,
      trialEndMs,
      trialStartEpochMs,
      trialEndEpochMs,
    });
  }

  _getTestStats() {
    const tests = this.testRows;
    const correct = tests.filter((r) => r.correct === 1).length;
    const acc = tests.length ? Math.round((correct / tests.length) * 100) : 0;

    const rts = tests.filter((r) => r.correct === 1).map((r) => r.rt);
    const meanRT = rts.length
      ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
      : 0;
    const timeouts = tests.filter((r) => r.timedOut === 1).length;

    return { total: tests.length, correct, acc, meanRT, timeouts };
  }

  summaryDOM() {
    const tests = this.testRows;
    const correct = tests.filter((r) => r.correct === 1).length;
    const acc = tests.length ? Math.round((correct / tests.length) * 100) : 0;

    const rts = tests.filter((r) => r.correct === 1).map((r) => r.rt);
    const meanRT = rts.length
      ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
      : 0;

    const root = document.createElement("div");
    root.className = "prm-summary";
    root.style.textAlign = "center";

    const title = document.createElement("h3");
    title.style.marginBottom = "8px";
    title.textContent = T("prm.summaryTitle");
    root.appendChild(title);

    const statsEl = document.createElement("div");
    statsEl.className = "prm-summary-stats";
    statsEl.style.lineHeight = "1.8";

    const addLine = (label, value) => {
      const div = document.createElement("div");
      div.textContent = `${label}: ${value}`;
      statsEl.appendChild(div);
    };
    addLine(T("prm.summaryTotal"), tests.length);
    addLine(T("prm.summaryCorrect"), correct);
    addLine(T("prm.summaryAcc"), `${acc}%`);
    addLine(T("prm.summaryMeanRt"), `${meanRT} ms`);
    root.appendChild(statsEl);

    const chartWrap = document.createElement("div");
    chartWrap.style.marginTop = "16px";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 260;
    chartWrap.appendChild(canvas);
    root.appendChild(chartWrap);

    return { root, canvas };
  }

  getTests() {
    return this.testRows.slice();
  }

  getStudyRows() {
    return this.studyRows.slice();
  }

  getStats() {
    return this._getTestStats();
  }

  toHumanCSV() {
    return window.PRM_CSV && typeof PRM_CSV.toHumanCSV === "function"
      ? PRM_CSV.toHumanCSV(this)
      : "";
  }

  toMachineCSV() {
    return window.PRM_CSV && typeof PRM_CSV.toMachineCSV === "function"
      ? PRM_CSV.toMachineCSV(this)
      : "";
  }

  toCSV() {
    return this.toMachineCSV();
  }
}

/* ===========================================================
   Main Task Controller
=========================================================== */

class PRMTask {
  /**
   * @param {Object} config  output of buildPrmConfigFromSettings
   * @param {PRMRenderer} renderer
   * @param {PRMPatternLibrary} library  (from prm_library.json)
   * @param {PRMSegmentPatternGenerator} generator  (for novel patterns)
   * @param {PRMLogger} logger
   */
  constructor(config, renderer, library, generator, logger) {
    this.config = config;
    this.renderer = renderer;
    this.library = library;
    this.generator = generator;
    this.logger = logger;
    this.participantId = "";
    this.mode = "main";

    this.studyIds = [];   // IDs shown in the study phase
    this.testList = [];   // full list of test trials
    this.studyIndex = 0;
    this.testIndex = 0;

    this.responseTimeoutId = null;
    this.responseLocked = false;
    this.choiceStartTime = null;
    this.visibilityHiddenDuringTrial = false;
    this.currentOptionIdsOrdered = [];
  }

  start(onFinish, options = {}) {
    this.onFinish = onFinish;
    this.mode = options.mode ?? "main";
    this.participantId = options.participantId ?? "";
    this.logger.start({
      mode: this.mode,
      participantId: this.participantId,
      config: this.config,
    });

    const studyCount =
      options.studyCount ?? this.config.nStudyPatterns ?? this.config.mainTrialsTotal ?? 12;
    const studyPatterns = this.library.selectStudyPatterns(studyCount);

    this.studyIds = studyPatterns.map((p) => p.id);

    // Build test trials:
    // - each trial: one old (library) + several novel (generator)
    this.testList = this.studyIds.map((oldId) => {
      const oldPat = this.library.getById(oldId);
      const options = [];
      const distractorIds = [];
      const correctIndex = Math.floor(Math.random() * this.config.nChoices);

      for (let i = 0; i < this.config.nChoices; i++) {
        if (i === correctIndex) {
          options.push(oldPat);
        } else {
          const novel = this.library.getNovelPattern(this.generator);
          distractorIds.push(novel.id || `novel_${i}`);
          options.push(novel);
        }
      }

      return { oldId, options, distractorIds, correctIndex };
    });

    this.studyIndex = 0;
    this.testIndex = 0;

    shuffle(this.testList);
    this.runStudy();
  }

  /* ---------- Study Phase ---------- */
  runStudy() {
    if (this.studyIndex >= this.studyIds.length) {
      // Move to the test phase
      // Transition to test without showing a middle-screen message.
      this.renderer.clear();
      setTimeout(() => this.runTest(), 1200);
      return;
    }

    const id = this.studyIds[this.studyIndex];
    const pat = this.library.getById(id);

    this.logger.logStudy(this.studyIndex, id);
    this.renderer.showStudySample(pat, this.studyIndex, this.studyIds.length);

    this.studyIndex++;

    setTimeout(() => {
      this.renderer.showFixation();
      setTimeout(() => this.runStudy(), this.config.isiMs);
    }, this.config.sampleDurationMs);
  }

  /* ---------- Test Phase ---------- */
  runTest() {
    if (this.testIndex >= this.testList.length) {
      this.finish();
      return;
    }

    const tr = this.testList[this.testIndex];

    this.renderer.setStatus(
      T("prm.questionCounter", {
        i: this.testIndex + 1,
        total: this.testList.length,
      })
    );

    this.responseLocked = false;
    this.visibilityHiddenDuringTrial = false;
    this.choiceStartTime = null;
    this.currentOptionIdsOrdered = tr.options.map((p) => p?.id ?? "");

    const trialStartMs = performance.now();
    this.renderer.showTestOptions(tr.options, (choiceIdx /*, domWrap*/) => {
      if (this.responseLocked || this.choiceStartTime === null) return;
      this.responseLocked = true;
      this._clearResponseTimer();

      const rt = performance.now() - this.choiceStartTime;
      const correct = choiceIdx === tr.correctIndex;

      this.logger.logTest({
        index: this.testIndex,
        oldId: tr.oldId,
        distractorIds: tr.distractorIds,
        optionIdsOrdered: this.currentOptionIdsOrdered.join("|"),
        correctIndex: tr.correctIndex,
        chosenIndex: choiceIdx,
        correct,
        rt,
        nChoices: this.config.nChoices,
        timedOut: false,
        responseDeadlineMs: this.config.responseDeadlineMs,
        visibilityHidden: this.visibilityHiddenDuringTrial ? 1 : 0,
        trialStartMs,
        trialEndMs: performance.now(),
      });

      if (this.config.giveFeedback) {
        this.renderer.showFeedback({ correct, timedOut: false });
        setTimeout(() => {
          this.testIndex++;
          this.runTest();
        }, this.config.feedbackDurationMs);
      } else {
        this.testIndex++;
        this.runTest();
      }
    });

    requestAnimationFrame(() => {
      this.choiceStartTime = performance.now();
      this._startResponseTimer();
    });
  }

  /* ---------- Timeout handling ---------- */

  _startResponseTimer() {
    this._clearResponseTimer();
    if (!this.config.responseDeadlineMs) return;
    this.responseTimeoutId = setTimeout(
      () => this._handleTimeout(),
      this.config.responseDeadlineMs
    );
  }

  _clearResponseTimer() {
    if (this.responseTimeoutId != null) {
      clearTimeout(this.responseTimeoutId);
      this.responseTimeoutId = null;
    }
  }

  _handleTimeout() {
    if (this.responseLocked) return;
    this.responseLocked = true;
    const tr = this.testList[this.testIndex];

    this.logger.logTest({
      index: this.testIndex,
      oldId: tr.oldId,
      distractorIds: tr.distractorIds,
      optionIdsOrdered: this.currentOptionIdsOrdered.join("|"),
      correctIndex: tr.correctIndex,
      chosenIndex: null,
      correct: false,
      rt: this.config.responseDeadlineMs,
      nChoices: this.config.nChoices,
      timedOut: true,
      responseDeadlineMs: this.config.responseDeadlineMs,
      visibilityHidden: this.visibilityHiddenDuringTrial ? 1 : 0,
    });

    this.testIndex++;
    this.renderer.setStatus(T("prm.timeout"));
    this.renderer.showFeedback({ correct: false, timedOut: true });

    setTimeout(() => this.runTest(), this.config.feedbackDurationMs);
  }

  handleVisibilityChange(isHidden) {
    if (!isHidden) return;
    if (this.responseLocked || this.choiceStartTime === null) return;
    this.visibilityHiddenDuringTrial = true;
    this._clearResponseTimer();
    this._handleTimeout();
  }

  /* ---------- Finish ---------- */

  finish() {
    this._clearResponseTimer();
    this.renderer.setStatus("");
    this.renderer.setPhaseLabel("");
    if (this.renderer.statusEl) this.renderer.statusEl.classList.add("hidden");
    if (this.renderer.phaseLabelEl) this.renderer.phaseLabelEl.classList.add("hidden");
    const titleEl = document.querySelector("#app h1");
    if (titleEl) titleEl.classList.add("hidden");

    this.logger.taskEnd = performance.now();

    const tests = this.logger.getTests();
    const summary = this.logger.summaryDOM();
    this.renderer.showMessage(summary.root);
    renderResultsChart(tests, summary.canvas);

    if (window.TestHistory) {
      const stats = this.logger.getStats();
      const csvHuman = this.logger.toHumanCSV();
      const csvMachine = this.logger.toMachineCSV();
      const humanWb = window.PRM_REPORT?.buildWorkbook
        ? PRM_REPORT.buildWorkbook(this.logger)
        : null;
      const humanBase64 = humanWb
        ? XLSX.write(humanWb, { bookType: "xlsx", type: "base64" })
        : "";
      TestHistory.add({
        testType: "prm",
        participantId: this.participantId || "",
        mode: this.mode || "main",
        timestampIso: new Date().toISOString(),
        summary: stats,
        csvHuman,
        csvMachine,
        humanBase64,
        sessionId: this.logger.sessionId,
      });
    }

    if (this.onFinish) this.onFinish();
  }
}

/* ===========================================================
   Utilities
=========================================================== */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderResultsChart(tests, canvasOverride) {
  const canvas = canvasOverride || document.getElementById("prm-chart");
  if (!canvas || !tests?.length) return;
  const ctx = canvas.getContext("2d");
  const padding = 40;
  const chartHeight = canvas.height - padding * 2;
  const chartWidth = canvas.width - padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const maxRt = Math.max(...tests.map((t) => Number(t.rt) || 0), 500);
  const barWidth = Math.max(
    8,
    Math.min(24, chartWidth / Math.max(tests.length, 1) - 6)
  );
  const gap = Math.max(
    4,
    (chartWidth - tests.length * barWidth) / Math.max(tests.length - 1, 1)
  );

  const points = [];
  tests.forEach((t, i) => {
    const x = padding + i * (barWidth + gap);
    const baseY = canvas.height - padding;
    const barH = chartHeight * 0.6 * (t.correct ? 1 : 0.2);

    ctx.fillStyle = t.correct ? "#43a047" : "#e53935";
    ctx.fillRect(x, baseY - barH, barWidth, barH);

    ctx.fillStyle = "#bbb";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i + 1, x + barWidth / 2, baseY + 14);

    const rt = Number(t.rt) || 0;
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

/* ===========================================================
   Startup Code
=========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const settings = window.AppSettings?.load?.() ?? null;
    if (window.AppSettings?.applyThemeAndLanguage) {
      AppSettings.applyThemeAndLanguage(settings);
    }
    const lang = settings?.global?.language || "fa";
    if (window.I18N?.translatePage) {
      I18N.translatePage(lang);
    }

    const statusEl = document.getElementById("status");
    const phaseLabelEl = document.getElementById("phase-label");
    const stimEl = document.getElementById("stimulus-area");
    const controlsEl = document.getElementById("controls");
    let downloadBtn = null;
    const instructionsScreen = document.getElementById("instructions-screen");
    const instructionSampleEl = document.getElementById("instruction-sample");
    const backBtn = document.getElementById("back-btn");
    const menuScreen = document.getElementById("menu-screen");
    const menuInstructionsBtn = document.getElementById("menu-instructions-btn");
    const menuPracticeBtn = document.getElementById("menu-practice-btn");
    const menuStartBtn = document.getElementById("menu-start-btn");
    const instructionsPracticeBtn = document.getElementById("instructions-practice-btn");
    const instructionsStartBtn = document.getElementById("instructions-start-btn");

    const renderer = new PRMRenderer(statusEl, phaseLabelEl, stimEl);
    const generator = new PRMSegmentPatternGenerator();
    const library = new PRMPatternLibrary({});
    const logger = new PRMLogger();
    const prmConfig = buildPrmConfigFromSettings();

    const task = new PRMTask(prmConfig, renderer, library, generator, logger);

    document.addEventListener("visibilitychange", () => {
      task.handleVisibilityChange?.(document.hidden);
    });

    const shouldShowInstructions = settings?.global?.showInstructions ?? true;
    if (statusEl) {
      statusEl.textContent = shouldShowInstructions ? T("prm.statusReady") : "";
    }
    const originalSetStatus = renderer.setStatus.bind(renderer);
    const originalSetPhaseLabel = renderer.setPhaseLabel.bind(renderer);
    renderer.setStatus = (text) =>
      originalSetStatus(shouldShowInstructions ? text : "");
    renderer.setPhaseLabel = (text) =>
      originalSetPhaseLabel(shouldShowInstructions ? text : "");
    let isRunning = false;

    await library.loadLibrary();

    renderer.setStatus(T("prm.statusReady"));
    if (backBtn) backBtn.textContent = T("common.back");
    const titleEl = document.querySelector("#app h1");
    if (titleEl) titleEl.textContent = T("prm.title");
    const showTitle = () => titleEl?.classList.remove("hidden");
    const hideTitle = () => titleEl?.classList.add("hidden");
    showTitle();

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (isRunning) return;
        if (instructionsScreen && !instructionsScreen.classList.contains("hidden")) {
          hideInstructions();
          showMenu();
          backBtn?.classList.remove("hidden");
          return;
        }
        window.history.back();
      });
    }

    // Sample pattern for the instructions panel
    if (instructionSampleEl) {
      let samplePattern = null;
      if (library.isReady()) {
        const arr = library.selectStudyPatterns(1);
        samplePattern = arr[0];
      } else {
        samplePattern = generator.generatePattern();
      }
      if (samplePattern) {
        const sampleRenderer = new PRMSegmentRenderer();
        const c = document.createElement("canvas");
        sampleRenderer.render(samplePattern, c, 150);
        instructionSampleEl.appendChild(c);
      }
    }

    const downloadResults = () => {
      const humanWb = window.PRM_REPORT?.buildWorkbook
        ? PRM_REPORT.buildWorkbook(logger)
        : null;
      const machineCsv = logger.toMachineCSV();
      const pid = CSV_UTILS.sanitizeFilenameSegment(task.participantId || "");
      const sess = CSV_UTILS.sanitizeFilenameSegment(logger.sessionId || "session");
      const humanName = `PRM_Report_${pid || "participant"}_${sess}.xlsx`;
      const machineName = `PRM_Data_${pid || "participant"}_${sess}.csv`;
      const zipName = `PRM_Export_${pid || "participant"}_${sess}.zip`;
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
    };

    const ensureDownloadBtn = () => {
      if (downloadBtn) return downloadBtn;
      downloadBtn = document.createElement("button");
      downloadBtn.id = "download-btn";
      downloadBtn.className = "task-btn";
      downloadBtn.style.marginTop = "18px";
      downloadBtn.textContent = T("prm.downloadBtn");
      downloadBtn.addEventListener("click", downloadResults);
      downloadBtn.classList.add("hidden");
      menuScreen?.appendChild(downloadBtn);
      return downloadBtn;
    };

    const showMenu = () => {
      menuScreen?.classList.remove("hidden");
      showTitle();
    };
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
      showTitle();
    };
    const hideInstructions = () => instructionsScreen?.classList.add("hidden");

    const beginTask = async (mode) => {
      const participantId = await promptParticipantId();
      if (!participantId) {
        showMenu();
        backBtn?.classList.remove("hidden");
        return;
      }

      hideMenu();
      hideInstructions();
      isRunning = true;
      hideTitle();
      statusEl?.classList.remove("hidden");
      phaseLabelEl?.classList.remove("hidden");
      const btn = ensureDownloadBtn();
      btn.disabled = true;
      btn.classList.add("hidden");
      if (backBtn) backBtn.classList.add("hidden");

      const studyCount =
        mode === "practice"
          ? prmConfig.practiceTrialsTotal
          : prmConfig.mainTrialsTotal;

      downloadBtn?.classList.add("hidden");
      task.start(
        () => {
          isRunning = false;
          renderer.setStatus(T("prm.statusReady"));
          backBtn?.classList.remove("hidden");
          if (mode === "main") {
            const btn = ensureDownloadBtn();
            btn.disabled = false;
            btn.classList.remove("hidden");
          }
          showMenu();
          showTitle();
        },
        { studyCount, mode, participantId }
      );
    };

    menuInstructionsBtn?.addEventListener("click", () => showInstructions());
    menuPracticeBtn?.addEventListener("click", () => beginTask("practice"));
    menuStartBtn?.addEventListener("click", () => beginTask("main"));
    instructionsPracticeBtn?.addEventListener("click", () =>
      beginTask("practice")
    );
    instructionsStartBtn?.addEventListener("click", () => beginTask("main"));

    hideInstructions();
    showMenu();

  })();
});
