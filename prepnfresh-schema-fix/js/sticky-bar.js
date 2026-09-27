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

  // The build-a-box wizard keeps track of which step (meals vs. details)
  // is showing entirely in page JS, not in the URL. So a sticky-bar CTA
  // that's just a link to "build-a-box.html" — the same page it's
  // already on — does a full reload, and boot() always lands a reload
  // back on the meals step regardless of which step you were actually
  // on. From the meals step that reload is invisible (you're still
  // looking at the same step), which is exactly why the button looked
  // "broken" on mobile: it was doing something, just not the right
  // thing, and only scrolling down to the real in-page button actually
  // advanced the wizard. Instead of navigating, forward the tap to
  // whichever real step button is currently visible on the page, the
  // same as if the person had scrolled down and pressed it themselves.
  function clickCurrentStepButton() {
    var payBtn = document.getElementById("bb-pay-btn");
    var continueBtn = document.getElementById("bb-continue-btn");
    var target = payBtn && !payBtn.closest("[hidden]") ? payBtn
      : (continueBtn && !continueBtn.closest("[hidden]") ? continueBtn : null);
    if (target) target.click();
  }

  function render(bar) {
    var order = window.PNF_ORDER.load();
    var onBuildPage = /build-a-box\.html/.test(window.location.pathname);

    if (order && window.PNF.getPackage(order.packageId)) {
      var pkg = window.PNF.getPackage(order.packageId);
      var count = window.PNF_ORDER.totalSelected(order);
      var target = pkg.variable ? pkg.maxMeals : pkg.meals;
      var price = window.PNF_ORDER.orderPrice(order);
      var payBtnVisible = onBuildPage && document.getElementById("bb-pay-btn") &&
        !document.getElementById("bb-pay-btn").closest("[hidden]");
      var ctaLabel = payBtnVisible ? "Pay Now &rarr;" : "Continue &rarr;";
      var cta = onBuildPage
        ? '<button type="button" class="btn btn-primary sticky-order-bar__cta" id="sticky-order-bar-cta">' + ctaLabel + '</button>'
        : '<a class="btn btn-primary sticky-order-bar__cta" href="build-a-box.html">Continue &rarr;</a>';
      bar.innerHTML =
        '<div class="sticky-order-bar__inner">' +
          '<div class="sticky-order-bar__status">' +
            '<strong>' + count + ' / ' + target + '</strong> selected' +
            '<span class="sticky-order-bar__price">' + window.PNF.money(price) + '</span>' +
          '</div>' +
          cta +
        '</div>';
      if (onBuildPage) {
        var ctaBtn = document.getElementById("sticky-order-bar-cta");
        if (ctaBtn) ctaBtn.addEventListener("click", clickCurrentStepButton);
      }
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
