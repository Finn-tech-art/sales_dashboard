import { renderMetricCard } from "/components/metric-card.js?v=20260319";
import { renderLeadList } from "/components/lead-list.js?v=20260319";
import { renderChartCard, mountLazyChart } from "/components/chart-widget.js?v=20260319";
import { renderTaskPanel } from "/components/task-panel.js?v=20260319";

window.requireAuth();

const dashboardState = {
  metrics: [],
  leads: [],
  filteredLeads: [],
  leadStatusBreakdown: {},
  opportunities: { labels: [], closed_won: [], closed_lost: [] },
  sales: { labels: [], revenue: [] },
  tasks: [],
  isDemoMode: false,
};

const DEMO_DASHBOARD_DATA = {
  metrics: [
    { key: "total_leads", label: "Total Leads", value: 1842, change: "+12% This Week", trend: [140, 165, 182, 190, 210, 228, 246] },
    { key: "total_opportunities", label: "Total Opportunities", value: 146, change: "+9% This Week", trend: [12, 15, 18, 17, 20, 23, 26] },
    { key: "total_sales", label: "Total Sales", value: 84250, change: "+17% This Week", trend: [8200, 9100, 10600, 9800, 12500, 14800, 19250] },
  ],
  leads: [
    { avatar: "AL", name: "Amina Limo", email: "amina@northpeak.co", company: "Northpeak Studio", stage: "New" },
    { avatar: "JM", name: "James Mworia", email: "james@blueorbit.io", company: "Blue Orbit", stage: "Qualified" },
    { avatar: "SK", name: "Sofia Kimani", email: "sofia@fieldlane.com", company: "Fieldlane", stage: "Contacted" },
    { avatar: "TN", name: "Theo Njoroge", email: "theo@acelytics.ai", company: "Acelytics", stage: "Closed" },
    { avatar: "PR", name: "Priya Rao", email: "priya@vervegrid.com", company: "Vervegrid", stage: "Qualified" },
    { avatar: "DO", name: "Daniel Otieno", email: "daniel@highmarklabs.com", company: "Highmark Labs", stage: "New" },
    { avatar: "MN", name: "Maya Njeri", email: "maya@lumenforge.com", company: "Lumenforge", stage: "Contacted" },
    { avatar: "EC", name: "Ethan Cole", email: "ethan@northstarhq.com", company: "Northstar HQ", stage: "Qualified" },
  ],
  leadStatusBreakdown: { New: 28, Contacted: 21, Qualified: 17, Closed: 9 },
  opportunities: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    closed_won: [2, 3, 4, 3, 5, 4, 6],
    closed_lost: [1, 1, 2, 1, 2, 2, 1],
  },
  sales: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    revenue: [4200, 5600, 6100, 5800, 7900, 8600, 10400],
  },
  tasks: [
    { title: "Review New Lead Segments", detail: "Prioritize 28 New Contacts That Landed In The Last 7 Days", priority: "High" },
    { title: "Prepare Qualification Follow Ups", detail: "17 Qualified Leads Need Personalized Sequences Before Friday", priority: "Medium" },
    { title: "Validate Weekend Revenue Spike", detail: "Sunday Revenue Increased By 21% Compared To Saturday", priority: "Medium" },
  ],
};

function searchInput() {
  return document.querySelector(".workspace-search input");
}

function wireDashboardSearch() {
  searchInput()?.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    dashboardState.filteredLeads = dashboardState.leads.filter((lead) =>
      [lead.name, lead.email, lead.company].filter(Boolean).join(" ").toLowerCase().includes(query)
    );
    document.getElementById("crm-recent-leads").innerHTML = renderLeadList(dashboardState.filteredLeads);
  });
}

