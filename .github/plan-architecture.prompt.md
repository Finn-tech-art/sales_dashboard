## Plan: Align project to PRD architecture

**TL;DR**: The repository currently contains skeletal files without implementation and a slightly different folder layout. The plan is to reorganize directories to match the required MVP Layered Monolith structure, add missing backend modules (FastAPI app, models, services, workers), add missing frontend pages and shared styling, and add infrastructure configuration (Docker Compose, nginx, env example, gitignore). We'll keep existing files and implement missing logic rather than removing working content.

---

## Steps

### 1) Audit & Normalize Project Layout
1.1 Confirm current folders and spots where files exist but are misnamed (e.g., `backend/services/__inti__.py`, `backend/workers/celer_app.py`).
1.2 Rename/move files to match required structure:
  - `backend/workers/celer_app.py` → `backend/workers/celery_app.py`.
  - `backend/models/outreach_logs.py` → `backend/models/outreach_log.py`.
  - `backend/models/support_logs.py` → `backend/models/support_log.py`.
  - Add missing required files/folders under `backend/app/core`, `backend/app/api/routes`, `backend/models`, `backend/schemas`, `backend/services`.

### 2) Implement Backend Core + API
2.1 Create `backend/app/main.py` with FastAPI app, routers include, CORS, startup/shutdown, and startup checks.
2.2 Create `backend/app/config.py` to load env vars (pydantic/BaseSettings) and provide typed config.
2.3 Create `backend/app/database.py` to configure SQLAlchemy engine/session and Alembic integration.
2.4 Create `backend/app/core/security.py` for JWT helper functions and password hashing.
2.5 Create `backend/app/core/dependencies.py` for common dependencies (get_db, get_current_user).
2.6 Create `backend/app/api/routes/auth.py` implementing login/register and token issuance.
2.7 Ensure existing routes (dashboard, leads, outreach, reports, workflows, webhooks) are registered and follow FastAPI router style.

### 3) Implement Models + Schemas + Services
3.1 Models:
  - Create `backend/models/user.py` and `backend/models/session.py`.
  - Define base `Base` in `backend/models/__init__.py` (declarative base).
  - Implement models for leads, outreach_log, support_log, workflow_run according to expected fields.
3.2 Schemas:
  - Add `backend/schemas/auth.py` (auth request/response models). Keep existing schemas (lead, outreach, report, workflow) as is.
3.3 Services:
  - Create `backend/services/auth_service.py` and `user_service.py` for user CRUD and auth-related logic.
  - Add `backend/services/n8n_client.py` for webhook calls and triggering workflows.
  - Fill existing integration clients (apollo, hubspot, openai_client, email_sender, chatwoot) with minimal interfaces and helper methods.
  - Fix `backend/services/__init__.py` naming.

### 4) Implement Worker Workflows
4.1 Create `backend/workers/celery_app.py` setting up Celery app (Redis broker & backend), configure RedBeat scheduler.
4.2 Ensure `backend/workers/scheduler.py` defines periodic tasks (weekly report etc) and registers with Celery beat.
4.3 Implement `backend/workers/lead_sourcing.py` to:
  - Fetch leads from Apollo (service), deduplicate (by email/phone), persist to Postgres, sync to HubSpot.
4.4 Implement `backend/workers/outreach.py` to:
  - Trigger on new HubSpot contact (via webhook), generate email via OpenAI, send via SendGrid, log results.
4.5 Implement `backend/workers/support.py` to:
  - Process Chatwoot webhook events, generate reply via OpenAI, send via Chatwoot API.
4.6 Implement `backend/workers/reporting.py` to:
  - Periodically gather metrics, generate summary via OpenAI, send email.

### 5) Infrastructure & Environment
5.1 Create `infra/docker` with Docker Compose services (api, postgres, redis, celery worker, celery beat, n8n, nginx). Ensure it matches PRD services.
5.2 Create `infra/nginx` with reverse proxy config for FastAPI and n8n. Ensure correct hostnames/ports and use environment variables.
5.3 Create root-level `.env.example` with variables listed in PRD.
5.4 Update `.gitignore` to include required ignores per PRD and ensure secrets not committed.

### 6) Frontend Alignment
6.1 Add missing HTML pages: `frontend/login.html`, `frontend/signup.html`, `frontend/dashboard.html` (and ensure `leads.html`, `outreach.html`, `support.html`, `reports.html` follow same layout). Use `frontend/index.html` as style reference.
6.2 Extract shared CSS from `index.html` into reusable CSS files in `frontend/css` and ensure all pages include the same base styles and layout.
6.3 If helpful, create a shared JS file (e.g. `frontend/js/layout.js`) for common UI effects and layout injection.

### 7) Validation & Verification
7.1 Generate final project tree and confirm all required files exist.
7.2 Ensure every required module imports correctly (run `python -m py_compile` on backend or run `pytest` if tests exist).
7.3 Validate that Celery app can start and connects to Redis (smoke test via `celery -A backend.workers.celery_app worker` or similar).
7.4 Validate FastAPI routes register by running `uvicorn backend.app.main:app --reload` and hitting `/docs`.
7.5 Ensure environment variables are referenced through config and no secrets are hardcoded.

---

## Confirmed Decisions
- **Full JWT Auth**: Implement full sign-up/login with hashed passwords, JWT access + refresh tokens, and refresh-token persistence in a DB table.
- **Static HTML frontend**: Keep purely static HTML pages; implement shared layout & nav injection using a small shared `layout.js` helper.
- **Webhook-driven Outreach**: Use HubSpot webhook as the trigger for the outreach workflow; implement webhook signature verification.
- **Alembic initial migration**: Generate the initial migration now (after models are finalized) so the database schema is consistent from day one.

---

## Next Step
I'll now translate the confirmed architecture into a concrete implementation task plan (per-file actions + checklist) and proceed with refactoring the repo to match the PRD exactly.
