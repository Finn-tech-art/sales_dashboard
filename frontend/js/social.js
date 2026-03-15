requireAuth();

const SOCIAL_PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "linkedin", "x"];
const SOCIAL_TREND_WORKFLOW_NAME = "social-trend-discovery";
const SOCIAL_TREND_JOB_KEY = "bizard_social_trend_job_id";
let socialMetrics = {};
let socialTrends = [];
let socialPosts = [];
let currentTrendJob = null;
let trendJobPoller = null;

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Not Scheduled";
}

function selectedPlatformsFromForm(formData) {
  const selected = formData.getAll("platforms");
  return selected.length ? selected : null;
}

function isActiveTrendJob(status) {
  return ["queued", "running"].includes(String(status || "").toLowerCase());
}

function getStoredTrendJobId() {
  return localStorage.getItem(SOCIAL_TREND_JOB_KEY);
}

function setStoredTrendJobId(jobId) {
  if (jobId) {
    localStorage.setItem(SOCIAL_TREND_JOB_KEY, jobId);
    return;
  }
  localStorage.removeItem(SOCIAL_TREND_JOB_KEY);
}

function stopTrendPolling() {
  trendJobPoller?.stop?.();
  trendJobPoller = null;
}

function renderDiscoveryFeedback(job = currentTrendJob) {
  const normalizedStatus = String(job?.status || "idle").toLowerCase();
  const runButton = document.getElementById("run-discovery-button");
  const stopButton = document.getElementById("stop-discovery-button");
  const statusSlot = document.getElementById("social-discovery-badge");
  const spinnerSlot = document.getElementById("social-discovery-spinner");
  const textSlot = document.getElementById("social-discovery-status");

  if (statusSlot) {
    statusSlot.innerHTML = renderJobStatusBadge(normalizedStatus);
  }

  if (spinnerSlot) {
    spinnerSlot.innerHTML = isActiveTrendJob(normalizedStatus) ? `<span class="job-runner">${renderInlineJobSpinner(normalizedStatus === "queued" ? "Queued" : "Running")}</span>` : "";
  }

  if (textSlot) {
    if (!job) {
      textSlot.textContent = "Ready To Run Discovery";
    } else if (normalizedStatus === "completed") {
      const created = Number(job.records_created || 0);
      textSlot.textContent = `${created} Trends Saved`;
    } else if (normalizedStatus === "failed") {
      textSlot.textContent = job.error_message || "Trend Discovery Failed";
    } else if (normalizedStatus === "stopped") {
      textSlot.textContent = "Trend Discovery Stopped";
    } else if (normalizedStatus === "queued") {
      textSlot.textContent = "Trend Discovery Queued";
    } else {
      textSlot.textContent = "Trend Discovery Running";
    }
  }

  if (runButton) {
    runButton.disabled = isActiveTrendJob(normalizedStatus);
    runButton.innerHTML = isActiveTrendJob(normalizedStatus) ? renderInlineJobSpinner("Running") : "Run Discovery";
  }

  if (stopButton) {
    stopButton.disabled = !isActiveTrendJob(normalizedStatus);
    stopButton.hidden = !isActiveTrendJob(normalizedStatus);
  }
}

function setCurrentTrendJob(job) {
  currentTrendJob = job ? { ...job, status: String(job.status || "idle").toLowerCase() } : null;
  setStoredTrendJobId(currentTrendJob?.job_id || null);
  renderDiscoveryFeedback(currentTrendJob);
}

async function fetchLatestTrendWorkflow() {
  const workflows = await apiFetch("/workflows/", { showLoader: false });
  return (workflows.recent_runs || []).find((run) => run.workflow_name === SOCIAL_TREND_WORKFLOW_NAME) || null;
}

async function syncTrendJobById(jobId) {
  if (!jobId) {
    setCurrentTrendJob(null);
    return null;
  }

  try {
    const job = await apiFetch(`/workflows/status/${jobId}`, { showLoader: false });
    setCurrentTrendJob(job);
    return job;
  } catch (error) {
    setStoredTrendJobId(null);
    setCurrentTrendJob(null);
    throw error;
  }
}

function startTrendPolling(jobId) {
  stopTrendPolling();
  trendJobPoller = createJobPoller({
    intervalMs: 3000,
    fetchStatus: () => apiFetch(`/workflows/status/${jobId}`, { showLoader: false }),
    onUpdate: (job) => {
      setCurrentTrendJob(job);
    },
    onTerminal: async (job) => {
      setCurrentTrendJob(job);
      if (job.status === "completed") {
        notifyJobStatus("completed", "Trend Discovery Completed");
        await Promise.all([loadMetrics(), loadTrends()]);
      } else if (job.status === "stopped") {
        notifyJobStatus("stopped", "Trend Discovery Stopped");
      } else {
        notifyJobStatus("failed", job.error_message || "Trend Discovery Failed");
      }
    },
  });
  trendJobPoller.start();
}

