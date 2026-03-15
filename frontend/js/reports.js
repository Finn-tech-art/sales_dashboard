requireAuth();

let reportsChart = null;
let summaryChart = null;

function renderChart(canvasId, config, existingChartRef) {
  const context = document.getElementById(canvasId);
  if (!context || typeof Chart === "undefined") {
    return existingChartRef;
  }
  existingChartRef?.destroy();
  return new Chart(context, config);
}

function workflowLabel(report) {
  try {
    const payload = report.payload ? JSON.parse(report.payload) : {};
    return report.workflow_name || payload.topic || report.domain || report.status;
  } catch {
    return report.workflow_name || report.domain || report.status;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "reports",
    title: "Reports And Analytics",
    subtitle: "Review The Current Report Payloads, Workflow Counts, And Operational Trends Returned By The Backend",
    searchPlaceholder: "Search Reports And Workflow History",
    actions: '<button class="btn btn-primary" id="trigger-report">Run Weekly Report</button>',
    content: `
      <section class="summary-grid" id="report-summary"></section>
      <section class="metric-grid metric-grid-compact" id="report-metrics"></section>
      <section class="chart-grid" style="margin-top:24px;">
        <div class="card chart-card">
          <h2>Workflow Volume Over Time</h2>
          <canvas id="reports-line-chart" aria-label="Workflow Volume Over Time"></canvas>
        </div>
        <div class="card chart-card">
          <h2>Business Mix Snapshot</h2>
          <canvas id="reports-bar-chart" aria-label="Business Mix Snapshot"></canvas>
        </div>
      </section>
      <section class="card" style="margin-top:24px;">
        <div class="toolbar">
          <div>
            <h2>Recent Report Runs</h2>
            <p>Latest Weekly Report, Social Trend, And Social Analytics Jobs</p>
          </div>
        </div>
        <div id="report-history"></div>
      </section>
    `,
  });

  async function loadReports() {
    const reports = await apiFetch("/reports/", {
      loaderTitle: "Loading Reports",
      loaderSubtitle: "Compiling Analytics And Workflow History",
    });

    document.getElementById("report-summary").innerHTML = `
      <article class="summary-card"><span class="metric-icon">${iconMarkup("reports")}</span><div><div class="label">Report Runs</div><strong>${reports.recent_reports.length}</strong><p>Recent Report And Analytics Workflows</p></div></article>
      <article class="summary-card"><span class="metric-icon">${iconMarkup("dashboard")}</span><div><div class="label">Records Processed</div><strong>${reports.recent_reports.reduce((sum, item) => sum + Number(item.records_processed || 0), 0)}</strong><p>Total Records Processed Across Recent Runs</p></div></article>
      <article class="summary-card"><span class="metric-icon">${iconMarkup("social")}</span><div><div class="label">Records Created</div><strong>${reports.recent_reports.reduce((sum, item) => sum + Number(item.records_created || 0), 0)}</strong><p>Total Records Created Across Recent Runs</p></div></article>
    `;

    document.getElementById("report-metrics").innerHTML = Object.entries(reports.totals)
      .map(
        ([key, value]) => `
          <article class="card metric-card">
            <div class="metric-header">
              <span class="metric-icon">${iconMarkup(key.includes("trend") || key.includes("post") ? "social" : "reports")}</span>
              <span class="trend-indicator">Executive Summary</span>
            </div>
            <div class="label">${titleCase(key)}</div>
            <strong class="metric-value">${Number(value || 0).toLocaleString()}</strong>
            <div class="metric-footer label">Updated From Live Data</div>
          </article>
        `
      )
      .join("");

    document.getElementById("report-history").innerHTML = reports.recent_reports.length
      ? `
        <table class="table workflow-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Processed</th>
              <th>Created</th>
              <th>Runtime</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            ${reports.recent_reports
              .map(
                (report) => `
                  <tr>
                    <td>${titleCase(workflowLabel(report))}</td>
                    <td>${titleCase(report.domain || "General")}</td>
                    <td><span class="status-chip">${titleCase(report.status)}</span></td>
                    <td>${report.records_processed || 0}</td>
                    <td>${report.records_created || 0}</td>
                    <td>${Number(report.execution_time || 0).toFixed(1)}s</td>
                    <td>${new Date(report.started_at).toLocaleString()}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : '<div class="empty">No Report Runs Yet.</div>';

    const timelineLabels = reports.recent_reports.map((report) => new Date(report.started_at).toLocaleDateString()).reverse();
    const timelineValues = reports.recent_reports.map((report) => report.records_processed || 0).reverse();

    reportsChart = renderChart(
      "reports-line-chart",
      {
        type: "line",
        data: {
          labels: timelineLabels,
          datasets: [
            {
              label: "Records Processed",
              data: timelineValues,
              borderColor: "#2563EB",
              backgroundColor: "rgba(37, 99, 235, 0.14)",
              tension: 0.32,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.16)" } },
            x: { grid: { display: false } },
          },
        },
      },
      reportsChart
    );

    summaryChart = renderChart(
      "reports-bar-chart",
      {
        type: "bar",
        data: {
          labels: Object.keys(reports.totals).map((key) => titleCase(key)),
          datasets: [
            {
              data: Object.values(reports.totals),
              backgroundColor: ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#1D4ED8", "#0EA5E9", "#2563EB"],
              borderRadius: 12,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.16)" } },
            x: { grid: { display: false } },
          },
        },
      },
      summaryChart
    );
  }

  document.getElementById("trigger-report").addEventListener("click", async () => {
    await apiFetch("/workflows/weekly-report/run", {
      method: "POST",
      loaderTitle: "Running Weekly Report",
      loaderSubtitle: "Queueing Executive Summary Generation",
    });
    showToast("Weekly Report Queued");
    await loadReports();
  });

  await loadReports();
});
