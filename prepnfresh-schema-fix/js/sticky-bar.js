/* ==========================================================================
   Sticky mobile order bar. Injects its own markup so every page just needs
   to include this script — no HTML duplication across 6 pages. Shows a
   neutral "View menu / Order now" state normally, and switches to live
   "x / y selected — total — Continue" once a box is in progress.
   ========================================================================== */

(function (window, document) {
  "use strict";

  function build() {
    var bar = document.createElement("div");
    bar.className = "sticky-order-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Order status");
    document.body.appendChild(bar);
    render(bar);
    pinToVisibleViewport(bar);
    document.addEventListener("pnf:order-changed", function () { render(bar); });
    window.addEventListener("storage", function (e) {
      if (e.key === "pnf_order_v1") render(bar);
    });
  }

  // Mobile browsers (iOS Safari in particular) report `position: fixed;
  // bottom: 0` relative to the full layout viewport, which extends
  // underneath the browser's own address/toolbar — not the shorter
  // "visual viewport" the person can actually see and tap. That leaves
  // the bar rendered right above the on-screen edge but with its real
  // hit-box partly behind the browser chrome, so taps land on the
  // browser's own UI instead of our button and silently do nothing.
  // Desktop has no such overlapping chrome, so the same code works fine
  // there. The Visual Viewport API reports the true visible area, so we
  // nudge the bar up by whatever gap has opened up between the two.
  function pinToVisibleViewport(bar) {
    if (!window.visualViewport) return;
    var vv = window.visualViewport;

    function reposition() {
      var gap = window.innerHeight - vv.height - vv.offsetTop;
      bar.style.transform = gap > 0 ? "translateY(-" + gap + "px)" : "";
    }

    vv.addEventListener("resize", reposition);
    vv.addEventListener("scroll", reposition);
    reposition();
  }

  function render(bar) {
    var order = window.PNF_ORDER.load();
    var onBuildPage = /build-a-box\.html/.test(window.location.pathname);

    if (order && window.PNF.getPackage(order.packageId)) {
      var pkg = window.PNF.getPackage(order.packageId);
      var count = window.PNF_ORDER.totalSelected(order);
      var target = pkg.variable ? pkg.maxMeals : pkg.meals;
      var price = window.PNF_ORDER.orderPrice(order);
      bar.innerHTML =
        '<div class="sticky-order-bar__inner">' +
          '<div class="sticky-order-bar__status">' +
            '<strong>' + count + ' / ' + target + '</strong> selected' +
            '<span class="sticky-order-bar__price">' + window.PNF.money(price) + '</span>' +
          '</div>' +
          '<a class="btn btn-primary sticky-order-bar__cta" href="build-a-box.html">Continue &rarr;</a>' +
        '</div>';
    } else if (onBuildPage) {
      bar.innerHTML = "";
      bar.classList.add("sticky-order-bar--hidden");
      return;
    } else {
      bar.innerHTML =
        '<div class="sticky-order-bar__inner">' +
          '<a class="btn btn-outline sticky-order-bar__cta" href="menu.html">View menu</a>' +
          '<a class="btn btn-primary sticky-order-bar__cta" href="build-a-box.html">Order now</a>' +
        '</div>';
    }
    bar.classList.remove("sticky-order-bar--hidden");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})(window, document);
