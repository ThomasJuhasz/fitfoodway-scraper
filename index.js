// index.js
// Script to crawl https://fitfoodway.hu/programok/fogyj-egeszsegesen and extract all days' menus

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const dailyRecommended = require("./dailyRecommended");

const URL = "https://fitfoodway.hu/programok/fogyj-egeszsegesen";
const daysToCollect = parseInt(process.argv[2], 10) || Infinity;

function extractNutritions(desc) {
  // Hungarian nutrition keywords and regexes
  const regexes = {
    // Robust: match 'kalória' or 'kalóriák', optional colon/whitespace, number always in group 1
    calories: /kalóri[áa]+k?\s*:?\s*([\d.,]+)/i,
    protein: /fehérj[ée]k?\s*[:]?(\s*[\d.,]+)\s*g?/i,
    lipids: /(zsír|lipid(?:ek)?)\s*[:]?(\s*[\d.,]+)\s*g/i,
    carbohydrate: /szénhidrát(?:ok)?\s*[:]?(\s*[\d.,]+)\s*g/i,
    fiber: /rost(?:ok)?\s*[:]?(\s*[\d.,]+)\s*g/i,
    natrium: /nátrium\s*[:]?(\s*[\d.,]+)\s*mg/i,
  };
  const nutritions = {};
  for (const [key, regex] of Object.entries(regexes)) {
    const match = desc.match(regex);
    let value = null;
    if (match) {
      // For lipids, the value is in the second group
      const raw = key === "lipids" ? match[2] : match[1];
      if (raw) {
        // Replace comma with dot, parse as float, then floor to int
        const num = parseFloat(raw.replace(",", "."));
        value = isNaN(num) ? null : num;
      }
    }
    nutritions[key] = value;
  }
  return nutritions;
}

function extractComponents(desc) {
  // Look for the section after "Összetevők és táplálkozási adatok:\n- " and before "Súly"
  const match = desc.match(
    /Összetevők és táplálkozási adatok:\s*-\s*([\s\S]*?)Súly/i
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

function markdownForDay(day) {
  let md = `# ${day.date}\n`;
  md += `\n**Napi összesített tápérték:**\n`;
  md += `- Kalória: ${round1(day.nutritions.calories)} kcal (${percentOfRecommended(day.nutritions.calories, dailyRecommended.calories)}%)\n`;
  md += `- Fehérje: ${round1(day.nutritions.protein)} g (${percentOfRecommended(day.nutritions.protein, dailyRecommended.protein)}%)\n`;
  md += `- Zsír: ${round1(day.nutritions.lipids)} g (${percentOfRecommended(day.nutritions.lipids, dailyRecommended.lipids)}%)\n`;
  md += `- Szénhidrát: ${round1(day.nutritions.carbohydrate)} g (${percentOfRecommended(day.nutritions.carbohydrate, dailyRecommended.carbohydrate)}%)\n`;
  md += `- Rost: ${round1(day.nutritions.fiber)} g (${percentOfRecommended(day.nutritions.fiber, dailyRecommended.fiber)}%)\n`;
  md += `- Nátrium: ${round1(day.nutritions.natrium)} mg (${percentOfRecommended(day.nutritions.natrium, dailyRecommended.natrium)}%)\n`;
  md += `\n**Ételek:**\n`;
  for (const item of day.menu) {
    const n = item.nutritions || {};
    md += `- ${item.name} (`;
    md += [
      n.calories !== null && n.calories !== undefined
        ? `${round1(n.calories)} kcal`
        : null,
      n.protein !== null && n.protein !== undefined
        ? `${round1(n.protein)}g fehérje`
        : null,
      n.lipids !== null && n.lipids !== undefined ? `${round1(n.lipids)}g zsír` : null,
      n.carbohydrate !== null && n.carbohydrate !== undefined
        ? `${round1(n.carbohydrate)}g szénhidrát`
        : null,
      n.fiber !== null && n.fiber !== undefined ? `${round1(n.fiber)}g rost` : null,
      n.natrium !== null && n.natrium !== undefined
        ? `${round1(n.natrium)}mg nátrium`
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    md += ")\n";
  }
  return md;
}

async function fetchAllMenus() {
  try {
    const days = await fetchDays();
    await fetchMenuDetails(days);
    summarizeNutritions(days);
    writeMarkdown(days);
  } catch (error) {
    console.error("Error fetching menu:", error.message);
  }
}

async function fetchDays() {
  const { data } = await axios.get(URL);
  const $ = cheerio.load(data);
  const days = [];

  $("div.menu-images").each((i, dayDiv) => {
    if (i >= daysToCollect) return false;
    const date = extractDate($, dayDiv);
    const menu = extractMenu($, dayDiv);
    days.push({ date, menu });
  });

  return days;
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
      if (j >= 5) return false;
      const name = $(menuDiv)
        .find(".box-menu-description")
        .first()
        .text()
        .replace(/^[-\s]*/, "")
        .trim();
      const link =
        $(menuDiv).find(".box-menu-description").first().attr("href") || "";
      menu.push({ name, link });
    });
  return menu;
}

async function fetchMenuDetails(days) {
  for (const day of days) {
    for (const item of day.menu) {
      if (!item.link) continue;
      try {
        const { data: itemHtml } = await axios.get(item.link);
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
    const summary = {
      calories: 0,
      protein: 0,
      lipids: 0,
      carbohydrate: 0,
      fiber: 0,
      natrium: 0,
    };
    for (const item of day.menu) {
      if (item.nutritions) {
        for (const key of Object.keys(summary)) {
          if (
            typeof item.nutritions[key] === "number" &&
            !isNaN(item.nutritions[key])
          ) {
            summary[key] += item.nutritions[key];
          }
        }
      }
    }
    day.nutritions = summary;
  }
}

function writeMarkdown(days) {
  let allMarkdown = "";
  for (const day of days) {
    allMarkdown += markdownForDay(day) + "\n";
  }
  // Write to docs/index.md instead of README.md
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync("docs/index.md", allMarkdown);
  console.log("Markdown written to docs/index.md");

  // Silence Jekyll SCSS error by ensuring an empty style.scss exists
  const scssPath = "docs/assets/css/style.scss";
  fs.mkdirSync(path.dirname(scssPath), { recursive: true });
  if (!fs.existsSync(scssPath)) {
    fs.writeFileSync(scssPath, "");
  }
}

fetchAllMenus();

module.exports = {
  extractNutritions,
  extractComponents,
  markdownForDay,
};
