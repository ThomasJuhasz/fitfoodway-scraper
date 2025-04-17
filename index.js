// index.js
// Script to crawl https://fitfoodway.hu/programok/fogyj-egeszsegesen and extract all days' menus

const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://fitfoodway.hu/programok/fogyj-egeszsegesen';

async function fetchAllMenus() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Array to hold all days
    const days = [];

    // Each day is in a div.menu-images
    $('div.menu-images').each((i, dayDiv) => {
      const dateHeader = $(dayDiv).find('h4').first().text().trim();
      // Try to extract date from header, fallback to id
      let date = dateHeader.match(/\d{2}\/\d{2}\/\d{4}/);
      if (date) date = date[0];
      else date = $(dayDiv).attr('id') || '';

      // Find the 5 menu items for the day
      const menu = [];
      $(dayDiv).find('.box-menu').each((j, menuDiv) => {
        if (j >= 5) return false; // Only 5 items
        const name = $(menuDiv).find('.box-menu-description').first().text().replace(/^[-\s]*/, '').trim();
        const link = $(menuDiv).find('.box-menu-description').first().attr('href') || '';
        menu.push({ name, link });
      });
      days.push({ date, menu });
    });

    console.log(JSON.stringify(days, null, 2));
  } catch (error) {
    console.error('Error fetching menu:', error.message);
  }
}

fetchAllMenus();
