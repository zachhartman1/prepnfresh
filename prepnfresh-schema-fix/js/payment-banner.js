(function () {
  var params = new URLSearchParams(window.location.search);
  var outcome = params.get("payment");
  if (!outcome) return;

  var messages = {
    failed: "Your payment didn't go through. Please try again, or use WhatsApp below instead.",
    cancelled: "Payment was cancelled. Your meal selection is still saved \u2014 you can pay whenever you're ready.",
    error: "Something went wrong while processing payment. Please try again, or use WhatsApp below instead."
  };

  var banner = document.getElementById("bb-payment-banner");
  if (banner && messages[outcome]) {
    banner.textContent = messages[outcome];
    banner.hidden = false;
  }

  // Remove the query param from the URL so refreshing the page doesn't
  // keep re-showing this banner indefinitely.
  var cleanUrl = window.location.pathname;
  window.history.replaceState({}, "", cleanUrl);
})();
