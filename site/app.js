const state = {
  activeCategory: "ALL",
  searchTerm: "",
};

let data;

const dashboardName = document.querySelector("#dashboard-name");
const dashboardTagline = document.querySelector("#dashboard-tagline");
const heroNarrative = document.querySelector("#hero-narrative");
const generatedDate = document.querySelector("#generated-date");
const summaryProviders = document.querySelector("#summary-providers");
const summaryGeographies = document.querySelector("#summary-geographies");
const summaryExports = document.querySelector("#summary-exports");
const statusGrid = document.querySelector("#status-grid");
const categoryBars = document.querySelector("#category-bars");
const technologyBars = document.querySelector("#technology-bars");
const sourceList = document.querySelector("#source-list");
const categoryFilter = document.querySelector("#category-filter");
const providerSearch = document.querySelector("#provider-search");
const providerTableTitle = document.querySelector("#provider-table-title");
const providerTableBody = document.querySelector("#provider-table-body");
const viewGrid = document.querySelector("#view-grid");
const metricList = document.querySelector("#metric-list");
const roadmapList = document.querySelector("#roadmap-list");
const downloadGrid = document.querySelector("#download-grid");

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function buildCsv(rows, headers) {
  const headerRow = headers.map((header) => csvEscape(header.label)).join(",");
  const body = rows
    .map((row) => headers.map((header) => csvEscape(header.getter(row))).join(","))
    .join("\n");
  return `${headerRow}\n${body}`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildWorksheetXml(name, rows, headers) {
  const headerCells = headers
    .map((header) => `<Cell><Data ss:Type="String">${xmlEscape(header.label)}</Data></Cell>`)
    .join("");
  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map((header) => `<Cell><Data ss:Type="String">${xmlEscape(header.getter(row))}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `
    <Worksheet ss:Name="${xmlEscape(name)}">
      <Table>
        <Row>${headerCells}</Row>
        ${bodyRows}
      </Table>
    </Worksheet>
  `;
}

function buildWorkbook() {
  const providerHeaders = [
    { label: "Rank", getter: (provider) => provider.rank },
    { label: "Provider", getter: (provider) => provider.name },
    { label: "Segment", getter: (provider) => provider.segment },
    { label: "Category", getter: (provider) => provider.category },
    { label: "Technologies", getter: (provider) => provider.technologies.join(", ") },
    { label: "Focus", getter: (provider) => provider.focus },
    { label: "Notes", getter: (provider) => provider.notes },
  ];
  const metricHeaders = [
    { label: "Metric family", getter: (metric) => metric.name },
    { label: "Description", getter: (metric) => metric.description },
  ];
  const sourceHeaders = [
    { label: "Source", getter: (source) => source.name },
    { label: "Status", getter: (source) => prettifyStatus(source.status) },
    { label: "Detail", getter: (source) => source.detail },
    { label: "Fields", getter: (source) => source.fields.join(", ") },
  ];

  return `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
      <Style ss:ID="Default" ss:Name="Normal">
        <Alignment ss:Vertical="Center" />
        <Font ss:FontName="Calibri" ss:Size="11" />
      </Style>
      <Style ss:ID="Header">
        <Font ss:Bold="1" />
        <Interior ss:Color="#D7ECE6" ss:Pattern="Solid" />
      </Style>
    </Styles>
    ${buildWorksheetXml("Providers", data.providerUniverse, providerHeaders)}
    ${buildWorksheetXml("Metric Dictionary", data.metricFamilies, metricHeaders)}
    ${buildWorksheetXml("Data Sources", data.dataSources, sourceHeaders)}
  </Workbook>`;
}

function downloadBlob(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function prettifyStatus(status) {
  const labels = {
    ui_ready: "UI ready",
    live_now: "Live now",
    fcc_data_ready: "Needs FCC data",
    pending_account: "Pending account",
    needs_census_enrichment: "Needs Census",
    ready_now: "Ready now",
    planned_next: "Planned next",
    optional_license: "Optional license",
    next: "Next",
    queued: "Queued",
    optional: "Optional",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function renderStatusCards() {
  const template = document.querySelector("#status-template");
  statusGrid.innerHTML = "";

  data.statusCards.forEach((card) => {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector(".mini-label").textContent = card.label;
    fragment.querySelector(".status-value").textContent = card.value;
    fragment.querySelector(".status-detail").textContent = card.detail;
    statusGrid.appendChild(fragment);
  });
}

function renderBars(target, rows) {
  const template = document.querySelector("#bar-template");
  const max = Math.max(...rows.map((row) => row.count), 1);
  target.innerHTML = "";

  rows.forEach((row) => {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector(".bar-label").textContent = row.label;
    fragment.querySelector(".bar-value").textContent = `${row.count}`;
    fragment.querySelector(".bar-fill").style.width = `${(row.count / max) * 100}%`;
    target.appendChild(fragment);
  });
}

function renderSources() {
  sourceList.innerHTML = "";

  data.dataSources.forEach((source) => {
    const item = document.createElement("article");
    item.className = "source-item";
    item.dataset.status = source.status;
    item.innerHTML = `
      <div class="card-head">
        <strong>${source.name}</strong>
        <span class="source-pill">${prettifyStatus(source.status)}</span>
      </div>
      <p>${source.detail}</p>
      <div class="source-fields">
        ${source.fields.map((field) => `<span>${field}</span>`).join("")}
      </div>
    `;
    sourceList.appendChild(item);
  });
}

function renderCategoryFilters() {
  const categories = ["ALL", ...new Set(data.providerUniverse.map((provider) => provider.category))];
  categoryFilter.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.textContent = category === "ALL" ? "All categories" : category;
    button.classList.toggle("is-active", state.activeCategory === category);
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderCategoryFilters();
      renderProviderTable();
    });
    categoryFilter.appendChild(button);
  });
}

function filteredProviders() {
  const term = state.searchTerm.trim().toLowerCase();
  return data.providerUniverse.filter((provider) => {
    const categoryMatch = state.activeCategory === "ALL" || provider.category === state.activeCategory;
    const searchMatch =
      term === "" ||
      [
        provider.name,
        provider.segment,
        provider.category,
        provider.focus,
        provider.notes,
        provider.technologies.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    return categoryMatch && searchMatch;
  });
}

function renderProviderTable() {
  const providers = filteredProviders();
  providerTableBody.innerHTML = "";
  providerTableTitle.textContent = `${providers.length} provider${providers.length === 1 ? "" : "s"} in scope`;

  providers.forEach((provider) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${provider.rank}</td>
      <td><strong>${provider.name}</strong></td>
      <td>${provider.segment}</td>
      <td><span class="table-pill">${provider.category}</span></td>
      <td>${provider.technologies.join(", ")}</td>
      <td>${provider.focus}</td>
      <td>${provider.notes}</td>
    `;
    providerTableBody.appendChild(row);
  });
}

