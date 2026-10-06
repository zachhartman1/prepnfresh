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
// Sender address. Until prepnfresh.co.uk is verified in Resend, only
// Resend's shared test address works — and it can only deliver to the
// Resend account owner's own inbox, so customer emails will be rejected
// (harmlessly) until RESEND_FROM_ADDRESS is set in Vercel to an address on
// the verified domain, e.g.  Prep N Fresh <orders@prepnfresh.co.uk>
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Prep N Fresh Orders <onboarding@resend.dev>";

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(Object.assign({ from: FROM_ADDRESS }, payload))
  });
  if (!r.ok) console.error("Resend rejected email:", r.status, await r.text().catch(() => ""));
}

async function sendOrderEmail(ref, orderSummary) {
  if (!orderSummary) return;
  await sendEmail({
    to: [ORDER_NOTIFICATION_EMAIL],
    subject: "New order \u2014 " + ref,
    text: orderSummary
  });
}

// Confirmation to the customer. Replies go to the business inbox. The two
// emails are sent independently so a problem with one never blocks the other.
async function sendCustomerEmail(ref, customerEmail, customerSummary) {
  const valid = typeof customerEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  if (!valid || !customerSummary) return;
  await sendEmail({
    to: [customerEmail.trim()],
    reply_to: ORDER_NOTIFICATION_EMAIL,
    subject: "Your Prep N Fresh order is confirmed \u2014 " + ref,
    text: String(customerSummary).slice(0, 5000)
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
    const customerEmail = (req.method === "POST" && (req.body || {}).customerEmail) || "";
    const customerSummary = (req.method === "POST" && (req.body || {}).customerSummary) || "";
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
      try { await sendCustomerEmail(ref, customerEmail, customerSummary); } catch (emailErr) { console.error("sendCustomerEmail failed:", emailErr); }
    }

    res.status(200).json({ status: status, lastEvent: record.lastEvent || null });
  } catch (err) {
    console.error("verify-payment error:", err);
    res.status(200).json({ status: "unknown" });
  }
};
