async function fetchWorkflows() {
  return apiFetch("/workflows/");
}

async function triggerWorkflow(workflowName) {
  return apiFetch(`/workflows/${workflowName}/run`, { method: "POST" });
}
