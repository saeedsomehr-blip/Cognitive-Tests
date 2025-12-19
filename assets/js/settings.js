// Basic settings helper for global/theme and per-task customization.
(() => {
  const STORAGE_KEY = "cantab_settings_v1";
  const HISTORY_KEY = "cantab_history_v1";

  const clone = (obj) => {
    if (typeof structuredClone === "function") return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  };

  const DEFAULTS = {
    global: {
      language: "fa",
      theme: "dark",
      showInstructions: false,
      seed: null,
    },
    dms: {
      nChoices: 4, // 1-6
      sampleDurationMs: 2000,
      delayMs: 4000,
      delayMsList: [0, 4000, 12000],
      subRectCount: 4,
      sharedQuadrants: 1,
      practiceTrialsTotal: 4,
      mainTrialsTotal: 24,
      responseDeadlineMs: null, // null => unlimited
    },
    prm: {
      nChoices: 2, // 2-4
      sampleDurationMs: 2500,
      responseDeadlineMs: null, // null => unlimited
      isiMs: 500,
      practiceTrialsTotal: 4,
      mainTrialsTotal: 24,
    },
  };

  const clampInt = (val, min, max, fallback) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.round(n), min), max);
  };

  const clampTrialCount = (val, fallback) =>
    clampInt(val, 1, 200, fallback);

  const sanitizeDelayValue = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return null;
    return Math.min(Math.max(Math.round(n), 0), 20000);
  };

  const normalizeDelayList = (list, fallback = DEFAULTS.dms.delayMsList) => {
    if (!Array.isArray(list)) list = [];
    const values = [];
    for (const item of list) {
      const n = sanitizeDelayValue(item);
      if (n == null) continue;
      if (!values.includes(n)) values.push(n);
    }
    if (!values.length && Array.isArray(fallback)) {
      return fallback.slice();
    }
    return values.sort((a, b) => a - b);
  };

  const mergeSettings = (base, patch) => {
    const out = clone(base);
    if (!patch || typeof patch !== "object") return out;

    if (patch.global) {
      out.global.language = patch.global.language || out.global.language;
      out.global.theme = patch.global.theme || out.global.theme;
      out.global.showInstructions =
        patch.global.showInstructions ?? out.global.showInstructions;
      out.global.seed = patch.global.seed ?? out.global.seed ?? null;
    }

    if (patch.dms) {
      out.dms.nChoices = clampInt(
        patch.dms.nChoices ?? out.dms.nChoices,
        1,
        6,
        out.dms.nChoices
      );
      out.dms.sampleDurationMs = clampInt(
        patch.dms.sampleDurationMs ?? out.dms.sampleDurationMs,
        300,
        15000,
        out.dms.sampleDurationMs
      );
      out.dms.delayMs = clampInt(
        patch.dms.delayMs ?? out.dms.delayMs,
        0,
        20000,
        out.dms.delayMs
      );
      out.dms.subRectCount = clampInt(
        patch.dms.subRectCount ?? out.dms.subRectCount,
        2,
        6,
        out.dms.subRectCount
      );
      const maxShared = Math.max(1, out.dms.subRectCount - 1);
      out.dms.sharedQuadrants = clampInt(
        patch.dms.sharedQuadrants ?? out.dms.sharedQuadrants ?? 1,
        1,
        maxShared,
        Math.min(out.dms.sharedQuadrants ?? 1, maxShared)
      );
      if (patch.dms.delayMsList) {
        out.dms.delayMsList = normalizeDelayList(
          patch.dms.delayMsList,
          out.dms.delayMsList
        );
      } else if (patch.dms.delayMs != null) {
        out.dms.delayMsList = normalizeDelayList(
          [patch.dms.delayMs],
          out.dms.delayMsList
        );
      }
      out.dms.practiceTrialsTotal = clampTrialCount(
        patch.dms.practiceTrialsTotal ?? out.dms.practiceTrialsTotal,
        out.dms.practiceTrialsTotal
      );
      out.dms.mainTrialsTotal = clampTrialCount(
        patch.dms.mainTrialsTotal ?? out.dms.mainTrialsTotal,
        out.dms.mainTrialsTotal
      );

      const rd = patch.dms.responseDeadlineMs;
      out.dms.responseDeadlineMs =
        rd === null || rd === "" ? null : clampInt(rd, 500, 30000, out.dms.responseDeadlineMs ?? null);
    }

    if (patch.prm) {
      out.prm.nChoices = clampInt(
        patch.prm.nChoices ?? out.prm.nChoices,
        2,
        4,
        out.prm.nChoices
      );
      out.prm.sampleDurationMs = clampInt(
        patch.prm.sampleDurationMs ?? out.prm.sampleDurationMs,
        300,
        15000,
        out.prm.sampleDurationMs
      );
      const rd = patch.prm.responseDeadlineMs;
      out.prm.responseDeadlineMs =
        rd === null || rd === "" ? null : clampInt(rd, 500, 30000, out.prm.responseDeadlineMs ?? null);
      out.prm.isiMs = clampInt(
        patch.prm.isiMs ?? out.prm.isiMs,
        0,
        10000,
        out.prm.isiMs
      );
      out.prm.practiceTrialsTotal = clampTrialCount(
        patch.prm.practiceTrialsTotal ?? out.prm.practiceTrialsTotal,
        out.prm.practiceTrialsTotal
      );
      out.prm.mainTrialsTotal = clampTrialCount(
        patch.prm.mainTrialsTotal ?? out.prm.mainTrialsTotal,
        out.prm.mainTrialsTotal
      );
    }

    return out;
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return mergeSettings(DEFAULTS, parsed);
    } catch (e) {
      console.warn("AppSettings: failed to load, resetting to defaults", e);
      localStorage.removeItem(STORAGE_KEY);
      return clone(DEFAULTS);
    }
  };

  const save = (settings) => {
    const merged = mergeSettings(DEFAULTS, settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  };

  const update = (partial) => {
    const existing = load();
    const merged = mergeSettings(existing, partial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  };

  const applyThemeAndLanguage = (settings = load()) => {
    const lang = settings.global.language || "fa";
    document.documentElement.lang = lang;
    document.body.dir = lang === "en" ? "ltr" : "rtl";

    const theme = settings.global.theme || "dark";
    document.body.dataset.theme = theme;
  };

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("TestHistory: reset due to parse error", e);
      localStorage.removeItem(HISTORY_KEY);
      return [];
    }
  };

  const saveHistory = (rows) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rows || []));
  };

  const addHistory = (entry) => {
    const rows = loadHistory();
    const id =
      (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `hist_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    rows.unshift({
      id,
      ...entry,
    });
    if (rows.length > 200) rows.length = 200; // keep it reasonable
    saveHistory(rows);
    return id;
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
  };

  window.AppSettings = {
    defaults: DEFAULTS,
    load,
    save,
    update,
    applyThemeAndLanguage,
    clampInt,
    normalizeDelayList,
  };

  window.TestHistory = {
    load: loadHistory,
    add: addHistory,
    clear: clearHistory,
  };
})();
