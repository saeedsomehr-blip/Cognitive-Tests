(() => {
  const { csvRow } = window.CSV_UTILS || {};

  const toHumanCSV = (logger) => {
    if (!csvRow) return "";
    const summary = logger.getSummary();
    const byCondition = logger.getConditionBreakdown();
    const trials = logger.getTrials();
    const cfg = logger.configSnapshot || {};

    const lines = [];
    const sessionRow = (field, value) => lines.push(csvRow(["session_info", field, value ?? ""]));

    lines.push(csvRow(["section", "field", "value"]));
    sessionRow("session_id", logger.sessionId);
    sessionRow("participant_id", logger.participantId ?? "");
    sessionRow("mode", logger.mode);
    sessionRow("started_at_iso", logger.sessionStartIso);
    sessionRow("n_choices", cfg.nChoices);
    sessionRow("sample_duration_ms", cfg.sampleDurationMs);
    sessionRow("delay_list_ms", cfg.delayMsList);
    sessionRow("response_deadline_ms", cfg.responseDeadlineMs);
    sessionRow("give_feedback", cfg.giveFeedback);
    sessionRow("practice_trials_config", cfg.practiceTrialsTotal);
    sessionRow("main_trials_config", cfg.mainTrialsTotal);

    lines.push(csvRow(["section", "metric", "value"]));
    lines.push(csvRow(["summary_overall", "total_trials", summary.total]));
    lines.push(csvRow(["summary_overall", "correct_first_try", summary.nCorrect]));
    lines.push(csvRow(["summary_overall", "eventually_correct", summary.eventualCorrect]));
    lines.push(csvRow(["summary_overall", "incorrect_trials", Math.max(summary.total - summary.nCorrect, 0)]));
    lines.push(csvRow(["summary_overall", "timeouts", summary.timeouts]));
    lines.push(csvRow(["summary_overall", "accuracy_percent", Number(summary.accuracy.toFixed(1))]));
    lines.push(csvRow(["summary_overall", "mean_rt_correct_ms", Math.round(summary.meanRT)]));
    lines.push(csvRow(["summary_overall", "mean_choices_to_correct", Number(summary.meanChoicesToCorrect.toFixed(2))]));

    if (Array.isArray(byCondition) && byCondition.length) {
      lines.push(
        csvRow([
          "section",
          "condition",
          "delay_ms",
          "total",
          "correct_first_try",
          "eventually_correct",
          "accuracy_percent",
          "mean_rt_correct_ms",
          "mean_choices_to_correct",
          "timeouts",
        ])
      );
      byCondition.forEach((c) => {
        lines.push(
          csvRow([
            "summary_by_condition",
            c.condition,
            c.delayMs,
            c.total,
            c.correct,
            c.eventualCorrect,
            c.accuracy,
            c.meanRtCorrectMs,
            Number(c.meanChoicesToCorrect.toFixed(2)),
            c.timeouts,
          ])
        );
      });
    }

    const humanTrialsHeader = [
      "section",
      "trial_index",
      "mode",
      "is_practice",
      "condition",
      "delay_ms",
      "n_choices",
      "correct_index",
      "chosen_index",
      "correct_first_try",
      "timed_out",
      "rt_ms",
      "elapsed_ms",
    ];
    lines.push(csvRow(humanTrialsHeader));

    const elapsedFrom = (t) =>
      t && typeof t.absoluteTimeMs === "number" && typeof logger.taskStartTime === "number"
        ? Math.round(t.absoluteTimeMs - logger.taskStartTime)
        : "";

    trials.forEach((t, idx) => {
      lines.push(
        csvRow([
          "trial_overview",
          t.trialIndex != null ? t.trialIndex : idx,
          t.mode ?? logger.mode,
          t.isPractice ? 1 : 0,
          t.conditionName,
          t.delayMs,
          t.nChoices,
          t.correctIndex,
          t.chosenIndex ?? "",
          t.correct ? 1 : 0,
          t.timedOut ? 1 : 0,
          t.rtMs != null ? Math.round(t.rtMs) : "",
          elapsedFrom(t),
        ])
      );
    });

    return lines.join("\n");
  };

  const toMachineCSV = (logger) => {
    if (!csvRow) return "";
    const trials = logger.getTrials();
    const cfg = logger.configSnapshot || {};

    const header = [
      "task",
      "session_id",
      "participant_id",
      "mode",
      "trial_index",
      "condition",
      "delay_ms",
      "simultaneous",
      "presentation_ms",
      "isi_ms",
      "deadline_ms",
      "n_choices",
      "sample_id",
      "correct_index",
      "correct_choice_id",
      "choices_ordered_ids",
      "first_choice_index",
      "first_choice_id",
      "first_choice_correct",
      "attempts_made",
      "choices_to_correct",
      "rt_first_choice_ms",
      "rt_to_correct_ms",
      "timed_out",
      "tab_hidden",
      "valid",
      "trial_start_ms",
      "trial_end_ms",
      "elapsed_ms",
      "trial_start_iso",
      "trial_end_iso",
    ];

    const lines = [csvRow(header)];
    const taskStart = logger.taskStartTime ?? 0;

    trials.forEach((t, idx) => {
      const choicePatterns = Array.isArray(t.choicePatterns) ? t.choicePatterns : [];
      const correctChoice = choicePatterns[t.correctIndex] || {};
      const orderedIds = choicePatterns.map((p) => p?.id ?? "").join("|");
      const firstEvent = Array.isArray(t.choiceEvents) && t.choiceEvents.length
        ? t.choiceEvents[0]
        : null;
      const firstIdx = firstEvent ? firstEvent.chosenIndex : "";
      const firstId = Number.isInteger(firstIdx) && choicePatterns[firstIdx]
        ? choicePatterns[firstIdx].id ?? ""
        : "";
      const attempts = t.nResponsesThisTrial ?? (Array.isArray(t.choiceEvents) ? t.choiceEvents.length : 0);
      const trialStart = t.trialStartMs != null ? Math.round(t.trialStartMs - taskStart) : "";
      const trialEnd = t.trialEndMs != null ? Math.round(t.trialEndMs - taskStart) : "";
      const elapsed = t.elapsedMs != null ? Math.round(t.elapsedMs) : (trialStart !== "" && trialEnd !== "" ? trialEnd - trialStart : "");
      const trialStartIso =
        typeof t.trialStartEpochMs === "number" ? new Date(t.trialStartEpochMs).toISOString() : "";
      const trialEndIso =
        typeof t.trialEndEpochMs === "number" ? new Date(t.trialEndEpochMs).toISOString() : "";
      const tabHidden = t.visibilityHidden ? 1 : 0;
      const valid = tabHidden ? 0 : 1;

      lines.push(
        csvRow([
          "DMS",
          logger.sessionId,
          logger.participantId ?? "",
          t.mode ?? logger.mode,
          t.trialIndex != null ? t.trialIndex : idx,
          t.conditionName ?? "",
          t.delayMs ?? "",
          t.simultaneous ? 1 : 0,
          cfg.sampleDurationMs ?? "",
          "", // isi_ms not applicable
          cfg.responseDeadlineMs ?? "",
          t.nChoices ?? "",
          t.sampleId ?? "",
          t.correctIndex ?? "",
          correctChoice.id ?? "",
          orderedIds,
          firstIdx,
          firstId,
          t.firstChoiceCorrect ? 1 : 0,
          attempts ?? "",
          typeof t.choiceNumberCorrect === "number" ? t.choiceNumberCorrect : "",
          t.rtFirstChoiceMs != null ? Math.round(t.rtFirstChoiceMs) : "",
          t.rtCorrectChoiceMs != null ? Math.round(t.rtCorrectChoiceMs) : "",
          t.timedOut ? 1 : 0,
          tabHidden,
          valid,
          trialStart,
          trialEnd,
          elapsed,
          trialStartIso,
          trialEndIso,
        ])
      );
    });

    return lines.join("\n");
  };

  window.DMS_CSV = {
    toHumanCSV,
    toMachineCSV,
  };
})();
