function renderJobStatusBadge(status = "idle") {
  const normalized = String(status || "idle").toLowerCase();
  return `<span class="job-status-badge" data-status="${normalized}">${titleCase(normalized)}</span>`;
}

window.renderJobStatusBadge = renderJobStatusBadge;
