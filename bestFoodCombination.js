// Algorithm to find the best combination of foods to cover missing nutritions
const additionalFoodItems = require('./additionalFoodItems');

/**
 * Given a missing nutrition object, returns a combination of food items that best covers the missing values.
 * Uses a greedy approach: at each step, picks the food that covers the most of the largest missing nutrient.
 * @param {Object} missing - { calories, protein, lipids, carbohydrate, fiber, natrium }
 * @returns {Array} Array of { name, count, ...nutritions }
 */
function bestFoodCombination(missing) {
  // Clone the missing object to avoid mutation
  let toCover = { ...missing };
  const result = [];
  // We'll try up to 20 items to avoid infinite loops
  for (let i = 0; i < 20; i++) {
    // Find the nutrient with the largest % missing
    const keys = Object.keys(toCover);
    let maxKey = null;
    let maxValue = 0;
    for (const k of keys) {
      if (toCover[k] > maxValue) {
        maxValue = toCover[k];
        maxKey = k;
      }
    }
    if (!maxKey || maxValue <= 0.1) break; // Done if nothing left to cover
    // Find the food that gives the most of this nutrient per serving
    let bestFood = null;
    let bestAmount = 0;
    for (const food of additionalFoodItems) {
      if (food[maxKey] > bestAmount) {
        bestAmount = food[maxKey];
        bestFood = food;
      }
    }
    if (!bestFood || bestAmount === 0) break; // No food can help
    // Add this food to the result
    let count = Math.ceil(toCover[maxKey] / bestAmount);
    result.push({ ...bestFood, count });
    // Subtract the nutrients provided by this food
    for (const k of keys) {
      toCover[k] = Math.max(0, toCover[k] - bestFood[k] * count);
    }
  }
  return result;
}

module.exports = bestFoodCombination;
