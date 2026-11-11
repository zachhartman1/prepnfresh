// Vercel Serverless Function — the ONLY place that touches the Worldpay
// secret API key, which lives in a Vercel environment variable
// (WORLDPAY_USERNAME + WORLDPAY_PASSWORD), never in the repo. This computes
// the authoritative
// price server-side (never trusts whatever the browser claims a package
// costs) and asks Worldpay to create a Hosted Payment Page, returning the
// URL to redirect the customer to. The customer's card details are only
// ever entered on Worldpay's own page — this function never sees them.

// Kept in sync with js/data.js. Duplicated here deliberately — this file
// runs in Node on the server, not the browser, so it can't just import the
// client-side data module. If you add/change a package, update both.
const PACKAGES = {
  "try-it": { name: "Try a Few", variable: true, perMealPrice: 5.49, minMeals: 1, maxMeals: 4 },
  "taster-4": { name: "Taster Box (4 meals)", price: 20 },
  "taster-8": { name: "Taster Box (8 meals)", price: 37.99 },
  "weekly": { name: "Weekly Plan (6 Tue / 8 Fri)", price: 65 },
  "monthly": { name: "Monthly Plan (6 Tue / 8 Fri, 4 weeks)", price: 250 }
};

// WORLDPAY_MODE controls both which Worldpay environment we call and
// (implicitly) which credentials are expected in WORLDPAY_USERNAME /
// WORLDPAY_PASSWORD — set all three consistently.
// consistently in Vercel's environment variables. Defaults to "test" so a
// missing/misconfigured env var can never accidentally take a real payment.
const MODE = process.env.WORLDPAY_MODE === "live" ? "live" : "test";
const BASE_URL = MODE === "live" ? "https://access.worldpay.com" : "https://try.access.worldpay.com";

// Your Worldpay entity reference, shown in the dashboard under
// Developer Tools -> Overview ("Entity"). Not a secret — safe here.
const MERCHANT_ENTITY = "PO4099643762";

function truncate(s, n) {
  return typeof s === "string" ? s.slice(0, n) : "";
}

function makeTransactionReference() {
  return "PNF-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const username = process.env.WORLDPAY_USERNAME;
    const password = process.env.WORLDPAY_PASSWORD;
    if (!username || !password) {
      console.error("WORLDPAY_USERNAME or WORLDPAY_PASSWORD is not set");
      res.status(500).json({ error: "Card payment isn't available right now. Please try again later or contact us." });
      return;
    }

    const { packageId, mealCount, orderSummary, name, phone, postcode, deliveryMethod } = req.body || {};

    const pkg = PACKAGES[packageId];
    if (!pkg) {
      res.status(400).json({ error: "Unknown package selected." });
      return;
    }
    const phoneDigits = typeof phone === "string" ? phone.replace(/[^\d]/g, "") : "";
    if (!name || !postcode || phoneDigits.length < 10) {
      res.status(400).json({ error: "Name, mobile number and postcode are required." });
      return;
    }

    // Fixed-price packages always charge their set price regardless of
    // anything the client sends. The variable "Try a Few" package has no
    // fixed price, so its actual charge depends on how many meals were
    // picked — the count itself comes from the client (there's no way to
    // know it otherwise) but is validated against the package's own
    // min/max here before it's ever used to calculate money.
    let price = pkg.price;
    let packageLabel = pkg.name;
    if (pkg.variable) {
      const count = Number(mealCount);
      if (!Number.isInteger(count) || count < pkg.minMeals || count > pkg.maxMeals) {
        res.status(400).json({ error: "Invalid meal count for this package." });
        return;
      }
      price = count * pkg.perMealPrice;
      packageLabel = pkg.name + " (" + count + " meal" + (count === 1 ? "" : "s") + ")";
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const transactionReference = makeTransactionReference();

    // Basic Auth per Worldpay's dashboard: a genuine username + password
    // pair (confirmed directly from Developer Tools -> API Credentials),
    // not a single API key as originally assumed.
    const authHeader = "Basic " + Buffer.from(username + ":" + password).toString("base64");

    const body = {
      transactionReference,
      merchant: { entity: MERCHANT_ENTITY },
      narrative: { line1: truncate("Prep N Fresh", 24) },
      value: {
        currency: "GBP",
        amount: Math.round(price * 100) // minor units (pence)
      },
      description: truncate(
        name + " " + phoneDigits + " (" + postcode + ") - " + packageLabel + " - " + (deliveryMethod === "delivery" ? "Delivery" : "Collection"),
        128
      ),
      resultURLs: {
        successURL: `${origin}/order-success.html?ref=${encodeURIComponent(transactionReference)}`,
        failureURL: `${origin}/build-a-box.html?payment=failed`,
        cancelURL: `${origin}/build-a-box.html?payment=cancelled`,
        errorURL: `${origin}/build-a-box.html?payment=error`
      },
      hostedProperties: {
        sendURLParameters: "true"
      },
      settlement: { auto: true }
    };

    const wpRes = await fetch(`${BASE_URL}/payment_pages`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/vnd.worldpay.payment_pages-v1.hal+json",
        "Accept": "application/vnd.worldpay.payment_pages-v1.hal+json"
      },
      body: JSON.stringify(body)
    });

    const wpData = await wpRes.json().catch(() => ({}));

    if (!wpRes.ok || !wpData.url) {
      console.error("Worldpay create payment page failed:", wpRes.status, wpData);
      res.status(502).json({ error: "Could not start checkout. Please try again or order via WhatsApp." });
      return;
    }

    res.status(200).json({
      url: wpData.url,
      transactionReference
    });
  } catch (err) {
    console.error("create-payment-page error:", err);
    res.status(500).json({ error: "Could not start checkout. Please try again or order via WhatsApp." });
  }
};
