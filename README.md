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
node index.js 20
```

This will fetch the data for the next 20 days and generate a markdown file at `public/index.md`.

## Run tests

```
npm test
```

## Output

- The generated markdown can be found in `docs/index.md`.
- Test coverage reports are available in the `coverage/` directory after running tests.
