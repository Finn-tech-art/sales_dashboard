function notifyJobStatus(status, message) {
  const normalized = String(status || "info").toLowerCase();
  const variant = normalized === "completed" ? "success" : normalized === "failed" ? "error" : normalized === "stopped" ? "info" : "info";
  showToast(message || `Job ${normalized}`, variant);
}

window.notifyJobStatus = notifyJobStatus;
