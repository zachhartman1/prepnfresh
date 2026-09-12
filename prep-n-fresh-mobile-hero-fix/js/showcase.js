/* ==========================================================================
   Horizontally scrolling meal showcase. Native overflow-x scroll container
   (so touch swipe and trackpad panning work for free) + a slow rAF auto-
   advance that pauses on any user interaction and respects
   prefers-reduced-motion. No carousel library.
   ========================================================================== */

(function (window, document) {
  "use strict";

  function cardHTML(meal) {
    var proteinBits = [];
    if (meal.kcal) proteinBits.push(meal.kcal + " kcal");
    if (meal.protein) proteinBits.push(meal.protein + "g protein");
    return (
      '<article class="showcase-card">' +
        '<div class="showcase-card__img">' +
          '<img src="' + meal.image + '" alt="' + meal.name + '" loading="lazy" ' +
            'onerror="this.closest(\'.showcase-card__img\').classList.add(\'no-image\'); this.remove();">' +
          '<span class="add-photo-hint">Add photo</span>' +
        '</div>' +
        '<div class="showcase-card__body">' +
          '<h3>' + meal.name + '</h3>' +
          '<p>' + proteinBits.join(" &middot; ") + '</p>' +
        '</div>' +
      '</article>'
    );
  }

  function init(container) {
    var meals = window.PNF.meals;
    var track = document.createElement("div");
    track.className = "showcase-track";
    track.innerHTML = meals.map(cardHTML).join("") + meals.map(cardHTML).join("");
    container.innerHTML = "";
    container.appendChild(track);
    container.setAttribute("tabindex", "0");
    container.setAttribute("aria-label", "This week's meals, scrollable");

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var paused = false;
    var pauseTimer = null;
    var raf = null;

    function pauseAWhile() {
      paused = true;
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(function () { paused = false; }, 2200);
    }

    ["pointerdown", "touchstart", "wheel"].forEach(function (evt) {
      container.addEventListener(evt, pauseAWhile, { passive: true });
    });
    // Pause-on-hover for desktop only. Using pointerenter/pointerleave with
    // an explicit mouse check (rather than mouseenter/mouseleave) matters
    // here: touchscreens fire a synthetic "ghost" mouseenter after a tap for
    // legacy compatibility, but never a matching mouseleave — which was
    // permanently freezing the auto-scroll after the very first touch.
    container.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "mouse") paused = true;
    });
    container.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") paused = false;
    });

    // Desktop click-drag to scroll — mouse (and pen) only. Touch input must
    // fall through untouched so the browser's own native swipe-scrolling
    // handles it; hijacking pointerdown/pointermove for touch is what broke
    // scrolling on phones, since Pointer Events fire for touch too.
    var isDown = false, startX = 0, startScroll = 0;
    container.addEventListener("pointerdown", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      isDown = true;
      startX = e.clientX;
      startScroll = container.scrollLeft;
      container.classList.add("dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      if (e.pointerType && e.pointerType !== "mouse") return;
      container.scrollLeft = startScroll - (e.clientX - startX);
    });
    window.addEventListener("pointerup", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      isDown = false;
      container.classList.remove("dragging");
    });

    if (!reduceMotion) {
      var speed = 0.4; // px per frame, gentle
      // Track position ourselves rather than reading container.scrollLeft
      // back each frame — iOS Safari rounds scrollLeft to whole pixels, so
      // re-reading it after every sub-pixel (0.4px) nudge silently discards
      // the fractional progress and the position never advances. Keeping
      // our own float accumulator and only ever writing to the DOM (never
      // reading it back into the loop) avoids that entirely.
      var pos = container.scrollLeft;
      var step = function () {
        if (!paused && !isDown) {
          pos += speed;
          // Loop seamlessly once we've scrolled past the first copy of the set.
          if (pos >= track.scrollWidth / 2) pos -= track.scrollWidth / 2;
          container.scrollTo({ left: pos, behavior: "auto" });
        } else {
          // User is interacting manually — keep our tracked position in
          // sync with the real scroll position so auto-scroll resumes from
          // wherever they left it, instead of jumping back.
          pos = container.scrollLeft;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
  }

  function boot() {
    var containers = document.querySelectorAll("[data-meal-showcase]");
    containers.forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window, document);
