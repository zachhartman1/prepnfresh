/* ==========================================================================
   Prep 'N' Fresh — single source of truth
   Meals, packages and business info live here. Every page/component reads
   from this file rather than hardcoding values, so menu, homepage, Build
   Your Box and the WhatsApp handoff never drift out of sync.

   When wiring up Stripe + Supabase later: this file maps directly onto a
   `meals` table and a `packages` table — ids below are stable keys to use
   as foreign keys once that migration happens.
   ========================================================================== */

(function (window) {
  "use strict";

  var MEALS = [
    { id: "katsu-chicken", name: "Katsu Chicken", kcal: 550, protein: 48, carbs: 77, fat: 10, fibre: 7,
      desc: "Chicken breast in a mild curry sauce with basmati rice and broccoli.",
      ingredients: "Basmati rice, chicken breast, broccoli, carrot, onion, water, plain flour (wheat), honey, curry powder (coriander seed, turmeric, ginger, cumin seed, salt, cayenne pepper, dried garlic, pimento, black pepper, fenugreek), olive oil, fresh ginger, garlic, salt, black pepper.",
      allergens: ["Wheat (gluten)"] },
    { id: "orange-chicken", name: "Orange Chicken", kcal: 590, protein: 48, carbs: 72, fat: 12, fibre: 7,
      desc: "Pan-seared chicken breast in a sticky orange and ginger sauce, with basmati rice and broccoli.",
      ingredients: "Chicken breast, cooked basmati rice, broccoli, orange juice, red pepper, carrot, orange, honey, soy sauce (soya, wheat) (water, soybeans, wheat, salt), fresh ginger, olive oil, cornflour, garlic, rice vinegar, chilli flakes, salt, black pepper.",
      allergens: ["Soya", "Wheat (gluten)"] },
    { id: "korean-bbq-beef-rice-bowl", name: "Korean BBQ Beef Rice Bowl", kcal: 570, protein: 38, carbs: 62, fat: 18, fibre: 7,
      desc: "Lean beef mince in a sweet-savoury soy glaze, jasmine rice, broccoli and carrot.",
      ingredients: "Jasmine rice, lean beef mince (5% fat), broccoli, carrot, red pepper, spring onion, soy sauce (soya, wheat) (water, soybeans, wheat, salt), honey, sesame oil, sesame seeds (sesame), garlic, ginger, lime juice, chilli flakes, black pepper.",
      allergens: ["Soya", "Wheat (gluten)", "Sesame"] },
    { id: "tuscan-chicken", name: "Tuscan Chicken with Baby Potatoes", kcal: 570, protein: 58, carbs: 45, fat: 20, fibre: 7,
      desc: "Chicken breast with baby potatoes, cherry tomatoes and spinach in a creamy parmesan sauce.",
      ingredients: "Chicken breast, baby potatoes, cherry tomatoes, spinach, onion, semi-skimmed milk (milk), parmesan (milk), olive oil, garlic, dried oregano, dried basil, black pepper, salt.",
      allergens: ["Milk"] },
    { id: "mixed-bean-chilli", name: "Mixed Bean Chilli", kcal: 520, protein: 20, carbs: 88, fat: 9, fibre: 20,
      desc: "Five-bean chilli with basmati rice, sweetcorn and smoked paprika.",
      ingredients: "Mixed beans (haricot beans, pinto beans, borlotti beans, cannellini beans, kidney beans), basmati rice, chopped tomatoes, red onion, red pepper, sweetcorn, garlic, tomato purée, olive oil, smoked paprika, ground cumin, chilli powder, dried oregano, salt, black pepper.",
      allergens: [], vegetarian: true, vegan: true },
    { id: "jerk-chicken-sweet-potato-mash", name: "Jerk Chicken with Sweet Potato Mash & Sweetcorn", kcal: 550, protein: 48, carbs: 64, fat: 12, fibre: 7,
      desc: "Jerk-spiced chicken breast with sweet potato mash and sweetcorn.",
      ingredients: "Chicken breast, sweet potato, sweetcorn, olive oil, lime juice, honey, garlic, dried thyme, smoked paprika, ground ginger, cinnamon, cayenne pepper, black pepper, salt, water.",
      allergens: [] },
    { id: "thai-style-salmon-basa-curry", name: "Thai-Style Salmon & Basa Curry", kcal: 560, protein: 40, carbs: 48, fat: 22, fibre: 5,
      desc: "Salmon and basa in a light coconut curry with basmati rice, red pepper and broccoli.",
      ingredients: "Basmati rice, salmon (fish), basa (fish), light coconut milk, red pepper, broccoli, onion, olive oil, soy sauce (soya, wheat) (water, soybeans, salt, wheat), garlic, ginger, fresh coriander, chilli powder, ground coriander, ground cumin, turmeric, black pepper.",
      allergens: ["Fish", "Soya", "Wheat (gluten)"] },
    { id: "beef-meatball-arrabbiata-fusilli", name: "Beef Meatball Arrabbiata with Fusilli", kcal: 570, protein: 39, carbs: 67, fat: 16, fibre: 9,
      desc: "Lean beef meatballs in a spiced tomato arrabbiata with fusilli.",
      ingredients: "Fusilli pasta (wheat), lean beef mince, chopped tomatoes, onion, red pepper, olive oil, tomato purée, garlic, dried oregano, dried basil, dried chilli flakes, salt, black pepper.",
      allergens: ["Wheat (gluten)"] },
    { id: "beef-enchilada-sweet-potato-corn", name: "Beef Enchilada with Sweet Potato & Corn", kcal: 570, protein: 39, carbs: 62, fat: 18, fibre: 8,
      desc: "Beef mince, sweet potato and cheddar wrapped enchilada-style, with tomato and sweetcorn.",
      ingredients: "Beef mince, sweet potato, flour tortilla (wheat), water, vegetable oil, salt, chopped tomatoes, sweetcorn, red onion, red pepper, reduced fat cheddar cheese (milk), olive oil, garlic, cumin, smoked paprika, chilli powder, oregano, salt, black pepper.",
      allergens: ["Wheat (gluten)", "Milk"] },
    { id: "satay-chicken-rice-vegetables", name: "Satay Chicken with Rice & Vegetables", kcal: 580, protein: 49, carbs: 55, fat: 18, fibre: 6,
      desc: "Chicken breast in a peanut satay sauce with basmati rice and mixed vegetables.",
      ingredients: "Chicken breast, cooked basmati rice, mixed vegetables, peanut butter (peanuts), light coconut milk, soy sauce (soya, wheat) (water, soybeans, wheat, salt), lime juice, honey, garlic, ginger, chilli flakes, curry powder, olive oil.",
      allergens: ["Peanuts", "Soya", "Wheat (gluten)"] },
    { id: "halloumi-roasted-vegetable-couscous", name: "Halloumi, Roasted Vegetable & Couscous", kcal: 580, protein: 25, carbs: 68, fat: 23, fibre: 7,
      desc: "Grilled halloumi with roasted courgette, pepper and cherry tomato couscous.",
      ingredients: "Couscous (wheat), halloumi (milk), courgette, cherry tomatoes, red pepper, red onion, olive oil, lemon juice, garlic, dried oregano, dried parsley, salt, black pepper.",
      allergens: ["Wheat (gluten)", "Milk"], vegetarian: true },
    { id: "spinach-ricotta-tomato-fusilli", name: "Spinach & Ricotta Tomato Fusilli", kcal: 570, protein: 27, carbs: 79, fat: 17, fibre: 8,
      desc: "Fusilli in a spinach, ricotta and tomato sauce with parmesan.",
      ingredients: "Fusilli pasta (wheat), chopped tomatoes, ricotta (milk), spinach, onion, parmesan (milk), olive oil, garlic, dried oregano, dried basil, salt, black pepper.",
      allergens: ["Wheat (gluten)", "Milk"], vegetarian: true },
    { id: "beef-kofta-couscous-roasted-vegetables", name: "Beef Kofta, Couscous & Roasted Vegetables", kcal: 570, protein: 43, carbs: 51, fat: 21, fibre: 7,
      desc: "Spiced beef kofta with couscous, roasted courgette and red pepper.",
      ingredients: "Couscous (wheat), beef mince, red pepper, courgette, red onion, onion, parsley, olive oil, garlic, lemon juice, ground cumin, smoked paprika, ground coriander, salt, black pepper, cinnamon.",
      allergens: ["Wheat (gluten)"] },
    { id: "chicken-tikka-style-curry", name: "Chicken Tikka-Style Curry", kcal: 570, protein: 52, carbs: 64, fat: 12, fibre: 4,
      desc: "Chicken breast in a tikka-style tomato and yoghurt curry with basmati rice.",
      ingredients: "Chicken breast, basmati rice, chopped tomatoes, natural Greek yoghurt (milk), onion, red pepper, water, olive oil, garlic, ginger, tomato purée, ground cumin, ground coriander, garam masala (coriander, cumin, cardamom, black pepper, fennel, mace, chilli, bay leaf), turmeric, paprika, chilli powder, salt, lemon juice.",
      allergens: ["Milk"] },
    { id: "salmon-lemon-parsley-new-potatoes", name: "Salmon, Lemon & Parsley New Potatoes with Broccoli", kcal: 560, protein: 39, carbs: 52, fat: 22, fibre: null,
      desc: "Salmon fillet with lemon and parsley new potatoes and broccoli.",
      ingredients: "New potatoes, salmon (fish), broccoli, olive oil, lemon juice, fresh parsley, garlic, salt, black pepper.",
      allergens: ["Fish"] }
  ];

  // Honest, threshold-derived badges — no invented popularity/awards.
  // Thresholds: High protein >=45g · Lower calorie <=550kcal · Vegetarian/Vegan from ingredient data.
  MEALS.forEach(function (m) {
    m.tags = [];
    if (m.protein >= 45) m.tags.push("High protein");
    if (m.kcal <= 550) m.tags.push("Lower calorie");
    if (m.vegan) m.tags.push("Vegan");
    else if (m.vegetarian) m.tags.push("Vegetarian");
    m.image = "assets/img/dishes/" + m.id + ".jpg";
  });

  var DELIVERY_DAYS = [
    { id: "tuesday", label: "Tuesday" },
    { id: "friday", label: "Friday" }
  ];

  var PACKAGES = [
    { id: "taster-4", name: "Taster Box", price: 20, meals: 4, schedule: "single",
      tagline: "Try it \u2014 one delivery day, your choice",
      features: ["4 meals, all delivered on the same day", "Choose Tuesday or Friday delivery", "Full macro & allergen labelling", "No artificial additives or E-numbers, ever"] },
    { id: "taster-8", name: "Taster Box", price: 37.99, meals: 8, schedule: "single",
      tagline: "A full week to try \u2014 one delivery day, your choice",
      features: ["8 meals, all delivered on the same day", "Choose Tuesday or Friday delivery", "Full macro & allergen labelling", "No artificial additives or E-numbers, ever"] },
    { id: "weekly", name: "Weekly Plan", price: 65, meals: 14, tuesdayMeals: 6, fridayMeals: 8, schedule: "split", popular: true,
      tagline: "2 meals a day, 7 days a week",
      features: ["6 meals delivered Tuesday, 8 delivered Friday", "Pick exactly which dishes for each delivery day", "No subscription \u2014 pause or cancel anytime", "No artificial additives or E-numbers, ever"] },
    { id: "monthly", name: "Monthly Plan", price: 250, meals: 14, tuesdayMeals: 6, fridayMeals: 8, weeks: 4, schedule: "split",
      tagline: "4 weeks of Tuesday & Friday deliveries",
      features: ["Same weekly rhythm, running for 4 weeks", "6 meals every Tuesday, 8 every Friday", "Pick your line-up once \u2014 it repeats each week", "No artificial additives or E-numbers, ever"] }
  ];
  PACKAGES.forEach(function (p) { p.perMeal = p.price / (p.meals * (p.weeks || 1)); });

  var BUSINESS = {
    name: "Prep 'N' Fresh",
    whatsapp: "447000000000",
    email: "hello@prepnfresh.co.uk",
    phone: "07000 000000",
    address: { line1: "9 Palmeira Parade", line2: "Western Esplanade", town: "Westcliff-on-Sea", county: "Essex", postcode: "SS0 7RR" },
    collection: "Tuesday 4–8pm (Monday cook) · Friday 4–8pm (Thursday cook)",
    deliveryAreas: ["Westcliff-on-Sea", "Leigh-on-Sea", "Chalkwell", "Southend-on-Sea"],
    deliveryDays: DELIVERY_DAYS,
    additiveFree: "No artificial additives, preservatives or E-numbers \u2014 ever.",
    // Two cook/delivery cycles a week: cooked the day before, ordered by 6pm
    // the night before that. Monday cook -> Tuesday delivery (order by Monday
    // 6pm). Thursday cook -> Friday delivery (order by Thursday 6pm).
    orderCutoffs: [
      { weekday: 1, hour: 18, minute: 0, timezone: "Europe/London", cookDay: "Monday", deliversOn: "Tuesday" },
      { weekday: 4, hour: 18, minute: 0, timezone: "Europe/London", cookDay: "Thursday", deliversOn: "Friday" }
    ],
    allergensDeclared: ["Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Lupin", "Milk", "Molluscs", "Mustard", "Peanuts", "Sesame", "Soybeans", "Sulphur dioxide & sulphites", "Tree nuts"]
  };

  function money(n) {
    return "£" + n.toFixed(n % 1 === 0 ? 0 : 2);
  }

  function getMeal(id) {
    for (var i = 0; i < MEALS.length; i++) if (MEALS[i].id === id) return MEALS[i];
    return null;
  }

  function getPackage(id) {
    for (var i = 0; i < PACKAGES.length; i++) if (PACKAGES[i].id === id) return PACKAGES[i];
    return null;
  }

  window.PNF = {
    meals: MEALS,
    packages: PACKAGES,
    business: BUSINESS,
    deliveryDays: DELIVERY_DAYS,
    money: money,
    getMeal: getMeal,
    getPackage: getPackage
  };
})(window);
