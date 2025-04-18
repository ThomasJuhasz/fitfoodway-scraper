prompt = `
Objective: You are given a list of available food items with their nutritional information. I need you to recommend a combination of these foods that will add up to the missing nutrients for today, as described below.

Conditions:
- The total calories from the selected foods must not exceed the missing calories by more than 10% (i.e., no more than 110% of the missing calories).
- Other nutrients (protein, fat, carbs, fiber, natrium) should be optimized to the extent possible but may be sacrificed if needed to stay within the calorie limit.
- Prefer foods with low effort, but it's acceptable to add higher-effort foods occasionally if they provide a significant benefit.
- You can select only 1 food if that already exceeds the missing calories.
`;

module.exports = {
  URL: "https://fitfoodway.hu/programok/fogyj-egeszsegesen",
  dailyRecommended: {
    calories: 1548,
    protein: 200, // in grams
    lipids: 50, // fats in grams
    carbohydrate: 73, // in grams
    fiber: 25, // in grams
    natrium: 2300, // in milligrams (sodium)
  },
  prompt: prompt,
  useGemini: false,
  defaultAdditionalFoodItems: [
    {
      name: "Fehérjepor shake (1 adag vízzel)",
      effort: 0,
      calories: 120,
      protein: 24,
      lipids: 1.5,
      carbohydrate: 2,
      fiber: 0,
      natrium: 150,
      count: 1,
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
      count: 1,
    },
  ],
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
