requireAuth();

const DASHBOARD_TRENDS = {
  total_leads: "+18% This Week",
  outreach_sent: "+11% This Week",
  support_responses: "Realtime Automation",
  successful_workflows: "Healthy Queue",
  tracked_trends: "Fresh Daily",
  draft_posts: "Ready For Review",
  published_posts: "Multi-Platform",
};

const DASHBOARD_ICONS = {
  total_leads: "leads",
  outreach_sent: "outreach",
  support_responses: "support",
  successful_workflows: "dashboard",
  tracked_trends: "social",
  draft_posts: "social",
  published_posts: "reports",
};

function metricCard(key, value) {
  return `
    <article class="card metric-card">
      <div class="metric-header">
        <span class="metric-icon">${iconMarkup(DASHBOARD_ICONS[key] || "dashboard")}</span>
        <span class="trend-indicator">${titleCase(DASHBOARD_TRENDS[key] || "Live Now")}</span>
      </div>
      <div class="label">${titleCase(key)}</div>
      <strong class="metric-value">${value}</strong>
      <div class="metric-footer label">Updated In Real Time</div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "dashboard",
    title: "Command Center",
    subtitle: "Track Leads, Social Publishing, Outreach, Support, And Reporting From One Operator View",
    searchPlaceholder: "Search Leads, Posts, And Reports",
    actions:
      '<button class="btn btn-secondary" type="button" onclick="clearTokens(); window.location.href=\'/login.html\'">' +
      iconMarkup("logOut") +
      "Log Out</button>",
    content: `
      <section class="metric-grid" id="metric-grid"></section>
      <section class="split" style="margin-top:24px;">
        <div class="card">
          <div class="toolbar">
            <div>
              <h2>Workflow Activity</h2>
              <p>Recent Background Jobs Across Lead Automation And Social Automation</p>
            </div>
            <button class="btn btn-secondary" id="refresh-dashboard">Refresh</button>
          </div>
          <div id="workflow-list" class="stack"></div>
        </div>
        <div class="card">
          <div class="stack">
            <div>
              <h2>Operator Actions</h2>
              <p>Launch The Most Common Jobs Without Leaving The Dashboard</p>
            </div>
            <div class="action-row">
              <button class="btn btn-primary" id="run-report">Run Weekly Report</button>
              <button class="btn btn-secondary" id="run-social-trends">Run Social Trends</button>
            </div>
            <div class="empty">Lead Sourcing Runs Daily. Social Trends Can Be Triggered On Demand. Reports Run Weekly.</div>
            <div class="card" style="padding:18px;">
              <div class="label">Workspace Quality</div>
              <strong class="metric-value" style="font-size:1.5rem;">Stable</strong>
              <div class="trend-indicator">Queues Healthy And Ready</div>
            </div>
          </div>
        </div>
      </section>
    `,
  });

  async function loadDashboard() {
    const dashboard = await apiFetch("/dashboard/", {
      loaderTitle: "Loading Dashboard",
      loaderSubtitle: "Preparing Your Workspace Overview",
    });

    document.getElementById("metric-grid").innerHTML = Object.entries(dashboard.kpis)
      .map(([key, value]) => metricCard(key, value))
      .join("");

    document.getElementById("workflow-list").innerHTML = dashboard.recent_workflows.length
      ? dashboard.recent_workflows
          .map(
            (item) => `
              <article class="timeline-item">
                <div class="toolbar">
                  <div>
                    <strong>${titleCase(item.workflow_name)}</strong>
                    <div class="label">${titleCase(item.domain || "Platform")} · ${new Date(item.started_at).toLocaleString()}</div>
                  </div>
                  <span class="status-chip">${titleCase(item.status)}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Processed ${item.records_processed || 0}</span>
                  <span class="label">Created ${item.records_created || 0}</span>
                  <span class="label">Runtime ${item.execution_time || 0}s</span>
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty">No Workflow Activity Yet.</div>';
  }

  document.getElementById("run-report").addEventListener("click", async () => {
    await triggerWorkflow("weekly-report");
    showToast("Weekly Report Queued");
    await loadDashboard();
  });

  document.getElementById("run-social-trends").addEventListener("click", async () => {
    await triggerWorkflow("social-trends");
    showToast("Social Trend Discovery Queued");
    await loadDashboard();
  });

  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);

  await loadDashboard();
});
