/* ==========================================================================
   Shared meal card markup. One function, used by the menu grid, the
   homepage featured meals, and the Build Your Box selector, so a redesign
   or a data change only ever needs to happen in one place.
   ========================================================================== */

(function (window) {
  "use strict";

  function tagsHTML(meal) {
    if (!meal.tags || !meal.tags.length) return "";
    return '<div class="meal-card__tags">' +
      meal.tags.map(function (t) { return '<span class="meal-card__tag">' + t + '</span>'; }).join("") +
      '</div>';
  }

  function allergensHTML(meal) {
    var text = meal.allergens && meal.allergens.length ? meal.allergens.join(", ") : "None declared";
    return '<div class="meal-card__allergens"><strong>Allergens:</strong> ' + text + '</div>';
  }

  // opts: { showIngredients: bool, qtyControls: bool }
  function render(meal, opts) {
    opts = opts || {};
    var qty = opts.qty || 0;

    var ingredientsHTML = opts.showIngredients
      ? '<div class="meal-card__ingredients"><strong>Ingredients:</strong> ' + meal.ingredients + '</div>'
      : "";

    var fibreStat = (meal.fibre !== null && meal.fibre !== undefined)
      ? '<span class="meal-card__macro">F<sub>i</sub> ' + meal.fibre + 'g</span>' : "";

    var macros =
      '<div class="meal-card__macros">' +
        '<span class="meal-card__kcal">' + meal.kcal + ' kcal</span>' +
        '<span class="meal-card__macro meal-card__macro--protein">P ' + meal.protein + 'g</span>' +
        '<span class="meal-card__macro">C ' + meal.carbs + 'g</span>' +
        '<span class="meal-card__macro">F ' + meal.fat + 'g</span>' +
        fibreStat +
      '</div>';

    var qtyHTML = "";
    if (opts.qtyControls) {
      var dayAttr = opts.day ? ' data-day="' + opts.day + '"' : "";
      qtyHTML =
        '<div class="meal-card__qty" data-qty-wrap data-meal-id="' + meal.id + '"' + dayAttr + '>' +
          '<button type="button" class="qty-btn" data-qty-minus aria-label="Remove one ' + meal.name + '">&minus;</button>' +
          '<span class="qty-value" data-qty-value>' + qty + '</span>' +
          '<button type="button" class="qty-btn" data-qty-plus aria-label="Add one ' + meal.name + '">+</button>' +
        '</div>';
    }

    return (
      '<article class="meal-card' + (qty > 0 ? ' meal-card--selected' : '') + '" data-meal-card data-meal-id="' + meal.id + '"' + (opts.day ? ' data-day="' + opts.day + '"' : '') + '>' +
        '<div class="meal-card__img">' +
          '<img src="' + meal.image + '" alt="' + meal.name + '" loading="lazy" ' +
            'onerror="this.closest(\'.meal-card__img\').classList.add(\'no-image\'); this.remove();">' +
          '<span class="add-photo-hint">Add photo</span>' +
          tagsHTML(meal) +
        '</div>' +
        '<div class="meal-card__body">' +
          '<h3>' + meal.name + '</h3>' +
          '<p>' + meal.desc + '</p>' +
          macros +
          ingredientsHTML +
          allergensHTML(meal) +
          qtyHTML +
        '</div>' +
      '</article>'
    );
  }

  window.PNF_CARD = { render: render };
})(window);
