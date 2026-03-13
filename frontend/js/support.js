requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "support",
    title: "Support Automation",
    subtitle: "Chatwoot webhooks feed this workflow. Replies are generated automatically and logged in the backend.",
    content: `
      <div class="grid cols-2">
        <div class="card">
          <h2>Webhook posture</h2>
          <p>Route: <code>/api/webhooks/chatwoot</code></p>
          <p>Service path: Chatwoot -> OpenAI -> Support log -> Chatwoot reply</p>
        </div>
        <div class="card">
          <h2>Workflow controls</h2>
          <button class="btn btn-primary" id="run-support">Queue support follow-up</button>
          <div id="support-state" class="empty" style="margin-top:14px;">Waiting for action.</div>
        </div>
      </div>
    `,
  });

  document.getElementById("run-support").addEventListener("click", async () => {
    await apiFetch("/workflows/support-followup/run", { method: "POST" });
    document.getElementById("support-state").textContent = "Support follow-up workflow queued.";
  });
});
