// Vercel Serverless Function — confirms a payment's real status directly
// with Worldpay. This exists because the success page the customer lands
// on is reached via their own browser being redirected there, which is
// never trustworthy on its own (a customer could, in principle, navigate
// straight to the success URL without ever paying). This function is the
// one place that actually asks Worldpay "did this transaction really get
// paid?" before anything is treated as a confirmed order.

const MODE = process.env.WORLDPAY_MODE === "live" ? "live" : "test";
const BASE_URL = MODE === "live" ? "https://access.worldpay.com" : "https://try.access.worldpay.com";
const MERCHANT_ENTITY = "PO4099643762";

// Where order notification emails go. Not a secret — safe to hardcode.
const ORDER_NOTIFICATION_EMAIL = "prepnfreshuk@gmail.com";

// lastEvent values that count as a genuinely completed payment. Worldpay's
// docs use slightly different casings/wordings across API versions, so we
// match loosely (case-insensitive substring) rather than one exact string.
const SUCCESS_PATTERNS = ["authorized", "sentforsettlement", "settlementrequestsubmitted", "settled"];
const FAILURE_PATTERNS = ["refused", "cancel", "failed", "timedout"];

function classify(lastEvent) {
  const normalized = (lastEvent || "").toLowerCase().replace(/[^a-z]/g, "");
  if (SUCCESS_PATTERNS.some((p) => normalized.includes(p))) return "paid";
  if (FAILURE_PATTERNS.some((p) => normalized.includes(p))) return "failed";
  return "unknown";
}

// Sends the order details to the business's inbox via Resend. Failure here
// must never break the customer's "payment confirmed" experience — the
// caller wraps this in try/catch and ignores the outcome either way.
// orderSummary is only present on the first successful check (the client
// clears its local copy immediately after), so a page refresh naturally
// can't trigger a second email for the same order.
async function sendOrderEmail(ref, orderSummary) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !orderSummary) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Prep N Fresh Orders <onboarding@resend.dev>",
      to: [ORDER_NOTIFICATION_EMAIL],
      subject: "New order \u2014 " + ref,
      text: orderSummary
    })
  });
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const username = process.env.WORLDPAY_USERNAME;
    const password = process.env.WORLDPAY_PASSWORD;
    if (!username || !password) {
      console.error("WORLDPAY_USERNAME or WORLDPAY_PASSWORD is not set");
      res.status(500).json({ error: "Could not verify payment." });
      return;
    }

    const ref = (req.method === "GET" ? req.query.ref : (req.body || {}).ref) || "";
    const orderSummary = (req.method === "POST" && (req.body || {}).orderSummary) || "";
    if (!ref) {
      res.status(400).json({ error: "Missing payment reference." });
      return;
    }

    const authHeader = "Basic " + Buffer.from(username + ":" + password).toString("base64");
    const url = `${BASE_URL}/paymentQueries/payments?transactionReference=${encodeURIComponent(ref)}&entity=${encodeURIComponent(MERCHANT_ENTITY)}`;

    const wpRes = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/vnd.worldpay.payment-queries-v1.hal+json"
      }
    });

    const wpData = await wpRes.json().catch(() => ({}));

    if (!wpRes.ok) {
      console.error("Worldpay payment query failed:", wpRes.status, wpData);
      res.status(200).json({ status: "unknown" });
      return;
    }

    // Handle both a direct object and an _embedded.payments[] list shape,
    // since Worldpay's query APIs use slightly different envelopes across
    // endpoints/versions.
    const record =
      (wpData._embedded && wpData._embedded.payments && wpData._embedded.payments[0]) ||
      wpData;

    const status = classify(record.lastEvent);

    if (status === "paid") {
      try { await sendOrderEmail(ref, orderSummary); } catch (emailErr) { console.error("sendOrderEmail failed:", emailErr); }
    }

    res.status(200).json({ status: status, lastEvent: record.lastEvent || null });
  } catch (err) {
    console.error("verify-payment error:", err);
    res.status(200).json({ status: "unknown" });
  }
};
