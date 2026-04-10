(function () {
  var timeEl = document.getElementById("clock-time");
  var dateEl = document.getElementById("clock-date");
  var statusbarTimeEl = document.getElementById("statusbar-time");
  var yearDayLineEl = document.getElementById("year-dayline");
  var yearProgressLineEl = document.getElementById("year-progressline");

  var STORAGE_KEY_LANG = "startpage-lang";
  var STORAGE_KEY_TRANSLATE_OPEN = "startpage-translate-open";
  var TRANSLATIONS = {
    ja: {
      labelTime: "時刻",
      labelDate: "日付",
      labelDay: "日",
      labelYearProgress: "年の進捗",
      labelTranslate: "翻訳",
      translateAction: "翻訳",
      translateFromLabel: "翻訳元言語",
      translateToLabel: "翻訳先言語",
      translatePlaceholder: "ここにテキストを入力...",
      translateToggleOpen: "翻訳パネルを開く",
      translateToggleClose: "翻訳パネルを閉じる",
      translateLoading: "翻訳中...",
      translateFailed: "翻訳結果を取得できませんでした。",
      translateNetworkError: "通信エラーです。しばらくしてから再試行してください。",
      footerLocalOnly: "ローカル専用",
      toastCopied: "プロンプトをクリップボードにコピーしました",
      toastCopyFailed: "コピーに失敗しました。手動で選択してください。"
    },
    en: {
      labelTime: "Time",
      labelDate: "Date",
      labelDay: "Day",
      labelYearProgress: "Year Progress",
      labelTranslate: "Translate",
      translateAction: "Translate",
      translateFromLabel: "Source language",
      translateToLabel: "Target language",
      translatePlaceholder: "Enter text here...",
      translateToggleOpen: "Open translate panel",
      translateToggleClose: "Close translate panel",
      translateLoading: "Translating...",
      translateFailed: "Could not get translation.",
      translateNetworkError: "Network error. Try again later.",
      footerLocalOnly: "Local only",
      toastCopied: "Prompt copied to clipboard",
      toastCopyFailed: "Copy failed. Please select manually."
    }
  };

  function getLang() {
    var stored = localStorage.getItem(STORAGE_KEY_LANG);
    return stored === "en" || stored === "ja" ? stored : "ja";
  }

  function setLang(lang) {
    if (lang !== "ja" && lang !== "en") return;
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    applyTranslations(lang);
  }

  function t(key) {
    var lang = getLang();
    var map = TRANSLATIONS[lang];
    return (map && map[key]) || TRANSLATIONS.en[key] || key;
  }

  function refreshTranslateChrome() {
    var input = document.getElementById("translate-input");
    var fromEl = document.getElementById("translate-from");
    var toEl = document.getElementById("translate-to");
    var toggleBtn = document.getElementById("translate-toggle");
    var panel = document.getElementById("translate-panel");
    var block = document.querySelector(".translate-block");
    if (input) input.placeholder = t("translatePlaceholder");
    if (fromEl) fromEl.setAttribute("aria-label", t("translateFromLabel"));
    if (toEl) toEl.setAttribute("aria-label", t("translateToLabel"));
    if (toggleBtn && panel) {
      var open = !panel.hidden;
      toggleBtn.setAttribute("aria-label", open ? t("translateToggleClose") : t("translateToggleOpen"));
      if (block) block.classList.toggle("translate-block--open", open);
    }
  }

  function applyTranslations(lang) {
    document.documentElement.lang = lang === "ja" ? "ja" : "en";
    var map = TRANSLATIONS[lang];
    if (!map) return;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (map[key]) el.textContent = map[key];
    });
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-lang") === lang;
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    updateClock();
    refreshTranslateChrome();
  }

  function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var hh = hours < 10 ? "0" + hours : String(hours);
    var mm = minutes < 10 ? "0" + minutes : String(minutes);
    return hh + ":" + mm;
  }

  function formatTimeWithSeconds(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var hh = hours < 10 ? "0" + hours : String(hours);
    var mm = minutes < 10 ? "0" + minutes : String(minutes);
    var ss = seconds < 10 ? "0" + seconds : String(seconds);
    return hh + ":" + mm + ":" + ss;
  }

  function formatDate(date) {
    var locale = getLang() === "ja" ? "ja-JP" : "en-US";
    try {
      var formatter = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return formatter.format(date);
    } catch (e) {
      var y = date.getFullYear();
      var m = date.getMonth() + 1;
      var d = date.getDate();
      return getLang() === "ja" ? y + "年" + m + "月" + d + "日" : m + "/" + d + "/" + y;
    }
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function dayOfYear(date) {
    var start = new Date(date.getFullYear(), 0, 1);
    var diffMs = date - start;
    return Math.floor(diffMs / 86400000) + 1;
  }

  function buildProgressBar(percent, length) {
    var p = Math.max(0, Math.min(100, percent));
    var filled = Math.round((p / 100) * length);
    var empty = Math.max(0, length - filled);
    return new Array(filled + 1).join("█") + new Array(empty + 1).join("░");
  }

  function updateYearProgress(now) {
    if (!yearDayLineEl && !yearProgressLineEl) {
      return;
    }

    var year = now.getFullYear();
    var total = isLeapYear(year) ? 366 : 365;
    var day = dayOfYear(now);
    var percent = Math.floor((day / total) * 100);
    var bar = buildProgressBar(percent, 13);

    if (yearDayLineEl) {
      yearDayLineEl.textContent = "Day " + day + " / " + total;
    }
    if (yearProgressLineEl) {
      yearProgressLineEl.textContent = bar + " " + percent + "%";
    }
  }

  function updateClock() {
    var now = new Date();
    if (timeEl) {
      timeEl.textContent = formatTime(now);
    }
    if (dateEl) {
      dateEl.textContent = formatDate(now);
    }
    if (statusbarTimeEl) {
      statusbarTimeEl.textContent = formatTimeWithSeconds(now);
    }
    updateYearProgress(now);
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.classList.add("toast--visible");
    window.setTimeout(function () {
      toast.classList.remove("toast--visible");
    }, 2200);
  }

  function initPromptTemplates() {
    var TEMPLATES = {
      requirements:
        "次のプロダクト/機能について、要件整理を手伝ってください。\\n\\n" +
        "【目的】\\n- \\n\\n【想定ユーザー】\\n- \\n\\n【ユーザーストーリー】\\n- \\n\\n" +
        "【必須要件】\\n- \\n\\n【非機能要件 / 制約】\\n- \\n\\n" +
        "抜けや矛盾があれば指摘しつつ、整理し直してください。",
      review:
        "これから貼るコード差分について、レビューをお願いします。\\n\\n" +
        "【背景】\\n- \\n\\n【変更の目的】\\n- \\n\\n【特に見てほしい点】\\n- パフォーマンス\\n- 設計\\n- ネーミング/可読性\\n\\n" +
        "良い点・懸念点・代替案があれば具体的に指摘してください。",
      bug:
        "バグの原因特定と切り分けを一緒に進めてください。\\n\\n" +
        "【事象】\\n- \\n\\n【期待する動作】\\n- \\n\\n【再現手順】\\n1. \\n2. \\n\\n" +
        "【すでに試したこと】\\n- \\n\\n" +
        "考えられる原因候補と、追加で確認すべきログや切り分け手順を提案してください。",
      learn:
        "今から貼る資料/テキストを、学習メモに落とし込みたいです。\\n\\n" +
        "【してほしいこと】\\n- 要点の箇条書き要約\\n- 重要な用語とその説明\\n- 自分のプロダクト開発にどう応用できるかの提案（3つ程度）\\n\\n" +
        "過度に長くなりすぎないようにまとめてください。"
    };

    var buttons = document.querySelectorAll("[data-prompt-id]");
    if (!buttons.length) {
      return;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-prompt-id");
        var text = TEMPLATES[id];
        if (!text) {
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(text)
            .then(function () {
              showToast(t("toastCopied"));
            })
            .catch(function () {
              showToast(t("toastCopyFailed"));
            });
        } else {
          var textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand("copy");
            showToast(t("toastCopied"));
          } catch (e) {
            showToast(t("toastCopyFailed"));
          }
          document.body.removeChild(textarea);
        }
      });
    });
  }

  function simplifyLinkTexts() {
    var links = document.querySelectorAll(".links-row a");
    if (!links.length) {
      return;
    }
    links.forEach(function (link) {
      try {
        var url = new URL(link.href);
        var host = url.hostname.replace(/^www\./, "");
        link.textContent = host;
      } catch (e) {
        // no-op
      }
    });
  }

  function initLangSwitcher() {
    applyTranslations(getLang());
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang");
        if (lang) setLang(lang);
      });
    });
  }

  function initTranslate() {
    var inputEl = document.getElementById("translate-input");
    var fromEl = document.getElementById("translate-from");
    var toEl = document.getElementById("translate-to");
    var btnEl = document.getElementById("translate-btn");
    var resultEl = document.getElementById("translate-result");
    var toggleBtn = document.getElementById("translate-toggle");
    var panel = document.getElementById("translate-panel");
    var block = document.querySelector(".translate-block");
    if (!inputEl || !fromEl || !toEl || !btnEl || !resultEl || !toggleBtn || !panel) return;

    function setTranslateOpen(open) {
      panel.hidden = !open;
      toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (block) block.classList.toggle("translate-block--open", open);
      toggleBtn.setAttribute("aria-label", open ? t("translateToggleClose") : t("translateToggleOpen"));
      try {
        localStorage.setItem(STORAGE_KEY_TRANSLATE_OPEN, open ? "1" : "0");
      } catch (e) {
        // no-op
      }
    }

    var storedOpen = null;
    try {
      storedOpen = localStorage.getItem(STORAGE_KEY_TRANSLATE_OPEN);
    } catch (e) {
      storedOpen = null;
    }
    setTranslateOpen(storedOpen === "1");

    toggleBtn.addEventListener("click", function () {
      setTranslateOpen(panel.hidden);
    });

    fromEl.addEventListener("change", function () {
      if (fromEl.value === toEl.value) {
        toEl.value = fromEl.value === "ja" ? "en" : "ja";
      }
    });
    toEl.addEventListener("change", function () {
      if (toEl.value === fromEl.value) {
        fromEl.value = toEl.value === "ja" ? "en" : "ja";
      }
    });

    function doTranslate() {
      var text = (inputEl.value || "").trim();
      if (!text) {
        resultEl.textContent = "";
        resultEl.classList.remove("translate-result--error");
        return;
      }
      var from = fromEl.value;
      var to = toEl.value;
      var langpair = from + "|" + to;
      resultEl.textContent = t("translateLoading");
      resultEl.classList.remove("translate-result--error");

      var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + encodeURIComponent(langpair);
      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var translated = data.responseData && data.responseData.translatedText;
          if (translated) {
            resultEl.textContent = translated;
          } else {
            resultEl.textContent = t("translateFailed");
            resultEl.classList.add("translate-result--error");
          }
        })
        .catch(function () {
          resultEl.textContent = t("translateNetworkError");
          resultEl.classList.add("translate-result--error");
        });
    }

    btnEl.addEventListener("click", doTranslate);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doTranslate();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLangSwitcher();
    updateClock();
    window.setInterval(updateClock, 1000);
    initPromptTemplates();
    initTranslate();
    simplifyLinkTexts();
  });
})();
