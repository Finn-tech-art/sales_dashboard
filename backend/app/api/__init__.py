from backend.app.api.routes.auth import router as auth
from backend.app.api.routes.dashboard import router as dashboard
from backend.app.api.routes.leads import router as leads
from backend.app.api.routes.outreach import router as outreach
from backend.app.api.routes.reports import router as reports
from backend.app.api.routes.workflows import router as workflows
from backend.app.api.routes.webhooks import router as webhooks

__all__ = [
    "auth",
    "dashboard",
    "leads",
    "outreach",
    "reports",
    "workflows",
    "webhooks",
]