function renderViews() {
  const template = document.querySelector("#view-template");
  viewGrid.innerHTML = "";

  data.analysisViews.forEach((view) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".view-card");
    card.dataset.status = view.status;
    fragment.querySelector(".view-name").textContent = view.name;
    fragment.querySelector(".status-badge").textContent = prettifyStatus(view.status);
    fragment.querySelector(".view-description").textContent = view.description;

    const pillList = fragment.querySelector(".pill-list");
    view.outputs.forEach((item) => {
      const pill = document.createElement("li");
      pill.textContent = item;
      pillList.appendChild(pill);
    });

    viewGrid.appendChild(fragment);
  });
}

function renderMetricDictionary() {
  metricList.innerHTML = "";
  data.metricFamilies.forEach((metric) => {
    const item = document.createElement("article");
    item.className = "definition-item";
    item.innerHTML = `<strong>${metric.name}</strong><p>${metric.description}</p>`;
    metricList.appendChild(item);
  });
}

function renderRoadmap() {
  roadmapList.innerHTML = "";
  data.roadmap.forEach((item) => {
    const card = document.createElement("article");
    card.className = "roadmap-item";
    card.dataset.status = item.status;
    card.innerHTML = `
      <div class="card-head">
        <strong>${item.title}</strong>
        <span class="source-pill">${prettifyStatus(item.status)}</span>
      </div>
      <p>${item.detail}</p>
    `;
    roadmapList.appendChild(card);
  });
}

