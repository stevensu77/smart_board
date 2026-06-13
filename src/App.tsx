import { ChangeEvent, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact, { type HighchartsReactRefObject } from "highcharts-react-official";
import "highcharts/modules/exporting";
import "highcharts/modules/offline-exporting";
import "highcharts/modules/heatmap";
import Papa from "papaparse";
import {
  BarChart3,
  Code2,
  FileDown,
  FileUp,
  Flame,
  LineChart,
  PieChart,
  RotateCcw,
  Save,
  Table2,
  Trash2,
  Wand2
} from "lucide-react";

type ChartKind = "line" | "bar" | "pie" | "heatmap";
type PageKind = "chart" | "data" | "custom";
type ColumnType = "number" | "date" | "text";
type CsvRow = Record<string, string | number | null>;

type ColumnProfile = {
  name: string;
  type: ColumnType;
  numericCount: number;
  emptyCount: number;
};

type SavedChartConfig = {
  id: string;
  name: string;
  code: string;
  updatedAt: string;
};

type CustomChartContext = {
  rows: CsvRow[];
  columns: ColumnProfile[];
  categories: string[];
  selected: {
    chartTitle: string;
    xColumn: string;
    yColumns: string[];
  };
  getLabel: (row: CsvRow, column: string, fallback: number) => string;
  getNumber: (row: CsvRow, column: string) => number | null;
  seriesFromSelected: (type?: "line" | "column" | "bar" | "area" | "spline") => Highcharts.SeriesOptionsType[];
};

const SAVED_CHART_CONFIGS_KEY = "smart_board.saved_chart_configs";

const chartKinds: Array<{ id: ChartKind; label: string; icon: typeof LineChart }> = [
  { id: "line", label: "Line", icon: LineChart },
  { id: "bar", label: "Bar", icon: BarChart3 },
  { id: "pie", label: "Pie", icon: PieChart },
  { id: "heatmap", label: "Heatmap", icon: Flame }
];

const sampleCsv = `ExperimentID,ExperimentDate,RubberType,FormulaVersion,BatchID,MixingTempC,MixingTimeMin,MooneyViscosityML100,CuringTempC,ScorchTimeMin,OptimumCureTimeMin,HardnessShoreA,TensileStrengthMPa,ElongationPercent,CompressionSetPercent,ReboundPercent,DensityGcm3,DefectCount,PassRatePercent,Technician
EXP-001,2026-05-01,Natural Rubber,F-A,NR-260501-A,82,8.5,64,155,5.8,12.5,61,18.4,520,18.2,47,1.12,3,96.5,Lin
EXP-002,2026-05-02,Natural Rubber,F-A,NR-260502-A,84,8.8,66,155,5.5,12.8,62,18.1,505,18.9,46,1.13,4,95.8,Lin
EXP-003,2026-05-03,SBR,F-B,SBR-260503-B,88,9.2,71,160,4.9,14.1,65,16.8,445,22.5,42,1.18,7,92.4,Chen
EXP-004,2026-05-04,SBR,F-B,SBR-260504-B,90,9.5,73,160,4.7,14.4,66,16.4,430,23.2,41,1.19,8,91.8,Chen
EXP-005,2026-05-05,EPDM,F-C,EPDM-260505-C,96,10.1,78,165,6.4,15.8,70,14.9,380,27.6,39,1.24,6,93.2,Wang
EXP-006,2026-05-06,EPDM,F-C,EPDM-260506-C,95,10.0,76,165,6.6,15.4,69,15.2,392,26.9,40,1.23,5,94.1,Wang
EXP-007,2026-05-07,NBR,F-D,NBR-260507-D,92,9.6,74,160,5.2,13.9,68,17.6,410,21.8,44,1.21,4,95.2,Zhao
EXP-008,2026-05-08,NBR,F-D,NBR-260508-D,91,9.4,72,160,5.4,13.6,67,17.9,418,21.1,45,1.20,3,96.0,Zhao
EXP-009,2026-05-09,Natural Rubber,F-A,NR-260509-A,83,8.7,65,155,5.9,12.3,61,18.8,535,17.8,48,1.12,2,97.1,Lin
EXP-010,2026-05-10,SBR,F-E,SBR-260510-E,89,9.1,69,158,5.1,13.7,64,17.2,462,21.5,43,1.17,5,94.6,Chen
EXP-011,2026-05-11,EPDM,F-F,EPDM-260511-F,97,10.4,80,166,6.1,16.2,71,15.6,405,25.8,41,1.25,4,95.0,Wang
EXP-012,2026-05-12,NBR,F-G,NBR-260512-G,93,9.8,75,162,5.0,14.2,69,18.3,428,20.7,46,1.22,2,97.4,Zhao`;

const generatedCustomConfigCode = `({
  chart: { type: "line", zooming: { type: "x" } },
  title: { text: context.selected.chartTitle || "Custom chart" },
  credits: { enabled: false },
  exporting: { enabled: true, fallbackToExportServer: false },
  xAxis: {
    categories: context.categories,
    title: { text: context.selected.xColumn }
  },
  yAxis: { title: { text: "Value" } },
  tooltip: {
    shared: true,
    useHTML: true,
    formatter: function () {
      const points = this.points || [this.point || this];
      const label = points[0]?.options?.custom?.xLabel || this.x;
      return "<b>" + context.selected.xColumn + ": " + label + "</b><br/>" +
        points.map((point) =>
          '<span style="color:' + point.color + '">●</span> ' +
          point.series.name + ": <b>" + point.y + "</b>"
        ).join("<br/>");
    }
  },
  series: context.seriesFromSelected("line")
})`;

function normalizeRows(rows: Record<string, unknown>[]): CsvRow[] {
  return rows.map((row) => {
    const normalized: CsvRow = {};
    Object.entries(row).forEach(([key, value]) => {
      const cleanKey = key.trim() || "Column";
      if (value === null || value === undefined || value === "") {
        normalized[cleanKey] = null;
        return;
      }

      const rawValue = String(value).trim();
      const numberValue = Number(rawValue.replace(/,/g, ""));
      normalized[cleanKey] =
        rawValue !== "" && Number.isFinite(numberValue) ? numberValue : rawValue;
    });
    return normalized;
  });
}

function normalizeCellValue(value: string): string | number | null {
  const rawValue = value.trim();
  if (!rawValue) {
    return null;
  }

  const numberValue = Number(rawValue.replace(/,/g, ""));
  return Number.isFinite(numberValue) ? numberValue : rawValue;
}

function isDateLike(value: string): boolean {
  const normalized = value.trim();
  const hasDateShape =
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(normalized) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(normalized) ||
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{2}/.test(normalized);

  return hasDateShape && !Number.isNaN(Date.parse(normalized));
}

function inferColumns(rows: CsvRow[]): ColumnProfile[] {
  const names = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return names.map((name) => {
    let numericCount = 0;
    let dateCount = 0;
    let emptyCount = 0;

    rows.slice(0, 100).forEach((row) => {
      const value = row[name];
      if (value === null || value === undefined || value === "") {
        emptyCount += 1;
        return;
      }
      if (typeof value === "number") {
        numericCount += 1;
        return;
      }
      if (isDateLike(String(value))) {
        dateCount += 1;
      }
    });

    const sampled = Math.max(rows.slice(0, 100).length - emptyCount, 1);
    const type: ColumnType =
      numericCount / sampled > 0.7 ? "number" : dateCount / sampled > 0.7 ? "date" : "text";

    return { name, type, numericCount, emptyCount };
  });
}

function getNumber(row: CsvRow, key: string): number | null {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getLabel(row: CsvRow, key: string, fallback: number): string {
  const value = row[key];
  return value === null || value === undefined || value === "" ? `Row ${fallback + 1}` : String(value);
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${Highcharts.numberFormat(value / 1_000_000_000, 1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${Highcharts.numberFormat(value / 1_000_000, 1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Highcharts.numberFormat(value / 1_000, 1)}k`;
  }
  return Highcharts.numberFormat(value, Number.isInteger(value) ? 0 : 2);
}

function getValueRange(rows: CsvRow[], yColumns: string[]) {
  const values = rows.flatMap((row) =>
    yColumns.map((column) => getNumber(row, column)).filter((value): value is number => value !== null)
  );

  if (!values.length) {
    return {};
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue || Math.max(Math.abs(maxValue), 1);
  const padding = spread * 0.08;
  const softMin = minValue - padding;

  return {
    softMin: minValue >= 0 && softMin < 0 ? 0 : softMin,
    softMax: maxValue + padding
  };
}

function getMedianMagnitude(rows: CsvRow[], column: string): number {
  const values = rows
    .map((row) => getNumber(row, column))
    .filter((value): value is number => value !== null && value !== 0)
    .map((value) => Math.abs(value))
    .sort((a, b) => a - b);

  if (!values.length) {
    return 0;
  }

  return values[Math.floor(values.length / 2)];
}

function buildSmartYAxes(rows: CsvRow[], yColumns: string[]): Highcharts.YAxisOptions[] {
  if (yColumns.length <= 1) {
    return [
      {
        ...getValueRange(rows, yColumns),
        endOnTick: true,
        startOnTick: true,
        tickPixelInterval: 76,
        title: { text: yColumns[0] ?? "Value" },
        labels: {
          formatter: function () {
            return typeof this.value === "number" ? formatNumber(this.value) : String(this.value);
          }
        }
      }
    ];
  }

  const magnitudes = yColumns.map((column) => ({
    column,
    magnitude: getMedianMagnitude(rows, column)
  }));
  const maxMagnitude = Math.max(...magnitudes.map((item) => item.magnitude), 0);
  const minMagnitude = Math.min(...magnitudes.filter((item) => item.magnitude > 0).map((item) => item.magnitude));
  const shouldSplitAxes = minMagnitude > 0 && maxMagnitude / minMagnitude >= 10;
  const primaryColumns = shouldSplitAxes
    ? magnitudes.filter((item) => item.magnitude >= maxMagnitude / 10).map((item) => item.column)
    : yColumns;
  const secondaryColumns = shouldSplitAxes
    ? magnitudes.filter((item) => item.magnitude < maxMagnitude / 10).map((item) => item.column)
    : [];

  const axes: Highcharts.YAxisOptions[] = [
    {
      ...getValueRange(rows, primaryColumns),
      endOnTick: true,
      startOnTick: true,
      tickPixelInterval: 76,
      title: { text: primaryColumns.length === 1 ? primaryColumns[0] : "Primary values" },
      labels: {
        formatter: function () {
          return typeof this.value === "number" ? formatNumber(this.value) : String(this.value);
        }
      }
    }
  ];

  if (secondaryColumns.length) {
    axes.push({
      ...getValueRange(rows, secondaryColumns),
      endOnTick: true,
      opposite: true,
      startOnTick: true,
      tickPixelInterval: 76,
      title: { text: secondaryColumns.length === 1 ? secondaryColumns[0] : "Secondary values" },
      labels: {
        formatter: function () {
          return typeof this.value === "number" ? formatNumber(this.value) : String(this.value);
        }
      }
    });
  }

  return axes;
}

function safeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "smart-board-chart";
}

function readSavedChartConfigs(): SavedChartConfig[] {
  try {
    const rawConfigs = window.localStorage.getItem(SAVED_CHART_CONFIGS_KEY);
    if (!rawConfigs) {
      return [];
    }

    const parsed = JSON.parse(rawConfigs);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedChartConfigs(configs: SavedChartConfig[]) {
  window.localStorage.setItem(SAVED_CHART_CONFIGS_KEY, JSON.stringify(configs));
}

function createConfigId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `config-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPointXLabel(point: Highcharts.Point, categories: string[]): string {
  const customLabel = (point.options as Highcharts.PointOptionsObject & { custom?: { xLabel?: string } }).custom
    ?.xLabel;

  if (customLabel) {
    return customLabel;
  }

  if (typeof point.category === "string") {
    return point.category;
  }

  if (typeof point.x === "number" && categories[point.x]) {
    return categories[point.x];
  }

  return String(point.x ?? "Selected point");
}

function createCustomChartContext(
  rows: CsvRow[],
  columns: ColumnProfile[],
  xColumn: string,
  yColumns: string[],
  chartTitle: string
): CustomChartContext {
  const categories = rows.map((row, index) => getLabel(row, xColumn, index));

  return {
    rows,
    columns,
    categories,
    selected: {
      chartTitle,
      xColumn,
      yColumns
    },
    getLabel,
    getNumber,
    seriesFromSelected: (type = "line") =>
      yColumns.map<Highcharts.SeriesOptionsType>((column) => ({
        type,
        name: column,
        data: rows.map((row, index) => ({
          y: getNumber(row, column),
          custom: {
            xLabel: categories[index]
          }
        }))
      }))
  };
}

function evaluateCustomChartConfig(code: string, context: CustomChartContext): Highcharts.Options {
  const factory = new Function(
    "context",
    "Highcharts",
    `"use strict";
const config = ${code};
return typeof config === "function" ? config(context, Highcharts) : config;`
  );
  const result = factory(context, Highcharts);

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Custom chart config must return a Highcharts options object.");
  }

  return {
    credits: { enabled: false },
    exporting: {
      enabled: true,
      fallbackToExportServer: false,
      filename: safeFileName(context.selected.chartTitle || "custom-chart")
    },
    accessibility: { enabled: false },
    ...(result as Highcharts.Options)
  };
}

function buildChartOptions(
  chartKind: ChartKind,
  rows: CsvRow[],
  xColumn: string,
  yColumns: string[],
  chartTitle: string
): Highcharts.Options {
  const titleText = chartTitle.trim() || (rows.length ? "CSV visualization" : "Upload a CSV to begin");
  const commonOptions: Highcharts.Options = {
    credits: { enabled: false },
    exporting: {
      enabled: true,
      fallbackToExportServer: false,
      filename: safeFileName(titleText)
    }
  };

  if (!rows.length || !xColumn || !yColumns.length) {
    return {
      ...commonOptions,
      title: { text: titleText },
      subtitle: { text: "Choose an X column and at least one numeric value column." },
      series: []
    };
  }

  if (chartKind === "pie") {
    const valueColumn = yColumns[0];
    const points = rows
      .map((row, index) => ({
        name: getLabel(row, xColumn, index),
        y: getNumber(row, valueColumn) ?? 0
      }))
      .filter((point) => point.y > 0)
      .slice(0, 20);

    return {
      ...commonOptions,
      chart: { type: "pie" },
      title: { text: titleText },
      subtitle: { text: `${valueColumn} by ${xColumn}` },
      tooltip: {
        formatter: function () {
          const point = this as Highcharts.Point & { percentage?: number };
          const value = typeof point.y === "number" ? formatNumber(point.y) : "No value";
          return `<b>${point.name || "Slice"}</b><br/>${value} (${Highcharts.numberFormat(point.percentage ?? 0, 1)}%)`;
        }
      },
      accessibility: { enabled: false },
      series: [{ type: "pie", name: valueColumn, data: points }]
    };
  }

  if (chartKind === "heatmap") {
    const categories = rows.map((row, index) => getLabel(row, xColumn, index));
    const data: Highcharts.PointOptionsObject[] = [];

    yColumns.forEach((column, yIndex) => {
      rows.forEach((row, xIndex) => {
        const value = getNumber(row, column);
        if (value !== null) {
          data.push({ x: xIndex, y: yIndex, value });
        }
      });
    });

    return {
      ...commonOptions,
      chart: { type: "heatmap" },
      title: { text: titleText },
      xAxis: {
        categories,
        title: { text: xColumn }
      },
      yAxis: { categories: yColumns, title: undefined, reversed: true },
      colorAxis: {
        minColor: "#f7fbff",
        maxColor: "#0f766e"
      },
      tooltip: {
        formatter: function () {
          const point = this as Highcharts.Point & { value?: number };
          const yLabel = this.series.yAxis.categories[point.y || 0] ?? "Dataset";
          const xLabel = this.series.xAxis.categories[point.x || 0] ?? "Row";
          const value = typeof point.value === "number" ? formatNumber(point.value) : "No value";
          return `<b>${yLabel}</b><br/>${xLabel}: <b>${value}</b>`;
        }
      },
      accessibility: { enabled: false },
      series: [{ type: "heatmap", name: "Value", data, borderWidth: 1 }]
    };
  }

  const categories = rows.map((row, index) => getLabel(row, xColumn, index));
  const smartYAxes = buildSmartYAxes(rows, yColumns);
  const hasSecondaryAxis = smartYAxes.length > 1;
  const maxMagnitude = Math.max(...yColumns.map((column) => getMedianMagnitude(rows, column)), 0);
  const series = yColumns.map<Highcharts.SeriesOptionsType>((column) => ({
    type: chartKind === "bar" ? "column" : "line",
    name: column,
    yAxis: hasSecondaryAxis && getMedianMagnitude(rows, column) < maxMagnitude / 10 ? 1 : 0,
    data: rows.map((row, index) => ({
      y: getNumber(row, column),
      custom: {
        xLabel: categories[index]
      }
    }))
  }));

  return {
    ...commonOptions,
    chart: { type: chartKind === "bar" ? "column" : "line", zooming: { type: "x" } },
    title: { text: titleText },
    xAxis: {
      categories,
      title: { text: xColumn }
    },
    yAxis: smartYAxes,
    tooltip: {
      shared: true,
      useHTML: true,
      formatter: function () {
        const context = this as Highcharts.Point & {
          key?: string | number;
          points?: Highcharts.Point[];
        };
        const points = context.points ?? [context];
        const labelPoint = points.find(Boolean) ?? context;
        const label = getPointXLabel(labelPoint, categories);
        const lines = points
          .filter(Boolean)
          .map((point: Highcharts.Point) => {
            const value = typeof point.y === "number" ? formatNumber(point.y) : "No value";
            return `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${value}</b>`;
          });

        return `<b>${xColumn}: ${label}</b><br/>${lines.join("<br/>")}`;
      }
    },
    accessibility: { enabled: false },
    series
  };
}

export default function App() {
  const chartRef = useRef<HighchartsReactRefObject | null>(null);
  const [activePage, setActivePage] = useState<PageKind>("chart");
  const [fileName, setFileName] = useState<string>("Rubber Pre-Production Experiment Demo");
  const [rows, setRows] = useState<CsvRow[]>(() =>
    normalizeRows(Papa.parse<Record<string, unknown>>(sampleCsv, { header: true, skipEmptyLines: true }).data)
  );
  const [parseMessage, setParseMessage] = useState("Rubber experiment demo loaded. Upload your own CSV when ready.");
  const [chartKind, setChartKind] = useState<ChartKind>("line");
  const [chartTitle, setChartTitle] = useState("Rubber Performance Trend");
  const [xColumn, setXColumn] = useState("ExperimentDate");
  const [yColumns, setYColumns] = useState<string[]>(["TensileStrengthMPa", "PassRatePercent"]);
  const [startRow, setStartRow] = useState(1);
  const [endRow, setEndRow] = useState(12);
  const [rowLimit, setRowLimit] = useState(500);
  const [tableSearch, setTableSearch] = useState("");
  const [customConfigName, setCustomConfigName] = useState("Rubber custom chart");
  const [customConfigCode, setCustomConfigCode] = useState(generatedCustomConfigCode);
  const [customConfigError, setCustomConfigError] = useState("");
  const [customConfigMessage, setCustomConfigMessage] = useState("Edit config, then apply or save to render.");
  const [customChartOptions, setCustomChartOptions] = useState<Highcharts.Options | null>(null);
  const [savedChartConfigs, setSavedChartConfigs] = useState<SavedChartConfig[]>(() => readSavedChartConfigs());

  const columns = useMemo(() => inferColumns(rows), [rows]);
  const numericColumns = columns.filter((column) => column.type === "number");
  const visibleRows = rows.slice(Math.max(startRow - 1, 0), Math.min(endRow, rows.length, rowLimit));
  const indexedRows = useMemo(
    () => rows.map((row, sourceIndex) => ({ row, sourceIndex })),
    [rows]
  );
  const filteredTableRows = useMemo(() => {
    const normalizedSearch = tableSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return indexedRows;
    }

    return indexedRows.filter(({ row }) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch))
    );
  }, [indexedRows, tableSearch]);
  const dataPreviewRows = filteredTableRows.slice(
    Math.max(startRow - 1, 0),
    Math.min(endRow, filteredTableRows.length, rowLimit)
  );
  const chartOptions = useMemo(
    () => buildChartOptions(chartKind, visibleRows, xColumn, yColumns, chartTitle),
    [chartKind, visibleRows, xColumn, yColumns, chartTitle]
  );
  const customChartContext = useMemo(
    () => createCustomChartContext(visibleRows, columns, xColumn, yColumns, chartTitle),
    [visibleRows, columns, xColumn, yColumns, chartTitle]
  );
  const activeCustomChartOptions = customChartOptions ?? chartOptions;

  function loadRows(nextRows: CsvRow[], nextFileName: string, message: string) {
    const nextColumns = inferColumns(nextRows);
    const firstNonNumber = nextColumns.find((column) => column.type !== "number") ?? nextColumns[0];
    const nextNumericColumns = nextColumns.filter((column) => column.type === "number");

    setRows(nextRows);
    setFileName(nextFileName);
    setParseMessage(message);
    setXColumn(firstNonNumber?.name ?? nextColumns[0]?.name ?? "");
    setYColumns(nextNumericColumns.slice(0, 2).map((column) => column.name));
    setChartTitle(nextNumericColumns[0] ? `${nextNumericColumns[0].name} by ${firstNonNumber?.name ?? "row"}` : "CSV visualization");
    setStartRow(1);
    setEndRow(Math.min(nextRows.length, 100));
    setTableSearch("");
    setCustomChartOptions(null);
    setCustomConfigError("");
    setCustomConfigMessage("Data changed. Apply custom config to render with the new rows.");
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const nextRows = normalizeRows(result.data);
        if (!nextRows.length) {
          setParseMessage("The CSV file appears to be empty.");
          return;
        }

        const warningText = result.errors.length
          ? `Loaded with ${result.errors.length} parser warning(s).`
          : "Loaded successfully.";
        loadRows(nextRows, file.name, warningText);
      },
      error: (error) => {
        setParseMessage(error.message);
      }
    });
  }

  function toggleYColumn(column: string) {
    setYColumns((current) => {
      if (current.includes(column)) {
        return current.filter((item) => item !== column);
      }
      return [...current, column];
    });
  }

  function resetSample() {
    loadRows(
      normalizeRows(Papa.parse<Record<string, unknown>>(sampleCsv, { header: true, skipEmptyLines: true }).data),
      "Rubber Pre-Production Experiment Demo",
      "Rubber experiment demo loaded. Upload your own CSV when ready."
    );
    setChartKind("line");
    setChartTitle("Rubber Performance Trend");
    setXColumn("ExperimentDate");
    setYColumns(["TensileStrengthMPa", "PassRatePercent"]);
  }

  function clearData() {
    setRows([]);
    setFileName("No file selected");
    setParseMessage("Upload a CSV file to create a chart.");
    setChartTitle("CSV visualization");
    setXColumn("");
    setYColumns([]);
    setStartRow(1);
    setEndRow(1);
    setTableSearch("");
    setCustomChartOptions(null);
    setCustomConfigError("");
    setCustomConfigMessage("Data cleared. Upload data or reset sample data to continue.");
  }

  function applyCustomConfig() {
    try {
      const nextOptions = evaluateCustomChartConfig(customConfigCode, customChartContext);
      setCustomChartOptions(nextOptions);
      setCustomConfigError("");
      setCustomConfigMessage("Custom config applied.");
    } catch (error) {
      setCustomConfigError(error instanceof Error ? error.message : "Custom chart config failed.");
    }
  }

  function saveCustomConfig() {
    try {
      const nextOptions = evaluateCustomChartConfig(customConfigCode, customChartContext);
      const now = new Date().toISOString();
      const normalizedName = customConfigName.trim() || "Untitled chart config";
      const existing = savedChartConfigs.find((config) => config.name === normalizedName);
      const nextConfig: SavedChartConfig = {
        id: existing?.id ?? createConfigId(),
        name: normalizedName,
        code: customConfigCode,
        updatedAt: now
      };
      const nextConfigs = [
        nextConfig,
        ...savedChartConfigs.filter((config) => config.id !== nextConfig.id)
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      writeSavedChartConfigs(nextConfigs);
      setSavedChartConfigs(nextConfigs);
      setCustomChartOptions(nextOptions);
      setCustomConfigError("");
      setCustomConfigMessage(`Saved and applied "${normalizedName}".`);
    } catch (error) {
      setCustomConfigError(error instanceof Error ? error.message : "Custom chart config failed.");
    }
  }

  function loadSavedConfig(configId: string) {
    const config = savedChartConfigs.find((item) => item.id === configId);
    if (!config) {
      return;
    }

    setCustomConfigName(config.name);
    setCustomConfigCode(config.code);
    setCustomChartOptions(null);
    setCustomConfigError("");
    setCustomConfigMessage(`Loaded "${config.name}". Apply it to render.`);
  }

  function resetCustomConfig() {
    setCustomConfigCode(generatedCustomConfigCode);
    setCustomConfigName("Generated custom chart");
    setCustomChartOptions(null);
    setCustomConfigError("");
    setCustomConfigMessage("Generated default config restored. Apply it to render.");
  }

  function deleteSavedConfigs() {
    writeSavedChartConfigs([]);
    setSavedChartConfigs([]);
    setCustomChartOptions(null);
    setCustomConfigError("");
    setCustomConfigMessage("All saved chart configs were deleted.");
  }

  function updateCell(rowIndex: number, columnName: string, value: string) {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [columnName]: normalizeCellValue(value)
            }
          : row
      )
    );
  }

  function downloadEditedCsv() {
    if (!rows.length || !columns.length) {
      return;
    }

    const csv = Papa.unparse(rows, { columns: columns.map((column) => column.name) });
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(fileName.replace(/\.csv$/i, "")) || "smart-board-data"}-edited.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local CSV dashboard</p>
          <h1>Smart Board</h1>
        </div>
        <nav className="page-tabs" aria-label="Smart Board pages">
          <button
            className={activePage === "chart" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("chart")}
          >
            <LineChart size={17} />
            <span>Chart</span>
          </button>
          <button
            className={activePage === "data" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("data")}
          >
            <Table2 size={17} />
            <span>Data Preview</span>
          </button>
          <button
            className={activePage === "custom" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("custom")}
          >
            <Code2 size={17} />
            <span>Custom Chart</span>
          </button>
        </nav>
        <div className="topbar-actions">
          <label className="button primary">
            <FileUp size={18} />
            <span>Upload CSV</span>
            <input accept=".csv,text/csv" type="file" onChange={handleUpload} />
          </label>
          <button className="button icon-button" type="button" title="Reset sample data" onClick={resetSample}>
            <RotateCcw size={18} />
          </button>
          <button className="button icon-button" type="button" title="Clear data" onClick={clearData}>
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="status-block">
            <span className="label">File</span>
            <strong>{fileName}</strong>
            <p>{parseMessage}</p>
          </div>

          {activePage === "chart" ? (
            <>
              <div className="field">
                <span className="label">Chart type</span>
                <div className="segmented">
                  {chartKinds.map((kind) => {
                    const Icon = kind.icon;
                    return (
                      <button
                        key={kind.id}
                        className={chartKind === kind.id ? "active" : ""}
                        type="button"
                        title={`${kind.label} chart`}
                        onClick={() => setChartKind(kind.id)}
                      >
                        <Icon size={17} />
                        <span>{kind.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="field">
                <span className="label">Chart name</span>
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(event) => setChartTitle(event.target.value)}
                  placeholder="Name this chart"
                />
              </label>

              <label className="field">
                <span className="label">X axis / labels</span>
                <select value={xColumn} onChange={(event) => setXColumn(event.target.value)}>
                  {columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name} ({column.type})
                    </option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span className="label">Data sets</span>
                <div className="check-list">
                  {numericColumns.length ? (
                    numericColumns.map((column) => (
                      <label key={column.name} className="check-row">
                        <input
                          checked={yColumns.includes(column.name)}
                          type="checkbox"
                          onChange={() => toggleYColumn(column.name)}
                        />
                        <span>{column.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="muted">No numeric columns detected.</p>
                  )}
                </div>
              </div>
            </>
          ) : activePage === "data" ? (
            <>
              <label className="field">
                <span className="label">Search table</span>
                <input
                  type="search"
                  value={tableSearch}
                  onChange={(event) => {
                    setTableSearch(event.target.value);
                    setStartRow(1);
                  }}
                  placeholder="Filter rows"
                />
              </label>

              <div className="panel-stat">
                <span className="label">Filtered rows</span>
                <strong>{filteredTableRows.length}</strong>
                <p>Matching rows from the current uploaded data.</p>
              </div>

              <div className="panel-stat">
                <span className="label">Columns</span>
                <strong>{columns.length}</strong>
                <p>{numericColumns.length} numeric columns detected.</p>
              </div>

              <button className="button sidebar-action" type="button" onClick={downloadEditedCsv}>
                <FileDown size={18} />
                <span>Download CSV</span>
              </button>
            </>
          ) : (
            <>
              <label className="field">
                <span className="label">Config name</span>
                <input
                  type="text"
                  value={customConfigName}
                  onChange={(event) => setCustomConfigName(event.target.value)}
                  placeholder="Name this config"
                />
              </label>

              <label className="field">
                <span className="label">Saved configs</span>
                <select defaultValue="" onChange={(event) => loadSavedConfig(event.target.value)}>
                  <option value="" disabled>
                    Load saved config
                  </option>
                  {savedChartConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="label">X axis source</span>
                <select value={xColumn} onChange={(event) => setXColumn(event.target.value)}>
                  {columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name} ({column.type})
                    </option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span className="label">Selected data helpers</span>
                <div className="check-list compact">
                  {numericColumns.length ? (
                    numericColumns.map((column) => (
                      <label key={column.name} className="check-row">
                        <input
                          checked={yColumns.includes(column.name)}
                          type="checkbox"
                          onChange={() => toggleYColumn(column.name)}
                        />
                        <span>{column.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="muted">No numeric columns detected.</p>
                  )}
                </div>
              </div>

              <div className="sidebar-button-stack">
                <button className="button primary" type="button" onClick={applyCustomConfig}>
                  <Wand2 size={18} />
                  <span>Apply config</span>
                </button>
                <button className="button" type="button" onClick={saveCustomConfig}>
                  <Save size={18} />
                  <span>Save config</span>
                </button>
                <button className="button" type="button" onClick={resetCustomConfig}>
                  <RotateCcw size={18} />
                  <span>Reset generated</span>
                </button>
                <button className="button danger" type="button" onClick={deleteSavedConfigs}>
                  <Trash2 size={18} />
                  <span>Delete saved</span>
                </button>
              </div>

              <div className="helper-note">
                Use <code>context.seriesFromSelected("line")</code> to reuse selected CSV columns, or write your
                own <code>series</code> manually.
              </div>
            </>
          )}

          <div className="field two-columns">
            <label>
              <span className="label">Start row</span>
              <input
                min={1}
                max={Math.max(activePage === "data" ? filteredTableRows.length : rows.length, 1)}
                type="number"
                value={startRow}
                onChange={(event) => setStartRow(Number(event.target.value))}
              />
            </label>
            <label>
              <span className="label">End row</span>
              <input
                min={1}
                max={Math.max(activePage === "data" ? filteredTableRows.length : rows.length, 1)}
                type="number"
                value={endRow}
                onChange={(event) => setEndRow(Number(event.target.value))}
              />
            </label>
          </div>

          <label className="field">
            <span className="label">Maximum displayed rows</span>
            <input
              min={1}
              max={5000}
              type="number"
              value={rowLimit}
              onChange={(event) => setRowLimit(Number(event.target.value))}
            />
          </label>
        </aside>

        <section className="main-panel">
          {activePage === "chart" ? (
            <>
              <div className="chart-header">
                <div>
                  <span className="label">Rows displayed</span>
                  <strong>
                    {visibleRows.length} of {rows.length}
                  </strong>
                </div>
                <div>
                  <span className="label">Columns</span>
                  <strong>{columns.length}</strong>
                </div>
                <div>
                  <span className="label">Numeric data sets</span>
                  <strong>{numericColumns.length}</strong>
                </div>
              </div>

              <div className="chart-surface">
                <HighchartsReact
                  key={chartKind}
                  ref={chartRef}
                  highcharts={Highcharts}
                  immutable
                  options={chartOptions}
                />
              </div>
            </>
          ) : activePage === "data" ? (
            <section className="data-page">
              <div className="data-page-header">
                <div>
                  <p className="eyebrow">Editable uploaded data</p>
                  <h2>Data Preview</h2>
                </div>
              </div>
              <div className="data-summary">
                <div>
                  <span className="label">Visible rows</span>
                  <strong>{dataPreviewRows.length}</strong>
                </div>
                <div>
                  <span className="label">Filtered rows</span>
                  <strong>{filteredTableRows.length}</strong>
                </div>
                <div>
                  <span className="label">Columns</span>
                  <strong>{columns.length}</strong>
                </div>
              </div>
              <div className="editable-table-wrap">
                <table className="editable-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {columns.map((column) => (
                        <th key={column.name}>
                          <span>{column.name}</span>
                          <small>{column.type}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPreviewRows.map(({ row, sourceIndex }) => {
                      return (
                        <tr key={sourceIndex}>
                          <td className="row-number">{sourceIndex + 1}</td>
                          {columns.map((column) => (
                            <td key={column.name}>
                              <input
                                value={row[column.name] ?? ""}
                                onChange={(event) => updateCell(sourceIndex, column.name, event.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="custom-page">
              <div className="custom-header">
                <div>
                  <p className="eyebrow">Highcharts JS options</p>
                  <h2>Custom Chart</h2>
                </div>
                <div className={customConfigError ? "config-status warning" : "config-status"}>
                  {customConfigError || customConfigMessage}
                </div>
              </div>

              <div className="custom-grid">
                <div className="custom-preview">
                  <HighchartsReact
                    key={customChartOptions ? "custom-applied" : `custom-${chartKind}`}
                    highcharts={Highcharts}
                    immutable
                    options={activeCustomChartOptions}
                  />
                </div>

                <div className="code-panel">
                  <div className="code-panel-header">
                    <span className="label">JS config editor</span>
                    <span>{savedChartConfigs.length} saved</span>
                  </div>
                  <textarea
                    spellCheck={false}
                    value={customConfigCode}
                    onChange={(event) => setCustomConfigCode(event.target.value)}
                  />
                  <div className="helper-block">
                    <strong>Available helpers</strong>
                    <pre>{`context.rows
context.columns
context.categories
context.selected.xColumn
context.selected.yColumns
context.getNumber(row, "ColumnName")
context.seriesFromSelected("line")`}</pre>
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
