export function renderLeadList(leads) {
  if (!leads.length) {
    return '<div class="empty">No HubSpot Contacts Available Yet.</div>';
  }

  return `
    <div class="crm-lead-list">
      ${leads
        .map(
          (lead) => `
            <article class="crm-lead-item">
              <div class="crm-lead-row">
                <span class="crm-avatar-badge">${lead.avatar}</span>
                <div>
                  <strong>${window.titleCase(lead.name)}</strong>
                  <div class="label">${lead.email}</div>
                </div>
              </div>
              <div class="label">${window.titleCase(lead.company)}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}
