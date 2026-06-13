# Smart Board v0.1

Smart Board is a local CSV visualization app for quickly previewing, editing, and charting uploaded data in the browser.

Version `0.1` focuses on a practical workflow: upload a CSV, inspect the data, adjust the table, choose chart fields, and export useful outputs.

## Features

### Local CSV Upload

- Upload `.csv` files from your local machine.
- Parse CSV data directly in the browser.
- Keep data local; no backend upload is required.
- Automatically detect basic column types:
  - Number
  - Date
  - Text

### Chart View

- Render uploaded CSV data with Highcharts.
- Supported chart types:
  - Line
  - Bar
  - Pie
  - Heatmap
- Choose the X-axis / label column.
- Select one or more numeric datasets.
- Add or edit the chart name.
- Select row range and maximum displayed rows.
- Automatically improve axis readability when labels are too crowded.
- Tooltips show the full X-axis value even when some axis labels are hidden.
- Export charts through the Highcharts chart menu.

### Data Preview View

- Open a dedicated `Data Preview` page.
- View parsed CSV rows in an editable table.
- Edit cell values directly in the browser.
- Chart data updates from the edited table values.
- Search/filter table rows.
- Control visible row range and maximum displayed rows.
- Download the edited data as CSV.

### Custom Chart View

- Open a dedicated `Custom Chart` page.
- Edit Highcharts options with JavaScript config, similar to a lightweight Highcharts live editor.
- Apply config to re-render the chart preview.
- Save custom chart configs to browser `localStorage`.
- Load saved configs from the left panel.
- Delete all saved chart configs when needed.
- Reset the editor back to a generated default config.
- Use helper context from the selected CSV data:
  - `context.rows`
  - `context.columns`
  - `context.categories`
  - `context.selected.xColumn`
  - `context.selected.yColumns`
  - `context.getNumber(row, "ColumnName")`
  - `context.seriesFromSelected("line")`

### Demo Dataset

The app includes a demo dataset for rubber pre-production factory experiments.

Demo CSV file:

```text
../doc/rubber_factory_experiment_demo.csv
```

The demo includes columns such as:

- ExperimentID
- ExperimentDate
- RubberType
- FormulaVersion
- BatchID
- MixingTempC
- MooneyViscosityML100
- CuringTempC
- HardnessShoreA
- TensileStrengthMPa
- ElongationPercent
- CompressionSetPercent
- PassRatePercent

## Tech Stack

- React
- TypeScript
- Vite
- Highcharts
- Papa Parse
- Lucide React

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

## Project Structure

```text
smart_board/
  src/
    App.tsx
    main.tsx
    styles.css
  index.html
  package.json
  vite.config.ts
  README.md
```

## Notes

- Highcharts does not require an API key for local rendering.
- Highcharts licensing depends on usage. Commercial usage may require a paid license.
- The current table editor is lightweight and built into the app. For very large CSV files, a future version should add table virtualization.
- The `Custom Chart` editor evaluates JavaScript locally in the browser. It should be used with trusted configs only.

## Next Version Ideas

- Add column rename support.
- Add row add/delete actions.
- Add chart configuration presets.
- Add a richer code editor with syntax highlighting and autocomplete.
- Add aggregation controls such as average, sum, min, and max.
- Add date grouping by day, week, month, or year.
- Add better heatmap-specific field mapping.
- Add large-file streaming and virtualized table rendering.
