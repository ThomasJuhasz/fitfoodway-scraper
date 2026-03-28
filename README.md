# FitFoodway Scraper

This project scrapes menu and nutrition information from https://fitfoodway.hu/programok/fogyj-egeszsegesen and generates a markdown summary.

## Prerequisites

- Node.js (v18 or newer recommended)
- npm

## Install dependencies

```
npm install
```

## Run the scraper

```
node index.js 20 https://www.fitfoodway.hu/programok/protein
```

This fetches data for the next 20 days from the selected FitFoodWay program URL and generates `docs/index.md`.

If no URL is provided, it uses the default from `config.js`. You can also set `FITFOODWAY_PROGRAM_URL`.

## Run tests

```
npm test
```

## Output

- The generated markdown can be found in `docs/index.md`.
- Test coverage reports are available in the `coverage/` directory after running tests.
