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

function safeTopic(report) {
  try {
    const payload = report.payload ? JSON.parse(report.payload) : {};
    return payload.topic || report.status;
  } catch {
    return report.status;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "reports",
    title: "Reports And Analytics",
    subtitle: "Review Executive Totals, Workflow History, And Visual Trends In One Reporting Surface",
    searchPlaceholder: "Search Reports And Workflow History",
    actions: '<button class="btn btn-primary" id="trigger-report">Run Weekly Report</button>',
    content: `
      <section class="metric-grid" id="report-metrics"></section>
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

    document.getElementById("report-metrics").innerHTML = Object.entries(reports.totals)
      .map(
        ([key, value]) => `
          <article class="card metric-card">
            <div class="metric-header">
              <span class="metric-icon">${iconMarkup(key.includes("trend") || key.includes("post") ? "social" : "reports")}</span>
              <span class="trend-indicator">Executive Summary</span>
            </div>
            <div class="label">${titleCase(key)}</div>
            <strong class="metric-value">${value}</strong>
            <div class="metric-footer label">Updated From Live Data</div>
          </article>
        `
      )
      .join("");

    document.getElementById("report-history").innerHTML = reports.recent_reports.length
      ? `
        <table class="table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Processed</th>
              <th>Created</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            ${reports.recent_reports
              .map(
                (report) => `
                  <tr>
                    <td>${titleCase(safeTopic(report))}</td>
                    <td>${titleCase(report.domain || "General")}</td>
                    <td><span class="status-chip">${titleCase(report.status)}</span></td>
                    <td>${report.records_processed || 0}</td>
                    <td>${report.records_created || 0}</td>
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
