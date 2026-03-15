export function renderTaskPanel(tasks) {
  if (!tasks.length) {
    return '<div class="empty">No HubSpot Tasks Available Yet.</div>';
  }

  return `
    <div class="crm-task-list">
      ${tasks
        .map(
          (task) => `
            <article class="crm-task-item">
              <div class="crm-task-priority">${window.titleCase(task.priority)}</div>
              <strong>${window.titleCase(task.title)}</strong>
              <div class="label">${window.titleCase(task.detail)}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}