function providerCsv() {
  return buildCsv(data.providerUniverse, [
    { label: "Rank", getter: (provider) => provider.rank },
    { label: "Provider", getter: (provider) => provider.name },
    { label: "Segment", getter: (provider) => provider.segment },
    { label: "Category", getter: (provider) => provider.category },
    { label: "Technologies", getter: (provider) => provider.technologies.join(", ") },
    { label: "Focus", getter: (provider) => provider.focus },
    { label: "Notes", getter: (provider) => provider.notes },
  ]);
}

function metricCsv() {
  return buildCsv(data.metricFamilies, [
    { label: "Metric family", getter: (metric) => metric.name },
    { label: "Description", getter: (metric) => metric.description },
  ]);
}

function sourceCsv() {
  return buildCsv(data.dataSources, [
    { label: "Source", getter: (source) => source.name },
    { label: "Status", getter: (source) => prettifyStatus(source.status) },
    { label: "Detail", getter: (source) => source.detail },
    { label: "Fields", getter: (source) => source.fields.join(", ") },
  ]);
}

function handleDownload(id) {
  if (id === "json") {
    downloadBlob("broadband-market-intelligence.json", "application/json", JSON.stringify(data, null, 2));
    return;
  }

  if (id === "providers_csv") {
    downloadBlob("provider-universe.csv", "text/csv;charset=utf-8", providerCsv());
    return;
  }

  if (id === "metrics_csv") {
    downloadBlob("metric-dictionary.csv", "text/csv;charset=utf-8", metricCsv());
    return;
  }

  if (id === "sources_csv") {
    downloadBlob("data-sources.csv", "text/csv;charset=utf-8", sourceCsv());
    return;
  }

  if (id === "excel") {
    downloadBlob("broadband-market-intelligence.xls", "application/vnd.ms-excel", buildWorkbook());
  }
}

function renderDownloads() {
  const template = document.querySelector("#download-template");
  downloadGrid.innerHTML = "";

  data.downloadCatalog.forEach((item) => {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector(".download-title").textContent = item.title;
    fragment.querySelector(".download-description").textContent = item.description;
    fragment.querySelector(".download-button").addEventListener("click", () => handleDownload(item.id));
    downloadGrid.appendChild(fragment);
  });
}

async function init() {
  data = await fetch("./data/latest.json").then((response) => response.json());

  dashboardName.textContent = data.dashboardName;
  dashboardTagline.textContent = data.tagline;
  heroNarrative.textContent = data.heroNarrative;
  generatedDate.textContent = data.generatedDateLabel;
  summaryProviders.textContent = String(data.summary.providerTargetCount);
  summaryGeographies.textContent = String(data.summary.geographyLevelCount);
  summaryExports.textContent = String(data.summary.exportFormatCount);

  providerSearch.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderProviderTable();
  });

  renderStatusCards();
  renderBars(categoryBars, data.providerCategoryBreakdown);
  renderBars(technologyBars, data.technologyCoverageBreakdown);
  renderSources();
  renderCategoryFilters();
  renderProviderTable();
  renderViews();
  renderMetricDictionary();
  renderRoadmap();
  renderDownloads();
}

init().catch((error) => {
  console.error("Failed to load dashboard data", error);
  dashboardName.textContent = "Broadband Market Intelligence";
  dashboardTagline.textContent = "The dashboard could not load its data snapshot.";
});
