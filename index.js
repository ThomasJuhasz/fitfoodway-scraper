// index.js
// Script to crawl FitFoodWay program pages and extract all days' menus

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const bestFoodCombination = require("./bestFoodCombination");

function resolveProgramUrl() {
  const cliArg = process.argv[3];
  const envUrl = process.env.FITFOODWAY_PROGRAM_URL;
  const candidate = cliArg || envUrl || config.URL;
  try {
    return new URL(candidate).href;
  } catch {
    return config.URL;
  }
}

const programUrl = resolveProgramUrl();
const dailyRecommended = config.dailyRecommended;
const additionalFoodItems = config.additionalFoodItems;
const daysToCollect = parseInt(process.argv[2], 10) || Infinity;

const requestHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://fitfoodway.hu/",
};

async function fetchHtml(url) {
  const response = await axios.get(url, {
    headers: requestHeaders,
    timeout: 30000,
  });
  return response.data;
}

function extractNutritions(desc) {
  const normalizedDesc = normalizeNutritionText(desc);
  const preferredSection =
    extractPreferredServingSection(normalizedDesc) || normalizedDesc;

  const regexes = {
    caloriesKcalPair:
      /(?:energia(?:ertek)?|tapertek)\s*(?:\([^)]*kj\s*\/\s*kcal[^)]*\))?\s*:?\s*[\d.,]+\s*\/\s*([\d.,]+)/i,
    calories: /kaloriak?\s*:?\s*([\d.,]+)/i,
    protein: /feherj(?:e|ek)(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)\s*g?/i,
    lipids: /(zsir|lipid(?:ek)?)(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)\s*g?/i,
    carbohydrate: /szenhidrat(?:ok)?(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)\s*g?/i,
    fiber: /rost(?:ok)?(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)\s*g?/i,
    natrium: /natrium(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)(?:\s*mg)?/i,
    salt: /so(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)(?:\s*g)?/i,
  };

  const nutritions = {};
  for (const [key, regex] of Object.entries(regexes)) {
    const match = preferredSection.match(regex);
    let value = null;
    if (match) {
      const rawByKey = { lipids: match[2] };
      const raw = rawByKey[key] || match[1];
      if (raw) {
        const num = parseFloat(raw.replace(",", "."));
        value = isNaN(num) ? null : num;
      }
    }
    nutritions[key] = value;
  }

  if (nutritions.calories == null && nutritions.caloriesKcalPair != null) {
    nutritions.calories = nutritions.caloriesKcalPair;
  }
  if (nutritions.natrium == null && nutritions.salt != null) {
    nutritions.natrium = Math.round(nutritions.salt * 393);
  }

  delete nutritions.caloriesKcalPair;
  delete nutritions.salt;
  return nutritions;
}

function normalizeNutritionText(text) {
  const decodedText = decodeMojibake(text || "");
  return decodedText
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function decodeMojibake(text) {
  if (/[ÃÅ]/.test(text)) {
    return Buffer.from(text, "latin1").toString("utf8");
  }
  try {
    return decodeURIComponent(escape(text));
  } catch {
    return text;
  }
}

function extractPreferredServingSection(normalizedDesc) {
  const servingMarkers = [
    "tapertek adagonkent",
    "tapertek adatok egy adagra",
    "tapertek adatai egy adagra",
  ];
  const start = servingMarkers.reduce(
    (max, marker) => Math.max(max, normalizedDesc.lastIndexOf(marker)),
    -1
  );

  if (start === -1) {
    return "";
  }

  let section = normalizedDesc.slice(start);
  for (const endMarker of ["allergen", "allergeneket tartalmaz", "*a menuk"]) {
    const end = section.indexOf(endMarker);
    if (end !== -1) {
      section = section.slice(0, end);
    }
  }

  return section;
}

function extractComponents(desc) {
  // Look for the section after "Ã–sszetevÅ‘k Ã©s tÃ¡plÃ¡lkozÃ¡si adatok:\n- " and before "SÃºly"
  const match = desc.match(
    /Ã–sszetevÅ‘k Ã©s tÃ¡plÃ¡lkozÃ¡si adatok:\s*-\s*([\s\S]*?)SÃºly/i
  );
  if (match) {
    // Clean up: remove newlines, extra spaces, and trailing punctuation
    return match[1]
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[:.,;\-]+$/, "")
      .trim();
  }
  return "";
}

