requireAuth();

document.addEventListener("DOMContentLoaded", () => {
  renderAppShell({
    active: "settings",
    title: "Workspace Settings",
    subtitle: "Manage Theme Preferences, Security Posture, Session Behavior, And Workspace Defaults",
    searchPlaceholder: "Search Workspace Settings",
    content: `
      <section class="settings-grid">
        <div class="card">
          <h2>Appearance</h2>
          <div class="settings-list">
            <div class="settings-item">
              <div>
                <strong>Theme Mode</strong>
                <div class="label">Switch Between Light Mode And Dark Mode</div>
              </div>
              <button class="btn btn-secondary" id="settings-theme-toggle">Toggle Theme</button>
            </div>
            <div class="settings-item">
              <div>
                <strong>Navigation Style</strong>
                <div class="label">Modern SaaS Sidebar With Top Utility Bar</div>
              </div>
              <span class="status-chip">Active</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h2>Security</h2>
          <div class="settings-list">
            <div class="settings-item">
              <div>
                <strong>Jwt Sessions</strong>
                <div class="label">Session Tokens Stored Securely For Authenticated Flows</div>
              </div>
              <span class="status-chip">Enabled</span>
            </div>
            <div class="settings-item">
              <div>
                <strong>Rate Limiting</strong>
                <div class="label">Slowapi Guards Auth, Workflows, And Webhooks</div>
              </div>
              <span class="status-chip">Enabled</span>
            </div>
            <div class="settings-item">
              <div>
                <strong>Local Session</strong>
                <div class="label">Clear Access And Refresh Tokens On Demand</div>
              </div>
              <button class="btn btn-danger" id="settings-logout">Clear Session</button>
            </div>
          </div>
        </div>
      </section>
      <section class="card" style="margin-top:24px;">
        <h2>Workspace Notes</h2>
        <div class="empty">This Mvp Uses A Shared Frontend Shell, Background Workers, Caching, And Modern SaaS Interaction Patterns Across Lead Automation And Social Automation.</div>
      </section>
    `,
  });

  document.getElementById("settings-theme-toggle").addEventListener("click", () => {
    toggleTheme();
    showToast("Theme Preference Updated");
  });

  document.getElementById("settings-logout").addEventListener("click", () => {
    clearTokens();
    showToast("Session Cleared", "info");
    window.location.href = "/login.html";
  });
});
