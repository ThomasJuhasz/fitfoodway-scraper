// Algorithm to find the best combination of foods to cover missing nutritions
const additionalFoodItems = require("./additionalFoodItems");
const dailyRecommended = require("./dailyRecommended");

/**
 * Given a missing nutrition object, returns a combination of food items that best covers the missing values.
 * Uses a greedy approach: at each step, picks the food that covers the most of the largest missing nutrient.
 * Prioritizes reaching protein target, but never goes above 100% of calorie intake.
 * @param {Object} missing - { calories, protein, lipids, carbohydrate, fiber, natrium }
 * @returns {Array} Array of { name, count, ...nutritions }
 */
function bestFoodCombination(missing) {
  let toCover = { ...missing };
  const result = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalLipids = 0;
  let totalFiber = 0;
  const calorieLimit = dailyRecommended.calories;
  const fatLimit = dailyRecommended.lipids * 1.1;
  const fiberMin = dailyRecommended.fiber * 0.9;
  const fiberMax = dailyRecommended.fiber * 1.1;
  // We'll try up to 20 items to avoid infinite loops
  for (let i = 0; i < 20; i++) {
    // Prioritize protein if not yet met, then fiber if not yet at 90%
    let maxKey = null;
    if (totalProtein < dailyRecommended.protein) {
      maxKey = "protein";
    } else if (totalFiber < fiberMin) {
      maxKey = "fiber";
    } else {
      // Otherwise, pick the largest missing nutrient
      const keys = Object.keys(toCover);
      let maxValue = 0;
      for (const k of keys) {
        if (toCover[k] > maxValue) {
          maxValue = toCover[k];
          maxKey = k;
        }
      }
      if (!maxKey || toCover[maxKey] <= 0.1) break;
    }
    // Find the food with the best protein/calorie or fiber/calorie ratio for the current target
    let bestFood = null;
    let bestRatio = 0;
    for (const food of additionalFoodItems) {
      if (maxKey === "protein" && food.protein > 0 && food.calories > 0) {
        // Prioritise by protein/calorie/fiber ratio
        const ratio = food.protein / (food.calories * (1 + 0.5 * (1 / (food.fiber + 1))));
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestFood = food;
        }
      } else if (maxKey === "fiber" && food.fiber > 0 && (food.calories >= 0)) {
        // Prioritise by fiber/calorie/protein ratio
        const ratio = food.fiber / ( (food.calories > 0 ? food.calories : 1) * (1 + 0.5 * (1 / (food.protein + 1))) );
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestFood = food;
        }
      } else if (food[maxKey] > 0 && food.calories > 0) {
        // For other nutrients, fallback to absolute value per serving
        if (food[maxKey] > bestRatio) {
          bestRatio = food[maxKey];
          bestFood = food;
        }
      }
    }
    if (!bestFood || bestRatio === 0) break;
    // Calculate how many servings we can add without exceeding calories or fat or fiber, and never more than 3 in total
    let existing = result.find((f) => f.name === bestFood.name);
    let alreadyAdded = existing ? existing.count : 0;
    let count = Math.ceil((toCover[maxKey] || 0) / (bestFood[maxKey] || 1));
    count = Math.min(count, 3 - alreadyAdded);
    if (count <= 0) continue;
    let foodCalories = bestFood.calories * count;
    let foodLipids = (bestFood.lipids || 0) * count;
    let foodFiber = (bestFood.fiber || 0) * count;
    if (totalCalories + foodCalories > calorieLimit) {
      count = Math.min(
        count,
        Math.floor((calorieLimit - totalCalories) / bestFood.calories)
      );
      if (count <= 0) break;
      foodCalories = bestFood.calories * count;
      foodLipids = (bestFood.lipids || 0) * count;
      foodFiber = (bestFood.fiber || 0) * count;
    }
    if (totalLipids + foodLipids > fatLimit) {
      count = Math.min(
        count,
        Math.floor((fatLimit - totalLipids) / (bestFood.lipids || 1))
      );
      if (count <= 0) break;
      foodCalories = bestFood.calories * count;
      foodLipids = (bestFood.lipids || 0) * count;
      foodFiber = (bestFood.fiber || 0) * count;
    }
    if (maxKey === "fiber" && totalFiber + foodFiber > fiberMax) {
      count = Math.min(count, Math.floor((fiberMax - totalFiber) / (bestFood.fiber || 1)));
      if (count <= 0) continue;
      foodCalories = bestFood.calories * count;
      foodLipids = (bestFood.lipids || 0) * count;
      foodFiber = (bestFood.fiber || 0) * count;
    }
    // Add this food to the result
    if (existing) {
      existing.count += count;
    } else {
      result.push({ ...bestFood, count });
    }
    totalCalories += foodCalories;
    totalProtein += (bestFood.protein || 0) * count;
    totalLipids += (bestFood.lipids || 0) * count;
    totalFiber += (bestFood.fiber || 0) * count;
    // Subtract the nutrients provided by this food
    for (const k of Object.keys(toCover)) {
      toCover[k] = Math.max(0, toCover[k] - (bestFood[k] || 0) * count);
    }
    // If we've hit the calorie or fat limit, or reached fiber min, stop
    if (totalCalories >= calorieLimit || totalLipids >= fatLimit) break;
    if (maxKey === "fiber" && totalFiber >= fiberMin) break;
  }
  // After main loop, if fiber is still below 90% and a zero-calorie, zero-fat fiber food exists, add it (but do not exceed 110% and never more than 3)
  if (totalFiber < fiberMin) {
    const fiberFood = additionalFoodItems.find(
      (f) => f.fiber > 0 && (f.calories || 0) === 0 && (f.lipids || 0) === 0
    );
    if (fiberFood) {
      const fiberNeeded = Math.min(fiberMax - totalFiber, fiberMin - totalFiber);
      let count = Math.ceil(fiberNeeded / fiberFood.fiber);
      count = Math.min(count, 3);
      if (count > 0) {
        let existing = result.find((f) => f.name === fiberFood.name);
        if (existing) {
          existing.count += count;
          if (existing.count > 3) existing.count = 3;
        } else {
          result.push({ ...fiberFood, count });
        }
        totalFiber += fiberFood.fiber * count;
      }
    }
  }
  // Ensure at least 2 types of foods in the result
  if (result.length < 2 && additionalFoodItems.length > 1) {
    // Find another food (not already in result) with the best protein/calorie or fiber/calorie ratio
    let bestAlt = null;
    let bestAltRatio = 0;
    for (const food of additionalFoodItems) {
      if (result.find((f) => f.name === food.name)) continue;
      if (food.protein > 0 && food.calories > 0) {
        const ratio = food.protein / food.calories;
        if (ratio > bestAltRatio) {
          bestAltRatio = ratio;
          bestAlt = food;
        }
      } else if (food.fiber > 0 && food.calories >= 0) {
        const ratio = food.fiber / (food.calories > 0 ? food.calories : 1);
        if (ratio > bestAltRatio) {
          bestAltRatio = ratio;
          bestAlt = food;
        }
      }
    }
    if (bestAlt) {
      result.push({ ...bestAlt, count: 1 });
    }
  }
  return result;
}

module.exports = bestFoodCombination;
