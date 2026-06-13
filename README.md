# Smart Board

Smart Board is a local-first CSV visualization app. It lets you upload a CSV file from your computer, preview and edit the data in the browser, create Highcharts visualizations, and experiment with custom Highcharts JavaScript config.

The project is designed for fast local analysis without a backend. Uploaded data is parsed in the browser and does not need to be sent to a server.

## Version

Current version: `0.1.0`

## Main Features

- Upload local `.csv` files.
- Preview parsed CSV data in an editable table.
- Search and filter table rows.
- Edit table cells directly in the browser.
- Select row ranges for chart rendering.
- Choose the X-axis / label column.
- Select one or more numeric datasets.
- Render charts with Highcharts.
- Switch between line, bar, pie, and heatmap chart views.
- Add a custom chart title.
- Use Highcharts built-in chart export menu.
- Download edited table data as CSV.
- Create custom charts with a JavaScript Highcharts config editor.
- Save and reload custom chart configs from browser `localStorage`.
- Delete saved custom chart configs when needed.

## Demo Dataset

A demo rubber factory pre-production experiment CSV is included:

```text
doc/rubber_factory_experiment_demo.csv
```

The dataset includes experiment metadata and lab measurements such as:

- `ExperimentID`
- `ExperimentDate`
- `RubberType`
- `FormulaVersion`
- `BatchID`
- `MixingTempC`
- `MixingTimeMin`
- `MooneyViscosityML100`
- `CuringTempC`
- `ScorchTimeMin`
- `OptimumCureTimeMin`
- `HardnessShoreA`
- `TensileStrengthMPa`
- `ElongationPercent`
- `CompressionSetPercent`
- `ReboundPercent`
- `DensityGcm3`
- `DefectCount`
- `PassRatePercent`
- `Technician`

## Tech Stack

- React
- TypeScript
- Vite
- Highcharts
- Highcharts React
- Papa Parse
- Lucide React

## Requirements

Install these before running the project:

- Node.js 18 or newer
- npm

You do not need a Highcharts API key for local rendering. Highcharts licensing depends on your use case, especially for commercial usage.

## Install

Clone the repository:

```bash
git clone https://github.com/stevensu77/smart_board.git
cd smart_board
```

Install dependencies:

```bash
npm install
```

## Run Locally

Start the Vite development server:

```bash
npm run dev
```

Open the local URL shown in the terminal. It is usually:

```text
http://localhost:5173/
```

If port `5173` is already in use, Vite may choose another port.

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deploy To GitHub Pages

This project includes a GitHub Actions workflow for GitHub Pages:

```text
.github/workflows/deploy.yml
```

The Vite base path is configured for the project URL:

```text
https://stevensu77.github.io/smart_board/
```

To enable deployment in GitHub:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Pages`.
3. Set `Build and deployment` source to `GitHub Actions`.
4. Push changes to the `main` branch.

GitHub will build the app and publish the `dist` output automatically.

## How To Use

1. Open the app in your browser.
2. Upload a CSV file from your computer.
3. Use the `Chart` tab to choose chart type, X-axis column, datasets, chart title, and row range.
4. Use the chart export menu inside the chart to download chart outputs.
5. Open the `Data Preview` tab to inspect, search, and edit table values.
6. Download the edited CSV from the Data Preview tools.
7. Open the `Custom Chart` tab to edit Highcharts config directly.
8. Apply the config to render a custom chart preview.
9. Save useful custom chart configs to local storage.

## Custom Chart Config

The Custom Chart editor accepts either a Highcharts options object:

```js
({
  chart: { type: "line" },
  title: { text: "Experiment Trend" },
  xAxis: { categories: context.categories },
  series: context.seriesFromSelected("line")
})
```

Or a function that returns a Highcharts options object:

```js
(context, Highcharts) => ({
  chart: { type: "column" },
  title: { text: "Pass Rate by Experiment" },
  xAxis: { categories: context.categories },
  yAxis: { title: { text: "Pass Rate %" } },
  series: [{
    name: "Pass Rate",
    data: context.rows.map((row) => context.getNumber(row, "PassRatePercent"))
  }]
})
```

Available helper values:

- `context.rows`
- `context.columns`
- `context.categories`
- `context.selected.xColumn`
- `context.selected.yColumns`
- `context.getNumber(row, "ColumnName")`
- `context.seriesFromSelected("line")`

Saved configs are stored in browser `localStorage`, so they stay on the same browser and machine until deleted.

## Project Structure

```text
smart_board/
  doc/
    rubber_factory_experiment_demo.csv
  src/
    App.tsx
    main.tsx
    styles.css
  index.html
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  README.md
```

## Notes

- The app is local-first and currently has no backend.
- CSV parsing is handled in the browser with Papa Parse.
- The table editor is intentionally lightweight in version `0.1.0`.
- Very large CSV files may need table virtualization in a future version.
- The Custom Chart editor evaluates JavaScript locally in the browser. Use trusted configs only.

## Roadmap

- Add row add/delete actions.
- Add column rename support.
- Add richer table controls and validation.
- Add chart presets.
- Add a code editor with syntax highlighting and autocomplete.
- Add aggregation controls such as sum, average, min, and max.
- Add date grouping by day, week, month, and year.
- Improve heatmap field mapping.
- Add large-file streaming and table virtualization.
