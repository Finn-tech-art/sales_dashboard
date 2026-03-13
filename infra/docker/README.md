# Docker Notes

`docker-compose.yml` is the primary stack definition for Bizard Leads.

The `infra/nginx/default.conf` file proxies:
- `/api/*` to FastAPI
- `/n8n/*` to n8n
- all other routes to the static frontend
