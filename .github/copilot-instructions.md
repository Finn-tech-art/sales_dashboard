# Workspace Instructions — Bizard Leads

## What is this project?
Bizard Leads is an AI-powered outreach automation platform. It is built as a **layered monolith** with a FastAPI backend, Celery workers, a Postgres database, Redis for Celery, and a static HTML/JS frontend. Automation workflows are managed via **n8n** and the system integrates with Apollo, HubSpot, OpenAI, SendGrid, and Chatwoot.

## Key folders
- `backend/` – Python backend code (FastAPI app, SQLAlchemy models, Celery workers, service clients).
- `frontend/` – Static UI pages (HTML, CSS, JS).
- `n8n/` – Automation workflow definitions.
- `infra/` – Intended place for Docker and nginx configuration (currently missing or incomplete).
- `migrations/` – Alembic migrations (should contain `001_initial.py` once generated).

## Development & Runtime expectations
The system should run via **Docker Compose** and expose:
- FastAPI backend (API + webhooks)
- Celery worker(s) + scheduler (RedBeat)
- Postgres + Redis
- n8n (automation engine)
- nginx reverse proxy

### Environment
The app reads secrets from environment variables. The repo should include a `.env.example` with:
- `POSTGRES_URL`, `REDIS_URL`
- `OPENAI_API_KEY`, `APOLLO_API_KEY`, `HUBSPOT_API_KEY`, `SENDGRID_API_KEY`, `CHATWOOT_API_KEY`
- `N8N_WEBHOOK_BASE`
- `JWT_SECRET`

## Coding Conventions & Architecture
- Backend is structured as:
  - `app/main.py` (FastAPI app entrypoint)
  - `app/config.py` (Pydantic settings)
  - `app/database.py` (SQLAlchemy setup)
  - `app/core/` (security + dependency helpers)
  - `app/api/routes/` (FastAPI routers)
  - `models/`, `schemas/`, `services/`
  - `workers/` (Celery app + workflow tasks)

- Authentication: full **JWT auth** with access + refresh tokens stored in a `sessions` table.
- Frontend: pure static HTML served via nginx; shared layout injected via JS.

## How to use Copilot in this workspace
- When adding new modules, follow the PRD structure exactly.
- Preserve any working logic; missing modules should be implemented, not deleted.
- Use `python -m py_compile` or `pytest` to validate backend imports.
- Ensure Celery connects to Redis and routes are registered in FastAPI.

## Notes for the Agent
- Use `backend/app/main.py` as the FastAPI app entry point.
- Ensure all required API routes are registered (auth, dashboard, leads, outreach, reports, workflows, webhooks).
- Implement webhook security for HubSpot (HMAC signature verification).
- Create `infra/docker` and `infra/nginx` configuration to match PRD requirements.

---

### If you are an AI agent (Copilot)
1. Always start by scanning the repository structure and inspecting key files.
2. Treat this repo as a work-in-progress; existing files may be empty placeholders.
3. When making changes, keep answers concise and reference the exact file paths.
4. For large refactors, propose a plan, get confirmation, then execute.

---

### Helpful commands (for humans)
- Run FastAPI locally:
  ```bash
  uvicorn backend.app.main:app --reload
  ```
- Run tests:
  ```bash
  pytest -q
  ```
- Perform an Alembic migration:
  ```bash
  alembic revision --autogenerate -m "initial"
  alembic upgrade head
  ```
- Start services via docker compose:
  ```bash
  docker compose up --build
  ```
