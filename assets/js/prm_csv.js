(() => {
  const { csvRow } = window.CSV_UTILS || {};

  const toHumanCSV = () =>
    csvRow ? csvRow([ "section", "note", "value" ]) + "\n" + csvRow([ "info", "Use Excel human report", "" ]) : "";

  const toMachineCSV = (logger) => {
    if (!csvRow) return "";
    const tests = logger.getTests();
    const cfg = logger.configSnapshot || {};

    const header = [
      "task",
      "session_id",
      "participant_id",
      "mode",
      "trial_index",
      "n_choices",
      "sample_ms",
      "isi_ms",
      "deadline_ms",
      "target_id",
      "correct_index",
      "chosen_index",
      "chosen_id",
      "correct",
      "rt_ms",
      "timed_out",
      "tab_hidden",
      "valid",
      "trial_start_ms",
      "trial_end_ms",
      "elapsed_ms",
      "distractor_ids",
      "options_ordered_ids",
      "trial_start_iso",
      "trial_end_iso",
    ];

    const lines = [csvRow(header)];
    const taskStart = logger.taskStart ?? 0;

    tests.forEach((r, idx) => {
      const trialStart = r.trialStartMs != null ? Math.round(r.trialStartMs - taskStart) : "";
      const trialEnd = r.trialEndMs != null ? Math.round(r.trialEndMs - taskStart) : "";
      const elapsed =
        r.elapsedMs != null
          ? Math.round(r.elapsedMs)
          : trialStart !== "" && trialEnd !== ""
          ? trialEnd - trialStart
          : r.t != null
          ? Math.round(r.t)
          : "";
      const trialStartIso =
        typeof r.trialStartEpochMs === "number" ? new Date(r.trialStartEpochMs).toISOString() : "";
      const trialEndIso =
        typeof r.trialEndEpochMs === "number" ? new Date(r.trialEndEpochMs).toISOString() : "";
      const orderedIdsStr = typeof r.optionIdsOrdered === "string" ? r.optionIdsOrdered : "";
      const orderedIdsArr = orderedIdsStr ? orderedIdsStr.split("|") : [];
      const chosenId =
        r.chosenIndex != null && r.chosenIndex !== "" && orderedIdsArr.length
          ? orderedIdsArr[r.chosenIndex] ?? ""
          : "";
      const tabHidden = r.visibilityHidden ? 1 : 0;
      const valid = tabHidden ? 0 : 1;

      lines.push(
        csvRow([
          "PRM",
          logger.sessionId,
          logger.participantId ?? "",
          r.mode,
          r.index != null ? r.index : idx,
          r.nChoices ?? "",
          cfg.sampleDurationMs ?? "",
          cfg.isiMs ?? "",
          cfg.responseDeadlineMs ?? "",
          r.patternId ?? "",
          r.correctIndex ?? "",
          r.chosenIndex ?? "",
          chosenId,
          r.correct ?? "",
          r.timedOut ? "" : r.rt ?? "",
          r.timedOut ? 1 : 0,
          tabHidden,
          valid,
          trialStart,
          trialEnd,
          elapsed,
          r.distractorIds ?? "",
          orderedIdsStr,
          trialStartIso,
          trialEndIso,
        ])
      );
    });

    return lines.join("\n");
  };

  window.PRM_CSV = {
    toHumanCSV,
    toMachineCSV,
  };
})();
