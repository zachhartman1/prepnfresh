(function (window, document) {
  "use strict";

  var GOAL_FILTERS = {
    all: function () { return true; },
    "high-protein": function (m) { return m.protein >= 45; },
    "lower-calorie": function (m) { return m.kcal <= 550; },
    vegetarian: function (m) { return m.vegetarian || m.vegan; }
  };

  function renderGrid(filterKey) {
    var el = document.getElementById("menu-grid");
    var filterFn = GOAL_FILTERS[filterKey] || GOAL_FILTERS.all;
    var meals = window.PNF.meals.filter(filterFn);
    if (!meals.length) {
      el.innerHTML = '<p style="color:var(--ink-muted);">No dishes currently match this filter.</p>';
      return;
    }
    el.innerHTML = meals.map(function (meal) {
      return window.PNF_CARD.render(meal, { showIngredients: true });
    }).join("");
  }

  function initChips() {
    var chips = document.querySelectorAll(".goal-chip");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        renderGrid(chip.getAttribute("data-goal"));
      });
    });
  }

  var MATRIX_ALLERGENS = ["Wheat (gluten)", "Soya", "Sesame", "Milk", "Fish", "Peanuts"];

  function renderMatrix() {
    var tbody = document.getElementById("matrix-body");
    if (!tbody) return;
    tbody.innerHTML = window.PNF.meals.map(function (meal) {
      var cells = MATRIX_ALLERGENS.map(function (a) {
        return '<td>' + (meal.allergens.indexOf(a) !== -1 ? "&#10003;" : "") + '</td>';
      }).join("");
      return '<tr><td>' + meal.name + '</td>' + cells + '</tr>';
    }).join("");
  }

  initChips();
  renderGrid("all");
  renderMatrix();
})(window, document);
