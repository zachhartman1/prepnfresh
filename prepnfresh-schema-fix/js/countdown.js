/* ==========================================================================
   Order-deadline countdown — there are now TWO weekly cutoffs (Monday 6pm
   for Tuesday delivery, Thursday 6pm for Friday delivery). This always
   finds whichever cutoff is soonest from the real clock, counts down to
   it, and updates the "Order by ___" label to match — recalculated on
   every load and every tick, never a stored/cached duration. Handles
   BST/GMT transitions via Intl, not a fixed UTC offset.
   ========================================================================== */

(function (window) {
  "use strict";

  var CUTOFFS = (window.PNF && window.PNF.business.orderCutoffs) || [
    { weekday: 1, hour: 18, minute: 0, timezone: "Europe/London", cookDay: "Monday", deliversOn: "Tuesday" },
    { weekday: 4, hour: 18, minute: 0, timezone: "Europe/London", cookDay: "Thursday", deliversOn: "Friday" }
  ];

  function londonPartsNow(tz) {
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
    var parts = {};
    fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      year: parseInt(parts.year, 10),
      month: parseInt(parts.month, 10),
      day: parseInt(parts.day, 10),
      hour: parts.hour === "24" ? 0 : parseInt(parts.hour, 10),
      minute: parseInt(parts.minute, 10),
      second: parseInt(parts.second, 10),
      weekday: weekdayMap[parts.weekday]
    };
  }

  // Convert a wall-clock date/time in `tz` into the correct UTC instant,
  // accounting for whatever offset (GMT/BST) applies on that date.
  function wallToUTC(tz, y, m, d, h, mi) {
    var guessUTC = Date.UTC(y, m - 1, d, h, mi, 0);
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
    var parts = {};
    fmt.formatToParts(new Date(guessUTC)).forEach(function (p) { parts[p.type] = p.value; });
    var asIfUTC = Date.UTC(
      parseInt(parts.year, 10), parseInt(parts.month, 10) - 1, parseInt(parts.day, 10),
      parts.hour === "24" ? 0 : parseInt(parts.hour, 10), parseInt(parts.minute, 10), 0
    );
    var offsetMs = asIfUTC - guessUTC; // tz's offset from UTC at that instant
    return guessUTC - offsetMs;
  }

  function nextOccurrence(cutoff) {
    var tz = cutoff.timezone || "Europe/London";
    var now = londonPartsNow(tz);
    var daysUntil = (cutoff.weekday - now.weekday + 7) % 7;
    var isToday = daysUntil === 0;
    var passedToday = isToday && (now.hour > cutoff.hour || (now.hour === cutoff.hour && now.minute >= cutoff.minute));
    if (passedToday) daysUntil = 7;

    var midnightUTC = wallToUTC(tz, now.year, now.month, now.day, 0, 0);
    var target = new Date(midnightUTC + daysUntil * 86400000);
    var tp = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(target).forEach(function (p) { tp[p.type] = p.value; });

    var targetUTCms = wallToUTC(tz, parseInt(tp.year, 10), parseInt(tp.month, 10), parseInt(tp.day, 10), cutoff.hour, cutoff.minute);
    return new Date(targetUTCms);
  }

  // Of all configured cutoffs, return whichever comes soonest from now,
  // along with its Date and originating config (for the label).
  function nextDeadline() {
    var best = null;
    CUTOFFS.forEach(function (cutoff) {
      var when = nextOccurrence(cutoff);
      if (!best || when.getTime() < best.when.getTime()) best = { when: when, cutoff: cutoff };
    });
    return best;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function render(el) {
    var next = nextDeadline();
    var diff = next.when.getTime() - Date.now();
    if (diff < 0) diff = 0;
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);

    var numsEl = el.querySelector("[data-countdown-nums]");
    if (numsEl) {
      if (days > 0) {
        numsEl.textContent = pad(days) + "d : " + pad(hours) + "h : " + pad(mins) + "m";
      } else {
        var secs = Math.floor((diff % 60000) / 1000);
        numsEl.textContent = pad(hours) + "h : " + pad(mins) + "m : " + pad(secs) + "s";
      }
    }

    var labelEl = el.querySelector("[data-countdown-deadline-label]");
    if (labelEl) {
      var c = next.cutoff;
      var hour12 = c.hour % 12 === 0 ? 12 : c.hour % 12;
      var ampm = c.hour >= 12 ? "pm" : "am";
      var timeStr = c.minute === 0 ? (hour12 + ampm) : (hour12 + ":" + pad(c.minute) + ampm);
      labelEl.textContent = "Order by " + c.cookDay + " " + timeStr + " for " + c.deliversOn + " delivery";
    }
  }

  function init() {
    var els = document.querySelectorAll("[data-countdown]");
    if (!els.length) return;
    els.forEach(function (el) { render(el); });
    setInterval(function () { els.forEach(function (el) { render(el); }); }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.PNF_COUNTDOWN = { nextDeadline: nextDeadline };
})(window);
