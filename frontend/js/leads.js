requireAuth();

let leadsState = {
  items: [],
  filtered: [],
  page: 1,
  pageSize: 6,
  query: "",
  status: "all",
  sort: "created_desc",
};

function leadDisplayName(lead) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.name || lead.email || "Unnamed Lead";
}

function leadSummary(items) {
  return {
    total: items.length,
    verified: items.filter((lead) => lead.status === "verified").length,
    contacted: items.filter((lead) => lead.status === "contacted").length,
    withEmail: items.filter((lead) => lead.email).length,
  };
}

function sortLeads(items) {
  const sorted = [...items];
  if (leadsState.sort === "company_asc") {
    sorted.sort((a, b) => (a.company || "").localeCompare(b.company || ""));
  } else if (leadsState.sort === "status_asc") {
    sorted.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
  } else {
    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return sorted;
}

function filterLeads() {
  const query = leadsState.query.trim().toLowerCase();
  leadsState.filtered = sortLeads(
    leadsState.items.filter((lead) => {
      const statusMatch = leadsState.status === "all" || lead.status === leadsState.status;
      const textMatch =
        !query ||
        [leadDisplayName(lead), lead.email, lead.company, lead.title, lead.source, lead.company_domain, lead.industry]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      return statusMatch && textMatch;
    })
  );
}

function pagedLeads() {
  const start = (leadsState.page - 1) * leadsState.pageSize;
  return leadsState.filtered.slice(start, start + leadsState.pageSize);
}

function renderLeadSummary() {
  const summary = leadSummary(leadsState.items);
  document.getElementById("lead-summary").innerHTML = `
    <article class="summary-card"><span class="metric-icon">${iconMarkup("leads")}</span><div><div class="label">Tracked Leads</div><strong>${summary.total}</strong><p>Total Lead Records Available</p></div></article>
    <article class="summary-card"><span class="metric-icon">${iconMarkup("dashboard")}</span><div><div class="label">Verified Leads</div><strong>${summary.verified}</strong><p>Ready For Outreach Or Enrichment</p></div></article>
    <article class="summary-card"><span class="metric-icon">${iconMarkup("outreach")}</span><div><div class="label">Contacted Leads</div><strong>${summary.contacted}</strong><p>Already Touched By Outreach</p></div></article>
    <article class="summary-card"><span class="metric-icon">${iconMarkup("support")}</span><div><div class="label">Leads With Email</div><strong>${summary.withEmail}</strong><p>Ready For Email Based Workflows</p></div></article>
  `;
}

function renderLeadsTable() {
  const rows = pagedLeads();
  const totalPages = Math.max(1, Math.ceil(leadsState.filtered.length / leadsState.pageSize));
  document.getElementById("leads-table").innerHTML = rows.length
    ? `
      <div class="data-table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Source</th>
              <th>Status</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (lead) => `
                  <tr>
                    <td>
                      <strong>${leadDisplayName(lead)}</strong>
                      <div class="label">${lead.email || "No Email Provided"}</div>
                    </td>
                    <td>
                      ${lead.company || "Unknown Company"}
                      <div class="label">${lead.title || lead.company_domain || "No Company Metadata"}</div>
                    </td>
                    <td>${titleCase(lead.source || "Manual")}</td>
                    <td><span class="status-chip">${titleCase(lead.status)}</span></td>
                    <td>${new Date(lead.created_at).toLocaleDateString()}</td>
                    <td><button class="btn btn-secondary" type="button" data-trigger-outreach="${lead.id}">Send Outreach</button></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <div class="pagination">
          <div class="label">Showing ${rows.length} Of ${leadsState.filtered.length} Leads</div>
          <div class="action-row">
            <button class="btn btn-secondary" type="button" id="leads-prev" ${leadsState.page === 1 ? "disabled" : ""}>Previous</button>
            <span class="label">Page ${leadsState.page} Of ${totalPages}</span>
            <button class="btn btn-secondary" type="button" id="leads-next" ${leadsState.page >= totalPages ? "disabled" : ""}>Next</button>
          </div>
        </div>
      </div>
    `
    : '<div class="empty">No Leads Match The Current Search And Filter.</div>';

  document.querySelectorAll("[data-trigger-outreach]").forEach((button) => {
    button.addEventListener("click", async () => {
      const leadId = Number(button.getAttribute("data-trigger-outreach"));
      await apiFetch("/outreach/trigger", {
        method: "POST",
        body: JSON.stringify({ lead_id: leadId }),
        loaderTitle: "Triggering Outreach",
        loaderSubtitle: "Generating A Personalized Message",
      });
      showToast("Outreach Triggered Successfully");
    });
  });

  document.getElementById("leads-prev")?.addEventListener("click", () => {
    leadsState.page = Math.max(1, leadsState.page - 1);
    renderLeadsTable();
  });

  document.getElementById("leads-next")?.addEventListener("click", () => {
    leadsState.page += 1;
    renderLeadsTable();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "leads",
    title: "Lead Pipeline",
    subtitle: "Manage The Actual Lead Records Used By Discovery, Verification, And Outreach Workflows",
    searchPlaceholder: "Search Leads By Name, Email, Company, Or Title",
    content: `
      <section class="summary-grid" id="lead-summary"></section>
      <section class="grid cols-2">
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Add Or Enrich A Lead</h2>
              <p>Create Manual Lead Records That Match The Current Backend Schema</p>
            </div>
          </div>
          <form class="form" id="lead-form">
            <div class="field floating-field"><input name="first_name" type="text" placeholder=" " /><label>First Name</label></div>
            <div class="field floating-field"><input name="last_name" type="text" placeholder=" " /><label>Last Name</label></div>
            <div class="field floating-field"><input name="email" type="email" placeholder=" " /><label>Email Address</label></div>
            <div class="field floating-field"><input name="phone" type="tel" placeholder=" " /><label>Phone Number</label></div>
            <div class="field floating-field"><input name="company" type="text" placeholder=" " /><label>Company Name</label></div>
            <div class="field floating-field"><input name="company_domain" type="text" placeholder=" " /><label>Company Domain</label></div>
            <div class="field floating-field"><input name="title" type="text" placeholder=" " /><label>Job Title</label></div>
            <div class="field floating-field"><input name="industry" type="text" placeholder=" " /><label>Industry</label></div>
            <div class="field floating-field"><input name="linkedin_url" type="url" placeholder=" " /><label>LinkedIn Url</label></div>
            <div class="field floating-field">
              <select name="source">
                <option value="manual">Manual</option>
                <option value="google_maps">Google Maps</option>
                <option value="website">Website</option>
                <option value="linkedin">LinkedIn</option>
                <option value="hubspot">HubSpot</option>
              </select>
              <label>Lead Source</label>
            </div>
            <div class="field floating-field">
              <select name="status">
                <option value="new">New</option>
                <option value="verified">Verified</option>
                <option value="contacted">Contacted</option>
              </select>
              <label>Pipeline Status</label>
            </div>
            <button class="btn btn-primary" type="submit">Save Lead</button>
            <div class="label" id="lead-form-status"></div>
          </form>
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Lead List</h2>
              <p>Search, Sort, Filter, And Trigger Outreach From The Same Records Workers Use</p>
            </div>
          </div>
          <div class="toolbar">
            <div class="toolbar-group">
              <input id="lead-search" type="search" placeholder="Search Leads" />
              <select id="lead-status-filter">
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="verified">Verified</option>
                <option value="contacted">Contacted</option>
              </select>
              <select id="lead-sort">
                <option value="created_desc">Newest First</option>
                <option value="company_asc">Company A To Z</option>
                <option value="status_asc">Status A To Z</option>
              </select>
            </div>
          </div>
          <div id="leads-table"></div>
        </div>
      </section>
    `,
  });

  async function loadLeads() {
    leadsState.items = await apiFetch("/leads/", {
      loaderTitle: "Loading Leads",
      loaderSubtitle: "Fetching Stored Lead Records",
    });
    filterLeads();
    renderLeadSummary();
    renderLeadsTable();
  }

  document.getElementById("lead-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    await apiFetch("/leads/", {
      method: "POST",
      body: JSON.stringify(payload),
      loaderTitle: "Saving Lead",
      loaderSubtitle: "Updating The Lead Pipeline",
    });
    document.getElementById("lead-form-status").textContent = "Lead Saved Successfully";
    showToast("Lead Saved Successfully");
    event.target.reset();
    await loadLeads();
  });

  document.getElementById("lead-search").addEventListener("input", (event) => {
    leadsState.query = event.target.value;
    leadsState.page = 1;
    filterLeads();
    renderLeadsTable();
  });

  document.getElementById("lead-status-filter").addEventListener("change", (event) => {
    leadsState.status = event.target.value;
    leadsState.page = 1;
    filterLeads();
    renderLeadsTable();
  });

  document.getElementById("lead-sort").addEventListener("change", (event) => {
    leadsState.sort = event.target.value;
    filterLeads();
    renderLeadsTable();
  });

  await loadLeads();
});
