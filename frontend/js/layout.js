const APP_LINKS = [
  { href: "/dashboard.html", label: "Dashboard", key: "dashboard" },
  { href: "/leads.html", label: "Leads", key: "leads" },
  { href: "/outreach.html", label: "Outreach", key: "outreach" },
  { href: "/support.html", label: "Support", key: "support" },
  { href: "/reports.html", label: "Reports", key: "reports" },
];

function renderAppShell({ active, title, subtitle, actions = "", content = "" }) {
  const nav = APP_LINKS.map(
    (link) =>
      `<a class="nav-link ${link.key === active ? "active" : ""}" href="${link.href}">${link.label}</a>`
  ).join("");

  document.body.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="/"><span>Bizard</span> Leads</a>
        <p>Outreach, support, and reporting in one quiet command center.</p>
        <nav class="nav-list">${nav}</nav>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="page-copy">
            <div class="pill">AI-powered SMB workflow stack</div>
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </div>
          <div>${actions}</div>
        </div>
        ${content}
      </main>
    </div>
  `;
}

function renderAuthShell({ title, subtitle, content }) {
  document.body.innerHTML = `
    <div class="auth-shell">
      <a class="brand" href="/"><span>Bizard</span> Leads</a>
      <div class="auth-panel card">
        <div class="pill">Secure workspace access</div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        ${content}
      </div>
    </div>
  `;
}