async function restoreTrendJobState() {
  const storedJobId = getStoredTrendJobId();
  if (storedJobId) {
    try {
      const storedJob = await syncTrendJobById(storedJobId);
      if (storedJob && isActiveTrendJob(storedJob.status)) {
        startTrendPolling(storedJob.job_id);
        return;
      }
    } catch (error) {
      console.warn("Unable To Restore Stored Trend Job", error);
    }
  }

  try {
    const latestRun = await fetchLatestTrendWorkflow();
    if (!latestRun) {
      setCurrentTrendJob(null);
      return;
    }
    if (latestRun.job_id?.startsWith("trend_")) {
      const latestJob = await syncTrendJobById(latestRun.job_id);
      if (latestJob && isActiveTrendJob(latestJob.status)) {
        startTrendPolling(latestJob.job_id);
      }
    } else {
      setCurrentTrendJob(latestRun);
    }
  } catch (error) {
    console.warn("Unable To Recover Trend Discovery State", error);
  }
}

function renderPlatformCheckboxes() {
  return SOCIAL_PLATFORMS.map(
    (platform) => `
      <label class="checkbox-item">
        <input type="checkbox" name="platforms" value="${platform}" ${["instagram", "linkedin"].includes(platform) ? "checked" : ""} />
        <span>${titleCase(platform)}</span>
      </label>
    `
  ).join("");
}

