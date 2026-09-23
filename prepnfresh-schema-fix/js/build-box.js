(function (window, document) {
  "use strict";

  var order = window.PNF_ORDER.load();

  var stepPackage = document.getElementById("bb-step-package");
  var stepMeals = document.getElementById("bb-step-meals");
  var stepDetails = document.getElementById("bb-step-details");
  var heading = document.getElementById("bb-heading");
  var subheading = document.getElementById("bb-subheading");
  var trustLine = document.getElementById("bb-trust-line");

  if (trustLine) trustLine.textContent = window.PNF.business.additiveFree;

  function showStep(name) {
    stepPackage.hidden = name !== "package";
    stepMeals.hidden = name !== "meals";
    stepDetails.hidden = name !== "details";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "package") {
      heading.textContent = "Choose your box size";
      subheading.textContent = "Pick how many meals you need — you'll choose exactly which dishes on the next step.";
    } else if (name === "meals") {
      var pkg = window.PNF.getPackage(order.packageId);
      if (pkg.schedule === "split") {
        heading.textContent = "Build your " + pkg.name.toLowerCase();
        subheading.textContent = "Choose " + pkg.tuesdayMeals + " dishes for Tuesday and " + pkg.fridayMeals + " for Friday.";
      } else if (pkg.variable) {
        heading.textContent = "Choose your meals";
        subheading.textContent = "Pick " + pkg.minMeals + " to " + pkg.maxMeals + " meals, priced at " + window.PNF.money(pkg.perMealPrice) + " each.";
      } else {
        heading.textContent = "Build your " + pkg.meals + " meal box";
        subheading.textContent = "Pick a delivery day, then add meals until you reach " + pkg.meals + ".";
      }
    } else {
      heading.textContent = "Almost done";
      subheading.textContent = "";
    }
  }

  // ---------- Step 1: package grid ----------
  function renderPackageGrid() {
    var grid = document.getElementById("bb-package-grid");
    grid.innerHTML = window.PNF.packages.map(function (pkg) {
      var scheduleLine = pkg.schedule === "split"
        ? pkg.tuesdayMeals + " Tue &middot; " + pkg.fridayMeals + " Fri" + (pkg.weeks ? " &middot; " + pkg.weeks + " weeks" : "")
        : "1 delivery day of your choice";
      var priceTag = pkg.variable
        ? '<div class="price-tag"><strong>' + window.PNF.money(pkg.perMealPrice) + '</strong> <span>per meal</span></div>' +
          '<div class="price-per">From ' + window.PNF.money(pkg.perMealPrice * pkg.minMeals) + ' &middot; ' + scheduleLine + '</div>'
        : '<div class="price-tag"><strong>' + window.PNF.money(pkg.price) + '</strong> <span>/ ' + pkg.meals + ' meals' + (pkg.weeks ? ' a week' : '') + '</span></div>' +
          '<div class="price-per">' + window.PNF.money(pkg.perMeal) + ' per meal &middot; ' + scheduleLine + '</div>';
      return (
        '<div class="price-card' + (pkg.popular ? ' popular' : '') + '">' +
          (pkg.popular ? '<span class="price-badge">Most popular</span>' : '') +
          '<h3>' + pkg.name + '</h3>' +
          '<p style="color:var(--ink-muted); font-size:0.92rem; margin-bottom:0;">' + pkg.tagline + '</p>' +
          priceTag +
          '<ul>' + pkg.features.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
          '<button type="button" class="btn ' + (pkg.popular ? 'btn-primary' : 'btn-outline') + '" data-pick-package="' + pkg.id + '" style="width:100%; justify-content:center;">Build ' + pkg.name + '</button>' +
        '</div>'
      );
    }).join("");

    grid.querySelectorAll("[data-pick-package]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pkgId = btn.getAttribute("data-pick-package");
        if (!order || order.packageId !== pkgId) {
          order = window.PNF_ORDER.create(pkgId);
          window.PNF_ORDER.save(order);
        }
        showStep("meals");
        renderMealsStep();
      });
    });
  }

  // ---------- Step 2: meal selection (branches by schedule type) ----------
  var dayToggle = document.getElementById("bb-day-toggle");
  var singleSection = document.getElementById("bb-single-day-section");
  var splitSection = document.getElementById("bb-split-day-section");
  var lastTuesdayDoneState = false;

  function renderMealsStep() {
    var pkg = window.PNF.getPackage(order.packageId);
    if (pkg.schedule === "split") {
      dayToggle.hidden = true;
      singleSection.hidden = true;
      splitSection.hidden = false;
      renderSplitGrids();
    } else {
      dayToggle.hidden = false;
      singleSection.hidden = false;
      splitSection.hidden = true;
      renderDayToggle();
      renderSingleGrid();
    }
  }

  function renderDayToggle() {
    dayToggle.innerHTML = window.PNF.deliveryDays.map(function (d) {
      var active = order.deliveryDay === d.id;
      return '<button type="button" class="bb-day-pill' + (active ? ' active' : '') + '" data-day-pick="' + d.id + '">' + d.label + ' delivery</button>';
    }).join("");

    dayToggle.querySelectorAll("[data-day-pick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var day = btn.getAttribute("data-day-pick");
        window.PNF_ORDER.setDeliveryDay(order, day);
        window.PNF_ORDER.save(order);
        renderDayToggle();
        renderSingleGrid();
      });
    });
  }

  function renderSingleGrid() {
    var pkg = window.PNF.getPackage(order.packageId);
    var day = order.deliveryDay;
    var grid = document.getElementById("bb-meal-grid");
    grid.innerHTML = window.PNF.meals.map(function (meal) {
      var bucket = order.items[day] || {};
      return window.PNF_CARD.render(meal, { qtyControls: true, qty: bucket[meal.id] || 0, day: day });
    }).join("");
    wireQtyControls(grid, day);
    updateSingleProgress();
    updateSidebar();
  }

  function updateSingleProgress() {
    var pkg = window.PNF.getPackage(order.packageId);
    var count = window.PNF_ORDER.selectedForDay(order, order.deliveryDay);
    var cap = pkg.variable ? pkg.maxMeals : pkg.meals;
    var pct = Math.min(100, Math.round((count / cap) * 100));
    document.getElementById("bb-progress-fill").style.width = pct + "%";
    var complete = window.PNF_ORDER.isComplete(order);
    document.getElementById("bb-progress-text").textContent = pkg.variable
      ? count + " selected (up to " + pkg.maxMeals + ")" + (complete ? " \u2713" : "")
      : count + " / " + pkg.meals + " meals selected" + (complete ? " \u2713" : "");
    document.getElementById("bb-continue-btn").disabled = !complete;
  }

  function renderSplitGrids() {
    renderDayGrid("tuesday", "bb-meal-grid-tuesday");
    renderDayGrid("friday", "bb-meal-grid-friday");
    renderJumpNav();
    updateSplitProgress();
    updateJumpNavState();
    var pkg = window.PNF.getPackage(order.packageId);
    lastTuesdayDoneState = window.PNF_ORDER.selectedForDay(order, "tuesday") >= pkg.tuesdayMeals;
    updateSidebar();
  }

  function renderJumpNav() {
    var nav = document.getElementById("bb-jump-nav");
    nav.hidden = false;
    nav.innerHTML =
      '<a href="#bb-day-block-tuesday" data-jump="tuesday">Tuesday</a>' +
      '<a href="#bb-day-block-friday" data-jump="friday">Friday</a>';
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        scrollToDay(link.getAttribute("data-jump"));
      });
    });
  }

  function scrollToDay(day) {
    var el = document.getElementById("bb-day-block-" + day);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateJumpNavState() {
    var pkg = window.PNF.getPackage(order.packageId);
    var tDone = window.PNF_ORDER.selectedForDay(order, "tuesday") >= pkg.tuesdayMeals;
    var fDone = window.PNF_ORDER.selectedForDay(order, "friday") >= pkg.fridayMeals;
    var tLink = document.querySelector('[data-jump="tuesday"]');
    var fLink = document.querySelector('[data-jump="friday"]');
    if (tLink) tLink.classList.toggle("done", tDone);
    if (fLink) fLink.classList.toggle("done", fDone);
  }

  function renderDayGrid(day, gridId) {
    var grid = document.getElementById(gridId);
    var bucket = order.items[day] || {};
    grid.innerHTML = window.PNF.meals.map(function (meal) {
      return window.PNF_CARD.render(meal, { qtyControls: true, qty: bucket[meal.id] || 0, day: day });
    }).join("");
    wireQtyControls(grid, day);
  }

  function syncPlusDisabled(day) {
    var cap = window.PNF_ORDER.capForDay(order, day);
    var count = window.PNF_ORDER.selectedForDay(order, day);
    document.querySelectorAll('[data-qty-wrap][data-day="' + day + '"] [data-qty-plus]').forEach(function (btn) {
      btn.disabled = count >= cap;
    });
  }

  function wireQtyControls(scopeEl, day) {
    scopeEl.querySelectorAll('[data-qty-wrap][data-day="' + day + '"]').forEach(function (wrap) {
      var mealId = wrap.getAttribute("data-meal-id");
      wrap.querySelector("[data-qty-plus]").addEventListener("click", function () {
        var current = (order.items[day] || {})[mealId] || 0;
        window.PNF_ORDER.setQty(order, day, mealId, current + 1);
        window.PNF_ORDER.save(order);
        onQtyChanged(day, mealId);
      });
      wrap.querySelector("[data-qty-minus]").addEventListener("click", function () {
        var current = (order.items[day] || {})[mealId] || 0;
        window.PNF_ORDER.setQty(order, day, mealId, current - 1);
        window.PNF_ORDER.save(order);
        onQtyChanged(day, mealId);
      });
    });
    syncPlusDisabled(day);
  }

  function onQtyChanged(day, mealId) {
    var pkg = window.PNF.getPackage(order.packageId);
    var card = document.querySelector('[data-meal-card][data-meal-id="' + mealId + '"][data-day="' + day + '"]');
    if (card) {
      var qty = (order.items[day] || {})[mealId] || 0;
      card.querySelector("[data-qty-value]").textContent = qty;
      card.classList.toggle("meal-card--selected", qty > 0);
    }
    if (pkg.schedule === "split") {
      var wasTuesdayDone = day === "tuesday" && lastTuesdayDoneState;
      updateSplitProgress();
      updateJumpNavState();
      // The moment Tuesday first reaches its cap, guide the customer
      // straight to Friday instead of leaving them to scroll and wonder
      // what's next.
      if (day === "tuesday") {
        var nowDone = window.PNF_ORDER.selectedForDay(order, "tuesday") >= pkg.tuesdayMeals;
        if (nowDone && !wasTuesdayDone) {
          lastTuesdayDoneState = true;
          setTimeout(function () { scrollToDay("friday"); }, 300);
        } else if (!nowDone) {
          lastTuesdayDoneState = false;
        }
      }
    } else {
      updateSingleProgress();
    }
    updateSidebar();
    syncPlusDisabled(day);
  }

  function updateSplitProgress() {
    var pkg = window.PNF.getPackage(order.packageId);
    var tCount = window.PNF_ORDER.selectedForDay(order, "tuesday");
    var fCount = window.PNF_ORDER.selectedForDay(order, "friday");

    document.getElementById("bb-tuesday-count").textContent = "(" + tCount + " / " + pkg.tuesdayMeals + ")";
    document.getElementById("bb-friday-count").textContent = "(" + fCount + " / " + pkg.fridayMeals + ")";
    document.getElementById("bb-progress-fill-tuesday").style.width = Math.min(100, Math.round((tCount / pkg.tuesdayMeals) * 100)) + "%";
    document.getElementById("bb-progress-fill-friday").style.width = Math.min(100, Math.round((fCount / pkg.fridayMeals) * 100)) + "%";

    var total = tCount + fCount;
    var target = pkg.tuesdayMeals + pkg.fridayMeals;
    var full = total >= target;
    document.getElementById("bb-progress-text-split").textContent =
      total + " / " + target + " meals selected" + (full ? " \u2713" : "");

    document.getElementById("bb-continue-btn").disabled = !window.PNF_ORDER.isComplete(order);
  }

  function updateSidebar() {
    var pkg = window.PNF.getPackage(order.packageId);
    var count = window.PNF_ORDER.totalSelected(order);
    var target = pkg.schedule === "split" ? (pkg.tuesdayMeals + pkg.fridayMeals) : (pkg.variable ? pkg.maxMeals : pkg.meals);

    document.getElementById("bb-sidebar-count").textContent = pkg.variable
      ? count + " selected"
      : count + " / " + target + " selected";
    document.getElementById("bb-sidebar-price").textContent = window.PNF.money(window.PNF_ORDER.orderPrice(order));

    var lines = document.getElementById("bb-sidebar-lines");
    var html = "";
    if (pkg.schedule === "split") {
      html += sidebarDayLines("tuesday", "Tuesday");
      html += sidebarDayLines("friday", "Friday");
    } else {
      html += sidebarDayLines(order.deliveryDay, window.PNF_ORDER.dayLabel(order.deliveryDay));
    }
    lines.innerHTML = html || '<p style="color:var(--ink-muted); font-size:0.88rem;">No meals added yet.</p>';
  }

  function sidebarDayLines(day, label) {
    var bucket = order.items[day] || {};
    var ids = Object.keys(bucket);
    if (!ids.length) return "";
    var rows = ids.map(function (id) {
      var meal = window.PNF.getMeal(id);
      return '<div class="bb-sidebar-line"><span>' + bucket[id] + ' &times; ' + meal.name + '</span></div>';
    }).join("");
    return '<p class="bb-sidebar-day-label">' + label + '</p>' + rows;
  }

  document.getElementById("bb-change-package").addEventListener("click", function () { showStep("package"); });
  document.getElementById("bb-change-package-split").addEventListener("click", function () { showStep("package"); });

  document.getElementById("bb-reset-btn").addEventListener("click", function () {
    window.PNF_ORDER.clear();
    order = null;
    showStep("package");
  });

  document.getElementById("bb-continue-btn").addEventListener("click", function () {
    showStep("details");
    renderDetails();
  });

  // ---------- Step 3: details + WhatsApp ----------
  function renderDetails() {
    var pkg = window.PNF.getPackage(order.packageId);
    var deliverySel = document.getElementById("bb-delivery");
    var nameInput = document.getElementById("bb-name");
    var postcodeInput = document.getElementById("bb-postcode");

    deliverySel.value = order.delivery || "collection";
    nameInput.value = order.name || "";
    postcodeInput.value = order.postcode || "";

    function syncAndRender() {
      order.delivery = deliverySel.value;
      order.name = nameInput.value;
      order.postcode = postcodeInput.value;
      window.PNF_ORDER.save(order);

      var count = window.PNF_ORDER.totalSelected(order);
      var summary = document.getElementById("bb-final-summary");
      var html = "";
      if (pkg.schedule === "split") {
        html += sidebarDayLines("tuesday", "Tuesday");
        html += sidebarDayLines("friday", "Friday");
      } else {
        html += '<p class="bb-sidebar-day-label">' + window.PNF_ORDER.dayLabel(order.deliveryDay) + ' delivery</p>';
        html += sidebarDayLines(order.deliveryDay, window.PNF_ORDER.dayLabel(order.deliveryDay));
      }
      summary.innerHTML =
        '<div class="bb-sidebar-lines">' + html + '</div>' +
        '<div class="bb-sidebar-total"><span>' + count + ' meals</span><strong>' + window.PNF.money(window.PNF_ORDER.orderPrice(order)) + '</strong></div>';
    }

    deliverySel.addEventListener("change", syncAndRender);
    nameInput.addEventListener("input", syncAndRender);
    postcodeInput.addEventListener("input", syncAndRender);
    syncAndRender();

    var payBtn = document.getElementById("bb-pay-btn");
    var payError = document.getElementById("bb-pay-error");
    payBtn.addEventListener("click", function () {
      payError.hidden = true;

      if (!window.PNF_ORDER.isComplete(order)) {
        payError.textContent = "Your meal selection looks incomplete \u2014 please go back and finish choosing your meals first.";
        payError.hidden = false;
        return;
      }
      if (!order.name || !order.postcode) {
        payError.textContent = "Please fill in your name and postcode before paying.";
        payError.hidden = false;
        return;
      }

      payBtn.disabled = true;
      payBtn.textContent = "Redirecting to secure payment\u2026";

      fetch("/api/create-payment-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: order.packageId,
          mealCount: window.PNF_ORDER.totalSelected(order),
          orderSummary: window.PNF_ORDER.whatsappMessage(order),
          name: order.name,
          postcode: order.postcode,
          deliveryMethod: order.delivery
        })
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok || !result.data.url) throw new Error(result.data.error || "Something went wrong starting your payment.");
          // Stash the order so the success page (after Worldpay redirects back)
          // can show what was ordered and offer to confirm it with the
          // kitchen — sessionStorage survives navigating away and back to
          // the same origin within one tab, even via an external domain.
          try { sessionStorage.setItem("pnf_pending_order", JSON.stringify(order)); } catch (e) {}
          try { sessionStorage.setItem("pnf_pending_ref", result.data.transactionReference); } catch (e) {}
          window.location.href = result.data.url;
        })
        .catch(function (err) {
          payError.textContent = err.message || "Something went wrong starting your payment. Please try again.";
          payError.hidden = false;
          payBtn.disabled = false;
          payBtn.textContent = "Pay Now \u2192";
        });
    });
  }

  document.getElementById("bb-back-btn").addEventListener("click", function () {
    showStep("meals");
  });

  // ---------- Boot ----------
  function boot() {
    renderPackageGrid();

    var params = new URLSearchParams(window.location.search);
    var requestedPackage = params.get("box");

    if (order && window.PNF.getPackage(order.packageId)) {
      showStep("meals");
      renderMealsStep();
    } else if (requestedPackage && window.PNF.getPackage(requestedPackage)) {
      order = window.PNF_ORDER.create(requestedPackage);
      window.PNF_ORDER.save(order);
      showStep("meals");
      renderMealsStep();
    } else {
      showStep("package");
    }
  }

  boot();
})(window, document);
