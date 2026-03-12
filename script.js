(function () {
  var timeEl = document.getElementById("clock-time");
  var dateEl = document.getElementById("clock-date");
  var statusbarTimeEl = document.getElementById("statusbar-time");
  var yearDayLineEl = document.getElementById("year-dayline");
  var yearProgressLineEl = document.getElementById("year-progressline");

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
    try {
      var formatter = new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return formatter.format(date);
    } catch (e) {
      var y = date.getFullYear();
      var m = date.getMonth() + 1;
      var d = date.getDate();
      return y + "年" + m + "月" + d + "日";
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
    var map = {
      0: "Clear",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Heavy drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      66: "Freezing rain",
      67: "Heavy freezing rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Rain showers",
      81: "Rain showers",
      82: "Heavy rain showers",
      85: "Snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with hail"
    };
    return map[code] || "—";
  }

  function initWeather() {
    var locationEl = document.getElementById("weather-location");
    var tempEl = document.getElementById("weather-temp");
    var descEl = document.getElementById("weather-desc");

    if (!locationEl || !tempEl || !descEl) {
      return;
    }

    function setError(msg) {
      locationEl.textContent = msg;
      tempEl.textContent = "—°C";
      descEl.textContent = "";
    }

    function setWeather(locationName, temp, desc) {
      locationEl.textContent = locationName || "Current location";
      tempEl.textContent = temp != null ? Math.round(temp) + "°C" : "—°C";
      descEl.textContent = desc ? " · " + desc : "";
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
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
            var desc = code != null ? weatherCodeToText(code) : "";

            var reverseUrl =
              "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
              encodeURIComponent(lat) +
              "&lon=" +
              encodeURIComponent(lon);

            fetch(reverseUrl, {
              headers: {
                "Accept-Language": "ja",
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
                setWeather(name || "Current location", temp, desc);
              })
              .catch(function () {
                setWeather("Current location", temp, desc);
              });
          })
          .catch(function () {
            setError("Failed to fetch weather");
          });
      },
      function () {
        setError("Please allow location access");
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
              showToast("プロンプトをクリップボードにコピーしました");
            })
            .catch(function () {
              showToast("コピーに失敗しました。手動で選択してください。");
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
            showToast("プロンプトをクリップボードにコピーしました");
          } catch (e) {
            showToast("コピーに失敗しました。手動で選択してください。");
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

  document.addEventListener("DOMContentLoaded", function () {
    updateClock();
    window.setInterval(updateClock, 1000);
    initWeather();
    initPromptTemplates();
    simplifyLinkTexts();
  });
})();
