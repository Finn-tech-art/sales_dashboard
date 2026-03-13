requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "outreach",
    title: "Outreach Queue",
    subtitle: "Review generated emails and see which contacts have already been touched.",
    content: '<div class="card"><div id="outreach-list"></div></div>',
  });

  const logs = await apiFetch("/outreach/");
  document.getElementById("outreach-list").innerHTML = logs.length
    ? `
      <table class="table">
        <thead><tr><th>Lead</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead>
        <tbody>
          ${logs
            .map(
              (log) => `
                <tr>
                  <td>${log.lead_id || "-"}</td>
                  <td>${log.subject || "-"}</td>
                  <td>${log.status}</td>
                  <td>${new Date(log.sent_at).toLocaleString()}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `
    : '<div class="empty">No outreach activity yet.</div>';
});
