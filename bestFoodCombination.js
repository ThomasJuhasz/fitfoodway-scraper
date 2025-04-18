const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("./config");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Calls Gemini to get the best food combination based on missing nutrients and available food items.
 * @param {Object} missing - The missing nutrients { calories, protein, lipids, carbohydrate, fiber, natrium }.
 * @param {Array} foodList - The list of available additional food items.
 * @returns {Promise<string>} A recommendation from Gemini.
 */
async function bestFoodCombination(missing, foodList) {
  let prompt = `
  I have the following missing nutrients for today: ${JSON.stringify(
    missing,
    null,
    2
  )}
  Here is a list of available additional food items: ${JSON.stringify(
    foodList,
    null,
    2
  )}`;
  prompt += config.prompt;
  prompt += `
  Respond with a javascript array of recomended list of additional foods in the same format as the food list provided. Nothing else, only the array, similar to this: 
  [{
    name: "Fibershake",
    calories: 133,
    protein: 20,
    lipids: 1.4,
    carbohydrate: 8.4,
    fiber: 10.2,
    natrium: 390,
  }]
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const response = await model.generateContent(prompt);
  const result = response.response.text();
  const cleanedResult = result.split("\n").slice(1, -1).join("\n");

  let bestFoodCombinationArray = [];
  try {
    bestFoodCombinationArray = JSON.parse(cleanedResult).map((item) => ({
      ...item,
      count: item.count || 1, // Default count to 1 if not provided
    }));
  } catch (error) {
    console.error("Failed to parse best food combination result:", error);
  }

  const summarizedRecommendations = bestFoodCombinationArray.reduce(
    (acc, item) => {
      const existing = acc.find((food) => food.name === item.name);
      if (existing) {
        existing.count += item.count;
      } else {
        acc.push({ ...item });
      }
      return acc;
    },
    []
  );

  return summarizedRecommendations;
}

module.exports = bestFoodCombination;
