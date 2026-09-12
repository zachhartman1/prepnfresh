# Prep 'N' Fresh — website

Static HTML/CSS/vanilla JS. No build step, no framework, no dependencies —
deploys to Vercel as-is. No React/Next.js/Supabase exists yet; this README
also serves as the audit trail for the big Aug 2026 restructure.

## Architecture (single source of truth)

- **`js/data.js`** — the only place meals, packages, and business info live.
  Every page reads from here. Adding a 16th meal or changing a price only
  ever needs to happen in this one file.
- **`js/order-state.js`** — the customer's in-progress box: load/save/clear,
  quantity logic, and the WhatsApp message builder. This is the module to
  swap out when Stripe + Supabase replace WhatsApp — nothing else should
  need to change. Order shape: `{ packageId, items: {mealId: qty}, delivery,
  name, postcode, createdAt }`, deliberately close to a future `orders` row
  (add `id`, `paymentStatus`, `fulfilmentStatus`, `total` when that day comes).
- **`js/meal-card.js`** — one card renderer used by the menu grid, homepage
  featured meals, and Build Your Box, so the card design only lives in one
  place.
- **`js/countdown.js`** — computes the real next Thursday 18:00 Europe/London
  live from the clock (via `Intl.DateTimeFormat`, so BST/GMT is handled
  correctly), not a stored duration. A refresh can't reset or fake it.
- **`js/showcase.js`** — the auto-scrolling meal strip. Native scroll
  container (touch/trackpad swipe work for free) + a slow `requestAnimationFrame`
  auto-advance that pauses on any interaction and is skipped entirely under
  `prefers-reduced-motion`.
- **`js/build-box.js`** — controller for `build-a-box.html`: package choice →
  meal quantities → details → WhatsApp handoff.
- **`js/sticky-bar.js`** — injects the mobile sticky order bar into every
  page (no HTML duplication), reading live state from `order-state.js`.
- **`js/menu-render.js`** / **`js/home.js`** — page-specific rendering only;
  no data lives in these files.

## What's implemented

- Build Your Box: package selection → quantity-based meal picker → progress
  bar → sticky sidebar (desktop) → details form → generated WhatsApp message,
  all persisted to `localStorage` so a refresh doesn't lose the order, with a
  Reset button.
- Real Thursday-6pm countdown, DST-aware, shown as a bar on every page.
- Auto-scrolling meal showcase on the homepage, draggable, swipeable, pauses
  on interaction, reduced-motion aware.
- Sticky mobile order bar site-wide, showing live box progress once one is
  started.
- Goal-based filter chips on the menu page (High protein ≥45g, Lower calorie
  ≤550kcal, Vegetarian/Vegan) — all threshold-derived from real macro data,
  no invented "popular"/fat-loss claims.
- Simplified nav: Menu / Build a Box / How It Works / About + Order Now.
- Homepage restructured around the SEE → WANT → TRUST → CHOOSE → ORDER
  journey.
- Visual style dialled back from pill-everything/gradient-hover toward
  restrained borders, moderate radius, and a single sans typeface.

## Deferred (per the "don't invent content" rule)

Nothing fake was added. These sections were requested but need real assets
you don't have yet, so they're intentionally **not built**:

- **Customer reviews carousel** — no genuine testimonials exist yet. Build
  a `reviews.js` data file in the same pattern as `data.js` when you have
  real ones, and I'll wire up the carousel.
- **Kitchen/food gallery** — no real kitchen/prep photography exists yet
  (only the placeholder-photo system on dish cards). Same offer once you
  have images.
- **Postcode delivery checker** — the delivery-area data isn't structured
  precisely enough (no real postcode boundary list) to validate an address
  honestly, so the page states delivery areas in prose instead of pretending
  to check eligibility.

## Not yet done (next phase, flagged so nothing's assumed finished)

- Structured data (schema.org LocalBusiness/Menu), sitemap.xml, robots.txt.
- A full accessibility pass (focus-visible states, ARIA on the quantity
  steppers, live-region announcements for progress changes).
- Real image optimisation (responsive `srcset`, modern formats) — currently
  every dish photo slot is a plain `<img>` with graceful fallback; fine
  until real photography goes in, worth revisiting once it does.

## Before you go live — replace these placeholders

1. **WhatsApp number** — `447000000000` everywhere. Find-and-replace across
   every `.html` and `js/data.js` (`BUSINESS.whatsapp`).
2. **Dish photos** — drop images into `assets/img/dishes/` named to match
   each meal's `id` in `js/data.js` (e.g. `katsu-chicken.jpg`). They'll
   appear automatically in the showcase, menu grid, homepage, and Build
   Your Box — no code changes needed.
3. **Logo** — `assets/img/logo.jpg`, already wired in.
4. **About page story / FAQ answers** — written in brand voice, not sourced
   from a real subpage I never had access to. Review for accuracy.

## Deploying to your own Vercel account

1. Create a new **empty** GitHub repository under your own account.
2. Push this folder to it:
   ```bash
   cd prep-n-fresh-site
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/prep-n-fresh.git
   git push -u origin main
   ```
3. Go to [vercel.com/new](https://vercel.com/new), sign in with your own
   account, and import that repo. Framework preset: **Other** — no build
   command needed, it's static.
4. Deploy, then add your real domain under Settings → Domains.
