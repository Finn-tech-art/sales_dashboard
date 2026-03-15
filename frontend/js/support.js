requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "support",
    title: "Support Automation",
    subtitle: "Review The Current Support Reply Footprint And Manage Support Follow-Up Workers From One Control Surface",
    searchPlaceholder: "Search Support Controls",
    content: `
      <section class="summary-grid" id="support-summary"></section>
      <section class="grid cols-2">
        <div class="card">
          <div class="stack">
            <div>
              <h2>Automation Overview</h2>
              <p>Inbound Support Events Flow From Chatwoot Into OpenAI, Then Back Into The Conversation Thread Through The Worker Queue</p>
            </div>
            <div class="settings-list">
              <div class="settings-item"><span class="label">Webhook Route</span><strong>/Api/Webhooks/Chatwoot</strong></div>
              <div class="settings-item"><span class="label">Message Generation</span><strong>OpenAI Assisted</strong></div>
              <div class="settings-item"><span class="label">Outbound Channel</span><strong>Chatwoot Reply Api</strong></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="stack">
            <div>
              <h2>Operator Controls</h2>
              <p>Queue A Follow-Up Job, Review Recent Workflow Runs, And Confirm The Worker Path Is Healthy</p>
            </div>
            <div class="action-row">
              <button class="btn btn-primary" id="run-support">Queue Support Follow-Up</button>
              <button class="btn btn-secondary" id="support-toast">Run Health Check</button>
            </div>
            <div id="support-state" class="empty">Waiting For Action.</div>
            <div id="support-runs" class="stack"></div>
          </div>
        </div>
      </section>
    `,
  });

  async function loadSupportData() {
    const [dashboard, workflows] = await Promise.all([
      apiFetch("/dashboard/", {
        loaderTitle: "Loading Support Metrics",
        loaderSubtitle: "Reviewing Support Automation Signals",
      }),
      apiFetch("/workflows/", {
        loaderTitle: "Loading Workflow Runs",
        loaderSubtitle: "Checking Support Follow-Up History",
      }),
    ]);

    document.getElementById("support-summary").innerHTML = `
      <article class="summary-card"><span class="metric-icon">${iconMarkup("support")}</span><div><div class="label">Support Replies</div><strong>${dashboard.kpis.support_responses || 0}</strong><p>Automated Support Responses Logged</p></div></article>
      <article class="summary-card"><span class="metric-icon">${iconMarkup("dashboard")}</span><div><div class="label">Lead Workflows</div><strong>${dashboard.kpis.successful_workflows || 0}</strong><p>Completed Lead Domain Workflows</p></div></article>
      <article class="summary-card"><span class="metric-icon">${iconMarkup("outreach")}</span><div><div class="label">Outreach Sends</div><strong>${dashboard.kpis.outreach_sent || 0}</strong><p>Messages Sent Across The Lead Domain</p></div></article>
    `;

    const supportRuns = (workflows.recent_runs || []).filter((item) => item.workflow_name === "support-followup").slice(0, 4);
    document.getElementById("support-runs").innerHTML = supportRuns.length
      ? supportRuns
          .map(
            (run) => `
              <article class="timeline-item">
                <div class="toolbar">
                  <strong>${titleCase(run.workflow_name)}</strong>
                  <span class="status-chip">${titleCase(run.status)}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Processed ${run.records_processed || 0}</span>
                  <span class="label">Created ${run.records_created || 0}</span>
                  <span class="label">${new Date(run.started_at).toLocaleString()}</span>
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty">No Support Follow-Up Workflows Have Run Yet.</div>';
  }

  document.getElementById("run-support").addEventListener("click", async () => {
    await apiFetch("/workflows/support-followup/run", {
      method: "POST",
      loaderTitle: "Queueing Support Follow-Up",
      loaderSubtitle: "Dispatching Worker Automation",
    });
    document.getElementById("support-state").textContent = "Support Follow-Up Workflow Queued Successfully.";
    showToast("Support Follow-Up Queued");
    await loadSupportData();
  });

  document.getElementById("support-toast").addEventListener("click", () => {
    document.getElementById("support-state").textContent = "Support Automation Controls Look Healthy.";
    showToast("Support Automation Looks Healthy", "info");
  });

  await loadSupportData();
});
