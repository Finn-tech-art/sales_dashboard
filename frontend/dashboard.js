requireAuth();

const KPI_META = {
  total_leads: { label: "Tracked Leads", icon: "leads", note: "Lead Records In The CRM" },
  outreach_sent: { label: "Outreach Sends", icon: "outreach", note: "Logged Messages Delivered" },
  support_responses: { label: "Support Replies", icon: "support", note: "Automated Chat Replies Sent" },
  successful_workflows: { label: "Completed Lead Workflows", icon: "dashboard", note: "Lead Jobs Finished Successfully" },
  tracked_trends: { label: "Tracked Trends", icon: "social", note: "Trend Records In The Social Domain" },
  draft_posts: { label: "Draft Posts", icon: "social", note: "Posts Waiting For Approval" },
  published_posts: { label: "Published Or Scheduled Posts", icon: "reports", note: "Posts Ready For Distribution" },
};

const WORKFLOW_ACTIONS = [
  { workflow: "lead-sourcing", label: "Run Lead Sourcing", icon: "leads", note: "Start The Free Lead Discovery Pipeline" },
  { workflow: "weekly-report", label: "Run Weekly Report", icon: "reports", note: "Queue The Executive Summary Job" },
  { workflow: "social-trends", label: "Run Social Trends", icon: "social", note: "Discover New Topics For Content" },
  { workflow: "social-analytics", label: "Run Social Analytics", icon: "dashboard", note: "Refresh Stored Social Metrics" },
  { workflow: "support-followup", label: "Queue Support Follow-Up", icon: "support", note: "Push A Support Worker Task" },
];

const LEAD_METRIC_KEYS = ["total_leads", "outreach_sent", "support_responses", "successful_workflows"];
const SOCIAL_METRIC_KEYS = ["tracked_trends", "draft_posts", "published_posts"];

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function metricCard(key, value) {
  const meta = KPI_META[key] || { label: titleCase(key), icon: "dashboard", note: "Live Metric" };
  return `
    <article class="card metric-card">
      <div class="metric-header">
        <span class="metric-icon">${iconMarkup(meta.icon)}</span>
        <span class="trend-indicator">${titleCase(meta.note)}</span>
      </div>
      <div class="label">${meta.label}</div>
      <strong class="metric-value">${formatNumber(value)}</strong>
      <div class="metric-footer label">${meta.note}</div>
    </article>
  `;
}

function summaryCard(label, value, note, icon) {
  return `
    <article class="summary-card">
      <span class="metric-icon">${iconMarkup(icon)}</span>
      <div>
        <div class="label">${titleCase(label)}</div>
        <strong>${formatNumber(value)}</strong>
        <p>${titleCase(note)}</p>
      </div>
    </article>
  `;
}

