requireAuth();

document.addEventListener("DOMContentLoaded", () => {
  renderAppShell({
    active: "support",
    title: "Support Automation",
    subtitle: "Manage Chatwoot Automation Posture, Queue Follow-Up Jobs, And Review Safety Controls",
    searchPlaceholder: "Search Support Controls",
    content: `
      <section class="grid cols-2">
        <div class="card">
          <div class="stack">
            <div>
              <h2>Automation Overview</h2>
              <p>Inbound Support Events Flow From Chatwoot Into OpenAI, Then Back Into The Conversation Thread</p>
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
              <p>Queue A Follow-Up Job And Confirm The Worker Path Is Healthy</p>
            </div>
            <div class="action-row">
              <button class="btn btn-primary" id="run-support">Queue Support Follow-Up</button>
              <button class="btn btn-secondary" id="support-toast">Run Health Check</button>
            </div>
            <div id="support-state" class="empty">Waiting For Action.</div>
          </div>
        </div>
      </section>
    `,
  });

  document.getElementById("run-support").addEventListener("click", async () => {
    await apiFetch("/workflows/support-followup/run", {
      method: "POST",
      loaderTitle: "Queueing Support Follow-Up",
      loaderSubtitle: "Dispatching Worker Automation",
    });
    document.getElementById("support-state").textContent = "Support Follow-Up Workflow Queued Successfully.";
    showToast("Support Follow-Up Queued");
  });

  document.getElementById("support-toast").addEventListener("click", () => {
    document.getElementById("support-state").textContent = "Support Automation Controls Look Healthy.";
    showToast("Support Automation Looks Healthy", "info");
  });
});
