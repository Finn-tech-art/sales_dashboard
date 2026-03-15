function renderInlineJobSpinner(label = "Running") {
  return `
    <span class="job-spinner" aria-hidden="true"></span>
    <span>${titleCase(label)}</span>
  `;
}

window.renderInlineJobSpinner = renderInlineJobSpinner;