function renderPlatformHealth() {
  const platformCounts = SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    drafts: socialPosts.filter((post) => post.platform === platform && post.approval_status !== "approved").length,
    published: socialPosts.filter((post) => post.platform === platform && post.publish_status === "published").length,
  }));

  document.getElementById("platform-health").innerHTML = platformCounts
    .map(
      (item) => `
        <div class="settings-item">
          <span class="label">${titleCase(item.platform)}</span>
          <strong>${item.drafts} Drafts | ${item.published} Published</strong>
        </div>
      `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "social",
    title: "Social Content Studio",
    subtitle: "Work With The Actual Trend And Post Records Returned By The Social Domain Instead Of Generic Demo Content",
    searchPlaceholder: "Search Trends, Drafts, And Published Posts",
    content: `
      <section class="summary-grid" id="social-summary"></section>
      <section class="metric-grid metric-grid-compact" id="social-metrics"></section>
      <section class="board-grid" style="margin-top:24px;">
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Trend Insights</h2>
              <p>Run Discovery Against The Topic And Platform Inputs The Backend Social Workflow Accepts</p>
            </div>
          </div>
          <form class="form" id="social-discovery-form">
            <div class="field floating-field">
              <input name="topic" type="text" placeholder=" " value="Small Business Marketing" required />
              <label>Trend Topic</label>
            </div>
            <div class="field">
              <label>Platform Selection</label>
              <div class="checkbox-grid">${renderPlatformCheckboxes()}</div>
            </div>
            <div class="field floating-field">
              <input name="limit" type="number" min="1" max="20" value="8" placeholder=" " />
              <label>Trend Limit</label>
            </div>
            <div class="job-runner-panel">
              <div class="job-runner-actions">
                <button class="btn btn-primary" id="run-discovery-button" type="submit">Run Discovery</button>
                <button class="btn btn-danger" id="stop-discovery-button" type="button" hidden>Stop</button>
                <div id="social-discovery-badge">${renderJobStatusBadge("idle")}</div>
              </div>
              <div class="job-inline-feedback">
                <div id="social-discovery-spinner"></div>
                <span class="label" id="social-discovery-status">Ready To Run Discovery</span>
              </div>
            </div>
          </form>
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Publishing Readiness</h2>
              <p>Current Platform Post Counts And Queue Status Based On Stored Social Posts</p>
            </div>
          </div>
          <div id="platform-health" class="settings-list"></div>
        </div>
      </section>
      <section class="board-grid" style="margin-top:24px;">
        <div class="card">
          <div class="toolbar">
            <div>
              <h2>Content Creator</h2>
              <p>Generate New Drafts From Ranked Trends</p>
            </div>
            <button class="btn btn-secondary" id="refresh-social">Refresh Board</button>
          </div>
          <div id="trend-list" class="stack"></div>
        </div>
        <div class="card">
          <div class="toolbar">
            <div>
              <h2>Approval Queue</h2>
              <p>Approve, Publish, Or Iterate On Generated Social Posts</p>
            </div>
          </div>
          <div id="post-list" class="stack"></div>
        </div>
      </section>
    `,
  });

  async function loadMetrics() {
    socialMetrics = await apiFetch("/social/dashboard", {
      loaderTitle: "Loading Social Analytics",
      loaderSubtitle: "Preparing Social Studio Metrics",
    });

    document.getElementById("social-summary").innerHTML = `
      <article class="summary-card"><span class="metric-icon">${iconMarkup("social")}</span><div><div class="label">Tracked Trends</div><strong>${socialMetrics.tracked_trends || 0}</strong><p>Trend Records Available For Creation</p></div></article>
      <article class="summary-card"><span class="metric-icon">${iconMarkup("dashboard")}</span><div><div class="label">Draft Queue</div><strong>${socialMetrics.draft_posts || 0}</strong><p>Posts Waiting For Review Or Approval</p></div></article>
      <article class="summary-card"><span class="metric-icon">${iconMarkup("reports")}</span><div><div class="label">Published Queue</div><strong>${socialMetrics.published_posts || 0}</strong><p>Posts Scheduled Or Published</p></div></article>
    `;

    document.getElementById("social-metrics").innerHTML = Object.entries(socialMetrics)
      .map(
        ([key, value]) => `
          <article class="card metric-card">
            <div class="metric-header">
              <span class="metric-icon">${iconMarkup("social")}</span>
              <span class="trend-indicator">Live Social Signal</span>
            </div>
            <div class="label">${titleCase(key)}</div>
            <strong class="metric-value">${Number(value || 0).toLocaleString()}</strong>
            <div class="metric-footer label">Updated From The Social Domain</div>
          </article>
        `
      )
      .join("");
  }

  async function loadTrends() {
    socialTrends = await apiFetch("/social/trends?limit=18", {
      loaderTitle: "Loading Trends",
      loaderSubtitle: "Fetching Ranked Social Signals",
    });

    document.getElementById("trend-list").innerHTML = socialTrends.length
      ? socialTrends
          .map(
            (trend) => `
              <article class="trend-card">
                <div class="meta-row">
                  <span class="status-chip">${titleCase(trend.platform)}</span>
                  <span class="status-chip">Priority ${Number(trend.score || 0).toFixed(1)}</span>
                  <span class="status-chip">${titleCase(trend.status)}</span>
                </div>
                <h3>${titleCase(trend.keyword)}</h3>
                <p>${trend.summary || "No Summary Returned For This Trend Yet"}</p>
                <div class="label">Discovered ${formatDate(trend.discovered_at)}</div>
                <div class="action-row">
                  <select id="platform-${trend.id}">
                    ${SOCIAL_PLATFORMS.map((platform) => `<option value="${platform}" ${platform === trend.platform ? "selected" : ""}>${titleCase(platform)}</option>`).join("")}
                  </select>
                  <button class="btn btn-primary" data-create-post="${trend.id}">Generate Draft</button>
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty">No Trends Discovered Yet. Run Discovery To Populate The Studio.</div>';

    document.querySelectorAll("[data-create-post]").forEach((button) => {
      button.addEventListener("click", async () => {
        const trendId = Number(button.getAttribute("data-create-post"));
        const platform = document.getElementById(`platform-${trendId}`).value;
        await apiFetch("/social/posts", {
          method: "POST",
          body: JSON.stringify({ trend_id: trendId, platform }),
          loaderTitle: "Generating Social Draft",
          loaderSubtitle: "Creating Platform Specific Content",
        });
        showToast("Draft Generated Successfully");
        await Promise.all([loadMetrics(), loadPosts()]);
      });
    });
  }

  async function loadPosts() {
    socialPosts = await apiFetch("/social/posts?limit=18", {
      loaderTitle: "Loading Draft Queue",
      loaderSubtitle: "Fetching Social Content Drafts",
    });

    document.getElementById("post-list").innerHTML = socialPosts.length
      ? socialPosts
          .map(
            (post) => `
              <article class="post-card">
                <div class="meta-row">
                  <span class="status-chip">${titleCase(post.platform)}</span>
                  <span class="status-chip">${titleCase(post.approval_status)}</span>
                  <span class="status-chip">${titleCase(post.publish_status)}</span>
                </div>
                <h3>${titleCase(post.title || "Untitled Social Draft")}</h3>
                <div class="label">${post.caption || "No Caption Generated Yet"}</div>
                <div class="content-block">${post.content || "No Content Generated Yet"}</div>
                <div class="label">Created ${formatDate(post.created_at)} | Scheduled ${formatDate(post.scheduled_for)}</div>
                <div class="action-row">
                  ${post.approval_status !== "approved" ? `<button class="btn btn-secondary" data-approve-post="${post.id}">Approve</button>` : ""}
                  <button class="btn btn-secondary" data-regenerate-post="${post.id}">Regenerate</button>
                  <button class="btn btn-danger" data-discard-post="${post.id}">Discard</button>
                  ${post.publish_status !== "published" ? `<button class="btn btn-primary" data-publish-post="${post.id}">Publish Now</button>` : ""}
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty">No Drafts Yet. Generate Content From A Ranked Trend.</div>';

    renderPlatformHealth();

    document.querySelectorAll("[data-approve-post]").forEach((button) => {
      button.addEventListener("click", async () => {
        const postId = Number(button.getAttribute("data-approve-post"));
        await apiFetch(`/social/posts/${postId}/approve`, {
          method: "POST",
          loaderTitle: "Approving Draft",
          loaderSubtitle: "Moving Content Into The Publish Queue",
        });
        showToast("Draft Approved");
        await Promise.all([loadMetrics(), loadPosts()]);
      });
    });

    document.querySelectorAll("[data-publish-post]").forEach((button) => {
      button.addEventListener("click", async () => {
        const postId = Number(button.getAttribute("data-publish-post"));
        await apiFetch(`/social/posts/${postId}/publish`, {
          method: "POST",
          body: JSON.stringify({ schedule_for: null }),
          loaderTitle: "Publishing Content",
          loaderSubtitle: "Routing The Post Through The Publishing Workflow",
        });
        showToast("Post Published Or Scheduled");
        await Promise.all([loadMetrics(), loadPosts()]);
      });
    });

    document.querySelectorAll("[data-regenerate-post]").forEach((button) => {
      button.addEventListener("click", () => showToast("Generate A New Draft From The Trend Card", "info"));
    });

    document.querySelectorAll("[data-discard-post]").forEach((button) => {
      button.addEventListener("click", () => showToast("Discard Is Reserved For The Next Iteration", "info"));
    });
  }

  document.getElementById("social-discovery-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (currentTrendJob && isActiveTrendJob(currentTrendJob.status)) {
      notifyJobStatus("running", "Trend Discovery Is Already Running");
      return;
    }

    const formData = new FormData(event.target);
    const payload = {
      topic: formData.get("topic"),
      platforms: selectedPlatformsFromForm(formData),
      limit: Number(formData.get("limit") || 8),
    };

    setCurrentTrendJob({
      job_id: currentTrendJob?.job_id || null,
      status: "running",
      records_created: 0,
      records_processed: 0,
      error_message: null,
    });

    try {
      const existingRun = await fetchLatestTrendWorkflow();
      if (existingRun && isActiveTrendJob(existingRun.status) && existingRun.job_id?.startsWith("trend_")) {
        const activeJob = await syncTrendJobById(existingRun.job_id);
        startTrendPolling(activeJob.job_id);
        notifyJobStatus("running", "Trend Discovery Is Already Running");
        return;
      }

      const result = await apiFetch("/workflows/start-trend-discovery", {
        method: "POST",
        body: JSON.stringify(payload),
        showLoader: false,
      });

      setCurrentTrendJob({
        job_id: result.job_id,
        workflow_run_id: result.workflow_run_id,
        status: "queued",
        records_created: 0,
        records_processed: 0,
      });
      notifyJobStatus("running", "Trend Discovery Started");
      startTrendPolling(result.job_id);
    } catch (error) {
      if (error.status === 409 && error.payload?.detail?.job_id) {
        const activeJob = await syncTrendJobById(error.payload.detail.job_id);
        startTrendPolling(activeJob.job_id);
        notifyJobStatus("running", error.payload.detail.message || "Trend Discovery Is Already Running");
        return;
      }

      setCurrentTrendJob({
        job_id: null,
        status: "failed",
        error_message: error.message || "Unable To Start Trend Discovery",
      });
      notifyJobStatus("failed", error.message || "Trend Discovery Failed");
    }
  });

  document.getElementById("stop-discovery-button").addEventListener("click", async () => {
    if (!currentTrendJob?.job_id || !isActiveTrendJob(currentTrendJob.status)) {
      return;
    }

    try {
      const result = await apiFetch(`/workflows/stop/${currentTrendJob.job_id}`, {
        method: "POST",
        showLoader: false,
      });
      stopTrendPolling();
      setCurrentTrendJob({
        ...currentTrendJob,
        ...result,
        status: "stopped",
      });
      notifyJobStatus("stopped", "Trend Discovery Stopped");
    } catch (error) {
      notifyJobStatus("failed", error.message || "Unable To Stop Trend Discovery");
    }
  });

  document.getElementById("refresh-social").addEventListener("click", async () => {
    await Promise.all([loadMetrics(), loadTrends(), loadPosts()]);
    showToast("Social Studio Refreshed", "info");
  });

  await Promise.all([loadMetrics(), loadTrends(), loadPosts(), restoreTrendJobState()]);
});