function renderSalesSummary() {
  const total = dashboardState.sales.revenue.reduce((sum, value) => sum + value, 0);
  const max = Math.max(0, ...dashboardState.sales.revenue);
  const bestDayIndex = dashboardState.sales.revenue.findIndex((value) => value === max);

  return `
    <div class="crm-sales-summary">
      <div class="crm-summary-tile">
        <div class="label">7 Day Revenue</div>
        <strong class="metric-value">${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(total)}</strong>
      </div>
      <div class="crm-summary-tile">
        <div class="label">Best Revenue Day</div>
        <strong class="metric-value">${dashboardState.sales.labels[bestDayIndex] || "-"}</strong>
      </div>
      <div class="crm-summary-tile">
        <div class="label">Closed Won Events</div>
        <strong class="metric-value">${dashboardState.opportunities.closed_won.reduce((sum, value) => sum + value, 0)}</strong>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const notificationsButton = `
    <button class="crm-top-icon-button" type="button" aria-label="Notifications">
      ${window.iconMarkup("support")}
    </button>
  `;
  const newLeadButton = `<button class="btn btn-primary" type="button">New Action</button>`;
  const avatar = '<span class="crm-avatar" aria-hidden="true">BL</span>';

  window.renderAppShell({
    active: "dashboard",
    title: "HubSpot CRM Dashboard",
    subtitle: "Monitor Leads, Opportunities, Revenue, And Task Activity From Your HubSpot Workspace",
    searchPlaceholder: "Search Leads",
    shellClass: "crm-dashboard-shell",
    actions: `<div class="crm-top-actions">${notificationsButton}${newLeadButton}${avatar}</div>`,
    content: `
      <div class="crm-dashboard">
        ${dashboardState.isDemoMode ? `
          <section class="card crm-panel crm-demo-banner">
            <div class="crm-demo-copy">
              <div class="pill">Demo Mode</div>
              <h2>HubSpot Data Is Temporarily Unavailable</h2>
              <p class="crm-panel-subtitle">Showing Sample CRM Data So You Can Review The Dashboard Experience While The Live Integration Is Being Finalized.</p>
            </div>
          </section>
        ` : ""}
        <section class="metric-grid" id="crm-metrics">
          ${dashboardState.metrics.map((card) => renderMetricCard(card)).join("")}
        </section>
        <section class="crm-grid" style="margin-top:24px;">
          <div class="crm-main">
            <div class="crm-chart-grid">
              ${renderChartCard({
                title: "Opportunity Summary",
                subtitle: "Closed Won Vs Closed Lost Over The Last 7 Days",
                canvasId: "hubspot-opportunity-chart",
              })}
              ${renderChartCard({
                title: "Lead Status",
                subtitle: "Current HubSpot Lifecycle Distribution",
                canvasId: "hubspot-status-chart",
              })}
            </div>
            <div class="crm-chart-grid crm-chart-grid--full">
              ${renderChartCard({
                title: "Sales Summary",
                subtitle: "Revenue By Day Across The Last 7 Days",
                canvasId: "hubspot-sales-chart",
              })}
            </div>
            <section class="card crm-panel">
              <div class="crm-panel-header">
                <div>
                  <h2>Sales Summary Snapshot</h2>
                  <p class="crm-panel-subtitle">Quick Performance Readout Powered By HubSpot Deals</p>
                </div>
              </div>
              ${renderSalesSummary()}
            </section>
          </div>
          <aside class="crm-sidebar-panel">
            <section class="card crm-panel">
              <div class="crm-panel-header">
                <div>
                  <h2>Recent Leads</h2>
                  <p class="crm-panel-subtitle">Latest Contacts Synced From HubSpot</p>
                </div>
              </div>
              <div id="crm-recent-leads">${renderLeadList(dashboardState.filteredLeads)}</div>
            </section>
            <section class="card crm-panel">
              <div class="crm-panel-header">
                <div>
                  <h2>Tasks Panel</h2>
                  <p class="crm-panel-subtitle">Suggested Focus Areas Based On HubSpot Activity</p>
                </div>
              </div>
              <div id="crm-tasks">${renderTaskPanel(dashboardState.tasks)}</div>
            </section>
          </aside>
        </section>
      </div>
    `,
  });

  wireDashboardSearch();

  mountLazyChart("hubspot-opportunity-chart", () => ({
    type: "line",
    data: {
      labels: dashboardState.opportunities.labels,
      datasets: [
        {
          label: "Closed Won",
          data: dashboardState.opportunities.closed_won,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          tension: 0.35,
        },
        {
          label: "Closed Lost",
          data: dashboardState.opportunities.closed_lost,
          borderColor: "#94A3B8",
          backgroundColor: "rgba(148, 163, 184, 0.12)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.12)" } },
        x: { grid: { display: false } },
      },
    },
  }));

  mountLazyChart("hubspot-status-chart", () => ({
    type: "doughnut",
    data: {
      labels: Object.keys(dashboardState.leadStatusBreakdown),
      datasets: [
        {
          data: Object.values(dashboardState.leadStatusBreakdown),
          backgroundColor: ["#2563EB", "#3B82F6", "#60A5FA", "#1D4ED8"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "68%",
      plugins: { legend: { position: "bottom" } },
    },
  }));

  mountLazyChart("hubspot-sales-chart", () => ({
    type: "bar",
    data: {
      labels: dashboardState.sales.labels,
      datasets: [
        {
          label: "Revenue",
          data: dashboardState.sales.revenue,
          backgroundColor: "#2563EB",
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.12)" } },
        x: { grid: { display: false } },
      },
    },
  }));
}

async function loadDashboardData() {
  const requests = await Promise.allSettled([
    window.apiFetch("/hubspot/metrics"),
    window.apiFetch("/hubspot/leads?limit=8"),
    window.apiFetch("/hubspot/opportunities"),
    window.apiFetch("/hubspot/sales"),
    window.apiFetch("/hubspot/tasks"),
  ]);

  const hasFailure = requests.some((request) => request.status === "rejected");
  if (hasFailure) {
    dashboardState.metrics = DEMO_DASHBOARD_DATA.metrics;
    dashboardState.leads = DEMO_DASHBOARD_DATA.leads;
    dashboardState.filteredLeads = [...DEMO_DASHBOARD_DATA.leads];
    dashboardState.leadStatusBreakdown = DEMO_DASHBOARD_DATA.leadStatusBreakdown;
    dashboardState.opportunities = DEMO_DASHBOARD_DATA.opportunities;
    dashboardState.sales = DEMO_DASHBOARD_DATA.sales;
    dashboardState.tasks = DEMO_DASHBOARD_DATA.tasks;
    dashboardState.isDemoMode = true;
    return;
  }

  const [metricsPayload, leadsPayload, opportunitiesPayload, salesPayload, tasksPayload] = requests.map(
    (request) => request.value
  );

  dashboardState.metrics = metricsPayload.cards || [];
  dashboardState.leads = leadsPayload.items || [];
  dashboardState.filteredLeads = [...dashboardState.leads];
  dashboardState.leadStatusBreakdown = leadsPayload.status_breakdown || {};
  dashboardState.opportunities = opportunitiesPayload;
  dashboardState.sales = salesPayload;
  dashboardState.tasks = tasksPayload.items || [];
  dashboardState.isDemoMode = false;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderDashboard();
  try {
    await loadDashboardData();
    renderDashboard();
    if (dashboardState.isDemoMode) {
      window.showToast("HubSpot Is Unavailable, Showing Demo Dashboard Data", "warning");
    }
  } catch (error) {
    console.error(error);
    dashboardState.metrics = DEMO_DASHBOARD_DATA.metrics;
    dashboardState.leads = DEMO_DASHBOARD_DATA.leads;
    dashboardState.filteredLeads = [...DEMO_DASHBOARD_DATA.leads];
    dashboardState.leadStatusBreakdown = DEMO_DASHBOARD_DATA.leadStatusBreakdown;
    dashboardState.opportunities = DEMO_DASHBOARD_DATA.opportunities;
    dashboardState.sales = DEMO_DASHBOARD_DATA.sales;
    dashboardState.tasks = DEMO_DASHBOARD_DATA.tasks;
    dashboardState.isDemoMode = true;
    renderDashboard();
    window.showToast(error.message || "Unable To Load The HubSpot Dashboard", "error");
  }
});
