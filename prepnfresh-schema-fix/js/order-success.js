(function () {
  var params = new URLSearchParams(window.location.search);
  var ref = params.get("ref");

  var checkingEl = document.getElementById("os-checking");
  var paidEl = document.getElementById("os-paid");
  var failedEl = document.getElementById("os-failed");

  var order = null;
  try { order = JSON.parse(sessionStorage.getItem("pnf_pending_order") || "null"); } catch (e) {}

  function showFailed() {
    checkingEl.hidden = true;
    failedEl.hidden = false;
  }

  function showPaid() {
    checkingEl.hidden = true;
    paidEl.hidden = false;

    // Just a plain contact link now — the kitchen is notified automatically
    // by email, so this button is for general questions, not confirming
    // the order itself.
    document.getElementById("os-whatsapp-btn").href = "https://wa.me/" + window.PNF.business.whatsapp;

    // The order is genuinely confirmed now — clear both the in-progress
    // draft and the handoff data so nothing stale lingers or could be
    // resubmitted.
    try { window.PNF_ORDER.clear(); } catch (e) {}
    try { sessionStorage.removeItem("pnf_pending_order"); } catch (e) {}
    try { sessionStorage.removeItem("pnf_pending_ref"); } catch (e) {}
  }

  if (!ref) {
    showFailed();
    return;
  }

  var orderSummary = "";
  try {
    if (order && window.PNF_ORDER.whatsappMessage) orderSummary = window.PNF_ORDER.whatsappMessage(order);
  } catch (e) {}

  fetch("/api/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: ref, orderSummary: orderSummary })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.status === "paid") showPaid();
      else showFailed();
    })
    .catch(function () { showFailed(); });
})();
