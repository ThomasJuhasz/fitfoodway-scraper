prompt = `
    Please recommend a combination of these foods to best cover the missing nutrients, without exceeding the recommended daily values.
    Never go above 110% of the daily recommended values. Please ensure that you hit at least 90% of the daily recommended values for each nutrient.
    Please prefer the foods with the low effort. It's okay to add higher effort foods sometimes, but not too much.
  `;

module.exports = {
  URL: "https://fitfoodway.hu/programok/fogyj-egeszsegesen",
  dailyRecommended: {
    calories: 2100,
    protein: 215, // in grams
    lipids: 85, // fats in grams
    carbohydrate: 225, // in grams
    fiber: 40, // in grams
    natrium: 2300, // in milligrams (sodium)
  },
  prompt: prompt,
  additionalFoodItems: [
    {
      name: "Görög joghurt (200g, zsírszegény)",
      effort: 0,
      calories: 130,
      protein: 20,
      lipids: 0.5,
      carbohydrate: 7,
      fiber: 0,
      natrium: 70,
    },
    {
      name: "Főtt tojás (2 darab)",
      effort: 1,
      calories: 155,
      protein: 13,
      lipids: 11,
      carbohydrate: 1,
      fiber: 0,
      natrium: 124,
    },
    {
      name: "Fehérjepor shake (1 adag vízzel)",
      effort: 0,
      calories: 120,
      protein: 24,
      lipids: 1.5,
      carbohydrate: 2,
      fiber: 0,
      natrium: 150,
    },
    {
      name: "Pöttyös Protein Turó Rudi natúr",
      effort: 0,
      calories: 145,
      protein: 9.2,
      lipids: 8,
      carbohydrate: 13,
      fiber: 2.2,
      natrium: 24,
    },
    {
      name: "Milbona High Protein Cottage Cheese (250g)",
      effort: 0,
      calories: 225,
      protein: 32,
      lipids: 10,
      carbohydrate: 8,
      fiber: 0,
      natrium: 500,
    },
    {
      name: "Csirkemell (100g, sült)",
      effort: 2,
      calories: 165,
      protein: 31,
      lipids: 3.5,
      carbohydrate: 0,
      fiber: 0,
      natrium: 70,
    },
    {
      name: "Tonhal konzerv (100g, vízben)",
      effort: 0,
      calories: 213,
      protein: 24,
      lipids: 13,
      carbohydrate: 0,
      fiber: 0,
      natrium: 400,
    },
    {
      name: "Fibershake",
      effort: 0,
      calories: 133,
      protein: 20,
      lipids: 1.4,
      carbohydrate: 8.4,
      fiber: 10.2,
      natrium: 390,
    },
  ],
};
