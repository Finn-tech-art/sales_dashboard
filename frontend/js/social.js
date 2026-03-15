requireAuth();

const SOCIAL_PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "linkedin", "x"];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Not Scheduled";
}

function selectedPlatformsFromForm(formData) {
  const selected = formData.getAll("platforms");
  return selected.length ? selected : null;
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

document.addEventListener("DOMContentLoaded", async () => {
  renderAppShell({
    active: "social",
    title: "Social Content Studio",
    subtitle: "Discover Trends, Generate Drafts, Approve Content, Configure Publishing, And Review Performance",
    searchPlaceholder: "Search Trends, Drafts, And Published Posts",
    content: `
      <section class="metric-grid" id="social-metrics"></section>
      <section class="board-grid" style="margin-top:24px;">
        <div class="card">
          <div class="toolbar">
            <div>
              <h2>Trend Insights</h2>
              <p>Discover Topic Signals Across Priority Social Platforms</p>
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
            <div class="action-row">
              <button class="btn btn-primary" type="submit">Run Discovery</button>
              <span class="label" id="social-discovery-status"></span>
            </div>
          </form>
        </div>
        <div class="card">
          <div class="stack">
            <div>
              <h2>Publishing Settings</h2>
              <p>Manage Platform Readiness Before Publishing Draft Content</p>
            </div>
            <div class="settings-list">
              <div class="settings-item"><span class="label">Instagram</span><span class="status-chip">Connect Account Prompt</span></div>
              <div class="settings-item"><span class="label">TikTok</span><span class="status-chip">Connect Account Prompt</span></div>
              <div class="settings-item"><span class="label">Facebook</span><span class="status-chip">Connect Account Prompt</span></div>
              <div class="settings-item"><span class="label">YouTube</span><span class="status-chip">Connect Account Prompt</span></div>
            </div>
            <div class="empty">Publishing Is Routed Through N8N In This MVP. Connect Each Platform Before Scheduling Client Content.</div>
          </div>
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
              <p>Approve, Publish, Or Iterate On AI Generated Posts</p>
            </div>
          </div>
          <div id="post-list" class="stack"></div>
        </div>
      </section>
    `,
  });

  async function loadMetrics() {
    const metrics = await apiFetch("/social/dashboard", {
      loaderTitle: "Loading Social Analytics",
      loaderSubtitle: "Preparing Social Studio Metrics",
    });
    document.getElementById("social-metrics").innerHTML = Object.entries(metrics)
      .map(
        ([key, value]) => `
          <article class="card metric-card">
            <div class="metric-header">
              <span class="metric-icon">${iconMarkup("social")}</span>
              <span class="trend-indicator">Live Social Signal</span>
            </div>
            <div class="label">${titleCase(key)}</div>
            <strong class="metric-value">${value}</strong>
            <div class="metric-footer label">Updated From The Social Domain</div>
          </article>
        `
      )
      .join("");
  }

  async function loadTrends() {
    const trends = await apiFetch("/social/trends?limit=18", {
      loaderTitle: "Loading Trends",
      loaderSubtitle: "Fetching Ranked Social Signals",
    });
    document.getElementById("trend-list").innerHTML = trends.length
      ? trends
          .map(
            (trend) => `
              <article class="trend-card">
                <div class="meta-row">
                  <span class="status-chip">${titleCase(trend.platform)}</span>
                  <span class="status-chip">Priority ${Number(trend.score || 0).toFixed(1)}</span>
                  <span class="status-chip">${titleCase(trend.status)}</span>
                </div>
                <h3>${titleCase(trend.keyword)}</h3>
                <p>${titleCase(trend.summary || "No Summary Returned For This Trend Yet")}</p>
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
    const posts = await apiFetch("/social/posts?limit=18", {
      loaderTitle: "Loading Draft Queue",
      loaderSubtitle: "Fetching Social Content Drafts",
    });
    document.getElementById("post-list").innerHTML = posts.length
      ? posts
          .map(
            (post) => `
              <article class="post-card">
                <div class="meta-row">
                  <span class="status-chip">${titleCase(post.platform)}</span>
                  <span class="status-chip">${titleCase(post.approval_status)}</span>
                  <span class="status-chip">${titleCase(post.publish_status)}</span>
                </div>
                <h3>${titleCase(post.title || "Untitled Social Draft")}</h3>
                <div class="label">${titleCase(post.caption || "No Caption Generated Yet")}</div>
                <div class="content-block">${titleCase(post.content || "No Content Generated Yet")}</div>
                <div class="label">Created ${formatDate(post.created_at)} · Scheduled ${formatDate(post.scheduled_for)}</div>
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
    const formData = new FormData(event.target);
    const payload = {
      topic: formData.get("topic"),
      platforms: selectedPlatformsFromForm(formData),
      limit: Number(formData.get("limit") || 8),
    };
    const status = document.getElementById("social-discovery-status");
    const result = await apiFetch("/social/trends/discover", {
      method: "POST",
      body: JSON.stringify(payload),
      loaderTitle: "Discovering Trends",
      loaderSubtitle: "Collecting Fresh Social Signals",
    });
    status.textContent = `${result.count} Trends Discovered`;
    showToast(`${result.count} Trends Discovered`);
    await Promise.all([loadMetrics(), loadTrends()]);
  });

  document.getElementById("refresh-social").addEventListener("click", async () => {
    await Promise.all([loadMetrics(), loadTrends(), loadPosts()]);
    showToast("Social Studio Refreshed", "info");
  });

  await Promise.all([loadMetrics(), loadTrends(), loadPosts()]);
});
