requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "dashboard",
    title: "Command Center",
    subtitle: "Track the four core PRD workflows from a single operator view.",
    actions: '<button class="btn btn-secondary" onclick="clearTokens(); location.href=\'/login.html\'">Log out</button>',
    content: `
      <section class="metric-grid" id="metric-grid"></section>
      <section class="split" style="margin-top:18px;">
        <div class="card">
          <h2>Workflow Activity</h2>
          <div id="workflow-list" class="stack"></div>
        </div>
        <div class="card">
          <h2>Operator Notes</h2>
          <div class="stack">
            <div class="empty">Lead sourcing runs daily, outreach is webhook-driven, and reports run weekly.</div>
            <button class="btn btn-primary" id="run-report">Trigger weekly report</button>
          </div>
        </div>
      </section>
    `,
  });

  document.getElementById("run-report").addEventListener("click", async () => {
    await apiFetch("/workflows/weekly-report/run", { method: "POST" });
    window.location.reload();
  });

  const dashboard = await apiFetch("/dashboard/");
  document.getElementById("metric-grid").innerHTML = Object.entries(dashboard.kpis)
    .map(
      ([key, value]) => `
        <div class="card metric-card">
          <div class="label">${key.replace(/_/g, " ")}</div>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");

  document.getElementById("workflow-list").innerHTML = dashboard.recent_workflows.length
    ? dashboard.recent_workflows
        .map(
          (item) => `
            <div class="timeline-item">
              <strong>${item.workflow_name}</strong>
              <p>${item.status} · ${new Date(item.started_at).toLocaleString()}</p>
            </div>
          `
        )
        .join("")
    : '<div class="empty">No workflow activity yet.</div>';
});
