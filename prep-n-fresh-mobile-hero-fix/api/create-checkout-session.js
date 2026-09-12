// Vercel Serverless Function — runs on the server, never in the browser.
// This is the ONLY place that touches the Stripe secret key, which lives
// in a Vercel environment variable (STRIPE_SECRET_KEY), never in the repo.
const Stripe = require("stripe");

// Kept in sync with js/data.js. Duplicated here deliberately — this file
// runs in Node on the server, not the browser, so it can't just import the
// client-side data module. If you add/change a package, update both.
const PACKAGES = {
  "taster-4": { name: "Taster Box (4 meals)", price: 20 },
  "taster-8": { name: "Taster Box (8 meals)", price: 37.99 },
  "weekly": { name: "Weekly Plan (6 Tue / 8 Fri)", price: 65 },
  "monthly": { name: "Monthly Plan (6 Tue / 8 Fri, 4 weeks)", price: 250 }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { packageId, orderSummary, deliveryMethod, name, postcode } = req.body || {};

    const pkg = PACKAGES[packageId];
    if (!pkg) {
      res.status(400).json({ error: "Unknown package" });
      return;
    }

    // Stripe metadata values are capped at 500 characters each — truncate
    // defensively so a long meal list never causes the API call to fail.
    const truncate = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: pkg.name },
            unit_amount: Math.round(pkg.price * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        packageId: packageId,
        orderSummary: truncate(orderSummary, 490),
        deliveryMethod: truncate(deliveryMethod, 50),
        customerName: truncate(name, 100),
        postcode: truncate(postcode, 20)
      },
      success_url: `${origin}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/build-a-box.html`
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    res.status(500).json({ error: "Could not start checkout. Please try again or order via WhatsApp." });
  }
};