function percentOfRecommended(actual, recommended) {
  if (!recommended || recommended === 0 || actual == null) return null;
  return Math.round((actual / recommended) * 100);
}

function round1(val) {
  if (val == null) return val;
  return Math.round(val * 10) / 10;
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return "";
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

// prettier-ignore
async function markdownForDay(day) {
  function percent(val, target) {
    if (val == null || target == null) return '';
    return target > 0 ? Math.round((val / target) * 100) : 0;
  }
  function missing(val, target, unit) {
    if (val == null || target == null) return '';
    const diff = round1(target - val);
    return diff > 0 ? `${diff} ${unit}` : '0';
  }
  let md = `# ${day.date}\n`;

  if (!day.menu || day.menu.length === 0) {
    return `${md}\nHave fun :)\n`;
  }

  // Calculate missing nutrients
  const missingNutrients = {
    calories: Math.max(0, dailyRecommended.calories - (day.nutritions.calories || 0)),
    protein: Math.max(0, dailyRecommended.protein - (day.nutritions.protein || 0)),
    lipids: Math.max(0, dailyRecommended.lipids - (day.nutritions.lipids || 0)),
    carbohydrate: Math.max(0, dailyRecommended.carbohydrate - (day.nutritions.carbohydrate || 0)),
    fiber: Math.max(0, dailyRecommended.fiber - (day.nutritions.fiber || 0)),
    natrium: Math.max(0, dailyRecommended.natrium - (day.nutritions.natrium || 0)),
  };
  const suggestions = await bestFoodCombination(missingNutrients, additionalFoodItems);

  // Calculate totals with extra food
  const extraTotals = { calories: 0, protein: 0, lipids: 0, carbohydrate: 0, fiber: 0, natrium: 0 };
  for (const food of suggestions) {
    extraTotals.calories += (food.calories || 0) * food.count;
    extraTotals.protein += (food.protein || 0) * food.count;
    extraTotals.lipids += (food.lipids || 0) * food.count;
    extraTotals.carbohydrate += (food.carbohydrate || 0) * food.count;
    extraTotals.fiber += (food.fiber || 0) * food.count;
    extraTotals.natrium += (food.natrium || 0) * food.count;
  }

  md += `\n| TÃ¡panyag      | Fogyasztott | AjÃ¡nlott | HiÃ¡nyzik a cÃ©lig | Extra utÃ¡n Ã¶sszesen |\n`;
  md += `|--------------|-------------|----------|------------------|---------------------|\n`;
  const keys = [
    { key: 'calories', label: 'KalÃ³ria', unit: 'kcal' },
    { key: 'protein', label: 'FehÃ©rje', unit: 'g' },
    { key: 'lipids', label: 'ZsÃ­r', unit: 'g' },
    { key: 'carbohydrate', label: 'SzÃ©nhidrÃ¡t', unit: 'g' },
    { key: 'fiber', label: 'Rost', unit: 'g' },
    { key: 'natrium', label: 'NÃ¡trium', unit: 'mg' },
  ];
  for (const { key: thisKey, label, unit } of keys) {
    const consumed = round1(day.nutritions[thisKey]);
    const consumedPercent = percent(day.nutritions[thisKey], dailyRecommended[thisKey]);
    const recommended = round1(dailyRecommended[thisKey]);
    const missingVal = missing(day.nutritions[thisKey], dailyRecommended[thisKey], unit);
    const totalWithExtra = round1((day.nutritions[thisKey] || 0) + (extraTotals[thisKey] || 0));
    const totalWithExtraPercent = percent(totalWithExtra, dailyRecommended[thisKey]);
    md += `| ${label.padEnd(12)} | ${consumed} ${unit} (${consumedPercent}%) | ${recommended} ${unit} | ${missingVal} | ${totalWithExtra} ${unit} (${totalWithExtraPercent}%) |\n`;
  }

  const nutrientSummary = [
    `Calories: ${round1(day.nutritions.calories || 0)} kcal`,
    `Protein: ${round1(day.nutritions.protein || 0)} g`,
    `Fat: ${round1(day.nutritions.lipids || 0)} g`,
    `Carbohydrates: ${round1(day.nutritions.carbohydrate || 0)} g`,
    `Fiber: ${round1(day.nutritions.fiber || 0)} g`,
    `Sodium: ${round1(day.nutritions.natrium || 0)} mg`
  ];
  md += `\n**Summary of Nutrients:** ${nutrientSummary.join(", ")}\n\n`;

  md += `\n**Ã‰telek:**\n`;
  for (const item of day.menu) {
    const n = item.nutritions || {};
    md += `- ${item.name} (`;
    md += [
      n.calories !== null && n.calories !== undefined
        ? `${round1(n.calories)} kcal`
        : null,
      n.protein !== null && n.protein !== undefined
        ? `${round1(n.protein)}g fehÃ©rje`
        : null,
      n.lipids !== null && n.lipids !== undefined
        ? `${round1(n.lipids)}g zsÃ­r`
        : null,
      n.carbohydrate !== null && n.carbohydrate !== undefined
        ? `${round1(n.carbohydrate)}g szÃ©nhidrÃ¡t`
        : null,
      n.fiber !== null && n.fiber !== undefined
        ? `${round1(n.fiber)}g rost`
        : null,
      n.natrium !== null && n.natrium !== undefined
        ? `${round1(n.natrium)}mg nÃ¡trium`
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    md += ")\n";
  }
  if (suggestions.length > 0) {
    md += `\n\n**Javasolt kiegÃ©szÃ­tÅ‘ Ã©telek a cÃ©l elÃ©rÃ©sÃ©hez:**\n`;
    for (const food of suggestions) {
      if (food.count > 0) {
        const total = (key) => round1((food[key] || 0) * food.count);
        md += `- ${food.name} Ã— ${food.count} (` +
          [
            total('calories') ? `${total('calories')} kcal` : null,
            total('protein') ? `${total('protein')}g fehÃ©rje` : null,
            total('lipids') ? `${total('lipids')}g zsÃ­r` : null,
            total('carbohydrate') ? `${total('carbohydrate')}g szÃ©nhidrÃ¡t` : null,
            total('fiber') ? `${total('fiber')}g rost` : null,
            total('natrium') ? `${total('natrium')}mg nÃ¡trium` : null,
          ].filter(Boolean).join(', ') +
          `)\n`;
      }
    }
  }
  return md;
}

async function fetchAllMenus() {
  const days = await fetchDays();
  await fetchMenuDetails(days);
  summarizeNutritions(days);
  await writeMarkdown(days);
}

function parseDaysFromLegacyMenuImages($) {
  const days = [];

  $("div.menu-images").each((i, dayDiv) => {
    if (i >= daysToCollect) return false;
    const date = extractDate($, dayDiv);
    const menu = extractMenu($, dayDiv);
    days.push({ date, menu });
  });

  return days;
}

function parseDaysFromProgramTimeline($) {
  const days = [];
  const skipLabels = new Set(["Reggeli", "EbÃ©d", "Vacsora", "Desszert"]);

  $("h4").each((i, header) => {
    if (days.length >= daysToCollect) return false;
    const headerText = $(header).text().replace(/\s+/g, " ").trim();
    const dateMatch = headerText.match(/\d{2}\/\d{2}\/\d{4}/);
    if (!dateMatch) return;

    const block = $(header).nextUntil("h4");
    const dayItems = [];
    const seen = new Set();

    block
      .filter("a[href]")
      .add(block.find("a[href]"))
      .each((j, a) => {
        const rawText = $(a).text().replace(/\s+/g, " ").trim();
        if (!rawText) return;
        if (skipLabels.has(rawText)) return;
        if (/teljes/i.test(rawText) && /megtekint/i.test(rawText)) return;
        if (/tedd\s+a\s+kos[Ã¡a]rba/i.test(rawText)) return;

        const name = rawText.replace(/^-\s*/, "").trim();
        if (!name || name.length < 5) return;

        const link = toAbsoluteUrl($(a).attr("href") || "", programUrl);
        const dedupeKey = `${name}|${link}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        dayItems.push({ name, link });
      });

    days.push({
      date: dateMatch[0],
      menu: dayItems,
    });
  });

  return days;
}

async function fetchDays() {
  const data = await fetchHtml(programUrl);
  const $ = cheerio.load(data);

  const legacyDays = parseDaysFromLegacyMenuImages($);
  if (legacyDays.length > 0) {
    return legacyDays;
  }

  const timelineDays = parseDaysFromProgramTimeline($);
  return timelineDays;
}

function extractDate($, dayDiv) {
  const dateHeader = $(dayDiv).find("h4").first().text().trim();
  let date = dateHeader.match(/\d{2}\/\d{2}\/\d{4}/);
  return date ? date[0] : $(dayDiv).attr("id") || "";
}

function extractMenu($, dayDiv) {
  const menu = [];
  $(dayDiv)
    .find(".box-menu")
    .each((j, menuDiv) => {
      const name = $(menuDiv)
        .find(".box-menu-description")
        .first()
        .text()
        .replace(/^[-\s]*/, "")
        .trim();
      const link =
        $(menuDiv).find(".box-menu-description").first().attr("href") || "";
      menu.push({ name, link: toAbsoluteUrl(link, programUrl) });
    });
  return menu;
}

async function fetchMenuDetails(days) {
  for (const day of days) {
    for (const item of day.menu) {
      if (!item.link) continue;
      try {
        const itemHtml = await fetchHtml(item.link);
        const _$ = cheerio.load(itemHtml);
        const desc = _$(".short-description").text().trim();
        item.components = extractComponents(desc);
        item.nutritions = extractNutritions(desc);
      } catch (e) {
        console.error(
          `Error fetching menu item details for link: ${item.link}`,
          e.message
        );
        item.components = "";
        item.nutritions = {};
      }
    }
  }
}

function summarizeNutritions(days) {
  for (const day of days) {
    day.nutritions = calculateDayNutritionSummary(day.menu);
  }
}

function calculateDayNutritionSummary(menu) {
  const summary = {
    calories: 0,
    protein: 0,
    lipids: 0,
    carbohydrate: 0,
    fiber: 0,
    natrium: 0,
  };
  for (const item of menu) {
    if (item.nutritions) {
      addItemNutritionsToSummary(item.nutritions, summary);
    }
  }
  return summary;
}

function addItemNutritionsToSummary(nutritions, summary) {
  for (const key of Object.keys(summary)) {
    if (typeof nutritions[key] === "number" && !isNaN(nutritions[key])) {
      summary[key] += nutritions[key];
    }
  }
}

async function writeMarkdown(days) {
  let dailyRecommendedMarkdown = `# Daily Recommended Nutritional Values\n\n`;

  for (const [key, value] of Object.entries(dailyRecommended)) {
    let unit;
    if (key === "natrium") {
      unit = "mg";
    } else if (key === "calories") {
      unit = "kcal";
    } else {
      unit = "g";
    }
    dailyRecommendedMarkdown += `- ${
      key.charAt(0).toUpperCase() + key.slice(1)
    }: ${value} ${unit}\n`;
  }

  dailyRecommendedMarkdown += `\n---\n\n`;

  let allMarkdown = "";
  for (const day of days) {
    allMarkdown += (await markdownForDay(day)) + "\n";
  }

  const finalMarkdown = dailyRecommendedMarkdown + allMarkdown;

  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync("docs/index.md", finalMarkdown);
  console.log("Markdown written to docs/index.md");

  const scssPath = "docs/assets/css/style.scss";
  fs.mkdirSync(path.dirname(scssPath), { recursive: true });
  if (!fs.existsSync(scssPath)) {
    fs.writeFileSync(scssPath, "");
  }
}

if (require.main === module) {
  fetchAllMenus();
}

module.exports = {
  extractNutritions,
  extractComponents,
  markdownForDay,
  parseDaysFromLegacyMenuImages,
  parseDaysFromProgramTimeline,
  toAbsoluteUrl,
};
