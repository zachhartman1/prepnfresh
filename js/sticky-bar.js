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
    document.addEventListener("pnf:order-changed", function () { render(bar); });
    document.addEventListener("pnf:step-changed", function () { render(bar); });
    window.addEventListener("storage", function (e) {
      if (e.key === "pnf_order_v1") render(bar);
    });

    // On the build page the sticky Continue must do exactly what the in-page
    // Continue button does (move to the details / "Almost done" step), rather
    // than linking back to build-a-box.html, which just reloads the page.
    bar.addEventListener("click", function (e) {
      var cta = e.target.closest ? e.target.closest(".js-sticky-continue") : null;
      if (!cta) return;
      e.preventDefault();
      var realBtn = document.getElementById("bb-continue-btn");
      if (realBtn && !realBtn.disabled) realBtn.click();
    });
  }

  // Which build-page step is currently visible (null if not on the build page)
  function currentBuildStep() {
    var meals = document.getElementById("bb-step-meals");
    if (!meals) return null;
    if (!meals.hidden) return "meals";
    var details = document.getElementById("bb-step-details");
    if (details && !details.hidden) return "details";
    return "package";
  }

  function hide(bar) {
    bar.innerHTML = "";
    bar.classList.add("sticky-order-bar--hidden");
  }

  function render(bar) {
    var order = window.PNF_ORDER.load();
    var buildStep = currentBuildStep();
    var onBuildPage = buildStep !== null;

    // Build page: only show the bar while choosing meals. The package step
    // has its own buttons, and the details step has its own Pay Now button.
    if (onBuildPage && buildStep !== "meals") {
      hide(bar);
      return;
    }

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
          (onBuildPage
            ? '<button type="button" class="btn btn-primary sticky-order-bar__cta js-sticky-continue"' +
                (window.PNF_ORDER.isComplete(order) ? '' : ' disabled') + '>Continue &rarr;</button>'
            : '<a class="btn btn-primary sticky-order-bar__cta" href="build-a-box.html">Continue &rarr;</a>') +
        '</div>';
    } else if (onBuildPage) {
      hide(bar);
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
