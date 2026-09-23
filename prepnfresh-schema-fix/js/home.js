(function (window, document) {
  "use strict";

  function renderFeatured() {
    var el = document.getElementById("home-featured-meals");
    if (!el) return;
    // Curated for variety (high protein / omega-3 / vegetarian / high fibre) —
    // no fabricated "popular" label since we have no real ordering-frequency data.
    var featuredIds = ["tuscan-chicken", "salmon-lemon-parsley-new-potatoes", "halloumi-roasted-vegetable-couscous", "mixed-bean-chilli"];
    el.innerHTML = featuredIds.map(function (id) {
      return window.PNF_CARD.render(window.PNF.getMeal(id), {});
    }).join("");
  }

  function scheduleLineFor(pkg) {
    return pkg.schedule === "split"
      ? pkg.tuesdayMeals + " Tue &middot; " + pkg.fridayMeals + " Fri" + (pkg.weeks ? " &middot; " + pkg.weeks + " weeks" : "")
      : "1 delivery day of your choice";
  }

  function priceTagHtml(pkg) {
    if (pkg.variable) {
      return '<div class="price-tag"><strong>' + window.PNF.money(pkg.perMealPrice) + '</strong> <span>per meal</span></div>' +
        '<div class="price-per">From ' + window.PNF.money(pkg.perMealPrice * pkg.minMeals) + ' &middot; ' + scheduleLineFor(pkg) + '</div>';
    }
    return '<div class="price-tag"><strong>' + window.PNF.money(pkg.price) + '</strong> <span>/ ' + pkg.meals + ' meals' + (pkg.weeks ? ' a week' : '') + '</span></div>' +
      '<div class="price-per">' + window.PNF.money(pkg.perMeal) + ' per meal &middot; ' + scheduleLineFor(pkg) + '</div>';
  }

  function renderPackageTeaser() {
    var el = document.getElementById("home-package-teaser");
    if (!el) return;
    el.innerHTML = window.PNF.packages.map(function (pkg) {
      return (
        '<div class="price-card' + (pkg.popular ? ' popular' : '') + '">' +
          (pkg.popular ? '<span class="price-badge">Most popular</span>' : '') +
          '<h3>' + pkg.name + '</h3>' +
          '<p style="color:var(--ink-muted); font-size:0.92rem; margin-bottom:0;">' + pkg.tagline + '</p>' +
          priceTagHtml(pkg) +
          '<a class="btn ' + (pkg.popular ? "btn-primary" : "btn-outline") + '" href="build-a-box.html?box=' + pkg.id + '" style="width:100%; justify-content:center; margin-top:6px;">Build Your Box &rarr;</a>' +
        '</div>'
      );
    }).join("");
  }

  function renderPricing() {
    var el = document.getElementById("home-pricing");
    if (!el) return;
    el.innerHTML = window.PNF.packages.map(function (pkg) {
      return (
        '<div class="price-card' + (pkg.popular ? ' popular' : '') + '">' +
          (pkg.popular ? '<span class="price-badge">Most popular</span>' : '') +
          '<h3>' + pkg.name + '</h3>' +
          '<p style="color:var(--ink-muted); font-size:0.92rem; margin-bottom:0;">' + pkg.tagline + '</p>' +
          priceTagHtml(pkg) +
          '<ul>' + pkg.features.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
          '<a class="btn ' + (pkg.popular ? "btn-primary" : "btn-outline") + '" href="build-a-box.html?box=' + pkg.id + '" style="width:100%; justify-content:center;">Build Your Box &rarr;</a>' +
        '</div>'
      );
    }).join("");
  }

  renderFeatured();
  renderPackageTeaser();
  renderPricing();
})(window, document);
