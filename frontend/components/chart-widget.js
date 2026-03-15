export function renderChartCard({ title, subtitle, canvasId }) {
  return `
    <article class="card crm-panel crm-chart-card">
      <div class="crm-panel-header">
        <div>
          <h2>${window.titleCase(title)}</h2>
          <p class="crm-panel-subtitle">${window.titleCase(subtitle)}</p>
        </div>
      </div>
      <div class="crm-chart-shell" data-chart-shell="${canvasId}">
        <div class="crm-chart-skeleton" data-chart-skeleton="${canvasId}">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <canvas id="${canvasId}" aria-label="${window.titleCase(title)}"></canvas>
      </div>
    </article>
  `;
}

export function mountLazyChart(canvasId, configFactory) {
  const canvas = document.getElementById(canvasId);
  const skeleton = document.querySelector(`[data-chart-skeleton="${canvasId}"]`);
  if (!canvas || typeof window.Chart === "undefined") {
    return;
  }

  let chart = null;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !chart) {
          chart = new window.Chart(canvas, configFactory());
          skeleton?.remove();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  observer.observe(canvas);
}
