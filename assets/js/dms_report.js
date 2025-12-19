(() => {
  const yesNo = (val) => (val ? "Yes" : "No");

  const parseHex = (hex) => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const blendHex = (from, to, t) => {
    const [r1, g1, b1] = parseHex(from);
    const [r2, g2, b2] = parseHex(to);
    const mix = (a, b) => Math.round(a + (b - a) * t);
    const toHex = (n) => n.toString(16).padStart(2, "0");
    return `${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`.toUpperCase();
  };

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
    const start = logger.taskStartTime ?? 0;
    const end = logger.taskEndTime ?? start;
    return Number(((end - start) / 60000).toFixed(1));
  };

  const summarize = (logger) => {
    const trials = logger.getTrials();
    const total = trials.length;
    const practice = trials.filter((t) => t.isPractice).length;
    const main = total - practice;
    const validTrials = trials.filter((t) => !t.visibilityHidden);
    const answeredTrials = validTrials.filter((t) => !t.timedOut);

    const timeouts = validTrials.filter((t) => t.timedOut).length;
    const firstChoiceCorrect = validTrials.filter((t) => t.firstChoiceCorrect).length;
    const eventuallyCorrect = validTrials.filter((t) => t.correctOnAnyTry).length;
    const eventuallyCorrectRate =
      answeredTrials.length > 0
        ? Number(((eventuallyCorrect / answeredTrials.length) * 100).toFixed(1))
        : 0;
    const rtFirstChoice = validTrials
      .map((t) => (typeof t.rtFirstChoiceMs === "number" ? t.rtFirstChoiceMs : null))
      .filter((v) => v != null);
    const meanRtFirst = rtFirstChoice.length
      ? Math.round(rtFirstChoice.reduce((a, b) => a + b, 0) / rtFirstChoice.length)
      : 0;
    const sdRtFirst = rtFirstChoice.length ? stddev(rtFirstChoice) : 0;
    const medianRtFirst = rtFirstChoice.length ? Math.round(median(rtFirstChoice)) : 0;
    const iqrRtFirst = rtFirstChoice.length ? Math.round(iqr(rtFirstChoice)) : 0;
    const choiceNums = validTrials
      .map((t) =>
        typeof t.choiceNumberCorrect === "number" ? t.choiceNumberCorrect : null
      )
      .filter((v) => v != null);
    const meanChoicesToCorrect = choiceNums.length
      ? Number((choiceNums.reduce((a, b) => a + b, 0) / choiceNums.length).toFixed(2))
      : 0;
    const sdChoicesToCorrect = choiceNums.length ? stddev(choiceNums) : 0;
    const medianChoicesToCorrect = choiceNums.length
      ? Number(median(choiceNums).toFixed(2))
      : 0;
    const iqrChoicesToCorrect = choiceNums.length
      ? Number(iqr(choiceNums).toFixed(2))
      : 0;
    const rtCorrectFirstAttempt = validTrials
      .filter((t) => t.firstChoiceCorrect && typeof t.rtFirstChoiceMs === "number")
      .map((t) => t.rtFirstChoiceMs);
    const meanRtCorrectFirstAttempt = rtCorrectFirstAttempt.length
      ? Math.round(
          rtCorrectFirstAttempt.reduce((a, b) => a + b, 0) / rtCorrectFirstAttempt.length
        )
      : 0;
    const sdRtCorrectFirstAttempt = rtCorrectFirstAttempt.length
      ? stddev(rtCorrectFirstAttempt)
      : 0;
    const rtToCorrect = validTrials
      .filter((t) => t.correctOnAnyTry && typeof t.rtCorrectChoiceMs === "number")
      .map((t) => t.rtCorrectChoiceMs);
    const meanRtToCorrect = rtToCorrect.length
      ? Math.round(rtToCorrect.reduce((a, b) => a + b, 0) / rtToCorrect.length)
      : 0;
    const sdRtToCorrect = rtToCorrect.length ? stddev(rtToCorrect) : 0;
    const medianRtToCorrect = rtToCorrect.length ? Math.round(median(rtToCorrect)) : 0;
    const iqrRtToCorrect = rtToCorrect.length ? Math.round(iqr(rtToCorrect)) : 0;

    const firstChoiceAccPct =
      validTrials.length > 0
        ? Number(((firstChoiceCorrect / validTrials.length) * 100).toFixed(1))
        : 0;
    const timeoutsPct =
      validTrials.length > 0
        ? Number(((timeouts / validTrials.length) * 100).toFixed(1))
        : 0;

    const byDelayMap = new Map();
    trials.forEach((t) => {
      const key = t.delayMs;
      const bucket = byDelayMap.get(key) || [];
      bucket.push(t);
      byDelayMap.set(key, bucket);
    });
    const byDelay = Array.from(byDelayMap.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([delayMs, arr]) => {
        const validArr = arr.filter((t) => !t.visibilityHidden);
        const valid = validArr.length;
        const answered = validArr.filter((t) => !t.timedOut);
        const timeoutsDelay = validArr.filter((t) => t.timedOut).length;
        const firstCorrectDelay = validArr.filter((t) => t.firstChoiceCorrect).length;
        const eventualCorrectDelay = validArr.filter((t) => t.correctOnAnyTry).length;
        const rtFirst = validArr
          .map((t) => (typeof t.rtFirstChoiceMs === "number" ? t.rtFirstChoiceMs : null))
          .filter((v) => v != null);
        const meanRtFirstDelay = rtFirst.length
          ? Math.round(rtFirst.reduce((a, b) => a + b, 0) / rtFirst.length)
          : 0;
        const sdRtFirstDelay = rtFirst.length ? stddev(rtFirst) : 0;
        const rtToCorrectDelay = validArr
          .filter((t) => t.correctOnAnyTry && typeof t.rtCorrectChoiceMs === "number")
          .map((t) => t.rtCorrectChoiceMs);
        const meanRtToCorrectDelay = rtToCorrectDelay.length
          ? Math.round(rtToCorrectDelay.reduce((a, b) => a + b, 0) / rtToCorrectDelay.length)
          : 0;
        const sdRtToCorrectDelay = rtToCorrectDelay.length ? stddev(rtToCorrectDelay) : 0;
        const medianRtToCorrectDelay = rtToCorrectDelay.length
          ? Math.round(median(rtToCorrectDelay))
          : 0;
        const choices = validArr
          .map((t) =>
            typeof t.choiceNumberCorrect === "number" ? t.choiceNumberCorrect : null
          )
          .filter((v) => v != null);
        const meanChoices =
          choices.length > 0
            ? Number((choices.reduce((a, b) => a + b, 0) / choices.length).toFixed(2))
            : 0;
        const sdChoices = choices.length ? stddev(choices) : 0;
        const acc =
          valid > 0 ? Number(((firstCorrectDelay / valid) * 100).toFixed(1)) : 0;
        const eventualRate =
          answered.length > 0
            ? Number(((eventualCorrectDelay / answered.length) * 100).toFixed(1))
            : 0;
        return {
          delayMs,
          trials: arr.length,
          valid,
          timeouts: timeoutsDelay,
          firstChoiceAccuracy: acc,
          meanRtFirstChoiceMs: meanRtFirstDelay,
          meanChoicesToCorrect: meanChoices,
          eventualCorrect: eventualCorrectDelay,
          eventualCorrectRate: eventualRate,
          meanRtToCorrectMs: meanRtToCorrectDelay,
          medianRtToCorrectMs: medianRtToCorrectDelay,
          sdRtFirstChoiceMs: sdRtFirstDelay,
          sdRtToCorrectMs: sdRtToCorrectDelay,
          sdChoicesToCorrect: sdChoices,
        };
      });

    return {
      total,
      practice,
      main,
      validTrials,
      timeouts,
      firstChoiceCorrect,
      eventuallyCorrect,
      eventuallyCorrectRate,
      answeredTrials,
      firstChoiceAccPct,
      totalErrorsFirstChoice: Math.max(validTrials.length - firstChoiceCorrect, 0),
      meanRtFirst,
      sdRtFirst,
      medianRtFirst,
      iqrRtFirst,
      meanChoicesToCorrect,
      sdChoicesToCorrect,
      medianChoicesToCorrect,
      iqrChoicesToCorrect,
      timeoutsPct,
      meanRtCorrectFirstAttempt,
      sdRtCorrectFirstAttempt,
      meanRtToCorrect,
      sdRtToCorrect,
      medianRtToCorrect,
      iqrRtToCorrect,
      byDelay,
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
    const widths = Array.from({ length: colCount }, (_, c) => {
      const maxLen = Math.max(
        ...table.map((row) => {
          const v = row[c];
          const s = v == null ? "" : String(v);
          return s.length;
        })
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
    });
    sheet["!cols"] = widths;

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

  const applyColorBars = (sheet, dataRows, colIdx, { from = "E5F1FF", to = "2563EB" } = {}) => {
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
      const color = blendHex(from, to, t);
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
    const delayListDisplay = (cfg.delayMsList || "").toString().replace(/\|/g, ", ");
    const delayListHasZero = String(delayListDisplay).split(/[|,]/).some((d) => Number(d) === 0);

    const tableA = [
      ["Field", "Value"],
      ["Task", "DMS"],
      ["Session ID", logger.sessionId],
      ["Participant ID", logger.participantId ?? ""],
      ["Block", logger.mode === "practice" ? "Practice" : "Main"],
      ["Start Time (ISO)", logger.sessionStartIso || ""],
      ["Task Start Time (Epoch ms)", logger.taskStartEpochMs ?? ""],
      ["Duration (min)", duration],
      ["Trials (Total)", stats.total],
      ["Trials (Practice)", stats.practice],
      ["Trials (Main)", stats.main],
      ["Choices per Trial", cfg.nChoices ?? ""],
      ["Sub-Rect Count", cfg.subRectCount ?? ""],
      ["Shared Quadrants", cfg.sharedQuadrants ?? ""],
      ["Seed", cfg.seed ?? ""],
      ["Presentation (ms)", cfg.sampleDurationMs ?? ""],
      ["Inter-Stimulus Interval (ms)", ""],
      ["Delays (ms)", delayListDisplay],
      ["Response Deadline (ms)", cfg.responseDeadlineMs ?? ""],
      ["Feedback", yesNo(cfg.giveFeedback)],
      ["Simultaneous", yesNo(delayListHasZero)],
    ];

    const tableB = [
      ["Metric", "Value"],
      [
        "First-Choice Accuracy",
        `${stats.firstChoiceAccPct}% (${stats.firstChoiceCorrect}/${stats.validTrials.length})`,
      ],
      ["Eventually Correct", stats.eventuallyCorrect],
      ["Eventually Correct Rate", `${stats.eventuallyCorrectRate}% of answered trials`],
      [
        "Mean Reaction Time (First Choice)",
        `${formatMeanSd(stats.meanRtFirst, stats.sdRtFirst)} ms`,
      ],
      [
        "Mean Choices to Correct",
        formatMeanSd(stats.meanChoicesToCorrect, stats.sdChoicesToCorrect, 2),
      ],
      [
        "Timeouts",
        `${stats.timeouts} (${stats.timeoutsPct}% of valid trials)`,
      ],
    ];

    const tableC = [
      ["Metric", "Value", "Unit", "Direction"],
      ["Valid Trials", stats.validTrials.length, "count", "-"],
      ["Timeouts", stats.timeouts, "count", "Lower is better"],
      ["First-Choice Correct", stats.firstChoiceCorrect, "count", "Higher is better"],
      ["Eventually Correct Trials", stats.eventuallyCorrect, "count", "Higher is better"],
      ["First-Choice Accuracy", `${stats.firstChoiceAccPct}%`, "%", "Higher is better"],
      ["Eventually Correct Rate", `${stats.eventuallyCorrectRate}%`, "%", "Higher is better"],
      ["Total Errors (First Choice)", stats.totalErrorsFirstChoice, "count", "Lower is better"],
      [
        "Mean Choices to Correct",
        formatMeanSd(stats.meanChoicesToCorrect, stats.sdChoicesToCorrect, 2),
        "-",
        "Lower is better",
      ],
      ["Median Choices to Correct", stats.medianChoicesToCorrect, "-", "Lower is better"],
      ["IQR Choices to Correct", stats.iqrChoicesToCorrect, "-", "Lower is better"],
      [
        "Mean RT (First Choice)",
        formatMeanSd(stats.meanRtFirst, stats.sdRtFirst),
        "ms",
        "Lower is better",
      ],
      ["Median RT (First Choice)", stats.medianRtFirst, "ms", "Lower is better"],
      ["IQR RT (First Choice)", stats.iqrRtFirst, "ms", "Lower is better"],
      [
        "Mean RT (Correct on First Choice)",
        formatMeanSd(stats.meanRtCorrectFirstAttempt, stats.sdRtCorrectFirstAttempt),
        "ms",
        "Lower is better",
      ],
      [
        "Mean RT (To Correct)",
        formatMeanSd(stats.meanRtToCorrect, stats.sdRtToCorrect),
        "ms",
        "Lower is better",
      ],
      ["Median RT (To Correct)", stats.medianRtToCorrect, "ms", "Lower is better"],
      ["IQR RT (To Correct)", stats.iqrRtToCorrect, "ms", "Lower is better"],
    ];

    const rtToCorrectAll = stats.validTrials
      .filter((t) => t.correctOnAnyTry && typeof t.rtCorrectChoiceMs === "number")
      .map((t) => t.rtCorrectChoiceMs);
    const meanRtToCorrectAll = rtToCorrectAll.length
      ? Math.round(rtToCorrectAll.reduce((a, b) => a + b, 0) / rtToCorrectAll.length)
      : 0;
    const sdRtToCorrectAll = rtToCorrectAll.length ? stddev(rtToCorrectAll) : 0;

    const tableD = [
      [
        "Delay (ms)",
        "Trials",
        "Valid",
        "Timeouts",
        "First-Choice Accuracy",
        "Eventually Correct",
        "Eventually Correct Rate",
        "Mean RT (First Choice, ms)",
        "Mean RT (To Correct, ms)",
        "Median RT (To Correct, ms)",
        "Mean Choices to Correct",
      ],
    ];
    stats.byDelay.forEach((row) => {
      tableD.push([
        row.delayMs,
        row.trials,
        row.valid,
        row.timeouts,
        `${row.firstChoiceAccuracy}%`,
        row.eventualCorrect,
        `${row.eventualCorrectRate}%`,
        formatMeanSd(row.meanRtFirstChoiceMs, row.sdRtFirstChoiceMs),
        formatMeanSd(row.meanRtToCorrectMs, row.sdRtToCorrectMs),
        row.medianRtToCorrectMs,
        formatMeanSd(row.meanChoicesToCorrect, row.sdChoicesToCorrect, 2),
      ]);
    });
    if (stats.byDelay.length > 1) {
      tableD.push([
        "All Delays",
        stats.total,
        stats.validTrials.length,
        stats.timeouts,
        `${stats.firstChoiceAccPct}%`,
        stats.eventuallyCorrect,
        `${stats.eventuallyCorrectRate}%`,
        formatMeanSd(stats.meanRtFirst, stats.sdRtFirst),
        formatMeanSd(meanRtToCorrectAll, sdRtToCorrectAll),
        stats.medianRtToCorrect,
        formatMeanSd(stats.meanChoicesToCorrect, stats.sdChoicesToCorrect, 2),
      ]);
    }

    const tableE = [
      ["Term", "Meaning"],
      ["Valid Trial", "No tab switch/visibility loss during the trial"],
      ["First-Choice Accuracy", "Correct on the first selection"],
      ["Eventually Correct", "Correct on any attempt within the trial"],
      ["Eventually Correct Rate", "Eventually correct / answered (non-timeout) trials"],
      ["Choices to Correct", "Number of selections needed to reach the correct answer"],
      ["Attempts Made", "Total number of selections made in the trial"],
      ["Timeout", "No selection before the response deadline"],
      ["Reaction Time - First Choice", "Time from choices shown to first selection"],
      ["Reaction Time - To Correct", "Time from choices shown to first correct selection"],
      ["Reaction Time - Incorrect First Choice", "Time to first choice when the first choice was wrong"],
      ["Simultaneous", "Yes if delay includes 0 ms (choices shown with sample)"],
    ];

    const tables = [
      makeTableSheet("Table A - Session Info", tableA),
      makeTableSheet("Table B - Key Outcomes", tableB),
      makeTableSheet("Table C - Overall Summary", tableC),
      makeTableSheet("Table E - Breakdown by Delay", tableD, {
        colorBars: [
          { colIdx: 4, colors: { from: "E0F2FE", to: "2563EB" } },
          { colIdx: 7, colors: { from: "ECFDF3", to: "16A34A" } },
          { colIdx: 8, colors: { from: "ECFDF3", to: "16A34A" } },
        ],
      }),
      makeTableSheet("Table F - Legend", tableE),
    ];

    return tables;
  };

  const makeTrialsSheet = (logger) => {
    const trials = logger.getTrials().slice().sort((a, b) => {
      const ai = a.trialIndex ?? 0;
      const bi = b.trialIndex ?? 0;
      return ai - bi;
    });
    const elapsedFrom = (t) =>
      t && typeof t.absoluteTimeMs === "number" && typeof logger.taskStartTime === "number"
        ? Math.round(t.absoluteTimeMs - logger.taskStartTime)
        : "";

    const header = [
      "Trial #",
      "Block (Practice/Main)",
      "Condition",
      "Delay (ms)",
      "Simultaneous (Yes/No)",
      "Choices",
      "Valid Trial (Yes/No)",
      "Timeout (Yes/No)",
      "First Choice Correct (Yes/No)",
      "Eventually Correct (Yes/No)",
      "Reaction Time - Incorrect First Choice (ms)",
      "Attempts Made",
      "Choices to Correct",
      "Reaction Time - First Choice (ms)",
      "Reaction Time - To Correct (ms)",
      "Elapsed Time (ms)",
    ];

    const rows = trials.map((t, idx) => {
      const attempts = t.nResponsesThisTrial ?? (Array.isArray(t.choiceEvents) ? t.choiceEvents.length : "");
      const firstCorrect = t.firstChoiceCorrect ? "Yes" : "No";
      const timeout = t.timedOut ? "Yes" : "No";
      const isSimul = t.simultaneous ? "Yes" : "No";
      const block = t.isPractice ? "Practice" : "Main";
      const valid = t.visibilityHidden ? "No" : "Yes";
      const eventuallyCorrect = t.correctOnAnyTry ? "Yes" : "No";
      const choicesToCorrect =
        typeof t.choiceNumberCorrect === "number" ? t.choiceNumberCorrect : "N/A";
      const firstEvent = Array.isArray(t.choiceEvents) && t.choiceEvents.length
        ? t.choiceEvents[0]
        : null;
      const rtIncorrectFirst =
        t.firstChoiceCorrect || !firstEvent ? "" : Math.round(firstEvent.rtMs);
      const rtFirst =
        t.rtFirstChoiceMs != null ? Math.round(t.rtFirstChoiceMs) : timeout === "Yes" ? "N/A" : "";
      const rtCorrect =
        t.rtCorrectChoiceMs != null
          ? Math.round(t.rtCorrectChoiceMs)
          : t.correctOnAnyTry
          ? ""
          : "N/A";
      return [
        t.trialIndex != null ? t.trialIndex : idx,
        block,
        t.conditionName ?? "",
        t.delayMs ?? "",
        isSimul,
        t.nChoices ?? "",
        valid,
        timeout,
        firstCorrect,
        eventuallyCorrect,
        rtIncorrectFirst,
        attempts === "" ? "N/A" : attempts,
        choicesToCorrect,
        rtFirst,
        rtCorrect,
        elapsedFrom(t),
      ];
    });

    const sheet = aoaToSheet([header, ...rows], { origin: "A1" });
    styleHeaderRow(sheet, header.length);
    sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    autoWidthAndAlign(sheet, [header, ...rows]);

    rows.forEach((row, rIdx) => {
      const timedOut = String(row[7]).toLowerCase() === "yes";
      const invalid = String(row[6]).toLowerCase() === "no";
      const firstWrong = String(row[8]).toLowerCase() === "no";
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
        } else if (firstWrong) {
          cell.s.fill = { fgColor: { rgb: "FEF9C3" } };
        }
      });
    });

    const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } });
    sheet["!autofilter"] = { ref };
    const table = {
      name: "DMS_Complete_Report",
      displayName: "DMS_Complete_Report",
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
    const orderedNames = [
      "Table A - Session Info",
      "Table B - Key Outcomes",
      "Table C - Overall Summary",
    ];
    orderedNames.forEach((name) => {
      const sheet = sheetByName.get(name);
      if (sheet) XLSX.utils.book_append_sheet(wb, sheet, name);
    });
    XLSX.utils.book_append_sheet(wb, makeTrialsSheet(logger), "Table D - Complete Report");
    ["Table E - Breakdown by Delay", "Table F - Legend"].forEach((name) => {
      const sheet = sheetByName.get(name);
      if (sheet) XLSX.utils.book_append_sheet(wb, sheet, name);
    });
    return wb;
  };

  window.DMS_REPORT = {
    buildWorkbook,
    summarize,
  };
})();
