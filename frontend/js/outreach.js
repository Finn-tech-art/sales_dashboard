requireAuth();

let outreachLogs = [];
let outreachLeads = [];

function renderOutreachTable(items, page = 1, pageSize = 6) {
  const start = (page - 1) * pageSize;
  const rows = items.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  document.getElementById("outreach-list").innerHTML = rows.length
    ? `
      <div class="data-table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Subject</th>
              <th>Sent At</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (log) => `
                  <tr>
                    <td>${log.lead_id || "-"}</td>
                    <td>${titleCase(log.channel || "Email")}</td>
                    <td><span class="status-chip">${titleCase(log.status)}</span></td>
                    <td>${titleCase(log.subject || "No Subject Generated")}</td>
                    <td>${new Date(log.sent_at).toLocaleString()}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <div class="pagination">
          <div class="label">Showing ${rows.length} Of ${items.length} Outreach Logs</div>
          <div class="action-row">
            <button class="btn btn-secondary" type="button" id="outreach-prev" ${page === 1 ? "disabled" : ""}>Previous</button>
            <span class="label">Page ${page} Of ${totalPages}</span>
            <button class="btn btn-secondary" type="button" id="outreach-next" ${page >= totalPages ? "disabled" : ""}>Next</button>
          </div>
        </div>
      </div>
    `
    : '<div class="empty">No Outreach Activity Yet.</div>';

  document.getElementById("outreach-prev")?.addEventListener("click", () => applyOutreachFilters(page - 1));
  document.getElementById("outreach-next")?.addEventListener("click", () => applyOutreachFilters(page + 1));
}

function applyOutreachFilters(page = 1) {
  const query = document.getElementById("outreach-search").value.toLowerCase();
  const status = document.getElementById("outreach-status").value;
  const filtered = outreachLogs.filter((log) => {
    const statusMatch = status === "all" || log.status === status;
    const textMatch =
      !query ||
      [String(log.lead_id || ""), log.subject, log.channel, log.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    return statusMatch && textMatch;
  });
  renderOutreachTable(filtered, page);
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "outreach",
    title: "Outreach Queue",
    subtitle: "Review Personalized Sends, Trigger New Outreach, And Monitor Delivery Status",
    searchPlaceholder: "Search Outreach Activity",
    content: `
      <section class="grid cols-2">
        <div class="card">
          <h2>Trigger Outreach</h2>
          <p>Select A Lead And Trigger A Personalized Outreach Sequence</p>
          <form class="form" id="outreach-form">
            <div class="field floating-field">
              <select name="lead_id" id="outreach-lead-select" required></select>
              <label>Lead</label>
            </div>
            <button class="btn btn-primary" type="submit">Send Outreach</button>
            <div class="label" id="outreach-form-status"></div>
          </form>
        </div>
        <div class="card">
          <div class="toolbar">
            <div>
              <h2>Outreach History</h2>
              <p>Search, Filter, And Audit Generated Outreach Logs</p>
            </div>
          </div>
          <div class="toolbar">
            <div class="toolbar-group">
              <input id="outreach-search" type="search" placeholder="Search Outreach Logs" />
              <select id="outreach-status">
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <div id="outreach-list"></div>
        </div>
      </section>
    `,
  });

  async function loadOutreach() {
    [outreachLogs, outreachLeads] = await Promise.all([
      apiFetch("/outreach/", { loaderTitle: "Loading Outreach", loaderSubtitle: "Collecting Outreach Logs" }),
      apiFetch("/leads/", { loaderTitle: "Loading Leads", loaderSubtitle: "Preparing Trigger Options" }),
    ]);

    document.getElementById("outreach-lead-select").innerHTML =
      '<option value="">Select A Lead</option>' +
      outreachLeads
        .map(
          (lead) =>
            `<option value="${lead.id}">${titleCase(
              [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email || `Lead ${lead.id}`
            )}</option>`
        )
        .join("");

    applyOutreachFilters();
  }

  document.getElementById("outreach-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    await apiFetch("/outreach/trigger", {
      method: "POST",
      body: JSON.stringify({ lead_id: Number(payload.lead_id) }),
      loaderTitle: "Sending Outreach",
      loaderSubtitle: "Generating A Personalized Message",
    });
    document.getElementById("outreach-form-status").textContent = "Outreach Queued Successfully";
    showToast("Outreach Queued Successfully");
    await loadOutreach();
  });

  document.getElementById("outreach-search").addEventListener("input", () => applyOutreachFilters());
  document.getElementById("outreach-status").addEventListener("change", () => applyOutreachFilters());

  await loadOutreach();
});
