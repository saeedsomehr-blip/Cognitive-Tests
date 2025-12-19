(() => {
  const SHARED_INSTRUCTION_BTNS_FA = {
    instructionsPracticeBtn: "شروع تمرین",
    instructionsStartBtn: "شروع آزمون اصلی",
  };
  const SHARED_INSTRUCTION_BTNS_EN = {
    instructionsPracticeBtn: "Practice",
    instructionsStartBtn: "Start main test",
  };

  const STRINGS = {
    fa: {
      common: {
        back: "بازگشت",
        save: "ذخیره",
        saved: "ذخیره شد.",
        savedHint: "تنظیمات به‌صورت محلی ذخیره می‌شود.",
        unlimited: "نامحدود",
        rtMs: "زمان واکنش (ms)",
        correctIncorrect: "درست/نادرست",
        yes: "بله",
        no: "خیر",
        confirm: "تأیید",
        cancel: "انصراف",
        enterParticipantId: "شناسه شرکت‌کننده را وارد کنید",
      },

      index: {
        title: "مجموعه آزمون‌های شناختی",
        runTitle: "اجرای آزمون",
        startDms: "شروع DMS",
        startPrm: "شروع PRM",
        dmsBadge: "تطبیق با تأخیر (DMS)",
        prmBadge: "حافظه تشخیص الگو (PRM)",
        goSettings: "شخصی‌سازی",
        historyLabel: "سوابق",
        historyBtn: "سوابق آزمون‌ها",
        historyBlurb:
          "جلسات قبلی را با شناسه شرکت‌کننده، خلاصه و لینک دانلود CSV ببینید. داده‌ها محلی و در مرورگر ذخیره می‌شوند.",
        historyHint: "برای هر جلسه: خلاصه را ببینید یا CSV دانلود کنید.",
        dmsBlurb:
          "یک الگوی نمونه را ببینید، کمی صبر کنید و سپس گزینه‌ای را انتخاب کنید که دقیقاً با نمونه یکسان است.",
        prmBlurb:
          "الگوها را به خاطر بسپارید؛ سپس وقتی جفت‌ها نمایش داده شدند، تصویری را انتخاب کنید که قبلاً دیده‌اید.",
        settingsLabel: "شخصی‌سازی",
        settingsBlurb:
          "زمان‌بندی، تعداد گزینه‌ها و تعداد تمرین/اصلی هر آزمون را تنظیم کنید. این تنظیمات هنگام شروع آزمون اعمال می‌شوند.",
        hint: "برای تنظیمات کلی/اختصاصی از صفحه شخصی‌سازی استفاده کنید.",
      },

      settings: {
        pageTitle: "شخصی‌سازی آزمون‌ها",
        globalTitle: "تنظیمات کلی",
        globalPill: "زبان، تم، راهنما",
        language: "زبان",
        theme: "تم",
        themeDark: "تاریک",
        themeLight: "روشن",
        instructions: "راهنما",
        instructionsLabel: "نمایش راهنما قبل از شروع آزمون‌ها",
        testsTitle: "شخصی‌سازی آزمون‌ها",
        whichTest: "کدام آزمون را می‌خواهید تنظیم کنید؟",
        dms: "DMS",
        prm: "PRM",
        dmsChoices: "تعداد گزینه‌ها (۱ تا ۶)",
        dmsSample: "مدت نمایش نمونه (میلی‌ثانیه)",
        dmsDelay: "تأخیر بین نمونه و گزینه‌ها (میلی‌ثانیه)",
        dmsDelayDefault: "پیش‌فرض",
        dmsDelayHint: "مقادیر را با کاما جدا کنید (مثلاً 0, 4000, 12000).",
        dmsSubRectCount: "تعداد بخش‌های الگو (زیرمستطیل‌ها)",
        dmsSubRectHint:
          "بخش‌های بیشتر الگو را پیچیده‌تر و بار دیداری را سنگین‌تر می‌کند.",
        dmsSharedQuadrants: "اشتراک بخش‌ها (سختی)",
        dmsSharedQuadrantsHint:
          "عدد بیشتر = سخت‌تر؛ دقیقاً همین تعداد بخش در الگوی هر گزینه باید با الگوی اصلی یکسان باشد .",
        dmsResponse: "مهلت پاسخ (میلی‌ثانیه؛ خالی = نامحدود)",
        dmsPracticeTrials: "تعداد ترایال‌های تمرینی",
        dmsMainTrials: "تعداد ترایال‌های اصلی",
        prmChoices: "تعداد گزینه‌ها (۲ تا ۴)",
        prmSample: "مدت نمایش تصویر (میلی‌ثانیه)",
        prmSampleDefault: "پیش‌فرض",
        prmResponse: "مهلت پاسخ (میلی‌ثانیه؛ خالی = نامحدود)",
        prmPracticeTrials: "تعداد ترایال‌های تمرینی",
        prmMainTrials: "تعداد ترایال‌های اصلی",
        saveBtn: "ذخیره",
        previewTitle: "پیش‌نمایش تنظیمات",
        previewLabel: "اعمال‌شده روی آزمون‌ها",
        previewHeading: "تنظیمات فعلی:",
        previewUnlimited: "نامحدود",
        previewDmsSummary:
          "DMS: {choices} گزینه، نمونه {sample}ms، تأخیر {delay}، مهلت پاسخ {response}، تمرین {practice}، اصلی {main}.",
        previewPrmSummary:
          "PRM: {choices} گزینه، تصویر {sample}ms، مهلت پاسخ {response}، تمرین {practice}، اصلی {main}.",
      },

      dms: {
        title: "تطبیق با تأخیر (DMS)",
        statusReady: "راهنما را ببینید یا آزمون را شروع کنید.",
        startBtn: "شروع (تمرین + اصلی)",
        startInfo: "نمایش راهنما",
        restartBtn: "شروع دوباره",
        downloadBtn: "دانلود CSV",
        menuHint: "برای شروع یکی را انتخاب کنید.",
        menuInstructions: "نمایش راهنما",
        menuPractice: "تمرین",
        menuStart: "شروع آزمون اصلی",
        ...SHARED_INSTRUCTION_BTNS_FA,
        phasePractice: "تمرین ({name})",
        phaseMain: "اصلی ({name})",
        simultaneous: "حالت همزمان: نمونه و گزینه‌ها همزمان نمایش داده می‌شوند.",
        rememberSample: "نمونه را به خاطر بسپارید.",
        waiting: "کمی صبر کنید...",
        chooseNow: "گزینه درست را انتخاب کنید.",
        wrongTryAgain: "نادرست است. دوباره امتحان کنید.",
        timeout: "مهلت پاسخ تمام شد.",
        feedbackCorrect: "درست",
        feedbackWrong: "نادرست",
        feedbackTimeout: "زمان تمام شد.",
        endStatus: "آزمون تمام شد.",
        summaryTitle: "خلاصه جلسه",
        summaryTotal: "تعداد ترایال‌ها",
        summaryCorrect: "پاسخ‌های درست",
        summaryAccuracy: "دقت",
        summaryMeanRt: "میانگین زمان واکنش (فقط درست‌ها)",
        instructionsTitle: "راهنمای DMS",
        instructionsSimpleTitle: "خلاصه",
        instructionsSimple:
          "در این آزمون، یک الگوی دیداری به‌صورت کوتاه نمایش داده می‌شود. بعد از یک تأخیر کوتاه (یا گاهی همزمان)، چند گزینه نمایش داده می‌شوند. وظیفه شما انتخاب گزینه‌ای است که دقیقاً با نمونه یکسان باشد.",
        instructionsFormalTitle: "توضیحات رسمی",
        instructionsFormal:
          "آزمون DMS یک سنجش استاندارد عصب‌روانشناختی برای ارزیابی حافظه کاری دیداری و تطبیق الگو با تأخیر است. در هر ترایال، یک الگوی هدف ارائه می‌شود و سپس بسته به شرط آزمون، پس از یک دوره تأخیر یا به‌صورت همزمان، گزینه‌ها نمایش داده می‌شوند. شرکت‌کننده باید گزینه‌ای را انتخاب کند که از نظر شکل و آرایش دقیقاً با نمونه مطابقت دارد. آزمون شامل فاز تمرینی و فاز اصلی است و دقت و زمان واکنش ثبت می‌شود.",
      },

      prm: {
        title: "حافظه تشخیص الگو (PRM)",
        statusReady: "راهنما را ببینید یا آزمون را شروع کنید.",
        startInfo: "نمایش راهنما",
        startBtn: "شروع PRM",
        restartBtn: "شروع دوباره",
        downloadBtn: "دانلود CSV",
        menuHint: "برای شروع یکی را انتخاب کنید.",
        menuInstructions: "نمایش راهنما",
        menuPractice: "تمرین",
        menuStart: "شروع آزمون اصلی",
        ...SHARED_INSTRUCTION_BTNS_FA,
        studyLabel: ({ i, total }) => `شکل ${i} از ${total}`,
        questionCounter: ({ i, total }) => `سؤال ${i} از ${total}`,
        remember: "الگو را به خاطر بسپارید.",
        pickOld: "کدام گزینه را قبلاً دیده‌اید؟",
        timeout: "زمان تمام شد.",
        feedbackCorrect: "درست",
        feedbackWrong: "نادرست",
        endStatus: "PRM تمام شد.",
        summaryTitle: "خلاصه PRM",
        summaryTotal: "تعداد سؤالات",
        summaryCorrect: "پاسخ‌های درست",
        summaryAcc: "دقت",
        summaryMeanRt: "میانگین زمان واکنش (درست‌ها)",
        instructionsTitle: "راهنمای PRM",
        instructions1:
          "در مرحله مشاهده، چند الگو نمایش داده می‌شود؛ آن‌ها را به خاطر بسپارید.",
        instructions2:
          "در مرحله آزمون، یک جفت نمایش داده می‌شود که یکی از آن‌ها قبلاً دیده شده است. گزینه‌ای را انتخاب کنید که قبلاً دیده‌اید.",
        instructions3: "یک نمونه در پایین نمایش داده می‌شود.",
      },

      history: {
        backBtn: "بازگشت",
        title: "سوابق آزمون‌ها",
        sectionTitle: "جلسات ذخیره‌شده",
        storageLabel: "LocalStorage",
        emptyHint: "هنوز جلسه‌ای ذخیره نشده است.",
        testNameDms: "DMS",
        testNamePrm: "PRM",
        modeMain: "اصلی",
        modePractice: "تمرین",
        participantId: "شناسه شرکت‌کننده",
        recordedAt: "تاریخ ثبت",
        runId: "شناسه اجرا",
        downloadCsv: "دانلود CSV",
        downloadCsvHuman: "CSV خوانا",
        downloadCsvMachine: "CSV ماشینی",
        summaryToggle: "خلاصه",
        summaryLine:
          "تعداد: {total} | درست: {correct} | دقت: {acc}% | میانگین RT: {meanRt} ms | بدون پاسخ: {timeouts}",
        summaryMissing: "خلاصه موجود نیست.",
      },
    },

    en: {
      common: {
        back: "Back",
        save: "Save",
        saved: "Saved.",
        savedHint: "Settings are stored locally.",
        unlimited: "Unlimited",
        rtMs: "RT (ms)",
        correctIncorrect: "Correct/Incorrect",
        yes: "Yes",
        no: "No",
        confirm: "Confirm",
        cancel: "Cancel",
        enterParticipantId: "Enter participant ID",
      },

      index: {
        title: "Cognitive Test Suite",
        runTitle: "Run test",
        startDms: "Start DMS",
        startPrm: "Start PRM",
        dmsBadge: "Delayed Matching to Sample (DMS)",
        prmBadge: "Pattern Recognition Memory (PRM)",
        goSettings: "Customize",
        historyLabel: "History",
        historyBtn: "Test history",
        historyBlurb:
          "See past sessions with participant ID, summary, and CSV download links. Stored locally in your browser.",
        historyHint: "For each session: view summary or download CSV.",
        dmsBlurb:
          "View a sample pattern, wait briefly, then pick the option that matches it exactly.",
        prmBlurb:
          "Study the patterns, then when pairs appear choose the image you've seen before.",
        settingsLabel: "Customize",
        settingsBlurb:
          "Adjust timing, choices, and practice/main counts for each test here; they apply when you start.",
        hint: "Open customization to adjust global/test settings.",
      },

      settings: {
        pageTitle: "Customize Tests",
        globalTitle: "Global settings",
        globalPill: "Language, Theme, Guide",
        language: "Language",
        theme: "Theme",
        themeDark: "Dark",
        themeLight: "Light",
        instructions: "Guide",
        instructionsLabel: "Show guide before starting tests",
        testsTitle: "Test customization",
        whichTest: "Which test do you want to configure?",
        dms: "DMS",
        prm: "PRM",
        dmsChoices: "Number of choices (1 to 6)",
        dmsSample: "Sample display time (ms)",
        dmsDelay: "Sample-to-choices delay (ms)",
        dmsDelayDefault: "Default",
        dmsDelayHint: "Separate values with commas (e.g., 0, 4000, 12000).",
        dmsSubRectCount: "Sub-rectangles per pattern",
        dmsSubRectHint: "More sub-rectangles make the pattern harder and increase visual load.",
        dmsSharedQuadrants: "Shared quadrants (difficulty)",
        dmsSharedQuadrantsHint: "Higher = harder; exactly this many quadrants are forced to match sample and each choice.",
        dmsResponse: "Response window (ms; empty = unlimited)",
        dmsPracticeTrials: "Practice trials",
        dmsMainTrials: "Main trials",
        prmChoices: "Number of choices (2 to 4)",
        prmSample: "Image display time (ms)",
        prmSampleDefault: "Default",
        prmResponse: "Response window (ms; empty = unlimited)",
        prmPracticeTrials: "Practice trials",
        prmMainTrials: "Main trials",
        saveBtn: "Save",
        previewTitle: "Settings preview",
        previewLabel: "Applied to tests",
        previewHeading: "Current settings:",
        previewUnlimited: "Unlimited",
        previewDmsSummary:
          "DMS: {choices} choices, sample {sample}ms, delay {delay}, response {response}, practice {practice}, main {main}.",
        previewPrmSummary:
          "PRM: {choices} choices, image {sample}ms, response {response}, practice {practice}, main {main}.",
      },

      dms: {
        title: "Delayed Matching to Sample (DMS)",
        statusReady: "Read the instructions or start the task.",
        startBtn: "Start task (practice + main)",
        startInfo: "View guide",
        restartBtn: "Restart",
        downloadBtn: "Download CSV",
        menuHint: "Choose an option to begin.",
        menuInstructions: "Show instructions",
        menuPractice: "Practice",
        menuStart: "Start main test",
        ...SHARED_INSTRUCTION_BTNS_EN,
        phasePractice: "Practice ({name})",
        phaseMain: "Main ({name})",
        simultaneous: "Simultaneous: sample and choices appear together.",
        rememberSample: "Memorize the sample.",
        waiting: "Waiting...",
        chooseNow: "Choose the option that matches the sample.",
        wrongTryAgain: "Incorrect choice. Try again.",
        timeout: "Response time is over.",
        feedbackCorrect: "Correct",
        feedbackWrong: "Incorrect",
        feedbackTimeout: "Time out",
        endStatus: "Task finished.",
        summaryTitle: "Session summary",
        summaryTotal: "Total trials",
        summaryCorrect: "Correct answers",
        summaryAccuracy: "Accuracy",
        summaryMeanRt: "Mean RT (correct only)",
        instructionsTitle: "DMS guide",
        instructionsSimpleTitle: "Quick summary",
        instructionsSimple:
          "In this task, a sample visual pattern is briefly presented. After a short delay (or simultaneously depending on the condition), several options appear. Your task is to choose the option that exactly matches the previously shown sample pattern.",
        instructionsFormalTitle: "Official instructions",
        instructionsFormal:
          "The DMS task is a standardized neuropsychological assessment measuring visual working memory and delayed pattern matching. In each trial, a target pattern is presented, followed by a delay period or simultaneous presentation of choices depending on the condition. Participants must select the option that matches the sample in shape, configuration, and structural layout. The task includes both practice and main phases, with accuracy and reaction time recorded separately to evaluate recognition performance under varying memory demands.",
      },

      prm: {
        title: "Pattern Recognition Memory (PRM)",
        statusReady: "Read the instructions or start the task.",
        startInfo: "View instructions",
        startBtn: "Start PRM",
        restartBtn: "Restart",
        downloadBtn: "Download CSV",
        menuHint: "Choose an option to begin.",
        menuInstructions: "Show instructions",
        menuPractice: "Practice",
        menuStart: "Start main test",
        ...SHARED_INSTRUCTION_BTNS_EN,
        studyLabel: ({ i, total }) => `Study item ${i} of ${total}`,
        questionCounter: ({ i, total }) => `Question ${i} of ${total}`,
        remember: "Memorize the pattern.",
        pickOld: "Which option have you seen before?",
        timeout: "Time out",
        feedbackCorrect: "Correct",
        feedbackWrong: "Incorrect",
        endStatus: "PRM finished.",
        summaryTitle: "PRM summary",
        summaryTotal: "Total questions",
        summaryCorrect: "Correct answers",
        summaryAcc: "Accuracy",
        summaryMeanRt: "Mean RT (correct)",
        instructionsTitle: "PRM instructions",
        instructions1:
          "In the study phase you will see several patterns; remember them.",
        instructions2:
          "In the test phase a pair appears; one was seen before. Choose the previously seen one.",
        instructions3: "A sample preview pattern is shown below.",
      },

      history: {
        backBtn: "Back",
        title: "Test history",
        sectionTitle: "Saved sessions",
        storageLabel: "LocalStorage",
        emptyHint: "No sessions saved yet.",
        testNameDms: "DMS",
        testNamePrm: "PRM",
        modeMain: "Main",
        modePractice: "Practice",
        participantId: "Participant ID",
        recordedAt: "Recorded",
        runId: "Run ID",
        downloadCsv: "Download CSV",
        downloadCsvHuman: "Download CSV (human)",
        downloadCsvMachine: "Download CSV (machine)",
        summaryToggle: "Summary",
        summaryLine:
          "Total trials: {total} | Correct: {correct} | Accuracy: {acc}% | Mean RT: {meanRt} ms | Timeouts: {timeouts}",
        summaryMissing: "Summary unavailable.",
      },
    },
  };

  const LOADED = {
    fa: STRINGS.fa,
    en: STRINGS.en,
  };

  let activeLang = "fa";
  const normalizeLang = (lang) => (lang === "en" ? "en" : "fa");

  function lookupKey(obj, key) {
    if (!obj || typeof obj !== "object") return undefined;
    const parts = String(key || "").split(".");
    let cur = obj;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in cur) cur = cur[part];
      else return undefined;
    }
    return cur;
  }

  function t(key, params = {}) {
    const dict = LOADED[activeLang] || LOADED.fa || {};
    const value = lookupKey(dict, key);

    if (value === undefined) {
      return params?.defaultValue ?? key;
    }

    if (typeof value === "string") {
      return value.replace(/\{([^}]+)\}/g, (_, k) =>
        params[k] != null ? String(params[k]) : ""
      );
    }

    if (typeof value === "function") {
      return value(params);
    }

    return params?.defaultValue ?? key;
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n") || "";
      el.textContent = t(key, { defaultValue: el.textContent || "" });
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder") || "";
      const prev = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", t(key, { defaultValue: prev }));
    });

    document.querySelectorAll("option[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n") || "";
      el.textContent = t(key, { defaultValue: el.textContent || "" });
    });

    document.documentElement.lang = activeLang;
    document.body.dir = activeLang === "en" ? "ltr" : "rtl";
  }

  function revealApp() {
    const body = document.body;
    if (!body) return;
    const done = () => body.classList.remove("app-loading");
    const fontsReady =
      document.fonts &&
      document.fonts.ready &&
      typeof document.fonts.ready.then === "function"
        ? document.fonts.ready
        : null;
    if (!fontsReady) {
      done();
      return;
    }
    Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 1200))])
      .then(done)
      .catch(done);
  }

  function translatePage(lang = activeLang) {
    activeLang = normalizeLang(lang);
    applyTranslations();
    revealApp();
  }

  window.I18N = {
    t,
    translatePage,
    setLanguage(lang) {
      translatePage(lang);
    },
    get active() {
      return activeLang;
    },
  };
})();
