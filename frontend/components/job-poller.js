function createJobPoller({ intervalMs = 3000, fetchStatus, onUpdate, onTerminal }) {
  let timerId = null;

  async function tick() {
    try {
      const result = await fetchStatus();
      onUpdate?.(result);
      if (["completed", "failed", "stopped"].includes(String(result.status || "").toLowerCase())) {
        stop();
        onTerminal?.(result);
      }
    } catch (error) {
      stop();
      onTerminal?.({ status: "failed", error_message: error.message || "Polling failed" });
    }
  }

  function start() {
    stop();
    timerId = window.setInterval(tick, intervalMs);
    tick();
  }

  function stop() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  return { start, stop };
}

window.createJobPoller = createJobPoller;
