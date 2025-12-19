(() => {
  const yesNo = (val) => (val ? "Yes" : "No");

  const median = (values) => {
    const arr = values.slice().sort((a, b) => a - b);
    if (!arr.length) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  const iqr = (values) => {
    const arr = values.slice().sort((a, b) => a - b);
    if (arr.length < 2) return 0;
    const mid = Math.floor(arr.length / 2);
    const lower = arr.slice(0, mid);
    const upper = arr.length % 2 ? arr.slice(mid + 1) : arr.slice(mid);
    return median(upper) - median(lower);
  };

  const stddev = (values) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / (values.length - 1);
    return Math.sqrt(variance);
  };

  const formatMeanSd = (mean, sd, sdDecimals = 1) => {
    const sdStr = Number(sd).toFixed(sdDecimals);
    return `${mean} (± ${sdStr})`;
  };

  const buildDurationMinutes = (logger) => {
    const start = logger.taskStart ?? 0;
    const end = logger.taskEnd ?? start;
    return Number(((end - start) / 60000).toFixed(1));
  };

  const summarize = (logger) => {
    const tests = logger.getTests();
    const total = tests.length;
    const practice = tests.filter((t) => t.isPractice).length;
    const main = total - practice;
    const validTrials = tests.filter((t) => !t.visibilityHidden);
    const timeouts = validTrials.filter((t) => t.timedOut).length;
    const correctTrials = validTrials.filter((t) => t.correct === 1).length;
    const incorrectTrials = validTrials.filter((t) => !t.timedOut && t.correct === 0).length;
    const accPct =
      validTrials.length > 0
        ? Number(((correctTrials / validTrials.length) * 100).toFixed(1))
        : 0;
    const omissionPct =
      validTrials.length > 0
        ? Number(((timeouts / validTrials.length) * 100).toFixed(1))
        : 0;
    const rtCorrect = validTrials
      .filter((t) => t.correct === 1 && !t.timedOut && typeof t.rt === "number")
      .map((t) => t.rt);
    const meanRtCorrect = rtCorrect.length
      ? Math.round(rtCorrect.reduce((a, b) => a + b, 0) / rtCorrect.length)
      : 0;
    const sdRtCorrect = rtCorrect.length ? stddev(rtCorrect) : 0;
    const medianRtCorrect = rtCorrect.length ? Math.round(median(rtCorrect)) : 0;
    const iqrRtCorrect = rtCorrect.length ? Math.round(iqr(rtCorrect)) : 0;
    const rtIncorrect = validTrials
      .filter((t) => t.correct === 0 && !t.timedOut && typeof t.rt === "number")
      .map((t) => t.rt);
    const meanRtIncorrect = rtIncorrect.length
      ? Math.round(rtIncorrect.reduce((a, b) => a + b, 0) / rtIncorrect.length)
      : 0;
    const sdRtIncorrect = rtIncorrect.length ? stddev(rtIncorrect) : 0;
    const medianRtIncorrect = rtIncorrect.length ? Math.round(median(rtIncorrect)) : 0;
    const timeoutsPct =
      validTrials.length > 0
        ? Number(((timeouts / validTrials.length) * 100).toFixed(1))
        : 0;

    const byBlock = [
      { label: "Practice", filter: (t) => t.isPractice },
      { label: "Main", filter: (t) => !t.isPractice },
    ].map(({ label, filter }) => {
      const subset = validTrials.filter(filter);
      const totalB = subset.length;
      const timeoutsB = subset.filter((t) => t.timedOut).length;
      const correctB = subset.filter((t) => t.correct === 1).length;
      const accB = totalB > 0 ? Number(((correctB / totalB) * 100).toFixed(1)) : 0;
      const rtB = subset
        .filter((t) => t.correct === 1 && !t.timedOut && typeof t.rt === "number")
        .map((t) => t.rt);
      const meanRtB = rtB.length
        ? Math.round(rtB.reduce((a, b) => a + b, 0) / rtB.length)
        : 0;
      const sdRtB = rtB.length ? stddev(rtB) : 0;
      return {
        block: label,
        trials: totalB,
        valid: totalB,
        timeouts: timeoutsB,
        correct: correctB,
        accuracy: accB,
        meanRtCorrectMs: meanRtB,
        sdRtCorrectMs: sdRtB,
      };
    });

    return {
      total,
      practice,
      main,
      validTrials,
      timeouts,
      incorrectTrials,
      correctTrials,
      accPct,
      timeoutsPct,
      omissionPct,
      meanRtCorrect,
      sdRtCorrect,
      medianRtCorrect,
      iqrRtCorrect,
      meanRtIncorrect,
      sdRtIncorrect,
      medianRtIncorrect,
      byBlock,
    };
  };

  const aoaToSheet = (aoa, opts = {}) => XLSX.utils.aoa_to_sheet(aoa, opts);

  const styleHeaderRow = (sheet, cols) => {
    for (let c = 0; c < cols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      const cell = sheet[cellRef];
      if (!cell) continue;
      cell.s = cell.s || {};
      cell.s.font = { ...(cell.s.font || {}), bold: true };
      cell.s.fill = { fgColor: { rgb: "E5E7EB" } };
      cell.s.border = { bottom: { style: "thin", color: { rgb: "CCCCCC" } } };
      cell.s.alignment = { ...(cell.s.alignment || {}), horizontal: "center" };
    }
  };

  const autoWidthAndAlign = (sheet, table) => {
    const colCount = table[0]?.length || 1;
    const cols = Array.from({ length: colCount }, (_, c) => {
      const maxLen = Math.max(
        ...table.map((row) => {
          const v = row[c];
          const s = v == null ? "" : String(v);
          return s.length;
        })
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
    });
    sheet["!cols"] = cols;
    table.slice(1).forEach((row, rIdx) => {
      row.forEach((val, cIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx });
        const cell = sheet[cellRef];
        if (!cell) return;
        cell.s = cell.s || {};
        const isNumeric =
          typeof val === "number" ||
          (/^-?\\d+(\\.\\d+)?$/.test(String(val))) ||
          String(val).trim().endsWith("%") ||
          String(val).toLowerCase().includes("ms");
        cell.s.alignment = { horizontal: isNumeric && cIdx !== 0 ? "right" : "left" };
      });
    });
  };

  const attachTableMeta = (sheet, name, rows, cols) => {
    const ref = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows - 1, 0), c: Math.max(cols - 1, 0) },
    });
    sheet["!ref"] = ref;
    sheet["!autofilter"] = { ref };
    const table = {
      name,
      displayName: name,
      ref,
      headerRow: 1,
      totalsRow: 0,
      style: { theme: "TableStyleMedium9" },
    };
    sheet["!table"] = [table];
    sheet["!tables"] = [table];
  };

  const applyColorBars = (sheet, dataRows, colIdx, { from = "E0F2FE", to = "2563EB" } = {}) => {
    const values = dataRows
      .map((row) => {
        const raw = row[colIdx];
        if (typeof raw === "string" && raw.endsWith("%")) {
          const num = Number(raw.replace("%", ""));
          return Number.isFinite(num) ? num : null;
        }
        if (typeof raw === "string") {
          const match = raw.match(/-?\\d+(\\.\\d+)?/);
          return match ? Number(match[0]) : null;
        }
        return typeof raw === "number" ? raw : null;
      })
      .filter((v) => v != null);
    if (!values.length) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const parseHex = (hex) => {
      const h = hex.replace("#", "");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const blend = (a, b, t) => Math.round(a + (b - a) * t);
    const toHex = (n) => n.toString(16).padStart(2, "0");
    dataRows.forEach((row, rIdx) => {
      const raw = row[colIdx];
      let num = raw;
      if (typeof raw === "string" && raw.endsWith("%")) {
        num = Number(raw.replace("%", ""));
      } else if (typeof raw === "string") {
        const match = raw.match(/-?\\d+(\\.\\d+)?/);
        num = match ? Number(match[0]) : null;
      }
      if (typeof num !== "number") return;
      const t = Math.min(Math.max((num - min) / span, 0), 1);
      const [r1, g1, b1] = parseHex(from);
      const [r2, g2, b2] = parseHex(to);
      const color = `${toHex(blend(r1, r2, t))}${toHex(blend(g1, g2, t))}${toHex(blend(b1, b2, t))}`.toUpperCase();
      const cellRef = XLSX.utils.encode_cell({ r: rIdx + 1, c: colIdx });
      const cell = sheet[cellRef];
      if (!cell) return;
      cell.s = cell.s || {};
      cell.s.fill = { fgColor: { rgb: color } };
      cell.s.font = { ...(cell.s.font || {}), color: { rgb: t > 0.6 ? "FFFFFF" : "000000" } };
    });
  };

  const makeTableSheet = (name, table, opts = {}) => {
    const sheet = aoaToSheet(table, { origin: "A1" });
    const colCount = table[0]?.length || 1;
    styleHeaderRow(sheet, colCount);
    autoWidthAndAlign(sheet, table);
    attachTableMeta(sheet, name.replace(/\\s+/g, "_"), table.length, colCount);
    if (opts.colorBars) {
      opts.colorBars.forEach((cb) => applyColorBars(sheet, table.slice(1), cb.colIdx, cb.colors));
    }
    return { name, sheet };
  };

  const makeSummarySheet = (logger) => {
    const cfg = logger.configSnapshot || {};
    const stats = summarize(logger);
    const duration = buildDurationMinutes(logger);
    const studyRows = typeof logger.getStudyRows === "function" ? logger.getStudyRows() : [];
    const studyCount = studyRows.length;
    const studyTimes = studyRows
      .map((r) => (typeof r.t === "number" ? r.t : null))
      .filter((v) => v != null);
    const studyDurationMs = studyTimes.length
      ? Math.max(...studyTimes) - Math.min(...studyTimes) + (cfg.sampleDurationMs ?? 0)
      : 0;

    const tableA = [
      ["Field", "Value"],
      ["Task", "PRM"],
      ["Session ID", logger.sessionId],
      ["Participant ID", logger.participantId ?? ""],
      ["Block", logger.mode === "practice" ? "Practice" : "Main"],
      ["Start Time (ISO)", logger.startedAtIso || ""],
      ["Duration (min)", duration],
      ["Trials (Total)", stats.total],
      ["Trials (Practice)", stats.practice],
      ["Trials (Main)", stats.main],
      ["Study Items (Count)", studyCount],
      ["Study Duration (ms)", Math.round(studyDurationMs)],
      ["Choices per Trial", cfg.nChoices ?? ""],
      ["Sample Duration (ms)", cfg.sampleDurationMs ?? ""],
      ["Inter-Stimulus Interval (ms)", cfg.isiMs ?? ""],
      ["Response Deadline (ms)", cfg.responseDeadlineMs ?? ""],
      ["Feedback", "On"], // PRM always gives feedback in current build
      ["Library", cfg.libraryName || ""],
    ];

    const tableB = [
      ["Metric", "Value"],
      [
        "Accuracy",
        `${stats.accPct}% (${stats.correctTrials}/${stats.validTrials.length})`,
      ],
      [
        "Mean Reaction Time (Correct)",
        `${formatMeanSd(stats.meanRtCorrect, stats.sdRtCorrect)} ms`,
      ],
      ["Incorrect Responses (Non-timeout)", stats.incorrectTrials],
      ["Omission Rate", `${stats.omissionPct}% of valid trials`],
      [
        "Timeouts",
        `${stats.timeouts} (${stats.timeoutsPct}% of valid trials)`,
      ],
    ];

    const tableC = [
      ["Metric", "Value", "Unit", "Direction"],
      ["Valid Trials", stats.validTrials.length, "count", "-"],
      ["Timeouts", stats.timeouts, "count", "Lower is better"],
      ["Incorrect Responses (Non-timeout)", stats.incorrectTrials, "count", "Lower is better"],
      ["Correct Trials", stats.correctTrials, "count", "Higher is better"],
      ["Accuracy", `${stats.accPct}%`, "%", "Higher is better"],
      [
        "Mean RT (Correct)",
        formatMeanSd(stats.meanRtCorrect, stats.sdRtCorrect),
        "ms",
        "Lower is better",
      ],
      ["Median RT (Correct)", stats.medianRtCorrect, "ms", "Lower is better"],
      ["IQR RT (Correct)", stats.iqrRtCorrect, "ms", "Lower is better"],
      [
        "Mean RT (Incorrect)",
        formatMeanSd(stats.meanRtIncorrect, stats.sdRtIncorrect),
        "ms",
        "Lower is better",
      ],
      ["Median RT (Incorrect)", stats.medianRtIncorrect, "ms", "Lower is better"],
    ];

    const tableD = [
      ["Block", "Trials", "Valid", "Timeouts", "Correct", "Accuracy", "Mean RT (Correct, ms)"],
    ];
    stats.byBlock.forEach((b) => {
      tableD.push([
        b.block,
        b.trials,
        b.valid,
        b.timeouts,
        b.correct,
        `${b.accuracy}%`,
        formatMeanSd(b.meanRtCorrectMs, b.sdRtCorrectMs),
      ]);
    });
    if (stats.byBlock.length > 1) {
      tableD.push([
        "All",
        stats.validTrials.length,
        stats.validTrials.length,
        stats.timeouts,
        stats.correctTrials,
        `${stats.accPct}%`,
        formatMeanSd(stats.meanRtCorrect, stats.sdRtCorrect),
      ]);
    }

    const tableE = [
      ["Term", "Meaning"],
      ["Valid Trial", "No tab switch/visibility loss during the trial"],
      ["Accuracy", "Correct responses / valid trials"],
      ["Incorrect Responses (Non-timeout)", "Incorrect selections that were not timeouts"],
      ["Omission Rate", "Timeouts / valid trials"],
      ["Timeout", "No response before the response deadline"],
      ["Target ID", "Human-friendly ID for the studied pattern"],
      ["Chosen ID", "Human-friendly ID for the selected pattern"],
      ["Correct Index", "Index of the correct choice in the options list"],
      ["Chosen Index", "Index of the selected choice in the options list"],
      ["Distractor IDs", "Human-friendly IDs for non-target options"],
    ];

    const tables = [
      makeTableSheet("Table A - Session Info", tableA),
      makeTableSheet("Table B - Key Outcomes", tableB),
      makeTableSheet("Table C - Overall Summary", tableC),
      makeTableSheet("Table E - Breakdown by Block", tableD, {
        colorBars: [
          { colIdx: 5, colors: { from: "E0F2FE", to: "2563EB" } },
          { colIdx: 6, colors: { from: "ECFDF3", to: "16A34A" } },
        ],
      }),
      makeTableSheet("Table F - Legend", tableE),
    ];
    return tables;
  };

  const makeTrialsSheet = (logger) => {
    const trials = logger.getTests().slice().sort((a, b) => {
      const ai = a.index ?? 0;
      const bi = b.index ?? 0;
      return ai - bi;
    });

    const elapsedFrom = (t) =>
      t && typeof t.t === "number" ? Math.round(t.t) : "";

    const idMap = new Map();
    let idCounter = 1;
    const toHumanId = (id) => {
      if (!id) return "";
      if (!idMap.has(id)) {
        idMap.set(id, `P${String(idCounter++).padStart(3, "0")}`);
      }
      return idMap.get(id);
    };

    const header = [
      "Trial #",
      "Block (Practice/Main)",
      "Choices",
      "Target ID",
      "Chosen ID",
      "Correct Index",
      "Chosen Index",
      "Distractor IDs",
      "Valid Trial (Yes/No)",
      "Timeout (Yes/No)",
      "Correct (Yes/No)",
      "Reaction Time (ms)",
      "Elapsed Time (ms)",
    ];

    const rows = trials.map((t, idx) => {
      const block = t.isPractice ? "Practice" : "Main";
      const timeout = t.timedOut ? "Yes" : "No";
      const correct = t.correct ? "Yes" : "No";
      const valid = t.visibilityHidden ? "No" : "Yes";
      const rt = t.rt != null ? t.rt : t.timedOut ? "N/A" : "";
      const orderedIdsStr = typeof t.optionIdsOrdered === "string" ? t.optionIdsOrdered : "";
      const orderedIdsArr = orderedIdsStr ? orderedIdsStr.split("|") : [];
      const targetId = toHumanId(t.patternId ?? "");
      const chosenId =
        t.chosenIndex != null && t.chosenIndex !== "" && orderedIdsArr.length
          ? toHumanId(orderedIdsArr[t.chosenIndex] ?? "")
          : "";
      const distractorIds = (t.distractorIds || "")
        .split("|")
        .filter(Boolean)
        .map((id) => toHumanId(id))
        .join("|");
      return [
        t.index != null ? t.index : idx,
        block,
        t.nChoices ?? "",
        targetId,
        chosenId,
        t.correctIndex ?? "",
        t.chosenIndex ?? "",
        distractorIds,
        valid,
        timeout,
        correct,
        rt,
        elapsedFrom(t),
      ];
    });

    const sheet = aoaToSheet([header, ...rows], { origin: "A1" });
    styleHeaderRow(sheet, header.length);
    sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    autoWidthAndAlign(sheet, [header, ...rows]);
    rows.forEach((row, rIdx) => {
      const timedOut = String(row[9]).toLowerCase() === "yes";
      const invalid = String(row[8]).toLowerCase() === "no";
      row.forEach((val, cIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx });
        const cell = sheet[cellRef];
        if (!cell) return;
        cell.s = cell.s || {};
        const num =
          typeof val === "number" ||
          (/^-?\\d+(\\.\\d+)?$/.test(String(val))) ||
          String(val).trim().endsWith("%") ||
          String(val).toLowerCase().includes("ms");
        cell.s.alignment = { horizontal: num && cIdx !== 0 ? "right" : "left" };
        if (timedOut) {
          cell.s.fill = { fgColor: { rgb: "FFF3CD" } };
        } else if (invalid) {
          cell.s.fill = { fgColor: { rgb: "FEE2E2" } };
        }
      });
    });
    const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } });
    sheet["!autofilter"] = { ref };
    const table = {
      name: "PRM_Complete_Report",
      displayName: "PRM_Complete_Report",
      ref,
      headerRow: 1,
      totalsRow: 0,
      style: { theme: "TableStyleMedium9" },
    };
    sheet["!table"] = [table];
    sheet["!tables"] = [table];
    return sheet;
  };

  const buildWorkbook = (logger) => {
    const wb = XLSX.utils.book_new();
    const summarySheets = makeSummarySheet(logger);
    const sheetByName = new Map(summarySheets.map((s) => [s.name, s.sheet]));
    ["Table A - Session Info", "Table B - Key Outcomes", "Table C - Overall Summary"].forEach(
      (name) => {
        const sheet = sheetByName.get(name);
        if (sheet) XLSX.utils.book_append_sheet(wb, sheet, name);
      }
    );
    XLSX.utils.book_append_sheet(wb, makeTrialsSheet(logger), "Table D - Complete Report");
    ["Table E - Breakdown by Block", "Table F - Legend"].forEach((name) => {
      const sheet = sheetByName.get(name);
      if (sheet) XLSX.utils.book_append_sheet(wb, sheet, name);
    });
    return wb;
  };

  window.PRM_REPORT = {
    buildWorkbook,
    summarize,
  };
})();
