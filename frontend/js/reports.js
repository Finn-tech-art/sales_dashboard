requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "reports",
    title: "Weekly Reporting",
    subtitle: "See the latest report snapshots and trigger a fresh executive summary.",
    actions: '<button class="btn btn-primary" id="trigger-report">Run report</button>',
    content: `
      <div class="grid cols-2">
        <div class="card"><div id="report-totals"></div></div>
        <div class="card"><div id="report-history"></div></div>
      </div>
    `,
  });

  document.getElementById("trigger-report").addEventListener("click", async () => {
    await apiFetch("/workflows/weekly-report/run", { method: "POST" });
    window.location.reload();
  });

  const reports = await apiFetch("/reports/");
  document.getElementById("report-totals").innerHTML = `
    <h2>Totals</h2>
    <div class="stack">
      ${Object.entries(reports.totals)
        .map(([key, value]) => `<div><strong>${value}</strong><div class="label">${key.replace(/_/g, " ")}</div></div>`)
        .join("")}
    </div>
  `;
  document.getElementById("report-history").innerHTML = reports.recent_reports.length
    ? `
      <h2>Recent Runs</h2>
      <div class="stack">
        ${reports.recent_reports
          .map(
            (report) => `
              <div class="timeline-item">
                <strong>${report.status}</strong>
                <p>${new Date(report.started_at).toLocaleString()}</p>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : '<div class="empty">No weekly reports have been generated yet.</div>';
});
