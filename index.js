// index.js
// Script to crawl https://fitfoodway.hu/programok/fogyj-egeszsegesen and extract all days' menus

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

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
        const num = Math.floor(parseFloat(raw.replace(",", ".")));
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

function markdownForDay(day) {
  let md = `# ${day.date}\n`;
  md += `\n**Napi összesített tápérték:**\n`;
  md += `- Kalória: ${day.nutritions.calories} kcal\n`;
  md += `- Fehérje: ${day.nutritions.protein} g\n`;
  md += `- Zsír: ${day.nutritions.lipids} g\n`;
  md += `- Szénhidrát: ${day.nutritions.carbohydrate} g\n`;
  md += `- Rost: ${day.nutritions.fiber} g\n`;
  md += `- Nátrium: ${day.nutritions.natrium} mg\n`;
  md += `\n**Ételek:**\n`;
  for (const item of day.menu) {
    const n = item.nutritions || {};
    md += `- ${item.name} (`;
    md += [
      n.calories !== null && n.calories !== undefined
        ? `${n.calories} kcal`
        : null,
      n.protein !== null && n.protein !== undefined
        ? `${n.protein}g fehérje`
        : null,
      n.lipids !== null && n.lipids !== undefined ? `${n.lipids}g zsír` : null,
      n.carbohydrate !== null && n.carbohydrate !== undefined
        ? `${n.carbohydrate}g szénhidrát`
        : null,
      n.fiber !== null && n.fiber !== undefined ? `${n.fiber}g rost` : null,
      n.natrium !== null && n.natrium !== undefined
        ? `${n.natrium}mg nátrium`
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
  fs.writeFileSync("README.md", allMarkdown);
  console.log("Markdown written to README.md");
}

fetchAllMenus();

module.exports = {
  extractNutritions,
  extractComponents,
  markdownForDay,
};