function workflowTable(runs) {
  if (!runs.length) {
    return '<div class="empty">No Workflow Runs Have Been Logged Yet.</div>';
  }

  return `
    <div class="data-table-shell">
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
          ${runs
            .map(
              (item) => `
                <tr>
                  <td><strong>${titleCase(item.workflow_name)}</strong></td>
                  <td>${titleCase(item.domain || "Platform")}</td>
                  <td><span class="status-chip">${titleCase(item.status)}</span></td>
                  <td>${formatNumber(item.records_processed)}</td>
                  <td>${formatNumber(item.records_created)}</td>
                  <td>${Number(item.execution_time || 0).toFixed(1)}s</td>
                  <td>${new Date(item.started_at).toLocaleString()}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "dashboard",
    title: "Operations Dashboard",
    subtitle: "Monitor Live Lead, Outreach, Support, Social, And Workflow Performance From One Shared Control Surface",
    searchPlaceholder: "Search Leads, Posts, And Reports",
    actions:
      '<button class="btn btn-secondary" type="button" onclick="clearTokens(); window.location.href=\'/login.html\'">' +
      iconMarkup("logOut") +
      "Log Out</button>",
    content: `
      <section class="summary-grid" id="dashboard-summary"></section>
      <section class="split" style="margin-top:24px;">
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Lead Operations Snapshot</h2>
              <p>Current Lead, Outreach, Support, And Lead Workflow Metrics Pulled From The Authenticated Backend</p>
            </div>
          </div>
          <div class="metric-grid metric-grid-compact" id="lead-metric-grid"></div>
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Social Studio Snapshot</h2>
              <p>Live Trend And Publishing Counts From The Social Domain</p>
            </div>
          </div>
          <div class="metric-grid metric-grid-compact" id="social-metric-grid"></div>
        </div>
      </section>
      <section class="board-grid" style="margin-top:24px;">
        <div class="card">
          <div class="toolbar">
            <div>
              <h2>Recent Workflow Activity</h2>
              <p>Queued And Completed Jobs Across Lead Automation And Social Automation</p>
            </div>
            <button class="btn btn-secondary" id="refresh-dashboard">Refresh Dashboard</button>
          </div>
          <div id="workflow-list"></div>
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Operator Actions</h2>
              <p>Run Only The Workflows That Are Actually Available In This Environment</p>
            </div>
          </div>
          <div class="stack" id="workflow-actions"></div>
        </div>
      </section>
    `,
  });

  async function loadDashboard() {
    const [dashboard, workflows] = await Promise.all([
      apiFetch("/dashboard/", {
        loaderTitle: "Loading Dashboard",
        loaderSubtitle: "Preparing Your Workspace Overview",
      }),
      apiFetch("/workflows/", {
        loaderTitle: "Loading Workflows",
        loaderSubtitle: "Checking Available Background Jobs",
      }),
    ]);

    document.getElementById("dashboard-summary").innerHTML = [
      summaryCard("Lead Pipeline", dashboard.kpis.total_leads || 0, "Tracked Leads Currently Stored", "leads"),
      summaryCard(
        "Message Operations",
        (dashboard.kpis.outreach_sent || 0) + (dashboard.kpis.support_responses || 0),
        "Outreach Sends And Support Replies Logged",
        "outreach"
      ),
      summaryCard(
        "Social Output",
        (dashboard.kpis.draft_posts || 0) + (dashboard.kpis.published_posts || 0),
        "Draft And Published Social Posts",
        "social"
      ),
    ].join("");

    document.getElementById("lead-metric-grid").innerHTML = LEAD_METRIC_KEYS.map((key) => metricCard(key, dashboard.kpis[key] || 0)).join("");
    document.getElementById("social-metric-grid").innerHTML = SOCIAL_METRIC_KEYS.map((key) => metricCard(key, dashboard.kpis[key] || 0)).join("");
    document.getElementById("workflow-list").innerHTML = workflowTable(dashboard.recent_workflows || []);

    const availableWorkflows = new Set(workflows.available || []);
    document.getElementById("workflow-actions").innerHTML = WORKFLOW_ACTIONS.filter((item) => availableWorkflows.has(item.workflow))
      .map(
        (item) => `
          <article class="action-card">
            <div class="metric-header">
              <span class="metric-icon">${iconMarkup(item.icon)}</span>
              <span class="status-chip">Available</span>
            </div>
            <strong>${titleCase(item.label)}</strong>
            <p>${titleCase(item.note)}</p>
            <button class="btn btn-primary" type="button" data-run-workflow="${item.workflow}">Run Workflow</button>
          </article>
        `
      )
      .join("");

    document.querySelectorAll("[data-run-workflow]").forEach((button) => {
      button.addEventListener("click", async () => {
        const workflow = button.getAttribute("data-run-workflow");
        await apiFetch(`/workflows/${workflow}/run`, {
          method: "POST",
          loaderTitle: "Queueing Workflow",
          loaderSubtitle: `Dispatching ${workflow}`,
        });
        showToast(`${workflow} Queued`);
        await loadDashboard();
      });
    });
  }

  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);

  await loadDashboard();
});
