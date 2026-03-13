(function () {
  var timeEl = document.getElementById("clock-time");
  var dateEl = document.getElementById("clock-date");
  var statusbarTimeEl = document.getElementById("statusbar-time");
  var yearDayLineEl = document.getElementById("year-dayline");
  var yearProgressLineEl = document.getElementById("year-progressline");

  var STORAGE_KEY_LANG = "startpage-lang";
  var TRANSLATIONS = {
    ja: {
      labelTime: "時刻",
      labelDate: "日付",
      labelDay: "日",
      labelYearProgress: "年の進捗",
      labelWeather: "天気",
      weatherFetching: "位置情報を取得中...",
      weatherCurrentLocation: "現在地",
      weatherUnsupported: "位置情報非対応",
      weatherFetchFailed: "天気の取得に失敗しました",
      weatherAllowLocation: "位置情報を許可してください",
      footerLocalOnly: "ローカル専用",
      toastCopied: "プロンプトをクリップボードにコピーしました",
      toastCopyFailed: "コピーに失敗しました。手動で選択してください。"
    },
    en: {
      labelTime: "Time",
      labelDate: "Date",
      labelDay: "Day",
      labelYearProgress: "Year Progress",
      labelWeather: "Weather",
      weatherFetching: "Fetching location...",
      weatherCurrentLocation: "Current location",
      weatherUnsupported: "Geolocation not supported",
      weatherFetchFailed: "Failed to fetch weather",
      weatherAllowLocation: "Please allow location access",
      footerLocalOnly: "Local only",
      toastCopied: "Prompt copied to clipboard",
      toastCopyFailed: "Copy failed. Please select manually."
    }
  };

  var WEATHER_DESC = {
    ja: {
      0: "晴れ", 1: "おおむね晴れ", 2: "一部曇り", 3: "曇り", 45: "霧", 48: "霧",
      51: "軽い霧雨", 53: "霧雨", 55: "強い霧雨", 61: "小雨", 63: "雨", 65: "大雨",
      66: "凍雨", 67: "強い凍雨", 71: "小雪", 73: "雪", 75: "大雪", 77: "雪粒",
      80: "にわか雨", 81: "にわか雨", 82: "強いにわか雨", 85: "にわか雪", 86: "強いにわか雪",
      95: "雷", 96: "ひょうを伴う雷", 99: "ひょうを伴う雷"
    },
    en: {
      0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
      51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
      66: "Freezing rain", 67: "Heavy freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
      80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers", 85: "Snow showers", 86: "Heavy snow showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"
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
    if (typeof applyLastWeather === "function") applyLastWeather();
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

  function weatherCodeToText(code) {
    var map = WEATHER_DESC[getLang()] || WEATHER_DESC.en;
    return map[code] || "—";
  }

  var lastWeather = null;
  function applyLastWeather() {
    if (!lastWeather) return;
    var locationEl = document.getElementById("weather-location");
    var tempEl = document.getElementById("weather-temp");
    var descEl = document.getElementById("weather-desc");
    if (!locationEl || !tempEl || !descEl) return;
    var desc = lastWeather.code != null ? weatherCodeToText(lastWeather.code) : "";
    locationEl.textContent = lastWeather.locationName || t("weatherCurrentLocation");
    tempEl.textContent = lastWeather.temp != null ? Math.round(lastWeather.temp) + "°C" : "—°C";
    descEl.textContent = desc ? " · " + desc : "";
  }

  function initWeather() {
    var locationEl = document.getElementById("weather-location");
    var tempEl = document.getElementById("weather-temp");
    var descEl = document.getElementById("weather-desc");

    if (!locationEl || !tempEl || !descEl) {
      return;
    }
    locationEl.textContent = t("weatherFetching");

    function setError(msg) {
      locationEl.textContent = msg;
      tempEl.textContent = "—°C";
      descEl.textContent = "";
      lastWeather = null;
    }

    function setWeather(locationName, temp, code) {
      var desc = code != null ? weatherCodeToText(code) : "";
      lastWeather = { locationName: locationName || null, temp: temp, code: code };
      locationEl.textContent = locationName || t("weatherCurrentLocation");
      tempEl.textContent = temp != null ? Math.round(temp) + "°C" : "—°C";
      descEl.textContent = desc ? " · " + desc : "";
    }

    if (!navigator.geolocation) {
      setError(t("weatherUnsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;

        var url =
          "https://api.open-meteo.com/v1/forecast?latitude=" +
          encodeURIComponent(lat) +
          "&longitude=" +
          encodeURIComponent(lon) +
          "&current=temperature_2m,weather_code";

        fetch(url)
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            var cur = data.current;
            var temp = cur && cur.temperature_2m != null ? cur.temperature_2m : null;
            var code = cur && cur.weather_code != null ? cur.weather_code : null;

            var reverseUrl =
              "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
              encodeURIComponent(lat) +
              "&lon=" +
              encodeURIComponent(lon);

            fetch(reverseUrl, {
              headers: {
                "Accept-Language": getLang() === "ja" ? "ja" : "en",
                "User-Agent": "StartPage/1.0 (local start page)"
              },
              method: "GET"
            })
              .then(function (r) {
                return r.json();
              })
              .then(function (geo) {
                var name = "";
                if (geo && geo.address) {
                  var a = geo.address;
                  name = a.city || a.town || a.village || a.municipality || a.state || a.country || "";
                }
                setWeather(name || null, temp, code);
              })
              .catch(function () {
                setWeather(null, temp, code);
              });
          })
          .catch(function () {
            setError(t("weatherFetchFailed"));
          });
      },
      function () {
        setError(t("weatherAllowLocation"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
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
    if (!inputEl || !fromEl || !toEl || !btnEl || !resultEl) return;

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
      resultEl.textContent = "翻訳中...";
      resultEl.classList.remove("translate-result--error");

      var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + encodeURIComponent(langpair);
      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var translated = data.responseData && data.responseData.translatedText;
          if (translated) {
            resultEl.textContent = translated;
          } else {
            resultEl.textContent = "翻訳結果を取得できませんでした。";
            resultEl.classList.add("translate-result--error");
          }
        })
        .catch(function () {
          resultEl.textContent = "通信エラーです。しばらくしてから再試行してください。";
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
    initWeather();
    initPromptTemplates();
    initTranslate();
    simplifyLinkTexts();
  });
})();
