function sparklinePoints(values) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const width = 220;
  const height = 64;
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;

  return safeValues
    .map((value, index) => {
      const x = (index / Math.max(1, safeValues.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatMetricValue(card) {
  if (card.key === "total_sales") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(card.value || 0);
  }
  return new Intl.NumberFormat("en-US").format(card.value || 0);
}

export function renderMetricCard(card) {
  return `
    <article class="card metric-card crm-panel">
      <div class="metric-header">
        <span class="metric-icon">${window.iconMarkup(card.key === "total_sales" ? "reports" : card.key === "total_opportunities" ? "dashboard" : "leads")}</span>
        <span class="trend-indicator">${window.titleCase(card.change || "Live Now")}</span>
      </div>
      <div class="label">${window.titleCase(card.label)}</div>
      <strong class="metric-value">${formatMetricValue(card)}</strong>
      <div class="metric-sparkline">
        <svg viewBox="0 0 220 64" width="100%" height="64" aria-hidden="true">
          <polyline fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${sparklinePoints(card.trend || [])}"></polyline>
        </svg>
      </div>
    </article>
  `;
}
