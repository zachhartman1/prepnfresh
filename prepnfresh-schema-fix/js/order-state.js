/* ==========================================================================
   Order state — the ONLY place that reads/writes the customer's in-progress
   box. Keeps order data, pricing, and the WhatsApp handoff cleanly separate
   from menu data and from rendering, so this module (not the UI) is what
   gets replaced when WorldPay (or another gateway) comes in later.

   Order object shape (mirrors a future orders table):
   {
     packageId,
     items: { tuesday: { mealId: qty }, friday: { mealId: qty } },
     deliveryDay: 'tuesday'|'friday',   // only meaningful for schedule:'single' (Taster) packages
     delivery: 'collection'|'delivery',
     name, postcode, createdAt
   }

   For schedule:'single' packages (Taster), all items live under whichever
   day the customer picked as deliveryDay — the other day stays empty.
   For schedule:'split' packages (Weekly / Monthly), both tuesday and friday
   buckets are used at once, each capped to its own package.tuesdayMeals /
   package.fridayMeals.
   ========================================================================== */

(function (window) {
  "use strict";

  var STORAGE_KEY = "pnf_order_v2";

  function loadOrder() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var order = raw ? JSON.parse(raw) : null;
      if (order && (!order.items || !order.items.tuesday || !order.items.friday)) return null; // stale v1 shape
      return order;
    } catch (e) { return null; }
  }

  function saveOrder(order) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch (e) { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent("pnf:order-changed", { detail: order }));
  }

  function clearOrder() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    document.dispatchEvent(new CustomEvent("pnf:order-changed", { detail: null }));
  }

  function newOrder(packageId) {
    return {
      packageId: packageId,
      items: { tuesday: {}, friday: {} },
      deliveryDay: "tuesday",
      delivery: "collection",
      name: "",
      postcode: "",
      createdAt: Date.now()
    };
  }

  // Cap for a given day under the current package: for split packages each
  // day has its own fixed count; for single (Taster) packages, only the
  // chosen deliveryDay has a cap (package.meals) and the other day is 0.
  function capForDay(order, day) {
    var pkg = window.PNF.getPackage(order.packageId);
    if (!pkg) return 0;
    if (pkg.schedule === "split") {
      return day === "tuesday" ? pkg.tuesdayMeals : pkg.fridayMeals;
    }
    // single-schedule: only the active day has any capacity
    var cap = pkg.variable ? pkg.maxMeals : pkg.meals;
    return day === order.deliveryDay ? cap : 0;
  }

  function selectedForDay(order, day) {
    var bucket = order.items[day] || {};
    var total = 0;
    for (var id in bucket) if (bucket.hasOwnProperty(id)) total += bucket[id];
    return total;
  }

  function totalSelected(order) {
    if (!order) return 0;
    return selectedForDay(order, "tuesday") + selectedForDay(order, "friday");
  }

  function setQty(order, day, mealId, qty) {
    var cap = capForDay(order, day);
    var bucket = order.items[day] || (order.items[day] = {});
    var current = selectedForDay(order, day) - (bucket[mealId] || 0);
    qty = Math.max(0, qty);
    if (current + qty > cap) qty = cap - current;
    if (qty <= 0) { delete bucket[mealId]; }
    else { bucket[mealId] = qty; }
    return order;
  }

  // Switching the Taster box's delivery day moves the customer's picks
  // across so they don't lose their selections by toggling back and forth.
  function setDeliveryDay(order, day) {
    if (order.deliveryDay === day) return order;
    var pkg = window.PNF.getPackage(order.packageId);
    if (pkg && pkg.schedule === "single") {
      order.items[day] = order.items[order.deliveryDay] || {};
      order.items[order.deliveryDay] = {};
    }
    order.deliveryDay = day;
    return order;
  }

  function isComplete(order) {
    var pkg = window.PNF.getPackage(order.packageId);
    if (!pkg) return false;
    if (pkg.schedule === "split") {
      return selectedForDay(order, "tuesday") === pkg.tuesdayMeals && selectedForDay(order, "friday") === pkg.fridayMeals;
    }
    if (pkg.variable) {
      return selectedForDay(order, order.deliveryDay) >= pkg.minMeals;
    }
    return selectedForDay(order, order.deliveryDay) === pkg.meals;
  }

  // Actual price for this order: fixed packages have one set price; the
  // variable "Try a Few" package is priced per meal, so the price depends
  // on how many the customer actually chose.
  function orderPrice(order) {
    var pkg = window.PNF.getPackage(order.packageId);
    if (!pkg) return 0;
    if (pkg.variable) return totalSelected(order) * pkg.perMealPrice;
    return pkg.price;
  }

  function dayLines(order, day) {
    var bucket = order.items[day] || {};
    return Object.keys(bucket).map(function (id) {
      var meal = window.PNF.getMeal(id);
      return meal ? { qty: bucket[id], meal: meal } : null;
    }).filter(Boolean);
  }

  function dayLabel(day) {
    var found = window.PNF.deliveryDays.filter(function (d) { return d.id === day; })[0];
    return found ? found.label : day;
  }

  function whatsappMessage(order) {
    var pkg = window.PNF.getPackage(order.packageId);
    var lines = [];
    lines.push("Hi Prep 'N' Fresh \uD83D\uDC4B");
    lines.push("");
    var mealCount = pkg.variable ? totalSelected(order) : pkg.meals;
    lines.push("I'd like to order the " + pkg.name + " (" + mealCount + " meals" + (pkg.weeks ? " a week for " + pkg.weeks + " weeks" : "") + ").");
    lines.push("");

    if (pkg.schedule === "split") {
      lines.push(dayLabel("tuesday") + " (" + pkg.tuesdayMeals + " meals):");
      dayLines(order, "tuesday").forEach(function (l) { lines.push(l.qty + " x " + l.meal.name); });
      lines.push("");
      lines.push(dayLabel("friday") + " (" + pkg.fridayMeals + " meals):");
      dayLines(order, "friday").forEach(function (l) { lines.push(l.qty + " x " + l.meal.name); });
      if (pkg.weeks) {
        lines.push("");
        lines.push("(Same line-up repeating each of the " + pkg.weeks + " weeks, unless I let you know otherwise.)");
      }
    } else {
      lines.push("Delivery day: " + dayLabel(order.deliveryDay));
      lines.push("");
      lines.push("My meals:");
      dayLines(order, order.deliveryDay).forEach(function (l) { lines.push(l.qty + " x " + l.meal.name); });
    }

    lines.push("");
    lines.push("Total: " + totalSelected(order) + " meals");
    lines.push("Price: " + window.PNF.money(orderPrice(order)));
    lines.push("");
    lines.push("Collection / Delivery: " + (order.delivery === "delivery" ? "Local delivery" : "Collection from Westcliff"));
    lines.push("");
    lines.push("Name: " + (order.name || ""));
    lines.push("Postcode: " + (order.postcode || ""));
    return lines.join("\n");
  }

  function whatsappLink(order) {
    var business = window.PNF.business;
    return "https://wa.me/" + business.whatsapp + "?text=" + encodeURIComponent(whatsappMessage(order));
  }

  // Card payment confirms the money — it says nothing to the kitchen about
  // which meals to actually prepare. With no database or email service in
  // this build, WhatsApp remains the one reliable channel for that, so a
  // paid order still gets a one-tap confirmation message, just worded to
  // reflect that payment is already done rather than being requested.
  function paidWhatsappMessage(order) {
    var msg = whatsappMessage(order);
    return msg.replace(
      "Hi Prep 'N' Fresh \uD83D\uDC4B\n\nI'd like to order the",
      "Hi Prep 'N' Fresh \uD83D\uDC4B\n\nI've just paid by card for the"
    );
  }

  function paidWhatsappLink(order) {
    var business = window.PNF.business;
    return "https://wa.me/" + business.whatsapp + "?text=" + encodeURIComponent(paidWhatsappMessage(order));
  }

  window.PNF_ORDER = {
    load: loadOrder,
    save: saveOrder,
    clear: clearOrder,
    create: newOrder,
    capForDay: capForDay,
    selectedForDay: selectedForDay,
    totalSelected: totalSelected,
    setQty: setQty,
    setDeliveryDay: setDeliveryDay,
    isComplete: isComplete,
    orderPrice: orderPrice,
    dayLabel: dayLabel,
    whatsappMessage: whatsappMessage,
    whatsappLink: whatsappLink,
    paidWhatsappMessage: paidWhatsappMessage,
    paidWhatsappLink: paidWhatsappLink
  };
})(window);
